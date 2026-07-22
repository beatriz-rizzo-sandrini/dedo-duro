const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔍 Listing all unique KSA SKUs and their descriptions...');
  
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('sku_produto, descricao_produto');

  if (error) {
    console.error(error);
    return;
  }

  const ksaMap = new Map();
  data.forEach(x => {
    const sku = String(x.sku_produto || '').trim().toUpperCase();
    if (sku.startsWith('KSA')) {
      const baseSku = sku.substring(0, 15); // Group by base SKU prefix
      if (!ksaMap.has(baseSku)) {
        ksaMap.set(baseSku, {
          skus: new Set(),
          descs: new Set()
        });
      }
      const entry = ksaMap.get(baseSku);
      entry.skus.add(sku);
      entry.descs.add(x.descricao_produto);
    }
  });

  console.log(`\nFound ${ksaMap.size} base KSA SKU prefixes:`);
  for (const [base, entry] of ksaMap.entries()) {
    console.log(`\nBase Prefix: ${base}`);
    console.log(`Sample SKUs: ${Array.from(entry.skus).slice(0, 3).join(', ')}`);
    console.log(`Descriptions:`);
    Array.from(entry.descs).slice(0, 5).forEach(d => console.log(`  - "${d}"`));
  }
}

run().catch(console.error);
