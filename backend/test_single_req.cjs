const axios = require('axios');
const fs = require('fs');
const path = require('path');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'meli_credentials.json'), 'utf8'));

async function run() {
  console.log('Testing a single request to Mercado Livre...');
  try {
    const res = await axios.get('https://api.mercadolibre.com/orders/search', {
      headers: {
        Authorization: `Bearer ${credentials.access_token}`
      },
      params: {
        seller: credentials.seller_id,
        limit: 1
      }
    });
    console.log('✅ Success! Single request returned 200 OK.', res.data.paging);
  } catch (err) {
    console.error('❌ Failed:', err.response?.status, err.response?.data || err.message);
  }
}

run();
