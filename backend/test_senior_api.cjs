const axios = require('axios');

// Credenciais do Portal do Desenvolvedor (Sensedia - Gateway)
const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';

// Credenciais do Console do Tenant (Senior X - Permissões)
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';

// Tenant padrão deduzido (gruposandrinicombr)
const tenantName = 'gruposandrinicombr';

async function run() {
  console.log('====================================================');
  console.log('   INICIANDO TESTE DE INTEGRAÇÃO COM A API SENIOR   ');
  console.log('====================================================\n');

  const combinations = [
    {
      url: `https://api.senior.com.br/platform/authentication/anonymous/loginWithKey`,
      tenant: tenantName,
      name: 'Global API anonymous/loginWithKey (tenantName)'
    },
    {
      url: `https://api.senior.com.br/platform/authentication/anonymous/loginWithKey`,
      tenant: 'gruposandrini.com.br',
      name: 'Global API anonymous/loginWithKey (tenantDomain)'
    }
  ];

  let token = null;

  for (const combo of combinations) {
    console.log(`Trying Authentication method: "${combo.name}"...`);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'client_id': gateway_client_id
      };

      const loginRes = await axios.post(combo.url, {
        accessKey: tenant_access_key,
        secret: tenant_secret,
        tenantName: combo.tenant
      }, {
        headers,
        timeout: 8000
      });

      let tokenValue = null;
      if (loginRes.data) {
        if (loginRes.data.access_token) {
          tokenValue = loginRes.data.access_token;
        } else if (loginRes.data.jsonToken) {
          try {
            const parsed = JSON.parse(loginRes.data.jsonToken);
            tokenValue = parsed.access_token || parsed.jsonToken;
          } catch (e) {
            tokenValue = loginRes.data.jsonToken;
          }
        }
      }

      if (tokenValue) {
        token = tokenValue;
        console.log(`✅ Success with method: "${combo.name}"!`);
        console.log('🔑 Token Gerado (Extraído):', token + '\n');
        break;
      }
    } catch (err) {
      console.log(`❌ Failed with status: ${err.response ? err.response.status : err.message}`);
      if (err.response && err.response.data) {
        console.log(`   Response details:`, JSON.stringify(err.response.data));
      }
    }
    console.log('----------------------------------------------------');
  }

  if (!token) {
    console.error('❌ Erro: Todos os métodos de autenticação falharam.');
    return;
  }

  const productSku = 'FL02TR00025';
  const queryPaths = [
    'erpx_com/produto/entities/e075der',
    'erpx_fnd/produto/entities/e075der',
    'erp_est/sku_produto/entities/e075der'
  ];

  for (const qPath of queryPaths) {
    console.log(`2. Consultando variações do SKU "${productSku}" na Senior usando rota "${qPath}"...`);
    try {
      const queryUrl = `https://api.senior.com.br/${qPath}?$filter=codRef eq '${productSku}' or idePro eq '${productSku}'`;
      const productRes = await axios.get(queryUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'client_id': gateway_client_id,
          'Accept': 'application/json',
          'X-Tenant': tenantName
        }
      });

      console.log('✅ Consulta realizada com sucesso!');
      console.log('================ DADOS DO PRODUTO (SENIOR) ================');
      if (productRes.data && productRes.data.length > 0) {
        console.log(JSON.stringify(productRes.data, null, 2));
      } else {
        console.log('⚠️ Nenhum produto encontrado com o SKU informado.');
        console.log('Resposta bruta:', productRes.data);
      }
      console.log('===========================================================');
      break;
    } catch (error) {
      console.error(`❌ Erro na rota "${qPath}":`);
      if (error.response) {
        console.error(`   Status HTTP: ${error.response.status}`);
        console.error('   Mensagem de Erro:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('   ' + error.message);
      }
      console.log('----------------------------------------------------');
    }
  }
}

run();
