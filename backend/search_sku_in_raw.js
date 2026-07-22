const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'scratch', 'item_raw.json'), 'utf8');
const data = JSON.parse(raw);

console.log('Searching for "SKU" in attributes...');
const skuAttrs = data.attributes?.filter(a => a.id.includes('SKU') || a.name.includes('SKU') || a.value_name?.includes('SKU'));
console.log('Main item SKU attributes:', JSON.stringify(skuAttrs, null, 2));

console.log('\nScanning variations for any mention of SKU or codes...');
data.variations.forEach((v, index) => {
  const matchingCombinations = v.attribute_combinations.filter(c => c.id.includes('SKU') || c.name.includes('SKU'));
  if (matchingCombinations.length > 0 || v.seller_custom_field || v.inventory_id) {
    console.log(`Variation ${index} (ID: ${v.id}):`);
    console.log(`  - seller_custom_field: ${v.seller_custom_field}`);
    console.log(`  - inventory_id: ${v.inventory_id}`);
    console.log(`  - user_product_id: ${v.user_product_id}`);
    if (matchingCombinations.length > 0) {
      console.log(`  - matching combinations:`, matchingCombinations);
    }
  }
});
