const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔍 VERIFYING RESOLVED SKU MAPPINGS AND SALES IN SUPABASE Remoto...\n');

  // 1. Check mapping for senior SKUs KNA1000NUB2652CNGG0008 and KNA1000NUB2652CN0G0007
  const { data: seniorMaps, error: err1 } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .in('sku_senior', ['KNA1000NUB2652CNGG0008', 'KNA1000NUB2652CN0G0007']);

  if (err1) {
    console.error('Error fetching by sku_senior:', err1.message);
  } else {
    console.log(`[1] Mappings for target Sênior SKUs in silver_mapeamento_sku (should only be on MELI SP):`);
    console.log(JSON.stringify(seniorMaps, null, 2));
  }

  // 2. Check mapping for platform SKUs K10CSM2875SORTGG, K10CSM2875SORTG, K10CAVALERACSORT1TG
  const { data: platMaps, error: err2 } = await supabase
    .from('silver_mapeamento_sku')
    .select('*')
    .in('sku_plataforma', ['K10CSM2875SORTGG', 'K10CSM2875SORTG', 'K10CAVALERACSORT1TG']);

  if (err2) {
    console.error('Error fetching by sku_plataforma:', err2.message);
  } else {
    console.log(`\n[2] Mappings for platform SKUs in silver_mapeamento_sku (should be mapped to themselves):`);
    console.log(JSON.stringify(platMaps, null, 2));
  }

  // 3. Check sales in vw_vendas_consolidadas for senior SKUs KNA1000NUB2652CNGG0008 and KNA1000NUB2652CN0G0007
  const { data: sales, error: err3 } = await supabase
    .from('vw_vendas_consolidadas')
    .select('*')
    .in('sku_produto', ['KNA1000NUB2652CNGG0008', 'KNA1000NUB2652CN0G0007']);

  if (err3) {
    console.error('Error fetching sales:', err3.message);
  } else {
    console.log(`\n[3] Sales in vw_vendas_consolidadas for target Nautica Boxer Sênior SKUs (should be 0 rows):`);
    console.log(`Found ${sales.length} rows.`);
    if (sales.length > 0) {
      console.log(JSON.stringify(sales, null, 2));
    } else {
      console.log('✅ Success! 0 sales found for Nautica Sênior SKUs.');
    }
  }
}

run().catch(console.error);
