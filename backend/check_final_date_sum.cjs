const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('vw_estoque_consolidado')
      .select('quantidade_disponivel, data_atualizacao')
      .eq('data_atualizacao', '27/05')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(error);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  let totalQty = 0;
  allData.forEach(r => {
    totalQty += Number(r.quantidade_disponivel) || 0;
  });
  console.log(`Supabase [Data: 27/05]: ${allData.length} linhas, total_quantidade = ${totalQty}`);
}

run();
