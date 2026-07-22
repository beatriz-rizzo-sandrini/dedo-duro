const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('📡 Buscando mapeamentos de tênis (não-SD2513) em silver_mapeamento_sku...');
  const { data: maps, error } = await supabase
    .from('silver_mapeamento_sku')
    .select('sku_plataforma, plataforma, sku_senior, descricao_oficial')
    .ilike('descricao_oficial', '%tenis%')
    .not('sku_plataforma', 'ilike', '%SD2513%')
    .limit(50);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Encontrado ${maps.length} mapeamentos de tênis.`);
  for (const m of maps) {
    console.log(`- SKU: ${m.sku_plataforma} | Plataforma: ${m.plataforma} | Sênior SKU: ${m.sku_senior}`);
    console.log(`  Descrição Oficial: "${m.descricao_oficial}"`);
  }
}

run().catch(console.error);
