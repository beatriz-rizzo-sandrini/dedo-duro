const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const invId = 'WTHW89301';

    console.log(`📡 Consultando /inventory/stock para o ID de estoque ${invId}...`);
    const res = await axios.get(`https://api.mercadolibre.com/inventory/stock?inventory_ids=${invId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Sucesso! Resposta da API:');
    console.log(JSON.stringify(res.data, null, 2));

  } catch (error) {
    console.error('❌ Falhou:', error.response ? error.response.status : error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

run();
