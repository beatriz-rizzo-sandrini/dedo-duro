const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking available dates in v_resumo_estoque_diario ---');
  const { data: resumoDates } = await supabase.from('v_resumo_estoque_diario').select('data_atualizacao').limit(500);
  const uDates = [...new Set((resumoDates || []).map(r => r.data_atualizacao))];
  console.log('Dates in v_resumo_estoque_diario:', uDates);

  console.log('\n--- Checking latest row in vw_estoque_consolidado ---');
  const { data: latestRows } = await supabase.from('vw_estoque_consolidado').select('id, data_atualizacao, local_estoque, sku_produto').order('id', { ascending: false }).limit(10);
  console.log('Latest 10 rows in vw_estoque_consolidado:', latestRows);

  console.log('\n--- Checking counts by local_estoque in vw_estoque_consolidado for latest date ---');
  const latestDate = latestRows?.[0]?.data_atualizacao;
  console.log('Detected latestDate:', latestDate);
  if (latestDate) {
    const { data: dateRows } = await supabase.from('vw_estoque_consolidado').select('local_estoque, quantidade_disponivel').eq('data_atualizacao', latestDate);
    const summary = {};
    for (const r of dateRows || []) {
      const loc = r.local_estoque;
      if (!summary[loc]) summary[loc] = { count: 0, sumQty: 0 };
      summary[loc].count++;
      summary[loc].sumQty += Number(r.quantidade_disponivel) || 0;
    }
    console.log(`Summary for date "${latestDate}" in vw_estoque_consolidado:`, summary);
  }

  console.log('\n--- Checking counts by local_estoque in silver_estoque for "08/09" ---');
  const { data: silverRows } = await supabase.from('silver_estoque').select('local_estoque, quantidade_disponivel').eq('data_atualizacao', '08/09');
  const silverSummary = {};
  for (const r of silverRows || []) {
    const loc = r.local_estoque;
    if (!silverSummary[loc]) silverSummary[loc] = { count: 0, sumQty: 0 };
    silverSummary[loc].count++;
    silverSummary[loc].sumQty += Number(r.quantidade_disponivel) || 0;
  }
  console.log('Summary for date "08/09" in silver_estoque:', silverSummary);
}

check().catch(console.error);
