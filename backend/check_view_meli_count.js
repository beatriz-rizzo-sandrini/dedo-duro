const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { count, error } = await supabase
    .from('vw_estoque_consolidado')
    .select('*', { count: 'exact', head: true })
    .eq('data_atualizacao', '14/07')
    .eq('local_estoque', 'MELI SP');

  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.log(`📊 Registros de MELI SP na VIEW para 14/07: ${count}`);
  }
}

run();
