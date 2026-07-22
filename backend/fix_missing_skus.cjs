// Quick script to add missing SKUs to seniorCatalog.json by querying the Senior API directly
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';
const catalogFilePath = path.join(__dirname, '..', 'src', 'utils', 'seniorCatalog.json');
const eanFilePath = path.join(__dirname, '..', 'src', 'utils', 'eanMapping.json');

async function obterToken() {
  const loginUrl = 'https://api.senior.com.br/platform/authentication/anonymous/loginWithKey';
  const res = await axios.post(loginUrl, {
    accessKey: tenant_access_key, secret: tenant_secret, tenantName
  }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'client_id': gateway_client_id } });
  if (res.data && res.data.jsonToken) return JSON.parse(res.data.jsonToken).access_token;
  throw new Error('Token error');
}

async function run() {
  const skus = process.argv.slice(2);
  if (skus.length === 0) {
    console.log('Uso: node fix_missing_skus.cjs SKU1 SKU2 ...');
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogFilePath, 'utf8'));
  const eanMapping = JSON.parse(fs.readFileSync(eanFilePath, 'utf8'));
  const token = await obterToken();
  console.log('Token obtido.');

  let added = 0;
  for (const sku of skus) {
    const skuUpper = sku.toUpperCase().trim();
    if (catalog[skuUpper]) {
      console.log(`${skuUpper}: Já existe no catálogo -> "${catalog[skuUpper].descricao_oficial}"`);
      continue;
    }

    const filter = `codDer eq '${skuUpper}'`;
    const url = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filter)}`;
    try {
      const r = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'client_id': gateway_client_id, 'Accept': 'application/json', 'X-Tenant': tenantName },
        timeout: 15000
      });
      const contents = r.data?.contents || [];
      if (contents.length === 0) {
        console.log(`${skuUpper}: NÃO encontrado na API da Senior!`);
        continue;
      }
      const item = contents[0];
      const productData = {
        sku_senior: skuUpper,
        descricao_oficial: String(item.desDer || '').trim(),
        idePro: String(item.idePro || '').trim() || null,
        codRef: String(item.codRef || '').trim() || null,
        nomMar: item.e076mar ? String(item.e076mar.nomMar || '').trim() : null,
        desFam: item.e012fam ? String(item.e012fam.desFam || '').trim() : null,
        dthger: item.dthger || null
      };
      catalog[skuUpper] = productData;
      const ean = String(item.codBar || item.codGtn || '').trim();
      if (ean) eanMapping[skuUpper] = ean;
      console.log(`${skuUpper}: ADICIONADO -> "${productData.descricao_oficial}" (marca: ${productData.nomMar})`);
      added++;
    } catch (err) {
      console.error(`${skuUpper}: Erro -> ${err.message}`);
    }
  }

  if (added > 0) {
    fs.writeFileSync(catalogFilePath, JSON.stringify(catalog, null, 2), 'utf8');
    fs.writeFileSync(eanFilePath, JSON.stringify(eanMapping, null, 2), 'utf8');
    console.log(`\n${added} SKU(s) adicionado(s) ao catálogo.`);
  } else {
    console.log('\nNenhum SKU novo para adicionar.');
  }
}

run().catch(err => console.error('Erro:', err.message));
