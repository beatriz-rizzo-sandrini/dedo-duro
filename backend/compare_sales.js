const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const startDate = '2026-06-14';
  const endDate = '2026-07-13';
  const local = 'MELI SP';
  const brand = 'SANDRINI';

  console.log(`📊 Comparando vendas de ${local} (Marca: ${brand}) entre ${startDate} e ${endDate}...`);

  // 1. Produção
  const { data: prodData, error: prodErr } = await supabase
    .from('silver_vendas')
    .select('quantidade_vendida')
    .eq('local_venda', local)
    .eq('marca', brand)
    .gte('data_venda', startDate)
    .lte('data_venda', endDate);

  if (prodErr) {
    console.error('Erro na produção:', prodErr.message);
  } else {
    const sumProd = prodData.reduce((acc, r) => acc + (Number(r.quantidade_vendida) || 0), 0);
    console.log(`- Produção (silver_vendas): Sum = ${sumProd} (${prodData.length} registros)`);
  }

  // 2. Teste
  const { data: testData, error: testErr } = await supabase
    .from('silver_vendas_teste')
    .select('quantidade_vendida')
    .eq('local_venda', local)
    .eq('marca', brand)
    .gte('data_venda', startDate)
    .lte('data_venda', endDate);

  if (testErr) {
    console.error('Erro no teste:', testErr.message);
  } else {
    const sumTest = testData.reduce((acc, r) => acc + (Number(r.quantidade_vendida) || 0), 0);
    console.log(`- Teste (silver_vendas_teste): Sum = ${sumTest} (${testData.length} registros)`);
  }
}

run();
