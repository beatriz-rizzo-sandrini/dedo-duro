const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const isTestMode = false; // Test production first
  const TABELA_ESTOQUE = isTestMode ? 'silver_estoque_teste' : 'vw_estoque_consolidado';
  const targetDate = '14/07';
  
  console.log(`📡 Simulando consulta de estoque para ${targetDate} (Tabela: ${TABELA_ESTOQUE})...`);

  try {
    const selectFields = isTestMode
      ? 'id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario'
      : 'id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario, sku_original_plataforma';

    const { data, error } = await supabase
      .from(TABELA_ESTOQUE)
      .select(selectFields)
      .eq('data_atualizacao', targetDate)
      .order('id', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Erro no query:', error.message);
      return;
    }

    console.log(`✅ Sucesso! Retornados ${data.length} registros.`);
    if (data.length > 0) {
      console.log('Amostra de registros mapeados do banco:', data[0]);
      
      const mapped = data.map(r => ({
        c: [
          { v: r.data_atualizacao, f: r.data_atualizacao },
          { v: r.sku_produto },
          { v: r.descricao_produto },
          { v: r.local_estoque },
          { v: r.marca },
          { v: Number(r.quantidade_disponivel) || 0 },
          { v: Number(r.valor_unitario) || 0 },
          { v: r.sku_original_plataforma || r.sku_produto }
        ]
      }));
      console.log('Amostra de linha convertida para o frontend:', mapped[0]);
    }
  } catch (err) {
    console.error('❌ Erro capturado:', err.message);
  }
}

run();
