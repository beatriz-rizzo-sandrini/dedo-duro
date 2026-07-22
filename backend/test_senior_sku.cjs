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

  const sku = 'SA000007000CMCNCN430032';
  
  // Test 1: exact match
  console.log(`\n=== Teste 1: codDer eq '${sku}' ===`);
  const filter1 = `codDer eq '${sku}'`;
  const url1 = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filter1)}`;
  
  try {
    const r1 = await axios.get(url1, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'client_id': gateway_client_id,
        'Accept': 'application/json',
        'X-Tenant': tenantName
      },
      timeout: 15000
    });
    const contents1 = r1.data?.contents || [];
    console.log(`Resultados: ${contents1.length}`);
    contents1.forEach(item => {
      console.log(`  codDer: ${item.codDer}`);
      console.log(`  desDer: ${item.desDer}`);
      console.log(`  nomMar: ${item.e076mar?.nomMar}`);
      console.log(`  desFam: ${item.e012fam?.desFam}`);
      console.log(`  codBar: ${item.codBar}`);
      console.log(`  dthger: ${item.dthger}`);
    });
  } catch (err) {
    console.error('Erro teste 1:', err.message);
  }

  // Test 2: starts with SA000007000 (broader search)
  console.log(`\n=== Teste 2: codDer starts with 'SA000007000' ===`);
  const filter2 = `codDer like 'SA000007000%'`;
  const url2 = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filter2)}`;
  
  try {
    const r2 = await axios.get(url2, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'client_id': gateway_client_id,
        'Accept': 'application/json',
        'X-Tenant': tenantName
      },
      timeout: 15000
    });
    const contents2 = r2.data?.contents || [];
    console.log(`Resultados: ${contents2.length}`);
    contents2.forEach(item => {
      console.log(`  codDer: ${item.codDer} | desDer: ${item.desDer} | marca: ${item.e076mar?.nomMar}`);
    });
  } catch (err) {
    console.error('Erro teste 2:', err.message);
  }

  // Test 3: try with 'contains' to find any variation
  console.log(`\n=== Teste 3: codDer contains '007000' ===`);
  const filter3 = `codDer like '%007000%'`;
  const url3 = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filter3)}&size=10`;
  
  try {
    const r3 = await axios.get(url3, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'client_id': gateway_client_id,
        'Accept': 'application/json',
        'X-Tenant': tenantName
      },
      timeout: 15000
    });
    const contents3 = r3.data?.contents || [];
    console.log(`Resultados: ${contents3.length}`);
    contents3.forEach(item => {
      console.log(`  codDer: ${item.codDer} | desDer: ${item.desDer}`);
    });
  } catch (err) {
    console.error('Erro teste 3:', err.message);
  }
}

run().catch(err => console.error('Erro geral:', err.message));
