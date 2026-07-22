const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function run() {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    console.log(`📡 Buscando pedidos recentes...`);
    const res = await axios.get(`https://api.mercadolibre.com/orders/search`, {
      params: {
        seller: userId,
        limit: 10,
        sort: 'date_desc' // let's try sorting descending
      },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const orders = res.data.results || [];
    console.log(`✅ Total no paging: ${res.data.paging.total}`);
    console.log(`Retornados ${orders.length} pedidos.`);
    
    orders.forEach((o, i) => {
      console.log(`[${i}] ID: ${o.id} | Criado em: ${o.date_created} | Status: ${o.status}`);
    });

  } catch (error) {
    console.error('Erro na execução:', error.response ? error.response.data : error.message);
  }
}

run();
