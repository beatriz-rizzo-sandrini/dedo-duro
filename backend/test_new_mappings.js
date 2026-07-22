const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying new mapping for CAMISETADRY2350CPTOTM | MELI MG in Supabase...');

  const { data, error } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .eq('sku_plataforma', 'CAMISETADRY2350CPTOTM')
    .eq('plataforma', 'MELI MG');

  if (error) {
    console.error('Error querying mapping:', error);
    return;
  }

  console.log('Resulting Mappings:', data);
  
  // Let's also check for a Lupo SKU mappings in MELI MG
  const { data: lupoData } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .ilike('descricao_oficial', '%Lupo%')
    .eq('plataforma', 'MELI MG')
    .limit(5);
  console.log('Sample Lupo Mappings in MELI MG:', lupoData);
}

check().catch(console.error);
