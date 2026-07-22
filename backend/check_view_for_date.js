const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Checking for 10/07 in vw_estoque_consolidado...');
  const { data, error } = await supabase
    .from('vw_estoque_consolidado')
    .select('data_atualizacao')
    .eq('data_atualizacao', '10/07')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results in vw_estoque_consolidado for 10/07:', data);
}

run();
