const axios = require('axios');

const gateway_client_id = 'ce837664-d8bc-4745-8262-d7120ac81c1b';
const tenant_access_key = '0e090b52-2f3d-4ce6-afa7-51efb3f3aebc';
const tenant_secret = '0468c3c3-f8d2-49ce-af53-532ba422c996';
const tenantName = 'gruposandrinicombr';

async function run() {
  console.log('Authenticating...');
  let token = null;
  try {
    const loginRes = await axios.post('https://api.senior.com.br/platform/authentication/anonymous/loginWithKey', {
      accessKey: tenant_access_key,
      secret: tenant_secret,
      tenantName: tenantName
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'client_id': gateway_client_id
      },
      timeout: 8000
    });

    if (loginRes.data && loginRes.data.access_token) {
      token = loginRes.data.access_token;
    } else if (loginRes.data && loginRes.data.jsonToken) {
      const parsed = JSON.parse(loginRes.data.jsonToken);
      token = parsed.access_token || parsed.jsonToken;
    }
  } catch (err) {
    console.error('Auth error:', err.response ? err.response.data : err.message);
    return;
  }

  if (!token) {
    console.error('No token generated.');
    return;
  }

  console.log('Token generated successfully.');

  const candidateUrls = [
    // 1. erpx_sup_cpr_purchase_orders prefix
    'https://api.senior.com.br/erpx_sup_cpr_purchase_orders/purchase_orders/queries/listPurchaseOrdersDeliveryTracking',
    // 2. erpx_sup_cpr prefix
    'https://api.senior.com.br/erpx_sup_cpr/purchase_orders/queries/listPurchaseOrdersDeliveryTracking',
    // 3. api_privada prefix
    'https://api.senior.com.br/api_privada/erpx_sup_cpr_purchase_orders/purchase_orders/queries/listPurchaseOrdersDeliveryTracking',
    // 4. without purchase_orders segment
    'https://api.senior.com.br/erpx_sup_cpr_purchase_orders/queries/listPurchaseOrdersDeliveryTracking',
    // 5. standard erpx_sup_cpr without purchase_orders segment
    'https://api.senior.com.br/erpx_sup_cpr/queries/listPurchaseOrdersDeliveryTracking',
    // 6. with erpx_sup_cpr_purchaseorders
    'https://api.senior.com.br/erpx_sup_cpr_purchaseorders/purchase_orders/queries/listPurchaseOrdersDeliveryTracking'
  ];

  for (const url of candidateUrls) {
    console.log(`\nTesting URL: ${url}`);
    try {
      const response = await axios.post(url, {
        deliveryTrackingStatus: ["UPCOMING"],
        page: {
          offset: 0,
          size: 5
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'client_id': gateway_client_id,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tenant': tenantName
        },
        timeout: 10000
      });

      console.log('✅ SUCCESS!');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2));
      return;
    } catch (err) {
      console.log(`❌ FAILED (Status: ${err.response ? err.response.status : 'No response'})`);
      if (err.response) {
        console.log('Response Details:', JSON.stringify(err.response.data, null, 2));
      }
    }
  }
}

run();
