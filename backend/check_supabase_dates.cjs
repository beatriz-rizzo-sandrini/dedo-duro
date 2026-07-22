const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const skus = [
  'FL001355005AAAECS391795',
  'FL001355005AAAECS351791',
  'FL001355005AAAECS361792',
  'FL001355005AAAECS371793',
  'FL001355005AAAECS381794',
  'FL001355005AAAECS401796'
];

async function run() {
  console.log('🔍 Checking latest records and their descriptions in Supabase silver_estoque...');

  for (const sku of skus) {
    const { data, error } = await supabase
      .from('silver_estoque')
      .select('data_atualizacao, descricao_produto, quantidade_disponivel')
      .eq('sku_produto', sku)
      .order('data_atualizacao', { ascending: false });

    if (error) {
      console.error(error.message);
      continue;
    }

    console.log(`\n================ SKU: ${sku} ================`);
    data.forEach(r => {
      console.log(`Date: ${r.data_atualizacao} | Qty: ${r.quantidade_disponivel} | Desc: "${r.descricao_produto}"`);
    });
  }
}

run().catch(console.error);
