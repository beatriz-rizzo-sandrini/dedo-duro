const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('silver_vendas')
    .select('id, data_venda, local_venda, sku_produto, quantidade_vendida')
    .eq('local_venda', 'MELI SP')
    .eq('data_venda', '2026-06-01');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`📊 TOTAL MELI SP ROWS FOR TODAY (2026-06-01): ${data.length}`);
  const sum = data.reduce((acc, row) => acc + Number(row.quantidade_vendida), 0);
  console.log(`📊 TOTAL QUANTITY SOLD TODAY: ${sum}`);
}

run();
