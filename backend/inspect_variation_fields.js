const fs = require('fs');
const path = require('path');
const axios = require('axios');

const credentialsPath = path.join(__dirname, 'meli_credentials.json');

async function run() {
  const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const token = creds.access_token;
  const itemId = 'MLB5113808724';

  console.log(`📡 Buscando detalhes do anúncio ${itemId} no Mercado Livre...`);
  try {
    const res = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const item = res.data;
    console.log(`\nTítulo: "${item.title}"`);
    console.log(`Total de variações: ${item.variations.length}`);

    if (item.variations.length > 0) {
      console.log('\n--- Propriedades completas da PRIMEIRA VARIAÇÃO ---');
      const firstVar = item.variations[0];
      console.log(JSON.stringify(firstVar, null, 2));
    } else {
      console.log('Sem variações.');
    }

  } catch (err) {
    console.error('Erro:', err.response ? err.response.data : err.message);
  }
}

run();
