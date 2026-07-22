const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Buscando definições das views no Supabase...');
  
  // We can query pg_views catalog using rpc if available, or just inspect how they behave by querying a single sample row!
  // Let's first fetch a few rows from vw_vendas_consolidadas where sku_produto = 'SA00SNECK01AAABAF420055'
  const { data: sales, error: salesErr } = await supabase
    .from('vw_vendas_consolidadas')
    .select('*')
    .eq('sku_produto', 'SA00SNECK01AAABAF420055')
    .limit(3);
    
  if (salesErr) {
    console.error('❌ Erro ao buscar vw_vendas_consolidadas:', salesErr.message);
  } else {
    console.log('\n📊 Amostra de vw_vendas_consolidadas para SKU SA00SNECK01AAABAF420055:');
    console.log(JSON.stringify(sales, null, 2));
  }

  // Let's also check a sample from silver_mapeamento_sku for this SKU
  const { data: maps, error: mapsErr } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .eq('sku_plataforma', 'SA00SNECK01AAABAF420055');

  if (mapsErr) {
    console.error('❌ Erro ao buscar silver_mapeamento_sku:', mapsErr.message);
  } else {
    console.log('\n🗺️  Mapeamentos cadastrados para SKU SA00SNECK01AAABAF420055:');
    console.log(JSON.stringify(maps, null, 2));
  }
  
  // Let's also query some raw sales for this SKU to see what original description they have!
  const { data: rawSales, error: rawErr } = await supabase
    .from('silver_vendas')
    .select('*')
    .eq('sku_produto', 'SA00SNECK01AAABAF420055')
    .limit(3);
    
  if (rawErr) {
    console.error('❌ Erro ao buscar silver_vendas:', rawErr.message);
  } else {
    console.log('\n🛒 Amostra de silver_vendas original para SKU SA00SNECK01AAABAF420055:');
    console.log(JSON.stringify(rawSales, null, 2));
  }
}

run().catch(console.error);
