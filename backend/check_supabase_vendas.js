const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: maxRow } = await supabase
      .from('silver_vendas')
      .select('data_venda')
      .order('data_venda', { ascending: false })
      .limit(1);

    const { data: minRow } = await supabase
      .from('silver_vendas')
      .select('data_venda')
      .order('data_venda', { ascending: true })
      .limit(1);

    const { count } = await supabase
      .from('silver_vendas')
      .select('*', { count: 'exact', head: true });

    console.log('--- REMOTE SUPABASE SALES SUMMARY ---');
    console.log('Total count:', count);
    console.log('Min date:', minRow?.[0]?.data_venda);
    console.log('Max date:', maxRow?.[0]?.data_venda);

    let allRows = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_vendas')
        .select('quantidade_vendida')
        .gte('data_venda', '2026-04-22')
        .lte('data_venda', '2026-05-21')
        .range(from, from + limit - 1);
      if (error) {
        console.error(error);
        break;
      }
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }

    const totalQty = allRows.reduce((sum, r) => sum + (Number(r.quantidade_vendida) || 0), 0);
    console.log('Supabase Rows in Period (2026-04-22 to 2026-05-21):', allRows.length);
    console.log('Supabase Total Qty in Period:', totalQty);

  } catch (err) {
    console.error(err);
  }
}

run();
