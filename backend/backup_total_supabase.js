require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'silver_vendas',
  'silver_estoque',
  'silver_reposicao',
  'silver_badstock',
  'silver_mapeamento_sku',
  'bronze_vendas',
  'bronze_estoque',
  'bronze_caminho',
  'bronze_badstock'
];

async function fetchTableData(tableName) {
  let data = [];
  let start = 0;
  const limit = 1000;

  while (true) {
    const { data: page, error } = await supabase
      .from(tableName)
      .select('*')
      .range(start, start + limit - 1);

    if (error) {
      if (tableName.startsWith('bronze') && error.message.includes('does not exist')) {
        return null;
      }
      throw error;
    }

    if (!page || page.length === 0) break;

    data = data.concat(page);
    if (page.length < limit) break;
    start += limit;
  }

  return data;
}

async function runBackup() {
  console.log('Iniciando backup total do Supabase...');
  const backup = {};

  for (const table of TABLES) {
    try {
      const data = await fetchTableData(table);
      if (data) {
        backup[table] = data;
        console.log(`- ${table}: ${data.length} registros exportados.`);
      }
    } catch (err) {
      console.error(`Erro ao obter dados da tabela ${table}:`, err.message);
      process.exit(1);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_total_supabase_${timestamp}.json`;
  const destPath = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', filename);

  fs.writeFileSync(destPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`Backup concluído com sucesso! Salvo em: ${destPath}`);
}

runBackup().catch(console.error);
