const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    return JSON.parse(jsonStr).table.rows;
  } catch (e) {
    return [];
  }
}

async function compare() {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const text = await res.text();
  const rows = parseGoogleJSON(text);
  
  const sheetSparkMeliSp = {};
  for (const r of rows) {
    if (!r || !r.c) continue;
    const sku = String(r.c[1]?.v || '').trim();
    const desc = String(r.c[2]?.v || '').trim();
    const local = String(r.c[3]?.v || '').trim();
    const qtd = Number(r.c[5]?.v) || 0;
    
    if (local.toUpperCase().includes('MELI SP') && (sku.toUpperCase().includes('1841') || desc.toUpperCase().includes('1841') || desc.toUpperCase().includes('SPARK'))) {
      sheetSparkMeliSp[sku] = (sheetSparkMeliSp[sku] || 0) + qtd;
    }
  }

  // Supabase all rows for 08/09 MELI SP (handling pagination)
  let supaRows = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('silver_estoque')
      .select('sku_produto, descricao_produto, quantidade_disponivel')
      .eq('data_atualizacao', '08/09')
      .ilike('local_estoque', '%MELI SP%')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    supaRows.push(...data);
    if (data.length < 1000) break;
    page++;
  }

  const supaSparkMeliSp = {};
  for (const r of supaRows) {
    const sku = (r.sku_produto || '').trim();
    const desc = (r.descricao_produto || '').trim();
    const qtd = Number(r.quantidade_disponivel) || 0;
    if (sku.toUpperCase().includes('1841') || desc.toUpperCase().includes('1841') || desc.toUpperCase().includes('SPARK')) {
      supaSparkMeliSp[sku] = (supaSparkMeliSp[sku] || 0) + qtd;
    }
  }

  let totalSheet = 0;
  for (const [sku, qtd] of Object.entries(sheetSparkMeliSp)) totalSheet += qtd;

  let totalSupa = 0;
  for (const [sku, qtd] of Object.entries(supaSparkMeliSp)) totalSupa += qtd;

  console.log(`Sheet total in MELI SP: ${totalSheet}`);
  console.log(`Supabase total in MELI SP: ${totalSupa}`);

  // Discrepancies
  for (const [sku, qtd] of Object.entries(sheetSparkMeliSp)) {
    if (supaSparkMeliSp[sku] !== qtd) {
      console.log(`Diff SKU ${sku}: Sheet=${qtd}, Supa=${supaSparkMeliSp[sku] || 0}`);
    }
  }
}

compare();
