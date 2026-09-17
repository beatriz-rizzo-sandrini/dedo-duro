const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    return JSON.parse(jsonStr).table.rows;
  } catch (e) {
    return [];
  }
}

async function analyzeAllAeroSpark() {
  console.log('--- 1. Fetching Sheet ESTOQUE ---');
  const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const sheetRows = parseGoogleJSON(res.data);
  console.log('Sheet rows count:', sheetRows.length);

  // Group by SKU and description
  let totalSparkQtyAllLocals = 0;
  let totalSparkQtyMeliSp = 0;
  const sparkRows = [];

  for (const r of sheetRows) {
    if (!r || !r.c) continue;
    const dStr = r.c[0]?.f || r.c[0]?.v;
    const sku = String(r.c[1]?.v || '').trim().toUpperCase();
    const desc = String(r.c[2]?.v || '').trim();
    const local = String(r.c[3]?.v || '').trim().toUpperCase();
    const marca = String(r.c[4]?.v || '').trim();
    const qtd = Number(r.c[5]?.v) || 0;
    const valor = Number(r.c[6]?.v) || 0;

    // Check if it's Aero Spark (1841) by SKU pattern or description
    const isAeroSpark = 
      sku.includes('1841') ||
      sku.includes('SPARK') ||
      desc.toUpperCase().includes('SPARK') ||
      desc.toUpperCase().includes('1841') ||
      desc.toUpperCase().includes('1841412') ||
      desc.toUpperCase().includes('1841408');

    if (isAeroSpark) {
      totalSparkQtyAllLocals += qtd;
      if (local === 'MELI SP') {
        totalSparkQtyMeliSp += qtd;
      }
      sparkRows.push({ sku, desc, local, qtd, valor });
    }
  }

  console.log(`Total Aero Spark in Google Sheet (All locals): ${totalSparkQtyAllLocals}`);
  console.log(`Total Aero Spark in Google Sheet (Meli SP only): ${totalSparkQtyMeliSp}`);

  // Summary by unique description in Sheet for Meli SP
  const byDescMeliSp = {};
  for (const r of sparkRows) {
    if (r.local === 'MELI SP') {
      if (!byDescMeliSp[r.desc]) byDescMeliSp[r.desc] = { count: 0, sumQty: 0, sampleSkus: [] };
      byDescMeliSp[r.desc].count++;
      byDescMeliSp[r.desc].sumQty += r.qtd;
      if (byDescMeliSp[r.desc].sampleSkus.length < 3) byDescMeliSp[r.desc].sampleSkus.push(r.sku);
    }
  }
  console.log('\n--- Aero Spark in Google Sheet for MELI SP by Description ---');
  console.log(JSON.stringify(byDescMeliSp, null, 2));

  // Check Supabase
  console.log('\n--- 2. Checking Supabase silver_estoque for 08/09 ---');
  const { data: dbRows } = await supabase
    .from('silver_estoque')
    .select('sku_produto, descricao_produto, local_estoque, quantidade_disponivel, valor_unitario')
    .eq('data_atualizacao', '08/09');

  let dbTotalMeliSp = 0;
  let dbTotalAll = 0;
  const dbByDesc = {};

  for (const r of dbRows || []) {
    const sku = String(r.sku_produto || '').trim().toUpperCase();
    const desc = String(r.descricao_produto || '').trim();
    const local = String(r.local_estoque || '').trim().toUpperCase();
    const qtd = Number(r.quantidade_disponivel) || 0;

    const isAeroSpark = 
      sku.includes('1841') ||
      sku.includes('SPARK') ||
      desc.toUpperCase().includes('SPARK') ||
      desc.toUpperCase().includes('1841') ||
      desc.toUpperCase().includes('1841412') ||
      desc.toUpperCase().includes('1841408');

    if (isAeroSpark) {
      dbTotalAll += qtd;
      if (local === 'MELI SP') {
        dbTotalMeliSp += qtd;
        if (!dbByDesc[desc]) dbByDesc[desc] = { count: 0, sumQty: 0 };
        dbByDesc[desc].count++;
        dbByDesc[desc].sumQty += qtd;
      }
    }
  }

  console.log(`Total Aero Spark in Supabase 08/09 (All locals): ${dbTotalAll}`);
  console.log(`Total Aero Spark in Supabase 08/09 (Meli SP only): ${dbTotalMeliSp}`);
  console.log('Supabase by Description (MELI SP):', JSON.stringify(dbByDesc, null, 2));
}

analyzeAllAeroSpark().catch(console.error);
