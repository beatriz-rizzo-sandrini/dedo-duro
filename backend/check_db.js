const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count, error } = await supabase.from('silver_vendas').select('*', { count: 'exact', head: true });
  console.log('Total de registros:', count);
  
  const { data: minData } = await supabase.from('silver_vendas').select('data_venda').order('data_venda', { ascending: true }).limit(1);
  const { data: maxData } = await supabase.from('silver_vendas').select('data_venda').order('data_venda', { ascending: false }).limit(1);
  
  console.log('Primeira venda no banco:', minData ? minData[0] : 'Nenhuma');
  console.log('Última venda no banco:', maxData ? maxData[0] : 'Nenhuma');
}

check();
