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

    for (const itemObj of multigetRes.data) {
      const item = itemObj.body;
      const itemSku = item.seller_custom_field;
      console.log(`\n📦 Item ID: ${item.id} | Title: ${item.title} | Item SKU: ${itemSku}`);
      if (item.variations && item.variations.length > 0) {
        console.log(`   Variations (${item.variations.length}):`);
        for (const v of item.variations) {
          const sizeAttr = v.attribute_combinations.find(a => a.id === 'SIZE');
          const colorAttr = v.attribute_combinations.find(a => a.id === 'COLOR');
          const sizeVal = sizeAttr ? sizeAttr.value_name : '?';
          const colorVal = colorAttr ? colorAttr.value_name : '?';
          console.log(`     - Var ID: ${v.id} | Qty: ${v.available_quantity} | SKU: ${v.seller_custom_field} | Size: ${sizeVal} | Color: ${colorVal}`);
        }
      } else {
        console.log(`   No variations. Available Qty: ${item.available_quantity}`);
      }
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
