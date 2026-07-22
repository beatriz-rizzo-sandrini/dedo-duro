const pool = require('./db');

async function run() {
  const connection = await pool.getConnection();
  try {
    const targetSkus = ['KMS0400017051KAA0G0007', 'KMS0400017051KCM0G0011', 'KMS0400017051KCM0M0010'];
    console.log('Querying samples from local MySQL...');
    
    for (const sku of targetSkus) {
      const [rows] = await connection.query('SELECT sku_produto, descricao_produto FROM silver_vendas WHERE sku_produto = ? LIMIT 1', [sku]);
      if (rows.length > 0) {
        console.log(`SKU: ${sku} | Desc: "${rows[0].descricao_produto}"`);
      } else {
        console.log(`SKU: ${sku} | Not found in silver_vendas`);
      }
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch(console.error);
