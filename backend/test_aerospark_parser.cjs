const fs = require('fs');
const path = require('path');

// Test how 1841 SKUs are parsed
const catalogPath = path.join(__dirname, '..', 'src', 'utils', 'seniorCatalog.json');
const seniorCatalog = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : {};

const testSkus = [
  { sku: 'SA001841034AAAVCN401034', desc: 'Tenis Sandrini Preto/Laranja' },
  { sku: 'SA001841412AJADCN440767', desc: 'TENIS SANDRINI MASCULINO 1841412 VERDE/MARINHO TAM. 44' },
  { sku: 'SA001841408ABAEAV440776', desc: 'TENIS SANDRINI MASCULINO 1841408 BRANCO/CINZA/LARANJA/AMARELO TAM. 44' },
  { sku: 'SA000001841AEAJCN441385', desc: 'Tênis Sandrini Aero Spark (1841) CZ/VD' },
  { sku: 'SA000001841BYAYCN361363', desc: 'Tênis Sandrini Aero Spark (1841) OFW/CAR' },
  { sku: 'SA000001841BPAVCN401388', desc: 'Tênis Sandrini Aero Spark (1841) GRF/LRJ' }
];

for (const item of testSkus) {
  const cat = seniorCatalog[item.sku];
  console.log('SKU:', item.sku);
  console.log('  Sheet Desc:', item.desc);
  console.log('  Senior Catalog Desc:', cat?.descricao_oficial || 'NÃO ENCONTRADO');
  console.log('  Senior Brand:', cat?.nomMar || 'NÃO ENCONTRADO');
  console.log('--------------------------------------------------');
}
