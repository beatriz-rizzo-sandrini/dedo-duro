const mysql = require('mysql2/promise');
const { parseProductDescription } = require('../src/utils/productParser.js');
require('dotenv').config();

const skus = [
  'FL001355005AAAECS391795',
  'FL001355005AAAECS351791',
  'FL001355005AAAECS361792',
  'FL001355005AAAECS371793',
  'FL001355005AAAECS381794',
  'FL001355005AAAECS401796'
];

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dedo_duro'
  });

  console.log('🔍 Fetching all records for the Fila SKUs from silver_estoque and silver_vendas to analyze parsed results...');

  for (const table of ['silver_estoque', 'silver_vendas']) {
    console.log(`\n================ TABLE: ${table} ================`);
    const skuField = 'sku_produto';
    const descField = 'descricao_produto';
    const localField = table === 'silver_estoque' ? 'local_estoque' : 'local_venda';

    const [rows] = await connection.execute(
      `SELECT DISTINCT ${skuField}, ${descField}, ${localField} FROM ${table} WHERE ${skuField} IN (${skus.map(() => '?').join(',')})`,
      skus
    );

    for (const r of rows) {
      const sku = r[skuField];
      const desc = r[descField];
      const local = r[localField];
      const parsed = parseProductDescription(desc, sku, local.includes('BUY CLOCK'));
      console.log(`SKU: "${sku}" | Local: "${local}"`);
      console.log(`  Desc Original: "${desc}"`);
      console.log(`  BaseTitle:     "${parsed.baseTitle}"`);
      console.log(`  Color:         "${parsed.color}"`);
      console.log(`  Size:          "${parsed.size}"`);
      console.log(`  Formatted:     "${parsed.descricaoFormatada}"`);
      console.log(`  Key:           "${parsed.baseTitle}|${local}"`);
      console.log('----------------------------------------------------');
    }
  }

  await connection.end();
}

run().catch(console.error);
