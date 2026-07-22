const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetSku = 'KSA08000002350CM0G0234';
  console.log(`Checking SKU "${targetSku}" in silver_estoque...`);
  const { data, error } = await supabase
    .from('vw_estoque_consolidado')
    .select('*')
    .eq('sku_produto', targetSku);

  if (error) {
    console.error(error);
  } else {
    console.log('Results in DB:', data);
  }
}

run();
