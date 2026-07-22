const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const invId = 'GCOI23288';

    console.log(`📡 Consultando estoque da central de Fulfillment SP para o ID ${invId}...`);
    
    try {
      const res = await axios.get(`https://api.mercadolibre.com/inventory/stock?inventory_ids=${invId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Rota /inventory/stock funcionou:');
      console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log(`❌ Rota /inventory/stock falhou: ${err.response ? err.response.status : err.message}`);
      if (err.response) console.log(JSON.stringify(err.response.data));
    }

  } catch (error) {
    console.error('Erro na execução:', error.message);
  }
}

run();
