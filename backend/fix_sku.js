const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const oldSku = 'SA0A6230063ABBYCN390409';
  const newSku = 'SA0A6230063ABBYCN390408';

  console.log(`Updating SKU ${oldSku} to ${newSku}...`);

  let res;
  
  res = await supabase.from('silver_vendas').update({ sku_produto: newSku }).eq('sku_produto', oldSku);
  console.log('silver_vendas updated:', res.error ? res.error : 'OK');

  res = await supabase.from('silver_estoque').update({ sku_produto: newSku }).eq('sku_produto', oldSku);
  console.log('silver_estoque updated:', res.error ? res.error : 'OK');

  res = await supabase.from('silver_reposicao').update({ sku_produto: newSku }).eq('sku_produto', oldSku);
  console.log('silver_reposicao updated:', res.error ? res.error : 'OK');

  res = await supabase.from('silver_badstock').update({ sku_produto: newSku }).eq('sku_produto', oldSku);
  console.log('silver_badstock updated:', res.error ? res.error : 'OK');

}
run();
