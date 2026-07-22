const fs = require('fs');

const catalogPath = 'src/utils/seniorCatalog.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// AD000JP5907ABAAAE410234
catalog['AD000JP5907ABAAAE410234'] = {
  "sku_senior": "AD000JP5907ABAAAE410234",
  "descricao_oficial": "TENIS ADIDAS ULTRARUN 5 TR JP5907 BCO/CZ 41",
  "idePro": null,
  "codRef": null,
  "nomMar": "Adidas",
  "desFam": "Adidas",
  "dthger": new Date().toISOString()
};

// AD000JP5907ABAAAE420235
catalog['AD000JP5907ABAAAE420235'] = {
  "sku_senior": "AD000JP5907ABAAAE420235",
  "descricao_oficial": "TENIS ADIDAS ULTRARUN 5 TR JP5907 BCO/CZ 42",
  "idePro": null,
  "codRef": null,
  "nomMar": "Adidas",
  "desFam": "Adidas",
  "dthger": new Date().toISOString()
};

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
console.log('SKUs da Adidas adicionados com sucesso no padrao: TENIS ADIDAS ULTRARUN 5 TR JP5907 BCO/CZ [TAM]');
