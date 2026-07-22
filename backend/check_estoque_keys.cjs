const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('sku_produto, quantidade_disponivel, local_estoque')
    .ilike('sku_produto', '%K10CBL%')
    .eq('local_estoque', 'MELI SP');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Stock records in Supabase for K10CBL in MELI SP:');
  console.log(data);
}

run();
