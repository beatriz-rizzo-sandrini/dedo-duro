const seniorCatalog = require('./src/utils/seniorCatalog.json');

const SKU_COLOR_MAP = {
  "AA": "PTO",
  "0P": "P"
};

const COLOR_ABBR_MAP = {
  "PTO": "PTO"
};

const skuUpper = 'KSA12000002350AA0P0396';
let baseTitle = '#N/A';
let skuColor = '';
let skuSize = '';

const kitSeniorMatch = skuUpper.match(/^K([A-Z]{2})\d{2}/i);
if (kitSeniorMatch && (skuUpper.length === 22 || skuUpper.length === 23)) {
  let colorCode = skuUpper.substring(14, 16);
  let sizeCode = skuUpper.substring(16, 18);
  if (SKU_COLOR_MAP[colorCode]) {
    skuColor = SKU_COLOR_MAP[colorCode];
    skuSize = sizeCode;
  }
}

baseTitle = baseTitle.replace(/\s*(?:TAM\.?|Tam:?|tam\.?|tamanho|Tamanho|CORL)\s*(GG|XG|EGG|EG|XXG|XGG|XP|XM|G\d|[GPM]|\d+(?:\/\d+)?)/i, '');
const words = baseTitle.split(/\s+/);
const cleanedWords = words.filter(word => {
  const cleanWord = word.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (COLOR_ABBR_MAP[cleanWord] || Object.values(SKU_COLOR_MAP).includes(cleanWord)) {
    return false;
  }
  return true;
});
baseTitle = cleanedWords.join(' ');

console.log('Result baseTitle:', baseTitle);
console.log('Result color:', skuColor);
console.log('Result size:', skuSize);
