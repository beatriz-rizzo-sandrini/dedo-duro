const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Querying silver_mapeamento_sku where sku_plataforma matches the specific SKU...');
  const { data: mappings, error: mapErr } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .ilike('sku_plataforma', '%SA025132197AABPCN%');

  if (mapErr) {
    console.error('Error:', mapErr);
  } else {
    console.log(`Found ${mappings.length} mappings:`);
    mappings.forEach(m => {
      console.log(`  [${m.plataforma}] ${m.sku_plataforma} -> Senior: ${m.sku_senior} | Oficial: "${m.descricao_oficial}"`);
    });
  }
}

inspect().catch(console.error);
