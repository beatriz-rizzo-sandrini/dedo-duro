const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const itemId = 'MLB1832654834';

    console.log(`📡 Buscando detalhes do anúncio ${itemId}...`);
    const res = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const item = res.data;
    console.log(`Título: "${item.title}"`);
    console.log(`Variações encontradas: ${item.variations.length}`);

    if (item.variations.length > 0) {
      console.log('\n--- VARIATION 0 ---');
      console.log(JSON.stringify(item.variations[0], null, 2));
      console.log('\n--- VARIATION 1 ---');
      console.log(JSON.stringify(item.variations[1], null, 2));
    }
  } catch (error) {
    console.error('Erro na execução:', error.response ? error.response.data : error.message);
  }
}

run();
