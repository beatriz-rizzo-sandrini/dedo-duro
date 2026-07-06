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
  console.log('Iniciando backup em formato SQL...');
  
  let sqlContent = `-- Backup do banco Supabase\n`;
  sqlContent += `-- Data: ${new Date().toISOString()}\n\n`;
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

    sqlContent += `SET session_replication_role = 'origin';\n`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_supabase_${timestamp}.sql`;
    const destPath = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', filename);

    fs.writeFileSync(destPath, sqlContent, 'utf-8');
    console.log(`Backup SQL concluído com sucesso! Salvo em: ${destPath}`);

  } catch (err) {
    console.error('Erro ao gerar o backup SQL:', err.message);
    process.exit(1);
  }
}

runSqlBackup().catch(console.error);
