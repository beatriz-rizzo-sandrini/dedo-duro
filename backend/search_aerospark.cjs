const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const catalogPath = path.join(__dirname, '..', 'src', 'utils', 'seniorCatalog.json');
const seniorCatalog = fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : {};

async function searchAeroSpark() {
  console.log('--- 1. Search in seniorCatalog for AERO / SPARK ---');
  const catalogMatches = [];
  for (const [sku, info] of Object.entries(seniorCatalog)) {
    const d = (info?.descricao_oficial || '').toUpperCase();
    const id = (info?.idePro || '').toUpperCase();
    const ref = (info?.codRef || '').toUpperCase();
    if (d.includes('SPARK') || d.includes('AERO') || sku.includes('SPARK') || sku.includes('AERO') || id.includes('SPARK') || ref.includes('SPARK')) {
      catalogMatches.push({ sku, desc: info.descricao_oficial, nomMar: info.nomMar, idePro: info.idePro, codRef: info.codRef });
    }
  }
  console.log(`Found ${catalogMatches.length} matches in seniorCatalog:`);
  catalogMatches.slice(0, 20).forEach(m => console.log(m));

  console.log('\n--- 2. Search in silver_estoque for 08/09 matching AERO / SPARK or the SKUs above ---');
  const matchSkus = new Set(catalogMatches.map(m => m.sku));

  const { data: stock0809, error: errEstoque } = await supabase
    .from('silver_estoque')
    .select('id, data_atualizacao, sku_produto, descricao_produto, marca, local_estoque, quantidade_disponivel')
    .eq('data_atualizacao', '08/09');

  if (errEstoque) {
    console.error(errEstoque);
    return;
  }

  const foundInStock = [];
  for (const r of stock0809) {
    const s = String(r.sku_produto || '').trim().toUpperCase();
    const d = String(r.descricao_produto || '').toUpperCase();
    const cleanS = s.replace(/(_FBA|_FULL|-FBA|-FULL)$/i, '');
    if (d.includes('SPARK') || d.includes('AERO') || s.includes('SPARK') || s.includes('AERO') || matchSkus.has(cleanS) || matchSkus.has(s)) {
      foundInStock.push(r);
    }
  }

  console.log(`Found ${foundInStock.length} rows in 08/09 stock:`);
  foundInStock.forEach(r => console.log(r));

  console.log('\n--- 3. Search in all silver_estoque without description filter ---');
  const { data: allStockMatches } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao, sku_produto, descricao_produto, local_estoque, quantidade_disponivel')
    .or('descricao_produto.ilike.%SPARK%,descricao_produto.ilike.%AERO%,sku_produto.ilike.%SPARK%,sku_produto.ilike.%AERO%')
    .limit(50);

  console.log(`Sample from all silver_estoque:`, allStockMatches?.slice(0, 10));
}

searchAeroSpark().catch(console.error);
