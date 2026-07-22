const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetDate = '2026-07-14';
  console.log(`🧹 Removendo vendas de hoje (${targetDate}) da tabela de produção (silver_vendas)...`);
  
  const { data, error } = await supabase
    .from('silver_vendas')
    .delete()
    .eq('data_venda', targetDate);

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  console.log('✅ Sucesso! As vendas de hoje foram removidas da produção.');
}

run();
