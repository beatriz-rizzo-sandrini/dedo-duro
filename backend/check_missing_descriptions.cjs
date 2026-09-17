const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const catalogPath = path.join(__dirname, '..', 'src', 'utils', 'seniorCatalog.json');
const seniorCatalog = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : {};

async function run() {
  console.log('--- Analyzing SKUs on date 08/09 ---');
  const { data, error } = await supabase
    .from('silver_estoque')
    .select('sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel')
    .eq('data_atualizacao', '08/09');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total rows on 08/09: ${data.length}`);

  let withoutDesc = 0;
  let inCatalog = 0;
  let notInCatalog = 0;
  const missingSkus = [];

  for (const r of data) {
    const rawSku = String(r.sku_produto || '').trim().toUpperCase();
    const hasDesc = r.descricao_produto && r.descricao_produto !== '#N/A' && r.descricao_produto.trim() !== '';
    if (!hasDesc) {
      withoutDesc++;
      const cat = seniorCatalog[rawSku];
      if (cat) {
        inCatalog++;
      } else {
        notInCatalog++;
        if (missingSkus.length < 20) {
          missingSkus.push({ sku: rawSku, local: r.local_estoque, qtd: r.quantidade_disponivel });
        }
      }
    }
  }

  console.log(`- Rows without description in sheet: ${withoutDesc}`);
  console.log(`  - Found in Senior Catalog: ${inCatalog}`);
  console.log(`  - NOT found in Senior Catalog: ${notInCatalog}`);
  console.log('Sample missing SKUs (not in catalog and no desc):', missingSkus);
}

run();
