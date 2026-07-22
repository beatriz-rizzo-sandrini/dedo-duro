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

  console.log(`2. Consultando CONTAS A PAGAR na Senior usando rota erpx_fin_int/facade/apis/getPayableTitle...`);
  try {
    const queryUrl = `https://api.senior.com.br/erpx_fin_int/facade/apis/getPayableTitle`;
    
    // Payload required for getPayableTitleFacadeInput
    const payload = {
      filter: {
        valueType: "OPEN" // Traga títulos em aberto
      },
      pageRequest: {
        offset: 0,
        size: 5 // Vamos puxar 5 só para ver a cara dos dados
      }
    };

    const productRes = await axios.post(queryUrl, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'client_id': gateway_client_id,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Tenant': tenantName
      },
      timeout: 15000
    });

    console.log('✅ Consulta realizada com sucesso!');
    console.log('================ DADOS FINANCEIROS (SENIOR) ================');
    if (productRes.data) {
      console.log(JSON.stringify(productRes.data, null, 2));
    } else {
      console.log('⚠️ A API respondeu com sucesso, mas retornou vazio.');
    }
    console.log('===========================================================');
  } catch (error) {
    console.error(`❌ Erro na rota de finanças:`);
    if (error.response) {
      console.error(`   Status HTTP: ${error.response.status}`);
      console.error('   Mensagem de Erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   ' + error.message);
    }
    console.log('----------------------------------------------------');
  }
}

run();
