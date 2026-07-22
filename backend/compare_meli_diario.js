const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
  console.log("Baixando planilha do relatório diário (gid=1070878202)...");
  let res;
  try {
    res = await axios.get('https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/export?format=csv&gid=1070878202');
  } catch(e) {
    console.error("Erro ao baixar planilha:", e.message);
    return;
  }
  
  const lines = res.data.split(/\r?\n/);
  if (lines.length < 2) {
    console.log("Planilha vazia ou em formato incorreto.");
    return;
  }
  
  const sheetSkus = {};
  let sheetTotal = 0;
  
  // Encontrar o cabeçalho correto. A primeira ou segunda linha costumam ter os cabeçalhos.
  let headerIndex = 0;
  let headers = parseCSVLine(lines[0]);
  
  let skuIdx = headers.findIndex(h => h.toUpperCase().includes('SKU') || h.toUpperCase().includes('CÓDIGO') || h.toUpperCase().includes('CODIGO'));
  let colMeliSp = headers.findIndex(h => h.toUpperCase().trim() === 'MELI SP');
  
  if (skuIdx === -1 || colMeliSp === -1) {
    // Tenta a segunda linha
    headers = parseCSVLine(lines[1]);
    skuIdx = headers.findIndex(h => h.toUpperCase().includes('SKU') || h.toUpperCase().includes('CÓDIGO') || h.toUpperCase().includes('CODIGO'));
    colMeliSp = headers.findIndex(h => h.toUpperCase().trim() === 'MELI SP');
    headerIndex = 1;
  }
  
  if (skuIdx === -1) skuIdx = 0; // Assume a primeira coluna
  
  console.log(`Índice SKU: ${skuIdx}, Índice MELI SP: ${colMeliSp}`);
  
  if (colMeliSp === -1) {
    console.log("Coluna MELI SP não encontrada. Procurando por algo parecido...");
    headers.forEach((h, idx) => {
      if (h.toUpperCase().includes('MELI')) console.log(`Encontrado: ${h} no índice ${idx}`);
    });
    // Pega o primeiro que contenha 'MELI SP' se possível
    colMeliSp = headers.findIndex(h => h.toUpperCase().includes('MELI SP'));
  }
  
  if (colMeliSp !== -1) {
    for (let i = headerIndex + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const sku = String(cols[skuIdx] || '').trim().toUpperCase();
      const valStr = String(cols[colMeliSp] || '').replace(/\./g, '').trim();
      const val = Number(valStr) || 0;
      
      if (sku && val > 0) {
        if (!sheetSkus[sku]) sheetSkus[sku] = 0;
        sheetSkus[sku] += val;
        sheetTotal += val;
      }
    }
  }

  console.log(`Planilha Total MELI SP: ${sheetTotal}`);

  console.log("Buscando dados no banco de dados (vw_estoque_consolidado ou silver_estoque)...");
  
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;
  
  // A UI "EM ESTOQUE consolidado" puxa da silver_estoque ou vw_estoque_consolidado
  // O usuário diz que filtra por "meli sp" na "data de hoje".
  // Vamos buscar a data mais recente no banco primeiro se for o caso, ou a de hoje.
  const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  
  // Precisamos ver que formato de data está no banco (DD/MM).
  // E local_estoque = 'MELI SP'
  while (hasMore) {
    const { data, error } = await supabase
      .from('silver_estoque')
      .select('sku_produto, quantidade_disponivel, data_atualizacao')
      .eq('local_estoque', 'MELI SP')
      .range(from, from + step - 1);
      
    if (error) {
      console.error(error);
      break;
    }
    
    if (data.length > 0) {
      allData = allData.concat(data);
      from += step;
    } else {
      hasMore = false;
    }
  }
  
  // Descobre a data mais recente ou a data com o total próximo a 65740
  const totalsByDate = {};
  const dataByDate = {};
  
  for (const row of allData) {
    const d = row.data_atualizacao;
    if (!totalsByDate[d]) {
      totalsByDate[d] = 0;
      dataByDate[d] = [];
    }
    totalsByDate[d] += row.quantidade_disponivel;
    dataByDate[d].push(row);
  }
  
  console.log("Totais por data no BD:", totalsByDate);
  
  // Pega a data que tiver total == 65740 ou a mais recente
  let targetDate = Object.keys(totalsByDate).find(d => totalsByDate[d] === 65740);
  if (!targetDate) {
      // Pega a data que tiver total > 0 (a mais recente logicamente seria o max)
      targetDate = Object.keys(totalsByDate).sort().pop();
  }
  
  console.log(`Usando os dados da data: ${targetDate}`);
  const dbSkus = {};
  let dbTotal = 0;
  
  if (dataByDate[targetDate]) {
    for (const row of dataByDate[targetDate]) {
      const sku = row.sku_produto.toUpperCase();
      if (!dbSkus[sku]) dbSkus[sku] = 0;
      dbSkus[sku] += row.quantidade_disponivel;
      dbTotal += row.quantidade_disponivel;
    }
  }
  
  console.log(`DB Total MELI SP (data ${targetDate}): ${dbTotal}`);
  
  console.log("\nComparando SKUs com diferenças...");
  const allSkus = new Set([...Object.keys(sheetSkus), ...Object.keys(dbSkus)]);
  
  const differences = [];
  for (const sku of allSkus) {
    const sVal = sheetSkus[sku] || 0;
    const dVal = dbSkus[sku] || 0;
    if (sVal !== dVal) {
      differences.push({ sku, sheet: sVal, db: dVal, diff: sVal - dVal });
    }
  }
  
  if (differences.length > 0) {
    console.table(differences);
  } else {
    console.log("Nenhuma diferença encontrada!");
  }
}
run();
