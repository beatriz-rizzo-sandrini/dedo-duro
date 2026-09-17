const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error('Erro parser:', error);
    return [];
  }
}

function parseDateToSQL(f, v) {
  if (f && typeof f === 'string' && f.includes('/')) {
    const parts = f.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (v && typeof v === 'string' && v.startsWith('Date(')) {
    const match = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const year = match[1];
      const month = String(parseInt(match[2]) + 1).padStart(2, '0');
      const day = String(match[3]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

async function upsertEmLotes(tabela, dados, onConflict, tamanhoLote = 500) {
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict });
    if (error) {
      console.error(`Erro no lote ${i / tamanhoLote + 1} de ${tabela}:`, error.message);
      throw error;
    }
    console.log(`- ${tabela}: lote ${i / tamanhoLote + 1} (${lote.length} registros) enviado.`);
  }
}

async function run() {
  console.log('--- Sincronizando vendas de Setembro da Planilha Google ---');
  
  const insertData = [];

  function processarLinhas(rows, isMonthlyTab = false) {
    for (const r of rows) {
      if (!r || !r.c) continue;
      let dataSQL, local, sku, desc, qtd, marca;

      if (isMonthlyTab) {
        dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
        sku = r.c[1]?.v || null;
        desc = r.c[2]?.v || null;
        local = r.c[3]?.v || null;
        marca = r.c[4]?.v || null;
        qtd = r.c[5]?.v || null;
      } else {
        dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
        local = r.c[1]?.v || null;
        sku = r.c[2]?.v || null;
        desc = r.c[3]?.v || null;
        qtd = r.c[4]?.v || null;
        marca = r.c[5]?.v || null;
      }

      if (sku === 'SA0A6230063ABBYCN390409') sku = 'SA0A6230063ABBYCN390408';
      if (sku === 'AD000IF4135ABAJCN430031') sku = 'AD000HP6011ADABCN430026';

      if (dataSQL && sku && local) {
        const cleanLocal = String(local).toUpperCase().trim();
        insertData.push({
          data_venda: dataSQL,
          local_venda: cleanLocal,
          sku_produto: String(sku).trim(),
          descricao_produto: desc,
          marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
          quantidade_vendida: Number(qtd) || 0
        });
      }
    }
  }

  // 1. Aba VENDAS
  try {
    const urlVendas = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`;
    const resVendas = await axios.get(urlVendas);
    const rowsVendas = parseGoogleJSON(resVendas.data);
    console.log(`Aba VENDAS: ${rowsVendas.length} linhas obtidas.`);
    processarLinhas(rowsVendas, false);
  } catch (e) {
    console.warn('Erro ao buscar VENDAS:', e.message);
  }

  // 2. Aba SETEMBRO (se existir)
  try {
    const urlSetembro = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=SETEMBRO`;
    const resSet = await axios.get(urlSetembro);
    const rowsSet = parseGoogleJSON(resSet.data);
    console.log(`Aba SETEMBRO: ${rowsSet.length} linhas obtidas.`);
    processarLinhas(rowsSet, true);
  } catch (e) {
    console.log('Aba SETEMBRO não disponível ou sem linhas.');
  }

  console.log(`Total geral de linhas lidas: ${insertData.length}`);

  // Filtrar período de Setembro (2026-09-01 até 2026-09-10)
  const setSales = insertData.filter(d => d.data_venda >= '2026-09-01' && d.data_venda <= '2026-09-10');
  console.log(`Linhas no período de 01 a 10 de Setembro: ${setSales.length}`);

  const porPlataforma = {};
  for (const s of setSales) {
    porPlataforma[s.local_venda] = (porPlataforma[s.local_venda] || 0) + s.quantidade_vendida;
  }
  console.log('Peças por Plataforma identificadas na Planilha:', porPlataforma);
  console.log('Detalhe por Plataforma:', porPlataforma);

  // Deduplicar e agregar chave (data_venda, local_venda, sku_produto)
  const mapa = {};
  for (const item of setSales) {
    const chave = `${item.data_venda}|${item.local_venda}|${item.sku_produto}`;
    if (mapa[chave]) {
      mapa[chave].quantidade_vendida += item.quantidade_vendida;
    } else {
      mapa[chave] = { ...item };
    }
  }
  const dadosUnicos = Object.values(mapa);
  console.log(`Registros únicos agregados para upsert: ${dadosUnicos.length}`);

  // Enviar para silver_vendas no Supabase
  console.log('Enviando para o Supabase (silver_vendas)...');
  await upsertEmLotes('silver_vendas', dadosUnicos, 'data_venda, local_venda, sku_produto');
  console.log('✅ Sincronização concluída com sucesso!');
}

run();
