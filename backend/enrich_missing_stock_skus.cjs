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
  console.log('1. Carregando catálogo local...');
  let seniorCatalog = {};
  if (fs.existsSync(catalogFilePath)) {
    seniorCatalog = JSON.parse(fs.readFileSync(catalogFilePath, 'utf8'));
  }
  console.log(`- SKUs no catálogo atual: ${Object.keys(seniorCatalog).length}`);

  console.log('2. Buscando SKUs do estoque 08/09 no Supabase...');
  const { data: stockRows, error: stockErr } = await supabase
    .from('silver_estoque')
    .select('id, sku_produto, descricao_produto, marca, local_estoque')
    .eq('data_atualizacao', '08/09');

  if (stockErr) {
    console.error('Erro ao buscar estoque:', stockErr);
    return;
  }

  console.log(`- Linhas no estoque 08/09: ${stockRows.length}`);

  const skusToQuerySenior = new Set();
  for (const r of stockRows) {
    const rawSku = String(r.sku_produto || '').trim().toUpperCase();
    const cleanSku = rawSku.replace(/(_FBA|_FULL|-FBA|-FULL)$/i, '');
    const hasDesc = r.descricao_produto && r.descricao_produto !== '#N/A' && r.descricao_produto.trim() !== '';
    const inCatalog = seniorCatalog[cleanSku] && seniorCatalog[cleanSku].descricao_oficial;

    if (!hasDesc || !inCatalog) {
      skusToQuerySenior.add(cleanSku);
    }
  }

  console.log(`3. Total de SKUs que precisam de busca na Senior: ${skusToQuerySenior.size}`);
  if (skusToQuerySenior.size === 0) {
    console.log('Todos os SKUs já possuem descrição!');
    return;
  }

  console.log('4. Autenticando na Senior...');
  const token = await obterToken();
  console.log('Autenticação OK.');

  const skusArray = Array.from(skusToQuerySenior);
  const batchSize = 30;
  let foundCount = 0;

  for (let i = 0; i < skusArray.length; i += batchSize) {
    const batch = skusArray.slice(i, i + batchSize);
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
        const desDer = String(item.desDer || '').trim();
        const nomMar = item.e076mar ? String(item.e076mar.nomMar || '').trim() : null;
        const desFam = item.e012fam ? String(item.e012fam.desFam || '').trim() : null;

        if (skuSen && desDer) {
          seniorCatalog[skuSen] = {
            sku_senior: skuSen,
            descricao_oficial: desDer,
            nomMar: nomMar || null,
            desFam: desFam || null,
            dthger: item.dthger || null
          };
          foundCount++;
        }
      }
    } catch (err) {
      console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, err.message);
    }
  }

  console.log(`5. Encontrados ${foundCount} novos SKUs na Senior! Salvando catálogo...`);
  fs.writeFileSync(catalogFilePath, JSON.stringify(seniorCatalog, null, 2), 'utf8');

  // 6. Atualizar descrições vazias no silver_estoque
  console.log('6. Atualizando silver_estoque com as descrições da Senior...');
  let updatedInDb = 0;
  for (const r of stockRows) {
    const rawSku = String(r.sku_produto || '').trim().toUpperCase();
    const cleanSku = rawSku.replace(/(_FBA|_FULL|-FBA|-FULL)$/i, '');
    const cat = seniorCatalog[cleanSku] || seniorCatalog[rawSku];

    if (cat && cat.descricao_oficial) {
      const hasValidDesc = r.descricao_produto && r.descricao_produto !== '#N/A' && r.descricao_produto.trim() !== '';
      if (!hasValidDesc) {
        await supabase
          .from('silver_estoque')
          .update({
            descricao_produto: cat.descricao_oficial,
            marca: cat.nomMar || r.marca
          })
          .eq('id', r.id);
        updatedInDb++;
      }
    }
  }

  console.log(`✅ Concluído! ${updatedInDb} linhas de estoque atualizadas no Supabase com descrições oficiais.`);
}

run().catch(console.error);
