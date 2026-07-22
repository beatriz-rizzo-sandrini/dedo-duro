const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://hpisoqyionulahtqfwsn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo');

async function run() {
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await s
      .from('silver_estoque')
      .select('quantidade_disponivel, data_atualizacao, sku_produto, descricao_produto')
      .eq('local_estoque', 'MELI SP')
      .range(from, from + step - 1);
      
    if (error) {
      console.error(error);
      break;
    }
    
    if (data.length > 0) {
      allData = allData.concat(data);
      from += step;
    } else {
      hasMore = false;
    }
  }
  
  const totalsByDate = {};
  allData.forEach(x => {
    if (!totalsByDate[x.data_atualizacao]) totalsByDate[x.data_atualizacao] = 0;
    totalsByDate[x.data_atualizacao] += x.quantidade_disponivel;
  });
  
  console.log("Totais de MELI SP por data:", totalsByDate);
  
  // Find which date has ~65740
  for (const date in totalsByDate) {
    if (totalsByDate[date] === 65740 || totalsByDate[date] === 65744 || date.includes('17/07')) {
      console.log(`\nDetalhes para a data ${date}: Total = ${totalsByDate[date]}`);
    }
  }
}
run();
