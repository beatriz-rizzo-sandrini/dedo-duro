const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function testRoute(name, url, token) {
  console.log(`📡 Testando ${name}: ${url}...`);
  try {
    const res = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✅ ${name} funcionou! Status: ${res.status}`);
    console.log(JSON.stringify(res.data, null, 2).substring(0, 1500));
    return true;
  } catch (err) {
    console.log(`❌ ${name} falhou: ${err.response ? err.response.status : err.message}`);
    return false;
  }
}

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    await testRoute('Inventory Items 1', `https://api.mercadolibre.com/users/${userId}/inventory_items`, token);
    await testRoute('Inventory Items 2', `https://api.mercadolibre.com/users/${userId}/inventory-items`, token);
    await testRoute('Inventory Items 3', `https://api.mercadolibre.com/inventory_items`, token);

  } catch (error) {
    console.error('Erro na execução:', error.message);
  }
}

run();
