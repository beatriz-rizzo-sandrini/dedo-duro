const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Searching for sales on 2026-06-02 in Supabase silver_vendas...');
  
  const { data: sales, error } = await supabase
    .from('silver_vendas')
    .select('*')
    .eq('data_venda', '2026-06-02');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${sales.length} rows on 2026-06-02.`);
  if (sales.length > 0) {
    // Show distribution of locals
    const localCounts = {};
    sales.forEach(r => {
      localCounts[r.local_venda] = (localCounts[r.local_venda] || 0) + 1;
    });
    console.log('Sales distribution by channel/local for 2026-06-02:');
    console.log(localCounts);
    
    console.log('\nSample rows:');
    sales.slice(0, 5).forEach((r, idx) => {
      console.log(`- Local: "${r.local_venda}" | SKU: "${r.sku_produto}" | Qty: ${r.quantidade_vendida} | Desc: "${r.descricao_produto}"`);
    });
  }
}

run();
