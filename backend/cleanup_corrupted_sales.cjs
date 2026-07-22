const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🧹 Cleaning up corrupted sales records from 2026-06-17 in Supabase silver_vendas...');
  
  const { data, error } = await supabase
    .from('silver_vendas')
    .delete()
    .eq('data_venda', '2026-06-17');
    
  if (error) {
    console.error('❌ Error during deletion:', error.message);
  } else {
    console.log('✅ Corrupted sales records for 2026-06-17 have been completely deleted!');
  }
}

run();
