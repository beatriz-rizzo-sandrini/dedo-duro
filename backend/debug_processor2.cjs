const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:\\Users\\beatriz.rizzo\\Downloads';
const vFile = path.join(downloadsDir, 'Transaction_Analysis_Video_List_20260701-20260731.xlsx');

const workbook = xlsx.readFile(vFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log("Total linhas:", rawData.length);

let headerIndex = -1;
for (let i = 0; i < Math.min(10, rawData.length); i++) {
  const row = rawData[i];
  if (row && row.some(cell => typeof cell === 'string' && (cell.includes('Username') || cell.includes('Nome de Usuário') || cell.includes('Product ID') || cell.includes('Video Title') || cell.includes('LIVE Title')))) {
    headerIndex = i;
    break;
  }
}
console.log("headerIndex achado:", headerIndex);

const parsed = xlsx.utils.sheet_to_json(sheet, { 
  range: headerIndex !== -1 ? headerIndex : 0,
  raw: false
});

console.log("parsed.length:", parsed.length);
if (parsed.length > 0) {
  console.log("Primeiro item:", parsed[0]);
}

