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

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  console.log('\n--- ANALISANDO RELAÇÃO ENTRE SKU E DESCRIÇÃO ---');
  // Let's analyze 30 rows to see if we can find a pattern
  const samples = rows.slice(0, 30);

  samples.forEach((row, idx) => {
    const sku = String(row['Código do Produto'] || '').trim();
    const descPadronizada = String(row['descricao_padronizada'] || '').trim();
    const descOriginal = String(row['descricao_original'] || '').trim();

    // Let's see if we can extract parts from SKU
    // For example: SA00P345N01AAABCN390811
    // P345N01 is the model.
    // AAABCN is the color.
    // 39 is the size.
    // 0811 is wait, what?
    console.log(`\n[${idx + 1}] SKU: "${sku}"`);
    console.log(`   Original:     "${descOriginal}"`);
    console.log(`   Padronizada:  "${descPadronizada}"`);

    // Let's print matched substrings or differences
  });
}

run();
