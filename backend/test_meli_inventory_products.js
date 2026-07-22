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

    // Testamos rotas de /inventory/products
    await testRoute('Inventory Products List 1', `https://api.mercadolibre.com/inventory/products`, token);
    await testRoute('Inventory Products List 2', `https://api.mercadolibre.com/users/${userId}/inventory/products`, token);
    await testRoute('Inventory Product SKU 1', `https://api.mercadolibre.com/inventory/products/K12MSSM8000SOR`, token);
    await testRoute('Inventory Product SKU 2', `https://api.mercadolibre.com/inventory/products/K6CBLM436SORM`, token);

  } catch (error) {
    console.error('Erro na execução:', error.message);
  }
}

run();
