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
  if (v && typeof v === 'string' && v.includes('/')) {
    const parts = v.split('/');
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

async function run() {
  console.log('=== COMPARANDO DIA A DIA: PLANILHA GOOGLE vs SUPABASE ===\n');

  // 1. Ler todas as vendas da planilha Google (Aba VENDAS)
  console.log('1. Lendo Planilha Google (Aba VENDAS)...');
  const resVendas = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`);
  const rowsVendas = parseGoogleJSON(resVendas.data);
  console.log(`Planilha: ${rowsVendas.length} linhas obtidas.`);

  const sheetByDate = {};
  const sheetByDatePlat = {};

  for (const r of rowsVendas) {
    if (!r || !r.c) continue;
    const dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
    if (!dataSQL) continue;

    const plat = String(r.c[1]?.v || 'SEM LOCAL').toUpperCase().trim();
    const sku = r.c[2]?.v;
    const qtd = Number(r.c[4]?.v) || 0;

    sheetByDate[dataSQL] = (sheetByDate[dataSQL] || 0) + qtd;
    
    if (!sheetByDatePlat[dataSQL]) sheetByDatePlat[dataSQL] = {};
    sheetByDatePlat[dataSQL][plat] = (sheetByDatePlat[dataSQL][plat] || 0) + qtd;
  }

  // 2. Ler todas as vendas do Supabase (silver_vendas)
  console.log('2. Lendo Supabase (silver_vendas)...');
  let allDb = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data } = await supabase
      .from('silver_vendas')
      .select('data_venda, local_venda, sku_produto, quantidade_vendida')
      .gte('data_venda', '2026-08-01')
      .lte('data_venda', '2026-09-10')
      .range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    allDb = allDb.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`Supabase: ${allDb.length} registros obtidos.`);

  const dbByDate = {};
  const dbByDatePlat = {};

  for (const r of allDb) {
    const d = r.data_venda;
    const plat = String(r.local_venda || 'SEM LOCAL').toUpperCase().trim();
    const qtd = Number(r.quantidade_vendida) || 0;

    dbByDate[d] = (dbByDate[d] || 0) + qtd;

    if (!dbByDatePlat[d]) dbByDatePlat[d] = {};
    dbByDatePlat[d][plat] = (dbByDatePlat[d][plat] || 0) + qtd;
  }

  // 3. Comparação dia a dia
  const allDates = [...new Set([...Object.keys(sheetByDate), ...Object.keys(dbByDate)])].filter(d => d >= '2026-08-09' && d <= '2026-09-09').sort();

  console.log('\n--- TABELA COMPARATIVA (09/08 a 09/09) ---');
  console.log('DATA        | PLANILHA (Qtd) | SUPABASE (Qtd) | DIFERENÇA | STATUS');
  console.log('------------------------------------------------------------------');

  let totalDiff = 0;
  for (const d of allDates) {
    const sQtd = sheetByDate[d] || 0;
    const dbQtd = dbByDate[d] || 0;
    const diff = dbQtd - sQtd;
    totalDiff += Math.abs(diff);
    const status = diff === 0 ? '✅ 100% IGUAL' : (diff > 0 ? `⚠️ SUPABASE +${diff}` : `❌ PLANILHA +${Math.abs(diff)}`);
    console.log(`${d}  | ${String(sQtd).padEnd(14)} | ${String(dbQtd).padEnd(14)} | ${String(diff).padEnd(9)} | ${status}`);
  }

  console.log('------------------------------------------------------------------');
  console.log(`Diferença total acumulada: ${totalDiff}`);

  // Mostrar plataformas com discrepância se houver
  for (const d of allDates) {
    const sQtd = sheetByDate[d] || 0;
    const dbQtd = dbByDate[d] || 0;
    if (sQtd !== dbQtd) {
      console.log(`\nDetalhes de discrepância em ${d}:`);
      console.log('  Planilha:', sheetByDatePlat[d] || {});
      console.log('  Supabase:', dbByDatePlat[d] || {});
    }
  }
}

run();
