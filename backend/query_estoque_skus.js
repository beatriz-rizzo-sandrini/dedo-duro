const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetSkus = ['KSA03000001000AB0M0224', 'KSA03000001000AB0P0223', 'KCV05056004132CM0P0060'];
  
  console.log('📡 Consultando estoque de SKUs do TikTok no Supabase para a data "14/07"...');
  
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('sku_produto, local_estoque, quantidade_disponivel, data_atualizacao')
    .in('sku_produto', targetSkus)
    .eq('data_atualizacao', '14/07');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`Registros encontrados: ${data.length}`);
  console.log(JSON.stringify(data, null, 2));
}

run();
