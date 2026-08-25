const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hpisoqyionulahtqfwsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo'
);

async function checkTotalQtd() {
  let from = 0;
  const PAGE = 1000;
  let hasMore = true;
  let total = 0;
  
  while(hasMore) {
    const { data: rows, error } = await supabase.from('silver_vendas').select('quantidade_vendida').range(from, from + PAGE - 1);
    if (error) {
       console.error(error);
       break;
    }
    if (!rows || rows.length === 0) break;
    rows.forEach(r => { total += (Number(r.quantidade_vendida) || 0) });
    from += PAGE;
    if (rows.length < PAGE) hasMore = false;
  }
  console.log('Total de peças vendidas:', total);
}

checkTotalQtd();
