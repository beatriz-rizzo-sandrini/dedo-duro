const pool = require('./db');

async function checkMySQL() {
  try {
    const [rows] = await pool.query('SELECT MIN(data_venda) as minData, MAX(data_venda) as maxData, COUNT(*) as count FROM silver_vendas');
    console.log('MySQL silver_vendas:');
    console.log(rows[0]);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

checkMySQL();
