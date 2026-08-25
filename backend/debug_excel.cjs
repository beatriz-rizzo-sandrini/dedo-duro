const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const downloadsDir = 'C:\\Users\\beatriz.rizzo\\Downloads';
const files = fs.readdirSync(downloadsDir).filter(f => f.includes('Transaction_Analysis_Video') && f.endsWith('.xlsx'));

if (files.length === 0) {
  console.log("Nenhum arquivo de video encontrado.");
  process.exit(0);
}

const file = path.join(downloadsDir, files[0]);
console.log("Lendo arquivo:", file);

const workbook = xlsx.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

for (let i = 0; i < Math.min(10, rawData.length); i++) {
  console.log(`Linha ${i}:`, rawData[i]);
}

const json = xlsx.utils.sheet_to_json(sheet, { range: 5, raw: false });
if (json.length > 0) {
  console.log("Headers usando range 5:");
  console.log(Object.keys(json[0]));
  console.log("Exemplo da primeira linha de dados:");
  console.log(json[0]);
}
