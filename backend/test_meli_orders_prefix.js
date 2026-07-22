const axios = require('axios');
const credentialsPath = require('path').join(__dirname, 'meli_sp_credentials.json');

async function test(params) {
  try {
    const creds = require(credentialsPath);
    const token = creds.access_token;
    const userId = creds.user_id;

    console.log(`📡 Testando busca de pedidos com params:`, params);
    const res = await axios.get(`https://api.mercadolibre.com/orders/search`, {
      params: {
        seller: userId,
        limit: 2,
        ...params
      },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Sucesso! Total de registros no paging:`, res.data.paging.total);
    if (res.data.results && res.data.results.length > 0) {
      console.log(`Primeiro pedido retornado: ID ${res.data.results[0].id}, date_created: ${res.data.results[0].date_created}`);
    } else {
      console.log('Nenhum pedido retornado.');
    }
  } catch (err) {
    console.log(`❌ Falha:`, err.response ? err.response.status : err.message, err.response ? err.response.data : '');
  }
}

async function run() {
  // Test with order.date_created.from
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const dateStr = threeDaysAgo.toISOString(); // e.g. 2026-07-10T20:00:00.000Z
  
  await test({ 'order.date_created.from': dateStr });
}

run();
