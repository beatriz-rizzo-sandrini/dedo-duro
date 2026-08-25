const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const skus = [
  'FL01TR00108AABP',
  'KSA12000002350AA0P'
];

async function run() {
  console.log('🔍 Checking SKUs in Supabase silver_mapeamento_sku...');

  for (const sku of skus) {
    console.log(`\n================ SKU: ${sku} ================`);
    
    // Check in silver_mapeamento_sku
    const { data: map, error: mapErr } = await supabase
      .from('silver_mapeamento_sku')
      .select('*')
      .ilike('sku_plataforma', `%${sku}%`);

    if (mapErr) console.error('Mapping error:', mapErr.message);
    else console.log(`Supabase Mapping (${map.length} rows):`, map);
  }
}

run().catch(console.error);
