const xlsx = require('xlsx');

const file = 'C:\\Users\\beatriz.rizzo\\Downloads\\vendas_live_agosto.xlsx';
try {
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Linha 2:', data[2]);
} catch (e) {
  console.error(e);
}
