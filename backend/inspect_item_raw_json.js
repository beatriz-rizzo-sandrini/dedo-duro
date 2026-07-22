const fs = require('fs');
const path = require('path');
const axios = require('axios');
const credentialsPath = path.join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const itemId = 'MLB4128182162';

    console.log(`📡 Buscando JSON bruto do anúncio ${itemId}...`);
    const res = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const scratchDir = path.join(__dirname, '..', 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir);
    }

    const outputPath = path.join(scratchDir, 'item_raw.json');
    fs.writeFileSync(outputPath, JSON.stringify(res.data, null, 2), 'utf8');
    console.log(`✅ JSON bruto salvo em: ${outputPath}`);

  } catch (error) {
    console.error('Erro:', error.response ? error.response.data : error.message);
  }
}

run();
