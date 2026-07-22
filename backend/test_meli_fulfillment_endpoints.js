const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function testRoute(name, url, token) {
  console.log(`📡 Testando ${name}: ${url}...`);
  try {
    const res = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✅ ${name} funcionou! Status: ${res.status}`);
    console.log(JSON.stringify(res.data, null, 2).substring(0, 1000));
    return true;
  } catch (err) {
    console.log(`❌ ${name} falhou: ${err.response ? err.response.status : err.message}`);
    if (err.response && err.response.status !== 404) {
      console.log(JSON.stringify(err.response.data));
    }
    return false;
  }
}

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    // Testamos várias rotas conhecidas de Fulfillment
    await testRoute('Fulfillment Stock 1', `https://api.mercadolibre.com/users/${userId}/fulfillment_stock`, token);
    await testRoute('Fulfillment Stock 2', `https://api.mercadolibre.com/fulfillment/stock`, token);
    await testRoute('Fulfillment Inputs', `https://api.mercadolibre.com/users/${userId}/fulfillment_inputs`, token);
    await testRoute('Fulfillment Warehouse Stock', `https://api.mercadolibre.com/users/${userId}/fulfillment/stock`, token);
    await testRoute('Seller Warehouse Locations', `https://api.mercadolibre.com/users/${userId}/locations`, token);

  } catch (error) {
    console.error('Erro na execução:', error.message);
  }
}

run();
