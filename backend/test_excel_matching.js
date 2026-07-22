const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('./db');

const EXCEL_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', 'Produtos Senior_padronizado_v5.xlsx');

async function run() {
  console.log('📖 Carregando planilha:', EXCEL_PATH);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  console.log('Total rows in Excel:', rows.length);
  if (rows.length === 0) return;
  
  // Imprime cabeçalhos e as primeiras 5 linhas
  console.log('Columns in Excel:', Object.keys(rows[0]));
  console.log('Sample rows in Excel:');
  console.log(rows.slice(0, 5));
  
  // Buscar SKUs no MySQL para ver se coincidem com algum do Excel
  const connection = await pool.getConnection();
  try {
    const [vendasRows] = await connection.query('SELECT DISTINCT sku_produto FROM silver_vendas LIMIT 20');
    console.log('\n20 SKUs das Vendas no MySQL:');
    console.log(vendasRows.map(r => r.sku_produto));

    // Mapear coluna de SKU
    let skuColName = null;
    const sample = rows[0];
    for (const key of Object.keys(sample)) {
      const cleanKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cleanKey.includes('cdigo do produto') || cleanKey.includes('codigo do produto') || cleanKey === 'sku') {
        skuColName = key;
      }
    }
    
    if (skuColName) {
      console.log(`\nColuna SKU detectada no Excel: "${skuColName}"`);
      const excelSkus = new Set(rows.map(r => String(r[skuColName]).trim()));
      console.log('Quantidade de SKUs únicos no Excel:', excelSkus.size);
      
      const [allVendasRows] = await connection.query('SELECT DISTINCT sku_produto FROM silver_vendas');
      const matched = [];
      const notMatched = [];
      
      for (const r of allVendasRows) {
        const sku = r.sku_produto;
        if (excelSkus.has(sku)) {
          matched.push(sku);
        } else {
          notMatched.push(sku);
        }
      }
      
      console.log(`Matching Results:`);
      console.log(`- Matched: ${matched.length} SKUs`);
      console.log(`- Not Matched: ${notMatched.length} SKUs`);
      
      if (matched.length > 0) {
        console.log('Exemplos que bateram (Matched):', matched.slice(0, 10));
      }
      if (notMatched.length > 0) {
        console.log('Exemplos que NÃO bateram (Not Matched):', notMatched.slice(0, 10));
        
        // Vamos ver se o SKU do Excel é um substring ou se conseguimos achar um padrão de correspondência!
        console.log('\nTentando correspondência por substring...');
        const excelSkusArray = Array.from(excelSkus);
        let substringMatchesCount = 0;
        for (const notMatchedSku of notMatched.slice(0, 5)) {
          const matchingExcelSkus = excelSkusArray.filter(es => notMatchedSku.includes(es) || es.includes(notMatchedSku));
          if (matchingExcelSkus.length > 0) {
            console.log(`SKU MySQL "${notMatchedSku}" combina com SKUs Excel:`, matchingExcelSkus);
            substringMatchesCount++;
          }
        }
      }
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch(console.error);
