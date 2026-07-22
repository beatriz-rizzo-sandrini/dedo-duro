const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Buscando vw_estoque_consolidado...');
  
  const { data: stock, error: stockErr } = await supabase
    .from('vw_estoque_consolidado')
    .select('*')
    .eq('sku_produto', 'SA00SNECK01AAABAF420055')
    .limit(3);
    
  if (stockErr) {
    console.error('❌ Erro:', stockErr.message);
  } else {
    console.log('\n📊 Amostra de vw_estoque_consolidado para SKU SA00SNECK01AAABAF420055:');
    console.log(JSON.stringify(stock, null, 2));
  }
  
  const { data: rawStock, error: rawStockErr } = await supabase
    .from('silver_estoque')
    .select('*')
    .eq('sku_produto', 'SA00SNECK01AAABAF420055')
    .limit(3);
    
  if (rawStockErr) {
    console.error('❌ Erro:', rawStockErr.message);
  } else {
    console.log('\n📦 Amostra de silver_estoque original para SKU SA00SNECK01AAABAF420055:');
    console.log(JSON.stringify(rawStock, null, 2));
  }
}

run().catch(console.error);
