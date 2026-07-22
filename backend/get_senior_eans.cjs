const axios = require('axios');

// Credenciais configuradas e validadas
const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';

// SKUs de exemplo para buscar
const skusParaBuscar = [
  'FL000012138AA00000G0038', // Camisa Regata Fila
  'AD000JJ7822AAABCN420273', // Tênis Adidas Runfalcon 5
  'SA00P345N01AAABCN390811'  // Tênis Sandrini P345N01
];

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
  throw new Error('Não foi possível gerar o token de acesso.');
}

async function buscarEANs(skus) {
  try {
    console.log('🔑 Autenticando na Senior X...');
    const token = await obterToken();
    console.log('✅ Autenticado com sucesso!\n');

    console.log(`🔎 Buscando EANs para os SKUs:`, skus);
    
    // Monta o filtro OData (ex: codDer eq 'SKU1' or codDer eq 'SKU2'...)
    const filterParts = skus.map(sku => `codDer eq '${sku}' or codRef eq '${sku}' or codBar eq '${sku}'`);
    const filterQuery = filterParts.join(' or ');
    
    const queryUrl = `https://api.senior.com.br/erpx_fnd/produto/entities/e075der?filter=${encodeURIComponent(filterQuery)}`;

    const response = await axios.get(queryUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'client_id': gateway_client_id,
        'Accept': 'application/json',
        'X-Tenant': tenantName
      }
    });

    const resultsObj = response.data;
    const contents = resultsObj && resultsObj.contents ? resultsObj.contents : (Array.isArray(resultsObj) ? resultsObj : []);

    console.log('\n================ RESULTADOS DA CONSULTA SENIOR ================');
    if (contents && contents.length > 0) {
      const tableData = contents.map(item => ({
        'SKU (codDer)': item.codDer,
        'Referência (codRef)': item.codRef || '-',
        'EAN (codBar)': item.codBar || item.codGtn || '-',
        'Descrição': item.desDer
      }));
      console.table(tableData);
    } else {
      console.log('⚠️ Nenhum produto correspondente foi encontrado.');
    }
    console.log('================================================================');

  } catch (error) {
    console.error('❌ Erro na consulta de EANs:');
    if (error.response) {
      console.error(`Status HTTP: ${error.response.status}`);
      console.error('Mensagem:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Executa com os SKUs informados ou passados por parâmetro via linha de comando
const args = process.argv.slice(2);
const list = args.length > 0 ? args : skusParaBuscar;

buscarEANs(list);
