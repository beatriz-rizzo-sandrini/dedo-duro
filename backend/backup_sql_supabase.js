require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_CONFIG = {
  silver_vendas: [
    'id', 'data_venda', 'local_venda', 'sku_produto', 'descricao_produto', 'marca', 'quantidade_vendida'
  ],
  silver_estoque: [
    'id', 'data_atualizacao', 'sku_produto', 'descricao_produto', 'marca', 'local_estoque', 'quantidade_disponivel', 'valor_unitario'
  ],
  silver_reposicao: [
    'id', 'sku_produto', 'descricao_produto', 'local_destino', 'quantidade_enviada', 'status_envio', 'previsao_chegada', 'numero_nota_fiscal'
  ],
  silver_badstock: [
    'id', 'sku_produto', 'local_badstock'
  ],
  silver_mapeamento_sku: [
    'id', 'sku_plataforma', 'plataforma', 'sku_senior', 'descricao_oficial', 'marca_oficial'
  ]
};

function formatSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  const escaped = val.toString().replace(/'/g, "''");
  return `'${escaped}'`;
}

async function fetchTableData(tableName, fields) {
  let data = [];
  let start = 0;
  const limit = 1000;

  while (true) {
    const { data: page, error } = await supabase
      .from(tableName)
      .select(fields.join(','))
      .range(start, start + limit - 1);

    if (error) {
      throw error;
    }

    if (!page || page.length === 0) break;

    data = data.concat(page);
    if (page.length < limit) break;
    start += limit;
  }

  return data;
}

async function runSqlBackup() {
  console.log('Iniciando backup em formato SQL com Estrutura e Dados...');
  
  let sqlContent = `-- Backup do banco Supabase (Estrutura + Dados)\n`;
  sqlContent += `-- Data: ${new Date().toISOString()}\n\n`;
  
  sqlContent += `-- ==========================================\n`;
  sqlContent += `-- 1. CRIAÇÃO DAS TABELAS\n`;
  sqlContent += `-- ==========================================\n\n`;

  sqlContent += `CREATE TABLE IF NOT EXISTS silver_vendas (
    id SERIAL PRIMARY KEY,
    data_venda DATE NOT NULL,
    local_venda VARCHAR(255) NOT NULL,
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    marca VARCHAR(255),
    quantidade_vendida NUMERIC(10, 2) DEFAULT 0,
    CONSTRAINT uk_venda_diaria UNIQUE (data_venda, local_venda, sku_produto)
  );\n\n`;

  sqlContent += `CREATE TABLE IF NOT EXISTS silver_estoque (
    id SERIAL PRIMARY KEY,
    data_atualizacao VARCHAR(50),
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    marca VARCHAR(255),
    local_estoque VARCHAR(255) NOT NULL,
    quantidade_disponivel NUMERIC(10, 2) DEFAULT 0,
    valor_unitario NUMERIC(10, 2) DEFAULT 0
  );\n\n`;

  sqlContent += `CREATE TABLE IF NOT EXISTS silver_reposicao (
    id SERIAL PRIMARY KEY,
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    local_destino VARCHAR(255) NOT NULL,
    quantidade_enviada NUMERIC(10, 2) DEFAULT 0,
    status_envio VARCHAR(100),
    previsao_chegada VARCHAR(100),
    numero_nota_fiscal VARCHAR(100),
    CONSTRAINT uk_reposicao_sku_envio UNIQUE (sku_produto, numero_nota_fiscal, local_destino)
  );\n\n`;

  sqlContent += `CREATE TABLE IF NOT EXISTS silver_badstock (
    id SERIAL PRIMARY KEY,
    sku_produto VARCHAR(255) NOT NULL,
    local_badstock VARCHAR(255) NOT NULL,
    CONSTRAINT uk_badstock UNIQUE (sku_produto, local_badstock)
  );\n\n`;

  sqlContent += `CREATE TABLE IF NOT EXISTS silver_mapeamento_sku (
    id SERIAL PRIMARY KEY,
    sku_plataforma VARCHAR(255) NOT NULL,
    plataforma VARCHAR(255) NOT NULL,
    sku_senior VARCHAR(255) NOT NULL,
    descricao_oficial VARCHAR(255),
    marca_oficial VARCHAR(255),
    CONSTRAINT uk_mapeamento UNIQUE (sku_plataforma, plataforma)
  );\n\n`;

  sqlContent += `SET session_replication_role = 'replica';\n\n`;

  try {
    for (const [table, fields] of Object.entries(TABLES_CONFIG)) {
      const records = await fetchTableData(table, fields);
      console.log(`- ${table}: ${records.length} registros exportados.`);

      sqlContent += `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;\n\n`;

      if (records.length > 0) {
        const batchSize = 200;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          sqlContent += `INSERT INTO ${table} (${fields.join(', ')}) VALUES\n`;
          
          const rows = batch.map(row => {
            const values = fields.map(f => formatSqlValue(row[f]));
            return `(${values.join(', ')})`;
          });

          sqlContent += rows.join(',\n') + ';\n\n';
        }
      }
      sqlContent += '\n';
    }

    sqlContent += `-- ==========================================\n`;
    sqlContent += `-- 2. CRIAÇÃO DAS VIEWS\n`;
    sqlContent += `-- ==========================================\n\n`;

    sqlContent += `CREATE OR REPLACE VIEW vw_estoque_consolidado AS
SELECT e.id,
       e.data_atualizacao, 
       e.sku_produto as sku_plataforma,
       COALESCE(m.sku_senior, e.sku_produto) as sku_produto, 
       COALESCE(m.descricao_oficial, e.descricao_produto) as descricao_produto, 
       e.local_estoque, 
       e.quantidade_disponivel, 
       e.valor_unitario,
       COALESCE(m.marca_oficial, e.marca) as marca,
       e.sku_produto as sku_original_plataforma
FROM silver_estoque e
LEFT JOIN silver_mapeamento_sku m ON e.sku_produto = m.sku_plataforma AND e.local_estoque = m.plataforma;\n\n`;

    sqlContent += `CREATE OR REPLACE VIEW vw_vendas_consolidadas AS
SELECT v.id,
       v.data_venda, 
       v.sku_produto as sku_plataforma,
       COALESCE(m.sku_senior, v.sku_produto) as sku_produto, 
       COALESCE(m.descricao_oficial, v.descricao_produto) as descricao_produto, 
       v.local_venda, 
       v.quantidade_vendida,
       COALESCE(m.marca_oficial, v.marca) as marca,
       v.sku_produto as sku_original_plataforma
FROM silver_vendas v
LEFT JOIN silver_mapeamento_sku m ON v.sku_produto = m.sku_plataforma AND v.local_venda = m.plataforma;\n\n`;

    sqlContent += `SET session_replication_role = 'origin';\n`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_completo_supabase_${timestamp}.sql`;
    const destPath = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', filename);

    fs.writeFileSync(destPath, sqlContent, 'utf-8');
    console.log(`Backup completo (Estrutura + Dados) concluído com sucesso! Salvo em: ${destPath}`);

  } catch (err) {
    console.error('Erro ao gerar o backup SQL:', err.message);
    process.exit(1);
  }
}

runSqlBackup().catch(console.error);
