const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Credenciais de Produção da Senior X
const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';

// Supabase
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Caminho do eanMapping.json
const mappingFilePath = path.join(__dirname, '..', 'src', 'utils', 'eanMapping.json');

async function obterToken() {
  const loginUrl = 'https://api.senior.com.br/platform/authentication/anonymous/loginWithKey';
  const res = await axios.post(loginUrl, {
    accessKey: tenant_access_key,
    secret: tenant_secret,
    tenantName: tenantName
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'client_id': gateway_client_id
    }
  });

  if (res.data && res.data.jsonToken) {
    const parsed = JSON.parse(res.data.jsonToken);
    return parsed.access_token;
  }
  throw new Error('Não foi possível gerar o token de acesso na Senior.');
}

async function run() {
  try {
    // 1. Carregar mapeamento local existente
    console.log('📂 Carregando eanMapping.json...');
    let eanMapping = {};
    if (fs.existsSync(mappingFilePath)) {
      eanMapping = JSON.parse(fs.readFileSync(mappingFilePath, 'utf8'));
    }
    const initialCount = Object.keys(eanMapping).length;
    console.log(`   ➔ ${initialCount} chaves de EAN encontradas no JSON local.\n`);

    // 2. Buscar SKUs da base Supabase (silver_mapeamento_sku)
    console.log('📡 Buscando SKUs mapeados no Supabase...');
    let allMappings = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_mapeamento_sku')
        .select('sku_plataforma, sku_senior')
        .range(from, from + limit - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allMappings = allMappings.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }
    console.log(`   ➔ Encontrados ${allMappings.length} mapeamentos no banco.\n`);

    // 3. Filtrar chaves que precisam de atualização de EAN
    const skuToPlatMap = {};
    const skusParaAtualizar = new Set();

    for (const item of allMappings) {
      const platSku = String(item.sku_plataforma || '').trim().toUpperCase();
      const senSku = String(item.sku_senior || '').trim().toUpperCase();

      if (senSku) {
        // Vincula o SKU Sênior ao SKU da plataforma
        if (!skuToPlatMap[senSku]) {
          skuToPlatMap[senSku] = [];
        }
        skuToPlatMap[senSku].push(platSku);

        // Se o EAN não existe ou está vazio, precisamos buscar
        if (!eanMapping[senSku] || !eanMapping[platSku]) {
          skusParaAtualizar.add(senSku);
        }
      }
    }

    // 3.5. Adicionar SKUs únicos de estoque e vendas que não estão mapeados
    console.log('📡 Buscando SKUs diretos do estoque e vendas...');
    const addSkusFromTable = async (table) => {
      let f = 0;
      let more = true;
      let countAdded = 0;
      while (more) {
        const { data, error } = await supabase.from(table).select('sku_produto').range(f, f + limit - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data) {
          const s = String(r.sku_produto || '').trim().toUpperCase();
          if (s && !eanMapping[s]) {
            skusParaAtualizar.add(s);
            countAdded++;
          }
        }
        more = data.length === limit;
        f += limit;
      }
      console.log(`   ➔ +${countAdded} SKUs novos encontrados em ${table} que precisam de EAN.`);
    };

    await addSkusFromTable('silver_estoque');
    await addSkusFromTable('silver_vendas');

    const uniqueSkusToFetch = Array.from(skusParaAtualizar);
    console.log(`   ➔ ${uniqueSkusToFetch.length} SKUs Sênior precisam de atualização de EAN.\n`);

    if (uniqueSkusToFetch.length === 0) {
      console.log('✨ Todos os SKUs já possuem EAN mapeado! Nada a fazer.');
      return;
    }

    // 4. Autenticar na Senior
    console.log('🔑 Autenticando na Senior X...');
    const token = await obterToken();
    console.log('✅ Autenticado com sucesso!\n');

    // 5. Consultar EANs na Senior em lotes de 40
    const batchSize = 40;
    let totalEncontrados = 0;

    for (let i = 0; i < uniqueSkusToFetch.length; i += batchSize) {
      const batch = uniqueSkusToFetch.slice(i, i + batchSize);
      console.log(`⏳ Buscando EANs (Lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(uniqueSkusToFetch.length / batchSize)})...`);

      // Monta o filtro SDL para o lote (codDer eq 'SKU1' or codDer eq 'SKU2'...)
      const filterParts = batch.map(sku => `codDer eq '${sku}'`);
      const filterQuery = filterParts.join(' or ');
      const queryUrl = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filterQuery)}`;

      try {
        const response = await axios.get(queryUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'client_id': gateway_client_id,
            'Accept': 'application/json',
            'X-Tenant': tenantName
          },
          timeout: 10000
        });

        const contents = response.data && response.data.contents ? response.data.contents : [];
        
        for (const item of contents) {
          const skuSen = String(item.codDer || '').toUpperCase().trim();
          const ean = String(item.codBar || item.codGtn || '').trim();

          if (skuSen && ean) {
            // Mapeia o SKU Sênior direto para o EAN
            eanMapping[skuSen] = ean;
            totalEncontrados++;

            // Mapeia também todos os SKUs de plataforma vinculados a esse SKU Sênior
            const platSkus = skuToPlatMap[skuSen] || [];
            for (const platSku of platSkus) {
              eanMapping[platSku] = ean;
            }
          }
        }
      } catch (err) {
        console.error(`   ❌ Erro ao consultar lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      }
    }

    console.log(`\n🎉 Processamento de API concluído.`);
    console.log(`   ➔ Encontrados ${totalEncontrados} novos EANs.`);

    // 6. Gravar o novo arquivo eanMapping.json de volta
    fs.writeFileSync(mappingFilePath, JSON.stringify(eanMapping, null, 2), 'utf8');
    const finalCount = Object.keys(eanMapping).length;
    console.log(`💾 eanMapping.json salvo com sucesso! Novo total de chaves: ${finalCount} (ganho de +${finalCount - initialCount}).`);

  } catch (error) {
    console.error('💥 Erro geral no robô de atualização de EANs:', error.message);
  }
}

run();
