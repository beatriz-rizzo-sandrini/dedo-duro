const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CREDENTIALS_PATH = path.join(__dirname, 'meli_credentials.json');

async function run() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const accessToken = credentials.access_token;

  try {
    const res = await axios.get('https://api.mercadolibre.com/items/MLB3768353737', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const item = res.data;
    console.log('ITEM DETAILS FOR MLB3768353737:');
    console.log(`Title: ${item.title}`);
    console.log(`Item SKU (seller_custom_field): ${item.seller_custom_field}`);
    console.log(`Available Qty: ${item.available_quantity}`);
    console.log(`Variations count: ${item.variations.length}`);
    
    item.variations.forEach(v => {
      const sizeAttr = v.attribute_combinations.find(a => a.id === 'SIZE');
      const colorAttr = v.attribute_combinations.find(a => a.id === 'COLOR');
      console.log(`- Variation ID: ${v.id} | Qty: ${v.available_quantity} | SKU: ${v.seller_custom_field} | Size: ${sizeAttr ? sizeAttr.value_name : '?'} | Color: ${colorAttr ? colorAttr.value_name : '?'}`);
    });
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
