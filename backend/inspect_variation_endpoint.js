const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const varId = '186527109281';

    console.log(`📡 Buscando detalhes da variação ${varId} na API do Mercado Livre...`);
    const res = await axios.get(`https://api.mercadolibre.com/variations/${varId}`, {
      headers: { 'Authorization': `Bearer ${creds.access_token}` }
    });

    console.log(JSON.stringify(res.data, null, 2));

  } catch (err) {
    if (err.response) {
      console.error('Erro:', err.response.status, err.response.data);
    } else {
      console.error('Erro:', err.message);
    }
  }
}

run();
