const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: allDates, error } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao')
    .order('data_atualizacao', { ascending: false })
    .limit(5000);

  const unique = [...new Set((allDates || []).map(r => r.data_atualizacao))];
  console.log('Unique data_atualizacao from silver_estoque:', unique);

  // Let's check distinct dates in silver_estoque via RPC or query
  const { count } = await supabase.from('silver_estoque').select('*', { count: 'exact', head: true });
  console.log('Total rows in silver_estoque:', count);
}

run();
