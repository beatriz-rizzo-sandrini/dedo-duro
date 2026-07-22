const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scratch', 'item_raw.json'), 'utf8'));

console.log('Main item keys:', Object.keys(data));
if (data.variations && data.variations.length > 0) {
  const v = data.variations[0];
  console.log('\nVariation keys:', Object.keys(v));
  console.log('\nVariation attributes property:', v.attributes);
  console.log('\nVariation attribute_combinations:', JSON.stringify(v.attribute_combinations, null, 2));
} else {
  console.log('No variations found in this item.');
}
