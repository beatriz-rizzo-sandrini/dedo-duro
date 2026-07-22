const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'C:\\Users\\beatriz.rizzo\\Downloads\\estoque_meli_sp.xlsx';

try {
  console.log(`Lendo planilha: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  const matches = rows.filter(r => {
    const anuncio = String(r['# Anúncio'] || '');
    return anuncio.includes('4128182162');
  });

  console.log(`\nEncontrados ${matches.length} registros para o anúncio 4128182162:`);
  matches.forEach((r, idx) => {
    console.log(`Registro ${idx + 1}:`);
    console.log(`  - SKU na Planilha: "${r['SKU']}"`);
    console.log(`  - Código ML: "${r['Código ML']}"`);
    console.log(`  - Produto: "${r['Produto']}"`);
    console.log(`  - Tamanho: "${r['Tamanho']}"`);
  });

} catch (err) {
  console.error('Erro:', err.message);
}
