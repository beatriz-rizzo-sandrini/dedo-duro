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
  return null;
}

async function run() {
  console.log('📡 Buscando mapeamentos do Supabase...');
  let mappings = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('silver_mapeamento_sku')
      .select('sku_plataforma, plataforma, sku_senior, descricao_oficial')
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    mappings = mappings.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  const mapLookup = {};
  mappings.forEach(m => {
    const platSku = String(m.sku_plataforma || "").trim().toUpperCase();
    const plat = String(m.plataforma || "").trim().toUpperCase();
    if (platSku && plat) {
      mapLookup[`${platSku}|${plat}`] = String(m.sku_senior || "").trim().toUpperCase();
    }
  });

  console.log(`✅ Carregados ${mappings.length} mapeamentos.`);

  // 1. Planilha VENDAS
  console.log('📡 Buscando aba VENDAS...');
  const resVendas = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`);
  const rowsVendas = parseGoogleJSON(resVendas.data);

  // 2. Planilha JUNHO
  console.log('📡 Buscando aba JUNHO...');
  const resJunho = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=JUNHO`);
  const rowsJunho = parseGoogleJSON(resJunho.data);

  let sheetTotalVendas = 0;
  let sheetTotalJunho = 0;

  const matchSku = 'F01TR00108';

  const sheetVendasDetails = {};
  const sheetJunhoDetails = {};

  // Analisa VENDAS
  for (const r of rowsVendas) {
    if (!r || !r.c) continue;
    const rawSku = String(r.c[2]?.v || '').trim().toUpperCase();
    const rawLocal = String(r.c[1]?.v || '').trim().toUpperCase();
    const mapping = mapLookup[`${rawSku}|${rawLocal}`];
    const mappedSku = mapping || rawSku;
    const rawDesc = String(r.c[3]?.v || '').toUpperCase();
    const qtd = Number(r.c[4]?.v) || 0;
    const date = r.c[0]?.f || '';

    if (rawDesc.includes('RISE UP') && rawDesc.includes('MASCULINO')) {
      sheetTotalVendas += qtd;
      sheetVendasDetails[date] = (sheetVendasDetails[date] || 0) + qtd;
    }
  }

  // Analisa JUNHO
  for (const r of rowsJunho) {
    if (!r || !r.c) continue;
    const rawSku = String(r.c[1]?.v || '').trim().toUpperCase();
    const rawLocal = String(r.c[3]?.v || '').trim().toUpperCase();
    const mapping = mapLookup[`${rawSku}|${rawLocal}`];
    const mappedSku = mapping || rawSku;
    const rawDesc = String(r.c[2]?.v || '').toUpperCase();
    const qtd = Number(r.c[5]?.v) || 0;
    const date = r.c[0]?.f || '';

    if (rawDesc.includes('RISE UP') && rawDesc.includes('MASCULINO')) {
      sheetTotalJunho += qtd;
      sheetJunhoDetails[date] = (sheetJunhoDetails[date] || 0) + qtd;
    }
  }

  console.log(`\n📊 Quantidades na Planilha para Rise Up Masculino:`);
  console.log(`   └ Aba VENDAS: ${sheetTotalVendas}`);
  console.log(`   └ Aba JUNHO : ${sheetTotalJunho}`);
  console.log(`   └ Total Geral: ${sheetTotalVendas + sheetTotalJunho}`);

  // 3. Supabase silver_vendas
  console.log('\n☁️ Buscando silver_vendas no Supabase...');
  let dbRows = [];
  from = 0;
  hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('silver_vendas')
      .select('data_venda, sku_produto, descricao_produto, quantidade_vendida')
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    dbRows = dbRows.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  let dbTotal = 0;
  const dbDetails = {};
  for (const r of dbRows) {
    const sku = String(r.sku_produto || '').trim().toUpperCase();
    const desc = String(r.descricao_produto || '').toUpperCase();
    const qtd = Number(r.quantidade_vendida) || 0;
    const date = parseDateToSQL(null, r.data_venda) || r.data_venda;

    if (desc.includes('RISE UP') && desc.includes('MASCULINO')) {
      dbTotal += qtd;
      dbDetails[date] = (dbDetails[date] || 0) + qtd;
    }
  }

  console.log(`📊 Supabase (silver_vendas total histórico): ${dbTotal}`);

  // Compare by dates
  console.log('\n📅 Comparação por datas (Planilha vs Supabase):');
  const allDates = new Set([
    ...Object.keys(sheetVendasDetails).map(d => parseDateToSQL(d)),
    ...Object.keys(sheetJunhoDetails).map(d => parseDateToSQL(d)),
    ...Object.keys(dbDetails)
  ]);

  const sortedDates = Array.from(allDates).filter(Boolean).sort();
  for (const d of sortedDates) {
    const dBR = d.split('-').reverse().join('/');
    const sheetQty = (sheetVendasDetails[dBR] || 0) + (sheetJunhoDetails[dBR] || 0);
    const dbQty = dbDetails[d] || 0;
    if (sheetQty > 0 || dbQty > 0) {
      console.log(`- Data: ${dBR} | Planilha: ${sheetQty} | Supabase: ${dbQty} | Dif: ${dbQty - sheetQty}`);
    }
  }
}

run().catch(console.error);
