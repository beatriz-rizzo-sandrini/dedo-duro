const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sku = 'SA000007000CMCNCN430032';
  
  // Check all tables for this SKU
  const tables = [
    { name: 'silver_estoque', col: 'sku_produto' },
    { name: 'silver_vendas', col: 'sku_produto' },
    { name: 'silver_reposicao', col: 'sku_produto' },
    { name: 'silver_badstock', col: 'sku_produto' },
  ];

  for (const t of tables) {
    const { data, error } = await supabase
      .from(t.name)
      .select(t.col)
      .ilike(t.col, `%${sku}%`)
      .limit(5);
    
    console.log(`${t.name}: ${data?.length || 0} registros`);
    if (data?.length) data.forEach(r => console.log(`  -> ${r[t.col]}`));
  }

  // Also check mapeamento
  const { data: mapData } = await supabase
    .from('silver_mapeamento_sku')
    .select('sku_senior, sku_plataforma')
    .or(`sku_senior.ilike.%${sku}%,sku_plataforma.ilike.%${sku}%`)
    .limit(5);
  
  console.log(`silver_mapeamento_sku: ${mapData?.length || 0} registros`);
  if (mapData?.length) mapData.forEach(r => console.log(`  -> senior: ${r.sku_senior} | plat: ${r.sku_plataforma}`));
}

run().catch(err => console.error(err.message));
