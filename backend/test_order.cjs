const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithOrder(table) {
  let all = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario')
      .eq('data_atualizacao', '08/09')
      .order('id', { ascending: true })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) {
      console.error('Error on table', table, error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  const spark = all.filter(r => (r.sku_produto || '').includes('1841') || (r.descricao_produto || '').includes('1841') || (r.descricao_produto || '').includes('SPARK'));
  const meliSp = spark.filter(r => (r.local_estoque || '').toUpperCase().includes('MELI SP'));
  const totalQty = meliSp.reduce((s, r) => s + Number(r.quantidade_disponivel || 0), 0);
  const totalAll = spark.reduce((s, r) => s + Number(r.quantidade_disponivel || 0), 0);

  console.log(`Table ${table} with ORDER BY id: Total rows = ${all.length}, MELI SP Spark = ${totalQty}, ALL Spark = ${totalAll}`);
}

async function run() {
  await testWithOrder('silver_estoque');
  await testWithOrder('vw_estoque_consolidado');
}
run();
