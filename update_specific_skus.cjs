const fs = require('fs');
const catalogPath = './src/utils/seniorCatalog.json';
const catalog = require(catalogPath);

catalog['KSA12000002350AA0P0396'] = {
  sku_senior: 'KSA12000002350AA0P0396',
  descricao_oficial: 'Kit 12 Camisas Sandrini Dry Fit (2350) PTO Tam P',
  nomMar: 'Sandrini',
  desFam: 'KITS DE PRODUTOS SANDRINI'
};

catalog['KSA12000002350AA0M0397'] = {
  sku_senior: 'KSA12000002350AA0M0397',
  descricao_oficial: 'Kit 12 Camisas Sandrini Dry Fit (2350) PTO Tam M',
  nomMar: 'Sandrini',
  desFam: 'KITS DE PRODUTOS SANDRINI'
};

catalog['KSA12000002350AA0G0398'] = {
  sku_senior: 'KSA12000002350AA0G0398',
  descricao_oficial: 'Kit 12 Camisas Sandrini Dry Fit (2350) PTO Tam G',
  nomMar: 'Sandrini',
  desFam: 'KITS DE PRODUTOS SANDRINI'
};

catalog['KSA12000002350AAGG0399'] = {
  sku_senior: 'KSA12000002350AAGG0399',
  descricao_oficial: 'Kit 12 Camisas Sandrini Dry Fit (2350) PTO Tam GG',
  nomMar: 'Sandrini',
  desFam: 'KITS DE PRODUTOS SANDRINI'
};

catalog['KSA12000002350CM0G0380'] = {
  sku_senior: 'KSA12000002350CM0G0380',
  descricao_oficial: 'Kit 12 Camisas Sandrini Dry Fit (2350) SORT Tam G',
  nomMar: 'Sandrini',
  desFam: 'KITS DE PRODUTOS SANDRINI'
};

catalog['KSA12000002350CMGG0381'] = {
  sku_senior: 'KSA12000002350CMGG0381',
  descricao_oficial: 'Kit 12 Camisas Sandrini Dry Fit (2350) SORT Tam GG',
  nomMar: 'Sandrini',
  desFam: 'KITS DE PRODUTOS SANDRINI'
};

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('Catalog updated!');
