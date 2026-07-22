const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', 'Produtos Senior_padronizado_v5.xlsx');

async function run() {
  console.log(`📖 Carregando planilha local: ${EXCEL_PATH}...`);
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Arquivo Excel não encontrado.');
    return;
  }

  const workbook = xlsx.readFile(EXCEL_PATH);
  console.log('Abas disponíveis no Excel:', workbook.SheetNames);

  workbook.SheetNames.forEach(name => {
    console.log(`\n========================================`);
    console.log(`Aba: "${name}"`);
    const sheet = workbook.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet);
    console.log(`Total de linhas na aba: ${rows.length}`);
    if (rows.length > 0) {
      console.log('Colunas detectadas:', Object.keys(rows[0]));
      console.log('Primeiras 3 linhas de amostra:');
      console.log(rows.slice(0, 3));
    }
    console.log(`========================================`);
  });
}

run();
