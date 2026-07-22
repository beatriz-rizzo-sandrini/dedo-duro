const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"|"$/g, ''));
}

async function run() {
  console.log("=== COMPARAÇÃO DE VENDAS (MELI SP) ===");
  
  // 1. Fetch from Google Sheets VENDAS
  // The VENDAS url from sincronizador_supabase.js is:
  // `https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=VENDAS`
  // But wait, it's easier to download as CSV if it's the first sheet or we can parse JSON.
  // The user says "planilha relatorio diario", which is gid=1070878202 we discovered earlier. Let's fetch that directly as CSV since we know it works.
  let res;
  try {
    res = await axios.get('https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/export?format=csv&gid=1070878202');
  } catch(e) {
    console.error("Erro ao baixar planilha:", e.message);
    return;
  }
  
  const lines = res.data.split(/\r?\n/);
  
  let sheetQtdTotal = 0;
  let sheetValorTotal = 0;
  let sheetCount = 0;
  const sheetSkus = {};
  
  for(let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    // data,SKU,DESCRIÇÃO,PLATAFORMA,MARCA,Quantidade,VALOR,VALOR TOTAL,MARKETPLACE CONVERSÃO
    const dataStr = cols[0] || '';
    const sku = String(cols[1] || '').trim().toUpperCase();
    const plat = String(cols[3] || '').trim().toUpperCase();
    const qtdStr = String(cols[5] || '').replace(/\./g, '').trim();
    const qtd = Number(qtdStr) || 0;
    
    // Check if it's MELI SP and today (assuming 17/07/2026)
    if (plat === 'MELI SP' && dataStr.includes('17/07/2026')) {
      sheetQtdTotal += qtd;
      sheetCount++;
      if (!sheetSkus[sku]) sheetSkus[sku] = 0;
      sheetSkus[sku] += qtd;
    }
  }
  
  console.log(`\nPlanilha: MELI SP em 17/07/2026`);
  console.log(`Qtd Peças: ${sheetQtdTotal} (em ${sheetCount} linhas)`);

  // 2. Fetch from Supabase silver_vendas
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('silver_vendas')
      .select('sku_produto, quantidade_vendida, data_venda')
      .eq('local_venda', 'MELI SP')
      .eq('data_venda', '2026-07-17')
      .range(from, from + step - 1);
      
    if (error) {
      console.error("DB Error:", error);
      break;
    }
    
    if (data.length > 0) {
      allData = allData.concat(data);
      from += step;
    } else {
      hasMore = false;
    }
  }
  
  let dbQtdTotal = 0;
  const dbSkus = {};
  for (const row of allData) {
    const sku = row.sku_produto.toUpperCase();
    dbQtdTotal += row.quantidade_vendida;
    if (!dbSkus[sku]) dbSkus[sku] = 0;
    dbSkus[sku] += row.quantidade_vendida;
  }
  
  console.log(`\nBanco de Dados: MELI SP em 2026-07-17`);
  console.log(`Qtd Peças (silver_vendas): ${dbQtdTotal}`);
  
  console.log(`\nDiferença Total: Planilha ${sheetQtdTotal} - DB ${dbQtdTotal} = ${sheetQtdTotal - dbQtdTotal}`);
  
  console.log("\nComparando SKUs (Planilha vs DB):");
  const allSkus = new Set([...Object.keys(sheetSkus), ...Object.keys(dbSkus)]);
  
  const diffs = [];
  for (const sku of allSkus) {
    const sVal = sheetSkus[sku] || 0;
    const dVal = dbSkus[sku] || 0;
    if (sVal !== dVal) {
      diffs.push({ sku, sheet: sVal, db: dVal, diff: sVal - dVal });
    }
  }
  
  if (diffs.length > 0) {
    console.table(diffs);
  } else {
    console.log("Nenhuma diferença de SKUs encontrada.");
  }
}
run();
