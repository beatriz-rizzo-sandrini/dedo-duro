const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CREDENTIALS_PATH = path.join(__dirname, 'meli_credentials.json');

async function run() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const accessToken = credentials.access_token;
  const sellerId = credentials.seller_id || '427063369';

  try {
    const res = await axios.get(`https://api.mercadolibre.com/users/${sellerId}/items/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { status: 'active', limit: 20 }
    });

    const itemIds = res.data.results || [];
    if (itemIds.length === 0) return;

    const multigetRes = await axios.get('https://api.mercadolibre.com/items', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { ids: itemIds.join(',') }
    });

    multigetRes.data.forEach(itemObj => {
      const item = itemObj.body;
      const brandAttr = item.attributes ? item.attributes.find(a => a.id === 'BRAND') : null;
      console.log(`- ID: ${item.id} | Title: ${item.title} | Brand ID: ${brandAttr ? brandAttr.id : 'N/A'} | Brand Val: ${brandAttr ? brandAttr.value_name : 'N/A'}`);
    });
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
