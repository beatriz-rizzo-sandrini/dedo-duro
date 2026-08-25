const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hpisoqyionulahtqfwsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo'
);

async function checkView() {
  const { data, error } = await supabase.from('vw_vendas_consolidadas').select('data_venda').order('data_venda', { ascending: true }).limit(1);
  const { data: data2 } = await supabase.from('vw_vendas_consolidadas').select('data_venda').order('data_venda', { ascending: false }).limit(1);
  const { count } = await supabase.from('vw_vendas_consolidadas').select('*', { count: 'exact', head: true });
  
  console.log('Count na view:', count);
  console.log('Min date:', data ? data[0] : null);
  console.log('Max date:', data2 ? data2[0] : null);
}

checkView();
