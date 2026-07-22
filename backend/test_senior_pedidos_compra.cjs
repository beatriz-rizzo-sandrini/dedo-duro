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
  console.log('   INICIANDO TESTE DE PEDIDOS DE COMPRA NA SENIOR   ');
  console.log('====================================================\n');

  const combinations = [
    {
      url: `https://api.senior.com.br/platform/authentication/anonymous/loginWithKey`,
      tenant: tenantName,
      name: 'Global API anonymous/loginWithKey (tenantName)'
    }
  ];

  let token = null;

  for (const combo of combinations) {
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
        console.log('🔑 Token Gerado (Extraído):', token + '\n');
        break;
      }
    } catch (err) {
      console.log(`❌ Failed with status: ${err.response ? err.response.status : err.message}`);
    }
  }

  if (!token) {
    console.error('❌ Erro: Todos os métodos de autenticação falharam.');
    return;
  }

  const queryPaths = [
    'erpx_sup_cpr/purchase_orders/queries/listPurchaseOrders'
  ];

  for (const qPath of queryPaths) {
    console.log(`2. Consultando PEDIDOS DE COMPRA na Senior usando rota ${qPath}...`);
    try {
      const queryUrl = `https://api.senior.com.br/${qPath}`;
      
      const payload = {
        pageRequest: {
          offset: 0,
          size: 5
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
        timeout: 10000
      });

      console.log('✅ Consulta realizada com sucesso!');
      console.log('================ DADOS DO PEDIDO DE COMPRA ================');
      if (productRes.data) {
        console.log(JSON.stringify(productRes.data, null, 2));
      } else {
        console.log('⚠️ A API respondeu com sucesso, mas retornou vazio.');
      }
      console.log('===========================================================');
      break;
    } catch (error) {
      console.error(`❌ Erro na rota:`);
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
