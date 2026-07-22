const mysql = require('mysql2/promise');
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

  console.log('🔍 Checking SKU Mappings in local MySQL silver_mapeamento_sku...');

  for (const sku of skus) {
    console.log(`\n================ SKU: ${sku} ================`);
    
    // Check in silver_mapeamento_sku
    const [mapRows] = await connection.execute(
      'SELECT * FROM silver_mapeamento_sku WHERE sku_plataforma = ? OR sku_senior = ?',
      [sku, sku]
    );
    console.log(`silver_mapeamento_sku (${mapRows.length} rows):`, mapRows);
  }

  await connection.end();
}

run().catch(console.error);
