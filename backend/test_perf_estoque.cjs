const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPerformance() {
  console.time('silver_estoque latest date');
  const { data: d1, error: e1 } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao')
    .order('id', { ascending: false })
    .limit(1);
  console.timeEnd('silver_estoque latest date');
  console.log('Result 1 (table):', d1, e1);

  console.time('vw_estoque_consolidado latest date');
  const { data: d2, error: e2 } = await supabase
    .from('vw_estoque_consolidado')
    .select('data_atualizacao')
    .order('id', { ascending: false })
    .limit(1);
  console.timeEnd('vw_estoque_consolidado latest date');
  console.log('Result 2 (view):', d2, e2);
}

testPerformance();
