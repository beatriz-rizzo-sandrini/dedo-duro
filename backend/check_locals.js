const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetSku = 'SA0A6230063ABBYCN410410';
  
  console.log(`📡 Buscando registros do SKU ${targetSku}...`);

  // 1. Mapeamento
  const { data: maps } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .eq('sku_plataforma', targetSku);
  
  console.log('\nMapeamentos em silver_mapeamento_sku:');
  console.log(JSON.stringify(maps, null, 2));

  // 2. Vendas na view
  const { data: sales } = await supabase
    .from('vw_vendas_consolidadas')
    .select('sku_produto, descricao_produto, local_venda, quantidade_vendida, sku_original_plataforma')
    .eq('sku_produto', targetSku)
    .limit(5);

  console.log('\nVendas na view vw_vendas_consolidadas:');
  console.log(JSON.stringify(sales, null, 2));

  // 3. Vendas brutas em silver_vendas
  const { data: rawSales } = await supabase
    .from('silver_vendas')
    .select('sku_produto, descricao_produto, local_venda')
    .eq('sku_produto', targetSku)
    .limit(5);

  console.log('\nVendas brutas em silver_vendas:');
  console.log(JSON.stringify(rawSales, null, 2));

  // 4. Estoque na view
  const { data: est } = await supabase
    .from('vw_estoque_consolidado')
    .select('sku_produto, descricao_produto, local_estoque, quantidade_disponivel')
    .eq('sku_produto', targetSku)
    .limit(5);

  console.log('\nEstoque na view vw_estoque_consolidado:');
  console.log(JSON.stringify(est, null, 2));

  // 5. Estoque bruto em silver_estoque
  const { data: rawEst } = await supabase
    .from('silver_estoque')
    .select('sku_produto, descricao_produto, local_estoque')
    .eq('sku_produto', targetSku)
    .limit(5);

  console.log('\nEstoque bruto em silver_estoque:');
  console.log(JSON.stringify(rawEst, null, 2));
}

run().catch(console.error);
