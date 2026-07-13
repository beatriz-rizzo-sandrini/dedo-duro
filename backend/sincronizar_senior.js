const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Credenciais da Senior X
const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';

// Supabase
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Caminhos locais
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

  console.log(`Buscando SKUs únicos de ${tableName}...`);
  const selectQuery = Array.isArray(columnNames) ? columnNames.join(', ') : columnNames;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .range(from, from + limit - 1);

    if (error) {
      console.error(`Erro ao buscar na tabela ${tableName}:`, error.message);
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
  return uniqueSet;
}

async function run() {
  try {
    console.log('Carregando mapeamentos locais...');
    let eanMapping = {};
    if (fs.existsSync(eanFilePath)) {
      eanMapping = JSON.parse(fs.readFileSync(eanFilePath, 'utf8'));
    }
    let seniorCatalog = {};
    if (fs.existsSync(catalogFilePath)) {
      seniorCatalog = JSON.parse(fs.readFileSync(catalogFilePath, 'utf8'));
    }
    console.log(`- EANs mapeados: ${Object.keys(eanMapping).length}`);
    console.log(`- Catálogo mapeado: ${Object.keys(seniorCatalog).length}`);

    const [estoqueSet, vendasSet, reposicaoSet, badstockSet, mapeamentoSet] = await Promise.all([
      getUniqueSkusFromTable('silver_estoque', 'sku_produto'),
      getUniqueSkusFromTable('silver_vendas', 'sku_produto'),
      getUniqueSkusFromTable('silver_reposicao', 'sku_produto'),
      getUniqueSkusFromTable('silver_badstock', 'sku_produto'),
      getUniqueSkusFromTable('silver_mapeamento_sku', ['sku_plataforma', 'sku_senior'])
    ]);

    const rawSkus = new Set([
      ...estoqueSet,
      ...vendasSet,
      ...reposicaoSet,
      ...badstockSet,
      ...mapeamentoSet
    ]);
    console.log(`Total de SKUs brutos consolidados: ${rawSkus.size}`);

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
    console.log(`Total de SKUs oficiais limpos: ${cleanSkusSet.size}`);

    const skusParaAtualizar = new Set();
    for (const cleanSku of cleanSkusSet) {
      const temEan = !!eanMapping[cleanSku];
      const temCatalog = !!seniorCatalog[cleanSku] && !!seniorCatalog[cleanSku].descricao_oficial && !!seniorCatalog[cleanSku].dthger;

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
    console.log(`${uniqueSkusToFetch.length} SKUs precisam ser sincronizados com a API da Senior.`);

    if (uniqueSkusToFetch.length === 0) {
      console.log('Tudo atualizado! Nenhuma requisição à Senior pendente.');
      return;
    }

    console.log('Autenticando na API da Senior...');
    const token = await obterToken();
    console.log('Autenticação realizada com sucesso.');

    const batchSize = 40;
    let totalNovosEans = 0;
    let totalNovosProdutosCatalog = 0;

    for (let i = 0; i < uniqueSkusToFetch.length; i += batchSize) {
      const batch = uniqueSkusToFetch.slice(i, i + batchSize);
      console.log(`Consultando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(uniqueSkusToFetch.length / batchSize)}...`);

      const filterParts = batch.map(sku => `codDer eq '${sku}'`);
      const filterQuery = filterParts.join(' or ');
      const queryUrl = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?size=40&filter=${encodeURIComponent(filterQuery)}`;

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

            if (!seniorCatalog[skuSen] || !seniorCatalog[skuSen].descricao_oficial || nomMar) {
              seniorCatalog[skuSen] = productData;
              totalNovosProdutosCatalog++;
            }

            if (ean) {
              if (!eanMapping[skuSen]) {
                eanMapping[skuSen] = ean;
                totalNovosEans++;
              }

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
        console.error(`Erro ao consultar lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      }
    }

    console.log('Sincronização concluída.');
    console.log(`- Novos EANs mapeados: ${totalNovosEans}`);
    console.log(`- Novos registros no catálogo: ${totalNovosProdutosCatalog}`);

    fs.writeFileSync(eanFilePath, JSON.stringify(eanMapping, null, 2), 'utf8');
    fs.writeFileSync(catalogFilePath, JSON.stringify(seniorCatalog, null, 2), 'utf8');
    console.log('Arquivos locais atualizados com sucesso.');

  } catch (error) {
    console.error('Erro geral no script de sincronização Senior:', error.message);
  }
}

run();
