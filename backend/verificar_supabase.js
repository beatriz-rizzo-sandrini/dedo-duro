// ============================================================
// Script de Verificação do Supabase
// Verifica quais tabelas e views existem e quantos registros têm
// Rode com: node verificar_supabase.js
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABELAS = [
  'silver_vendas',
  'silver_estoque',
  'silver_reposicao',
  'silver_badstock',
  'silver_mapeamento_sku',
];

const VIEWS = [
  'vw_vendas_consolidadas',
  'vw_estoque_consolidado',
];

async function verificar() {
  console.log('\n🔍 Verificando Supabase...\n');
  console.log('═'.repeat(55));

  // Verifica tabelas
  console.log('\n📦 TABELAS (dados brutos):');
  for (const tabela of TABELAS) {
    try {
      const { count, error } = await supabase
        .from(tabela)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${tabela.padEnd(30)} → ERRO: ${error.message}`);
      } else {
        console.log(`  ✅ ${tabela.padEnd(30)} → ${count} registros`);
      }
    } catch (e) {
      console.log(`  ❌ ${tabela.padEnd(30)} → NÃO EXISTE`);
    }
  }

  // Verifica views
  console.log('\n🔭 VIEWS (com mapeamento de SKU):');
  for (const view of VIEWS) {
    try {
      const { count, error } = await supabase
        .from(view)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${view.padEnd(30)} → ERRO: ${error.message}`);
      } else {
        console.log(`  ✅ ${view.padEnd(30)} → ${count} registros`);
      }
    } catch (e) {
      console.log(`  ❌ ${view.padEnd(30)} → NÃO EXISTE`);
    }
  }

  // Amostra do mapeamento
  console.log('\n🗺️  AMOSTRA do Mapeamento de SKUs (primeiros 5):');
  const { data: mapa, error: mapaErr } = await supabase
    .from('silver_mapeamento_sku')
    .select('sku_plataforma, plataforma, sku_senior, descricao_oficial')
    .limit(5);

  if (mapaErr || !mapa || mapa.length === 0) {
    console.log('  ⚠️  Tabela de mapeamento vazia ou inexistente.');
    console.log('     → O sincronizador precisa rodar para populá-la.');
  } else {
    mapa.forEach(m => {
      console.log(`  ${m.plataforma.padEnd(15)} | ${m.sku_plataforma.padEnd(25)} → ${m.sku_senior || '(sem senior)'}`);
    });
  }

  // Amostra de vendas
  console.log('\n📅 Data mais recente em silver_vendas:');
  const { data: ultimaVenda } = await supabase
    .from('silver_vendas')
    .select('data_venda')
    .order('data_venda', { ascending: false })
    .limit(1);

  if (ultimaVenda && ultimaVenda.length > 0) {
    console.log(`  ✅ Última data: ${ultimaVenda[0].data_venda}`);
  } else {
    console.log('  ⚠️  Nenhuma venda encontrada.');
  }

  // Amostra de estoque
  console.log('\n📦 Data mais recente em silver_estoque:');
  const { data: ultimoEstoque } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao')
    .order('data_atualizacao', { ascending: false })
    .limit(1);

  if (ultimoEstoque && ultimoEstoque.length > 0) {
    console.log(`  ✅ Última data: ${ultimoEstoque[0].data_atualizacao}`);
  } else {
    console.log('  ⚠️  Nenhum estoque encontrado.');
  }

  console.log('\n' + '═'.repeat(55));
  console.log('✅ Verificação concluída!\n');
}

verificar().catch(console.error);
