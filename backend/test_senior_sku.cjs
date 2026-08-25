const axios = require('axios');

const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';

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
  throw new Error('Token error');
}

async function run() {
  const token = await obterToken();
  console.log('Token obtido com sucesso.');

  const skus = ['FL01TR00108AABPCB411918', 'KSA12000002350AA0P0396'];
  
  for (const sku of skus) {
    console.log(`\n=== Buscando SKU: '${sku}' ===`);
    const filter = `codDer eq '${sku}'`;
    const url = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filter)}`;
    
    try {
      const r = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'client_id': gateway_client_id,
          'Accept': 'application/json',
          'X-Tenant': tenantName
        },
        timeout: 15000
      });
      const contents = r.data?.contents || [];
      console.log(`Resultados: ${contents.length}`);
      contents.forEach(item => {
        console.log(`  codDer: ${item.codDer}`);
        console.log(`  desDer: ${item.desDer}`);
        console.log(`  nomMar: ${item.e076mar?.nomMar}`);
        console.log(`  desFam: ${item.e012fam?.desFam}`);
        console.log(`  codBar: ${item.codBar}`);
        console.log(`  dthger: ${item.dthger}`);
      });
    } catch (err) {
      console.error(`Erro buscando ${sku}:`, err.message);
    }
  }
}

run().catch(err => console.error('Erro geral:', err.message));
