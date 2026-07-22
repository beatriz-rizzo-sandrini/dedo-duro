const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const skus = [
  'FL001355005AAAECS391795',
  'FL001355005AAAECS351791',
  'FL001355005AAAECS361792',
  'FL001355005AAAECS371793',
  'FL001355005AAAECS381794',
  'FL001355005AAAECS401796'
];

async function run() {
  console.log('🔍 Checking SKUs in Supabase silver_estoque, silver_vendas, and silver_mapeamento_sku...');

  for (const sku of skus) {
    console.log(`\n================ SKU: ${sku} ================`);
    
    // Check in silver_estoque
    const { data: est, error: estErr } = await supabase
      .from('silver_estoque')
      .select('sku_produto, descricao_produto, local_estoque, quantidade_disponivel, valor_unitario')
      .eq('sku_produto', sku);
    
    if (estErr) console.error('Estoque error:', estErr.message);
    else console.log(`Supabase Estoque (${est.length} rows):`, est);

    // Check in silver_vendas
    const { data: ven, error: venErr } = await supabase
      .from('silver_vendas')
      .select('sku_produto, descricao_produto, local_venda, quantidade_vendida')
      .eq('sku_produto', sku);

    if (venErr) console.error('Vendas error:', venErr.message);
    else console.log(`Supabase Vendas (${ven.length} rows):`, ven);

    // Check in silver_mapeamento_sku
    const { data: map, error: mapErr } = await supabase
      .from('silver_mapeamento_sku')
      .select('*')
      .eq('sku_plataforma', sku);

    if (mapErr) console.error('Mapping error:', mapErr.message);
    else console.log(`Supabase Mapping (${map.length} rows):`, map);
  }
}

run().catch(console.error);
