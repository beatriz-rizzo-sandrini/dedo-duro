const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('marca, quantidade_disponivel')
    .eq('local_estoque', 'MELI SP')
    .eq('data_atualizacao', '01/06/2026');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const brands = {};
  for (const row of data) {
    const brand = row.marca;
    brands[brand] = (brands[brand] || 0) + Number(row.quantidade_disponivel);
  }

  console.log('Stock Brands and Quantities in Supabase for MELI SP today:');
  console.log(brands);
}

run();
