const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('silver_mapeamento_sku')
    .select('sku_plataforma, sku_senior, descricao_oficial, plataforma')
    .ilike('descricao_oficial', '%Kit 4 Camisetas Dry%')
    .eq('plataforma', 'MELI MG');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('MELI MG mappings for Kit 4 Camisetas Dry:');
  console.log(data);
}

run();
