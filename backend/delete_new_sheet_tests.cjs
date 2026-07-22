const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🧹 Deletando registros com a data inativa de teste '27/05/2026' do Supabase...");
  const { data, error } = await supabase
    .from('silver_estoque')
    .delete()
    .eq('data_atualizacao', '27/05/2026');

  if (error) {
    console.error("Erro ao deletar:", error.message);
  } else {
    console.log("Registros deletados com sucesso!");
  }
}

run();
