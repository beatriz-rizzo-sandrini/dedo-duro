const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:\\Users\\beatriz.rizzo\\Downloads';
const files = fs.readdirSync(downloadsDir).filter(f => f.includes('Transaction_Analysis_Creator') && f.endsWith('.xlsx'));

if (files.length === 0) {
  console.log("Creator file not found");
  process.exit(0);
}

const file = path.join(downloadsDir, files[0]);
const workbook = xlsx.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
let headerIndex = -1;
for (let i = 0; i < Math.min(10, rawData.length); i++) {
  const row = rawData[i];
  if (row && row.some(cell => {
    if (typeof cell !== 'string') return false;
    const s = cell.toLowerCase();
    return s.includes('username') || s.includes('nome de usuário') || s.includes('criador') || s.includes('creator') || s.includes('gmv');
  })) {
    headerIndex = i;
    break;
  }
}

console.log("Header Index Creator:", headerIndex);
if (headerIndex !== -1) {
  console.log("Headers reais:", rawData[headerIndex]);
}

const vfiles = fs.readdirSync(downloadsDir).filter(f => f.includes('Transaction_Analysis_Video') && f.endsWith('.xlsx'));
if (vfiles.length > 0) {
  const vfile = path.join(downloadsDir, vfiles[0]);
  const vwb = xlsx.readFile(vfile);
  const vsh = vwb.Sheets[vwb.SheetNames[0]];
  const vraw = xlsx.utils.sheet_to_json(vsh, { header: 1 });
  let vhi = -1;
  for (let i = 0; i < Math.min(10, vraw.length); i++) {
    if (vraw[i] && vraw[i].some(cell => typeof cell === 'string' && cell.toLowerCase().includes('título do vídeo'))) {
      vhi = i; break;
    }
  }
  console.log("Header Index Video:", vhi);
  if (vhi !== -1) {
    console.log("Video Headers reais:", vraw[vhi]);
  }
}
