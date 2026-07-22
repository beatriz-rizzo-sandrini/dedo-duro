const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('./db');

const EXCEL_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', 'Produtos Senior_padronizado_v5.xlsx');

async function run() {
  console.log('🚀 Iniciando script de atualização de descrições APENAS para o MySQL LOCAL...');

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Arquivo Excel não encontrado em: ${EXCEL_PATH}`);
    process.exit(1);
  }

  // 1. Ler o arquivo Excel e montar o mapa SKU -> Descrição Padronizada
  console.log(`📖 Carregando planilha local: ${EXCEL_PATH}...`);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const skuMap = {};
  
  let skuColName = null;
  let descColName = null;

  if (rows.length > 0) {
    const sample = rows[0];
    for (const key of Object.keys(sample)) {
      const cleanKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cleanKey.includes('cdigo do produto') || cleanKey.includes('codigo do produto') || cleanKey === 'sku') {
        skuColName = key;
      }
      if (cleanKey === 'descricao_padronizada') {
        descColName = key;
      }
    }
  }

  if (!skuColName || !descColName) {
    console.error('❌ Não foi possível mapear as colunas SKU ou descricao_padronizada no Excel.');
    process.exit(1);
  }

  console.log(`🔎 Mapeando SKU via coluna: "${skuColName}" e Descrição via coluna: "${descColName}"`);

  let loadedCount = 0;
  for (const row of rows) {
    const sku = String(row[skuColName] || '').trim();
    const desc = String(row[descColName] || '').trim();
    if (sku && desc) {
      skuMap[sku] = desc;
      loadedCount++;
    }
  }

  console.log(`✅ Mapa criado com ${loadedCount} SKUs padronizados.`);

  // 2. ATUALIZAR MYSQL LOCAL
  console.log('\n💻 2. Iniciando atualização no MySQL Local (localhost)...');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let localEstoqueCount = 0;
    let localVendasCount = 0;
    let localReposicaoCount = 0;

    console.log('   🔄 Atualizando tabelas silver_estoque, silver_vendas e silver_reposicao locais...');
    for (const [sku, desc] of Object.entries(skuMap)) {
      const [resEstoque] = await connection.query(
        'UPDATE silver_estoque SET descricao_produto = ? WHERE sku_produto = ? AND (descricao_produto IS NULL OR descricao_produto != ?)',
        [desc, sku, desc]
      );
      localEstoqueCount += resEstoque.affectedRows;

      const [resVendas] = await connection.query(
        'UPDATE silver_vendas SET descricao_produto = ? WHERE sku_produto = ? AND (descricao_produto IS NULL OR descricao_produto != ?)',
        [desc, sku, desc]
      );
      localVendasCount += resVendas.affectedRows;

      const [resReposicao] = await connection.query(
        'UPDATE silver_reposicao SET descricao_produto = ? WHERE sku_produto = ? AND (descricao_produto IS NULL OR descricao_produto != ?)',
        [desc, sku, desc]
      );
      localReposicaoCount += resReposicao.affectedRows;
    }

    await connection.commit();
    console.log(`\n🎉 MySQL LOCAL Atualizado com Sucesso!`);
    console.log(`   ├ silver_estoque: ${localEstoqueCount} linhas modificadas`);
    console.log(`   ├ silver_vendas: ${localVendasCount} linhas modificadas`);
    console.log(`   └ silver_reposicao: ${localReposicaoCount} linhas modificadas`);

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao atualizar MySQL local:', err.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
