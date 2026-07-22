const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('local_estoque, quantidade_disponivel')
    .limit(5000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const locations = {};
  for (const row of data) {
    const loc = row.local_estoque;
    locations[loc] = (locations[loc] || 0) + Number(row.quantidade_disponivel);
  }

  console.log('Stock Locations and Total Quantities in Supabase:', locations);
}

run();
