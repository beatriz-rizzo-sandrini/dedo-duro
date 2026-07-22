const pool = require('./db');

async function run() {
  console.log('📡 Lendo silver_mapeamento_sku do MySQL local...');
  try {
    const [rows] = await pool.query(`
      SELECT sku_plataforma, plataforma, sku_senior, descricao_oficial 
      FROM silver_mapeamento_sku 
      LIMIT 10
    `);
    console.log('Mapeamentos locais no MySQL:', rows);
    
    // Let's also check if there are mapped descriptions for some sales SKUs
    const [sales] = await pool.query(`
      SELECT v.sku_produto, v.descricao_produto, m.sku_senior, m.descricao_oficial 
      FROM silver_vendas v
      LEFT JOIN silver_mapeamento_sku m ON v.sku_produto = m.sku_plataforma AND v.local_venda = m.plataforma
      WHERE m.sku_senior IS NOT NULL
      LIMIT 5
    `);
    console.log('\nVendas mapeadas localmente no MySQL:', sales);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
