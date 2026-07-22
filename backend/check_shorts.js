const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔍 Checking Shorts in Supabase tables...');

  // Query silver_estoque
  const { data: est, error: estErr } = await supabase
    .from('silver_estoque')
    .select('sku_produto, descricao_produto')
    .ilike('sku_produto', '%KSA04%');
  
  if (estErr) {
    console.error('Estoque error:', estErr.message);
  } else {
    console.log(`\nEstoque matching "%KSA04%" (${est.length} rows):`);
    const uniqueEst = Array.from(new Set(est.map(x => `${x.sku_produto} | ${x.descricao_produto}`)));
    uniqueEst.slice(0, 40).forEach(u => console.log(` - ${u}`));
    if (uniqueEst.length > 40) console.log(` ... and ${uniqueEst.length - 40} more`);
  }

  // Query silver_vendas
  const { data: ven, error: venErr } = await supabase
    .from('silver_vendas')
    .select('sku_produto, descricao_produto')
    .ilike('sku_produto', '%KSA04%');

  if (venErr) {
    console.error('Vendas error:', venErr.message);
  } else {
    console.log(`\nVendas matching "%KSA04%" (${ven.length} rows):`);
    const uniqueVen = Array.from(new Set(ven.map(x => `${x.sku_produto} | ${x.descricao_produto}`)));
    uniqueVen.slice(0, 40).forEach(u => console.log(` - ${u}`));
    if (uniqueVen.length > 40) console.log(` ... and ${uniqueVen.length - 40} more`);
  }
}

run().catch(console.error);
