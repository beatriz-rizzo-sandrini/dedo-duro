const { createClient } = require('@supabase/supabase-js');
const { parseProductDescription } = require('../src/utils/productParser.js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔍 Searching Supabase for any product description containing "Rise Up"...');

  const { data: est, error: estErr } = await supabase
    .from('silver_estoque')
    .select('sku_produto, descricao_produto, local_estoque, quantidade_disponivel')
    .ilike('descricao_produto', '%Rise Up%');

  if (estErr) {
    console.error('Estoque search error:', estErr.message);
    return;
  }

  console.log(`Found ${est.length} rows in silver_estoque.`);

  // Group by parsed base title, SKU, local, and description to see what's happening
  const summary = {};
  for (const r of est) {
    const sku = r.sku_produto;
    const desc = r.descricao_produto;
    const local = r.local_estoque;
    const parsed = parseProductDescription(desc, sku, local.includes('BUY CLOCK'));
    const key = `${sku}|${desc}|${local}|${parsed.baseTitle}|${parsed.color}`;
    if (!summary[key]) {
      summary[key] = {
        sku,
        desc,
        local,
        baseTitle: parsed.baseTitle,
        color: parsed.color,
        size: parsed.size,
        count: 0,
        totalQtd: 0
      };
    }
    summary[key].count++;
    summary[key].totalQtd += Number(r.quantidade_disponivel) || 0;
  }

  console.log('\n--- ESTOQUE SUMMARY ---');
  Object.values(summary).forEach(s => {
    console.log(`SKU: ${s.sku} | Local: ${s.local}`);
    console.log(`  Desc:      "${s.desc}"`);
    console.log(`  BaseTitle: "${s.baseTitle}"`);
    console.log(`  Color:     "${s.color}"`);
    console.log(`  Size:      "${s.size}"`);
    console.log(`  Total Qty: ${s.totalQtd} (${s.count} rows)`);
    console.log('------------------------------------------------');
  });
}

run().catch(console.error);
