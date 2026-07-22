const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('silver_mapeamento_sku')
    .select('sku_plataforma, plataforma, sku_senior, descricao_oficial')
    .neq('descricao_oficial', null)
    .limit(40);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample Mappings:');
  data.forEach(m => {
    console.log(`  - SKU: ${m.sku_plataforma.padEnd(25)} | Oficial: "${m.descricao_oficial}"`);
  });
}

check().catch(console.error);
