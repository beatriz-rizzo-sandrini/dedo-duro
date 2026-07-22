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
    console.error("Erro no parse do JSON do Sheets:", error);
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

async function run() {
  const targetDateSQL = '2026-06-16'; // 16/06/2026
  const targetDateSheetStr = '16/06/2026';
  console.log(`🔍 Analisando vendas para a data alvo: ${targetDateSQL} (${targetDateSheetStr})...`);

  // 1. Buscar vendas da planilha (aba JUNHO)
  console.log('📡 Buscando aba JUNHO do Google Sheets...');
  const urlVendas = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=JUNHO`;
  const resVendas = await axios.get(urlVendas);
  const rowsVendas = parseGoogleJSON(resVendas.data);

  let sheetTotalQty = 0;
  let sheetRowsCount = 0;
  const sheetItems = {};

  for (const r of rowsVendas) {
    if (!r || !r.c) continue;
    const dateSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
    if (dateSQL !== targetDateSQL) continue;

    const sku = String(r.c[1]?.v || '').trim();
    const local = String(r.c[3]?.v || '').toUpperCase().trim(); // Local is Col 3 in JUNHO tab!
    const qtd = Number(r.c[5]?.v) || 0; // Qty is Col 5 in JUNHO tab!

    if (sku && local) {
      sheetTotalQty += qtd;
      sheetRowsCount++;
      const key = `${sku}|${local}`;
      sheetItems[key] = (sheetItems[key] || 0) + qtd;
    }
  }

  console.log(`📊 Planilha (aba VENDAS) para ${targetDateSheetStr}:`);
  console.log(`   └ Total Linhas: ${sheetRowsCount}`);
  console.log(`   └ Soma Quantidade: ${sheetTotalQty}`);

  // 2. Buscar vendas do Supabase
  console.log('\n☁️ Buscando silver_vendas no Supabase...');
  let dbRows = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('silver_vendas')
      .select('sku_produto, local_venda, quantidade_vendida')
      .eq('data_venda', targetDateSQL)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Erro Supabase:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    dbRows = dbRows.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  let dbTotalQty = 0;
  const dbItems = {};
  for (const r of dbRows) {
    const local = String(r.local_venda || '').toUpperCase().trim();
    const sku = String(r.sku_produto || '').trim();
    const qtd = Number(r.quantidade_vendida) || 0;
    dbTotalQty += qtd;
    const key = `${sku}|${local}`;
    dbItems[key] = (dbItems[key] || 0) + qtd;
  }

  console.log(`📊 Supabase (silver_vendas) para ${targetDateSQL}:`);
  console.log(`   └ Total Linhas: ${dbRows.length}`);
  console.log(`   └ Soma Quantidade: ${dbTotalQty}`);

  // 3. Comparação de discrepâncias
  console.log('\n🔎 Comparando discrepâncias por SKU + Canal (local)...');
  const allKeys = new Set([...Object.keys(sheetItems), ...Object.keys(dbItems)]);
  let diffCount = 0;

  for (const key of allKeys) {
    const sheetQty = sheetItems[key] || 0;
    const dbQty = dbItems[key] || 0;

    if (sheetQty !== dbQty) {
      diffCount++;
      if (diffCount <= 20) {
        console.log(`❌ Discrepância no SKU/Canal: "${key}" | Planilha: ${sheetQty} | Supabase: ${dbQty} | Dif: ${dbQty - sheetQty}`);
      }
    }
  }

  console.log(`\nTotal de chaves SKU+Canal com divergências: ${diffCount}`);
}

run().catch(console.error);
