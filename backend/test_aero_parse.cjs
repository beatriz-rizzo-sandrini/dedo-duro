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

function isAeroSparkCheck(sku, desc, brand) {
  const s = String(sku || '').toUpperCase();
  const d = String(desc || '').toUpperCase();
  const b = String(brand || '').toUpperCase();
  const isSandrini = b.includes('SANDRINI') || s.startsWith('SA') || s.startsWith('KSA') || d.includes('SANDRINI');
  
  if (!isSandrini && b && b !== 'SEM MARCA') return false;

  return s.includes('1841') || s.includes('SPARK') || d.includes('1841') || d.includes('SPARK');
}

async function run() {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const text = await res.text();
  const rows = parseGoogleJSON(text);

  let totalMeliSp = 0;
  let totalAll = 0;
  let totalCostMeliSp = 0;

  for (const r of rows) {
    if (!r || !r.c) continue;
    const sku = String(r.c[1]?.v || '').trim();
    const desc = String(r.c[2]?.v || '').trim();
    const local = String(r.c[3]?.v || '').trim().toUpperCase();
    const brand = String(r.c[4]?.v || '').trim();
    const qtd = Number(r.c[5]?.v) || 0;
    const cost = Number(r.c[6]?.v) || 0;

    if (isAeroSparkCheck(sku, desc, brand)) {
      totalAll += qtd;
      if (local.includes('MELI SP')) {
        totalMeliSp += qtd;
        totalCostMeliSp += (qtd * cost);
      }
    }
  }

  console.log(`Unified Aero Spark in MELI SP (Spreadsheet): ${totalMeliSp} un (Cost: R$ ${totalCostMeliSp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
  console.log(`Unified Aero Spark in ALL Locations (Spreadsheet): ${totalAll} un`);
}

run();
