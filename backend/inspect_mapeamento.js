const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Querying silver_mapeamento_sku for RISE UP...');
  const { data: mappings, error: mapErr } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .ilike('descricao_oficial', '%Rise Up%');

  if (mapErr) {
    console.error('Error:', mapErr);
  } else {
    console.log(`Found ${mappings.length} mappings:`);
    console.log(JSON.stringify(mappings.slice(0, 5), null, 2));
  }

  console.log('\nQuerying silver_vendas for RISE UP...');
  const { data: sales, error: salesErr } = await supabase
    .from('silver_vendas')
    .select('*')
    .ilike('descricao_produto', '%Rise Up%')
    .limit(5);

  if (salesErr) {
    console.error('Error:', salesErr);
  } else {
    console.log(`Found sales sample:`);
    console.log(JSON.stringify(sales, null, 2));
  }
}

inspect().catch(console.error);
