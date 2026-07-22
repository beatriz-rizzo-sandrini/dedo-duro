const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('silver_vendas')
    .select('data_venda, quantidade_vendida');

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total rows in silver_vendas: ${data.length}`);
  const grouped = {};
  let totalQty = 0;
  data.forEach(item => {
    const d = item.data_venda;
    const q = item.quantidade_vendida || 0;
    grouped[d] = (grouped[d] || 0) + q;
    totalQty += q;
  });
  
  console.log(`Total quantity in silver_vendas: ${totalQty}`);
  
  const sortedDates = Object.keys(grouped).sort();
  console.log('Unique dates and sales counts:');
  sortedDates.forEach(d => {
    console.log(`  ${d}: ${grouped[d]} (rows: ${data.filter(x => x.data_venda === d).length})`);
  });
}

check().catch(console.error);
