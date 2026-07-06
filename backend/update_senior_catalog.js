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

// Caminho do seniorCatalog.json
const catalogFilePath = path.join(__dirname, '..', 'src', 'utils', 'seniorCatalog.json');

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
    console.log('📂 Inicializando catalog...');
    let catalog = {};
    if (fs.existsSync(catalogFilePath)) {
      catalog = JSON.parse(fs.readFileSync(catalogFilePath, 'utf8'));
    }
    const initialCount = Object.keys(catalog).length;

    // 1. Buscar SKUs do Supabase
    console.log('📡 Buscando SKUs no Supabase...');
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
    console.log(`   ➔ ${allMappings.length} mapeamentos encontrados.`);

    // Mapeia chaves para atualização
    const skuToPlatMap = {};
    const skusParaAtualizar = new Set();

    for (const item of allMappings) {
      const platSku = String(item.sku_plataforma || '').trim().toUpperCase();
      const senSku = String(item.sku_senior || '').trim().toUpperCase();

      if (senSku) {
        if (!skuToPlatMap[senSku]) {
          skuToPlatMap[senSku] = [];
        }
        skuToPlatMap[senSku].push(platSku);
        skusParaAtualizar.add(senSku); // Força atualização de todos para obter Marca/Família
      }
    }

    // Adicionar SKUs únicos de estoque e vendas que não estão mapeados
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
          // Aqui forçamos a busca para qualquer SKU do estoque/venda
          if (s) {
            if (!skusParaAtualizar.has(s)) {
              skusParaAtualizar.add(s);
              countAdded++;
            }
          }
        }
        more = data.length === limit;
        f += limit;
      }
      console.log(`   ➔ +${countAdded} SKUs novos encontrados em ${table} que serão sincronizados.`);
    };

    await addSkusFromTable('silver_estoque');
    await addSkusFromTable('silver_vendas');

    const uniqueSkusToFetch = Array.from(skusParaAtualizar);
    console.log(`   ➔ ${uniqueSkusToFetch.length} SKUs precisam ser sincronizados com a Senior.`);

    if (uniqueSkusToFetch.length === 0) {
      console.log('✨ O catálogo local já está 100% atualizado.');
      return;
    }

    // 2. Autenticar
    console.log('🔑 Autenticando na Senior X...');
    const token = await obterToken();
    console.log('✅ Autenticado!');

    // 3. Consultar Senior em lotes de 40
    const batchSize = 40;
    let totalEncontrados = 0;

    for (let i = 0; i < uniqueSkusToFetch.length; i += batchSize) {
      const batch = uniqueSkusToFetch.slice(i, i + batchSize);
      console.log(`⏳ Buscando dados (Lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(uniqueSkusToFetch.length / batchSize)})...`);

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
          const desDer = String(item.desDer || '').trim();
          const idePro = String(item.idePro || '').trim();
          const codRef = String(item.codRef || '').trim();
          const nomMar = item.e076mar ? String(item.e076mar.nomMar || '').trim() : null;
          const desFam = item.e012fam ? String(item.e012fam.desFam || '').trim() : null;

          if (skuSen) {
            const productData = {
              sku_senior: skuSen,
              descricao_oficial: desDer,
              idePro: idePro || null,
              codRef: codRef || null,
              nomMar: nomMar || null,
              desFam: desFam || null
            };

            // Mapeia o SKU Sênior
            catalog[skuSen] = productData;
            totalEncontrados++;

            // Mapeia todos os SKUs de plataforma correspondentes
            const platSkus = skuToPlatMap[skuSen] || [];
            for (const platSku of platSkus) {
              catalog[platSku] = productData;
            }
          }
        }
      } catch (err) {
        console.error(`   ❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      }
    }

    console.log(`\n🎉 Processamento concluído. ${totalEncontrados} SKUs adicionados.`);

    // 4. Salvar catalog
    fs.writeFileSync(catalogFilePath, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`💾 Catálogo salvo em ${catalogFilePath}. Novo total de chaves: ${Object.keys(catalog).length}`);

  } catch (error) {
    console.error('💥 Erro no catálogo:', error.message);
  }
}

run();
