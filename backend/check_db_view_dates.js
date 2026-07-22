const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Fetching unique dates and counts from vw_estoque_consolidado...');
  try {
    let allDates = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('vw_estoque_consolidado')
        .select('data_atualizacao')
        .range(from, from + limit - 1);
        
      if (error) {
        console.error(error);
        return;
      }
      
      if (!data || data.length === 0) break;
      
      data.forEach(r => {
        allDates.push(r.data_atualizacao);
      });
      
      hasMore = data.length === limit;
      from += limit;
      
      // Stop after 5 pages to keep it fast
      if (from >= 5000) break;
    }
    
    console.log(`Total rows fetched: ${allDates.length}`);
    const counts = {};
    allDates.forEach(d => {
      const key = d === null ? 'NULL' : d;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    console.log('\nDate distribution in vw_estoque_consolidado (first 5000 rows):');
    console.log(counts);
    
  } catch (err) {
    console.error(err);
  }
}

run();
