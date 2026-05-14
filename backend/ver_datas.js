const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verDatas() {
  console.log('Buscando datas em silver_vendas...');
  const { data: vendasData, error: vendasError } = await supabase
    .from('silver_vendas')
    .select('data_venda');
    
  if (vendasError) {
    console.error('Erro ao buscar vendas:', vendasError);
  } else {
    const datasVendas = [...new Set(vendasData.map(d => d.data_venda))].sort();
    console.log(`Datas em VENDAS (${datasVendas.length}):\n${datasVendas.join('\n')}\n`);
  }

  console.log('Buscando datas em silver_estoque...');
  const { data: estoqueData, error: estoqueError } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao');
    
  if (estoqueError) {
    console.error('Erro ao buscar estoque:', estoqueError);
  } else {
    const datasEstoque = [...new Set(estoqueData.map(d => d.data_atualizacao))].sort();
    console.log(`Datas em ESTOQUE (${datasEstoque.length}):\n${datasEstoque.join('\n')}\n`);
  }
}

verDatas();
