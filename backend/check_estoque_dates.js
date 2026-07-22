const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Buscando datas de silver_estoque no Supabase...');
  try {
    const { data, error } = await supabase
      .from('silver_estoque')
      .select('data_atualizacao');
      
    if (error) {
      console.error(error);
      return;
    }
    
    const uniqueDates = [...new Set(data.map(r => r.data_atualizacao))].sort();
    console.log('Datas únicas de estoque no Supabase:', uniqueDates);
  } catch (err) {
    console.error(err);
  }
}

run();
