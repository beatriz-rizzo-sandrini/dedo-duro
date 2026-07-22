const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🧹 Removendo registros de MELI SP e MELI MG de hoje (14/07) da tabela de produção (silver_estoque)...');
  
  const { data, error } = await supabase
    .from('silver_estoque')
    .delete()
    .eq('data_atualizacao', '14/07')
    .in('local_estoque', ['MELI SP', 'MELI MG']);

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  console.log('✅ Sucesso! Os registros foram apagados da produção.');
}

run();
