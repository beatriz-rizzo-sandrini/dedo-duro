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

// Caminhos dos arquivos JSON locais
const eanFilePath = path.join(__dirname, '..', 'src', 'utils', 'eanMapping.json');
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

async function getUniqueSkusFromTable(tableName, columnNames) {
  const uniqueSet = new Set();
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  console.log(`📡 Buscando SKUs da tabela "${tableName}"...`);
  
  const selectQuery = Array.isArray(columnNames) ? columnNames.join(', ') : columnNames;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .range(from, from + limit - 1);

    if (error) {
      console.error(`   ❌ Erro ao buscar da tabela ${tableName}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    data.forEach(row => {
      if (Array.isArray(columnNames)) {
        columnNames.forEach(col => {
          const val = row[col];
          if (val) uniqueSet.add(String(val).trim().toUpperCase());
        });
      } else {
        const val = row[columnNames];
        if (val) uniqueSet.add(String(val).trim().toUpperCase());
      }
    });

    hasMore = data.length === limit;
    from += limit;
  }
  console.log(`   ➔ Encontrados ${uniqueSet.size} SKUs únicos na tabela "${tableName}".`);
  return uniqueSet;
}

async function run() {
  try {
    // 1. Carregar mapeamento local de EAN e Catálogo Senior
    console.log('📂 Carregando arquivos JSON locais...');
    let eanMapping = {};
    if (fs.existsSync(eanFilePath)) {
      eanMapping = JSON.parse(fs.readFileSync(eanFilePath, 'utf8'));
    }
    let seniorCatalog = {};
    if (fs.existsSync(catalogFilePath)) {
      seniorCatalog = JSON.parse(fs.readFileSync(catalogFilePath, 'utf8'));
    }
    console.log(`   ➔ EANs mapeados: ${Object.keys(eanMapping).length}`);
    console.log(`   ➔ Catálogo mapeado: ${Object.keys(seniorCatalog).length}\n`);

    // 2. Coletar todos os SKUs de todas as tabelas em paralelo
    const [estoqueSet, vendasSet, reposicaoSet, badstockSet, mapeamentoSet] = await Promise.all([
      getUniqueSkusFromTable('silver_estoque', 'sku_produto'),
      getUniqueSkusFromTable('silver_vendas', 'sku_produto'),
      getUniqueSkusFromTable('silver_reposicao', 'sku_produto'),
      getUniqueSkusFromTable('silver_badstock', 'sku_produto'),
      getUniqueSkusFromTable('silver_mapeamento_sku', ['sku_plataforma', 'sku_senior'])
    ]);

    // Mesclar em um único Set de SKUs brutos
    const rawSkus = new Set([
      ...estoqueSet,
      ...vendasSet,
      ...reposicaoSet,
      ...badstockSet,
      ...mapeamentoSet
    ]);
    console.log(`\n📦 Total de SKUs brutos consolidados do Supabase: ${rawSkus.size}`);

    // Limpar SKUs (remover sufixos _FBA, _FULL, etc.) para obter o SKU oficial Senior
    const skuToPlatMap = {};
    const cleanSkusSet = new Set();

    for (const rawSku of rawSkus) {
      const cleanSku = rawSku.replace(/(_FBA|_FULL|-FBA|-FULL)$/i, '');
      if (cleanSku) {
        cleanSkusSet.add(cleanSku);
        if (!skuToPlatMap[cleanSku]) {
          skuToPlatMap[cleanSku] = new Set();
        }
        skuToPlatMap[cleanSku].add(rawSku);
      }
    }
    console.log(`   ➔ Total de SKUs oficiais (Senior) limpos: ${cleanSkusSet.size}\n`);

    // 3. Filtrar os SKUs que estão SEM EAN ou SEM informações de catálogo
    const skusParaAtualizar = new Set();
    for (const cleanSku of cleanSkusSet) {
      const temEan = !!eanMapping[cleanSku];
      const temCatalog = !!seniorCatalog[cleanSku] && !!seniorCatalog[cleanSku].descricao_oficial && !!seniorCatalog[cleanSku].dthger;

      // Pega os SKUs da plataforma vinculados para testar EANs deles também
      const platSkus = skuToPlatMap[cleanSku] || new Set();
      let todosPlatsComEan = true;
      for (const pSku of platSkus) {
        if (!eanMapping[pSku]) todosPlatsComEan = false;
      }

      if (!temEan || !temCatalog || !todosPlatsComEan) {
        skusParaAtualizar.add(cleanSku);
      }
    }

    const uniqueSkusToFetch = Array.from(skusParaAtualizar);
    console.log(`🔍 ${uniqueSkusToFetch.length} SKUs precisam ser atualizados na API Senior (EAN ou Marca/Descricao em falta).`);

    if (uniqueSkusToFetch.length === 0) {
      console.log('✨ Tudo atualizado localmente! Nenhuma requisição à Senior necessária.');
      return;
    }

    // 4. Autenticar na Senior
    console.log('\n🔑 Autenticando na Senior X...');
    const token = await obterToken();
    console.log('✅ Autenticado com sucesso!\n');

    // 5. Consultar a Senior em lotes de 40
    const batchSize = 40;
    let totalNovosEans = 0;
    let totalNovosProdutosCatalog = 0;

    for (let i = 0; i < uniqueSkusToFetch.length; i += batchSize) {
      const batch = uniqueSkusToFetch.slice(i, i + batchSize);
      console.log(`⏳ Buscando dados (Lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(uniqueSkusToFetch.length / batchSize)})...`);

      // Filtro OData: codDer eq 'SKU1' or codDer eq 'SKU2'...
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
          timeout: 15000
        });

        const contents = response.data && response.data.contents ? response.data.contents : [];

        for (const item of contents) {
          const skuSen = String(item.codDer || '').toUpperCase().trim();
          const ean = String(item.codBar || item.codGtn || '').trim();
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
              desFam: desFam || null,
              dthger: item.dthger || null
            };

            // Atualiza Catálogo
            if (!seniorCatalog[skuSen] || !seniorCatalog[skuSen].descricao_oficial || nomMar) {
              seniorCatalog[skuSen] = productData;
              totalNovosProdutosCatalog++;
            }

            // Atualiza EAN mapping
            if (ean) {
              if (!eanMapping[skuSen]) {
                eanMapping[skuSen] = ean;
                totalNovosEans++;
              }

              // Mapeia também os SKUs correspondentes da plataforma
              const platSkus = skuToPlatMap[skuSen] || [];
              for (const platSku of platSkus) {
                if (!eanMapping[platSku]) {
                  eanMapping[platSku] = ean;
                }
                if (!seniorCatalog[platSku]) {
                  seniorCatalog[platSku] = productData;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`   ❌ Erro ao consultar lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      }
    }

    console.log(`\n🎉 Sincronização concluída!`);
    console.log(`   ➔ Novos EANs mapeados: ${totalNovosEans}`);
    console.log(`   ➔ Novos registros no Catálogo: ${totalNovosProdutosCatalog}`);

    // 6. Gravar de volta nos arquivos JSON
    fs.writeFileSync(eanFilePath, JSON.stringify(eanMapping, null, 2), 'utf8');
    fs.writeFileSync(catalogFilePath, JSON.stringify(seniorCatalog, null, 2), 'utf8');
    console.log(`💾 Arquivos eanMapping.json e seniorCatalog.json salvos com sucesso!`);

  } catch (error) {
    console.error('💥 Erro geral no script de sincronização:', error.message);
  }
}

run();
