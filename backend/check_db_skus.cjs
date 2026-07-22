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

  console.log('🔍 Checking SKUs in database...');

  for (const sku of skus) {
    console.log(`\n================ SKU: ${sku} ================`);
    
    // Check in silver_estoque
    const [estoqueRows] = await connection.execute(
      'SELECT sku_produto, descricao_produto, local_estoque, quantidade_disponivel, valor_unitario FROM silver_estoque WHERE sku_produto = ?',
      [sku]
    );
    console.log(`Silver Estoque (${estoqueRows.length} rows):`, estoqueRows);

    // Check in silver_vendas
    const [vendasRows] = await connection.execute(
      'SELECT sku_produto, descricao_produto, local_venda, quantidade_vendida FROM silver_vendas WHERE sku_produto = ?',
      [sku]
    );
    console.log(`Silver Vendas (${vendasRows.length} rows):`, vendasRows);

    // Check in bronze_estoque
    const [bronzeEstoqueRows] = await connection.execute(
      'SELECT coluna_sku, coluna_descricao, coluna_local, coluna_quantidade FROM bronze_estoque WHERE coluna_sku = ?',
      [sku]
    );
    console.log(`Bronze Estoque (${bronzeEstoqueRows.length} rows):`, bronzeEstoqueRows);
  }

  await connection.end();
}

run().catch(console.error);
