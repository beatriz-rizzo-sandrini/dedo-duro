const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Lista de URLs fornecidas pela Beatriz
const sheetUrls = [
  'https://docs.google.com/spreadsheets/d/16--bDuAkNclLJ-COfSR-pOy9riwPMn-s_iwFa8tQH6g/edit?usp=sharing',
  'https://docs.google.com/spreadsheets/d/1ukKiUdGwTwPAqSVa8K_-YEWjvEXMwbXoP7EccrqTifY/edit?usp=sharing',
  'https://docs.google.com/spreadsheets/d/189ZMHcmkjk-4prIvnIE7XfLtCFS3tqSeUUCjXjOwp5g/edit?usp=sharing',
  'https://docs.google.com/spreadsheets/d/1FKN7_R_13yqzcyxL_sQvqk5X121WhNWfLCJ0KIjs-Nw/edit?usp=sharing',
  'https://docs.google.com/spreadsheets/d/1gzMon_SKZ0OEu2onQSCUivpcgnUFxi8r3Nu9yJT-O7M/edit?usp=sharing',
  'https://docs.google.com/spreadsheets/d/1_lbNeeoKXpkKVrvC2szbBafTpyzKV-SYgwhG5ny1MNY/edit?usp=sharing'
];

function extractId(url) {
  const match = url.match(/\/d\/(.*?)\//);
  return match ? match[1] : null;
}

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON", error);
    return [];
  }
}

async function upsertEmLotes(tabela, dados, onConflict, tamanhoLote = 500) {
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict });
    if (error) {
      console.error(`❌ Erro no lote ${i / tamanhoLote + 1}:`, error.message);
      throw error;
    }
    console.log(`   📦 Lote ${i / tamanhoLote + 1}: ${lote.length} registros inseridos com sucesso.`);
  }
}

async function processarPlanilha(url) {
  const id = extractId(url);
  if (!id) {
    console.log('ID inválido para URL:', url);
    return;
  }

  console.log(`\n🔄 Baixando dados da planilha ID: ${id}...`);
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

  try {
    const response = await axios.get(gvizUrl);
    const rows = parseGoogleJSON(response.data);
    
    if (rows.length === 0) {
      console.log('Nenhum dado encontrado ou erro de permissão.');
      return;
    }

    const insertData = [];

    for (const r of rows) {
      if (!r || !r.c) continue;
      const dataStr = r.c[0]?.f || r.c[0]?.v || null;
      const sku = r.c[1]?.v || null;
      const desc = r.c[2]?.v || null;
      const local = r.c[3]?.v || null;
      const marca = r.c[4]?.v || null;
      const qtd = r.c[5]?.v || null;
      const valor = r.c[6]?.v || null;

      if (sku && local && sku !== 'SKU') { // ignorar cabeçalho
        insertData.push({
          data_atualizacao: dataStr,
          sku_produto: String(sku).trim(),
          descricao_produto: desc,
          marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
          local_estoque: String(local).toUpperCase().trim(),
          quantidade_disponivel: Number(qtd) || 0,
          valor_unitario: Number(valor) || 0
        });
      }
    }

    if (insertData.length === 0) {
      console.log('Nenhum dado válido extraído.');
      return;
    }

    // Deduplica por data+sku+local
    const mapaEstoque = {};
    for (const item of insertData) {
      const chave = `${item.data_atualizacao}|${item.sku_produto}|${item.local_estoque}`;
      mapaEstoque[chave] = item;
    }
    const dadosUnicosEstoque = Object.values(mapaEstoque);

    const datasNoBanco = [...new Set(dadosUnicosEstoque.map(d => d.data_atualizacao))];
    console.log(`   🗓️ Datas encontradas na planilha: ${datasNoBanco.join(', ')}`);
    console.log(`   Apagando dados anteriores dessas datas no banco (se houver)...`);
    
    for (const data of datasNoBanco) {
      await supabase.from('silver_estoque').delete().eq('data_atualizacao', data);
    }

    console.log(`   Iniciando upsert de ${dadosUnicosEstoque.length} linhas...`);
    await upsertEmLotes('silver_estoque', dadosUnicosEstoque, 'data_atualizacao, sku_produto, local_estoque');
    console.log(`✅ Planilha processada com sucesso!`);

  } catch (error) {
    console.error(`Erro ao processar planilha ${id}:`, error.message);
  }
}

async function rodar() {
  for (const url of sheetUrls) {
    await processarPlanilha(url);
  }
  console.log('\n🎉 Finalizado! Todo o histórico foi importado para o Supabase.');
}

rodar();
