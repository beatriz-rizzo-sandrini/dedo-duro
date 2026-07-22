const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('silver_vendas')
    .select('data_venda, local_venda, quantidade_vendida')
    .eq('local_venda', 'MELI SP')
    .gte('data_venda', '2026-05-30');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const summary = {};
  for (const row of data) {
    const d = row.data_venda;
    summary[d] = (summary[d] || 0) + Number(row.quantidade_vendida);
  }

  console.log('MELI SP Quantity Sold by Date (2026-05-30 onwards):', summary);
}

run();
