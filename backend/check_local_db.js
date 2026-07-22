const pool = require('./db');

async function checkDb() {
  try {
    const [tables] = await pool.query("SHOW TABLES");
    console.log("MySQL Connection Successful!");
    console.log("Tables in database:", tables.map(t => Object.values(t)[0]));
    
    // Check row count in silver_estoque and silver_vendas
    try {
      const [[{ count: estoqueCount }]] = await pool.query("SELECT COUNT(*) as count FROM silver_estoque");
      console.log("Rows in silver_estoque:", estoqueCount);
      if (estoqueCount > 0) {
        const [samples] = await pool.query("SELECT sku_produto, descricao_produto FROM silver_estoque LIMIT 5");
        console.log("Samples from silver_estoque:", samples);
      }
    } catch (e) {
      console.log("Could not query silver_estoque:", e.message);
    }
    
  } catch (err) {
    console.error("MySQL Connection Failed:", err.message);
  } finally {
    await pool.end();
  }
}

checkDb();
