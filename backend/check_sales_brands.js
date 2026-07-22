const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const startDate = '2026-06-14';
  const endDate = '2026-07-13';
  const local = 'MELI SP';

  console.log(`📊 Agrupando vendas de ${local} por marca no período de ${startDate} a ${endDate}...`);

  // Paginar para obter todas as vendas do período
  let allSales = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('silver_vendas')
      .select('quantidade_vendida, marca')
      .eq('local_venda', local)
      .gte('data_venda', startDate)
      .lte('data_venda', endDate)
      .range(from, from + limit - 1);

    if (error) {
      console.error('Erro:', error.message);
      return;
    }
    if (!data || data.length === 0) break;
    allSales = allSales.concat(data);
    if (data.length < limit) break;
    from += limit;
  }

  console.log(`Total de registros carregados: ${allSales.length}`);

  const brandSums = {};
  let totalSales = 0;

  for (const sale of allSales) {
    const brand = String(sale.marca || 'SEM MARCA').toUpperCase().trim();
    const qty = Number(sale.quantidade_vendida) || 0;
    brandSums[brand] = (brandSums[brand] || 0) + qty;
    totalSales += qty;
  }

  console.log('\nResumo de vendas por marca:');
  for (const [brand, sum] of Object.entries(brandSums)) {
    console.log(`- ${brand}: ${sum} peças`);
  }
  console.log(`Soma total de todas as marcas: ${totalSales} peças`);
}

run();
