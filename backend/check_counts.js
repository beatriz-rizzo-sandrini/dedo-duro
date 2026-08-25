const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count: countE } = await supabase.from('silver_estoque').select('*', { count: 'exact', head: true });
  console.log('Estoque count:', countE);
  const { count: countR } = await supabase.from('silver_reposicao').select('*', { count: 'exact', head: true });
  console.log('Reposicao count:', countR);
  const { count: countB } = await supabase.from('silver_badstock').select('*', { count: 'exact', head: true });
  console.log('Badstock count:', countB);
}
check();
