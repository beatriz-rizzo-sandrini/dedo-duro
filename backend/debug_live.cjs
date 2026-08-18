pf, ajuste pra q todos os relatorios resumios / simplifcados exportados do dedo duro, deve aparecer a coluna de plataforma.

ajuste de todas as paginas pf e ja suba pra prodconst xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:\\Users\\beatriz.rizzo\\Downloads';
const files = fs.readdirSync(downloadsDir).filter(f => f.toLowerCase().includes('live') && f.endsWith('.xlsx'));

if (files.length === 0) {
  console.log("Nenhum arquivo de Live encontrado.");
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
