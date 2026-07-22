const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const estoqueUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse", error);
    return [];
  }
}

function normalizeDateStr(dStr) {
  if (!dStr) return "";
  let clean = String(dStr).trim().split(' ')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/2026`;
    } else if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${year}`;
    }
  }
  return clean;
}

function parseToTimestamp(dStr) {
  if (!dStr) return 0;
  const clean = String(dStr).trim().split(' ')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return new Date(`2026-${parts[1]}-${parts[0]}`).getTime();
    } else if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return new Date(`${year}-${parts[1]}-${parts[0]}`).getTime();
    }
  }
  return Date.parse(clean) || 0;
}

async function run() {
  try {
    console.log('Fetching Google Sheet stock data...');
    const res = await axios.get(estoqueUrl);
    const sheetRows = parseGoogleJSON(res.data);
    
    console.log(`Loaded ${sheetRows.length} rows from Google Sheet.`);

    // Filter sheet rows for DRY / 2350
    const sheetDryRows = [];
    sheetRows.forEach((r, idx) => {
      if (!r || !r.c) return;
      const dataStr = r.c[0]?.f || r.c[0]?.v || '';
      const sku = String(r.c[1]?.v || '').toUpperCase().trim();
      const desc = String(r.c[2]?.v || '').toUpperCase().trim();
      const local = String(r.c[3]?.v || '').toUpperCase().trim();
      const qtd = Number(r.c[5]?.v) || 0;

      if (sku.includes('DRY') || sku.includes('2350') || sku.includes('2351') || sku.includes('2352') || sku.includes('2353') || sku.includes('2355') ||
          desc.includes('DRY') || desc.includes('2350')) {
        sheetDryRows.push({ line: idx + 2, date: normalizeDateStr(dataStr), sku, desc, local, qtd });
      }
    });

    console.log(`Found ${sheetDryRows.length} DRY-related rows in Google Sheet.`);
    
    // Group sheet rows by SKU and Local to sum the quantities
    const sheetSummary = {};
    sheetDryRows.forEach(r => {
      const key = `${r.sku}|${r.local}`;
      if (!sheetSummary[key]) {
        sheetSummary[key] = { sku: r.sku, local: r.local, qtd: 0, rows: [] };
      }
      sheetSummary[key].qtd += r.qtd;
      sheetSummary[key].rows.push(r.line);
    });

    // Query Supabase for latest stock data
    console.log('Resolving latest date in database...');
    const { data: dateRows, error: dateError } = await supabase
      .from('silver_estoque')
      .select('data_atualizacao')
      .order('id', { ascending: false })
      .limit(2000);

    if (dateError) {
      console.error('Error resolving date:', dateError);
      return;
    }

    const dateCounts = {};
    dateRows.forEach(r => {
      const dStr = r.data_atualizacao;
      if (dStr) {
        const norm = normalizeDateStr(dStr);
        dateCounts[norm] = (dateCounts[norm] || 0) + 1;
      }
    });

    let maxTimestamp = 0;
    let latestCompleteDate = "";
    let maxCount = 0;
    let fallbackDate = "";

    Object.entries(dateCounts).forEach(([normDate, count]) => {
      if (count > maxCount) {
        maxCount = count;
        fallbackDate = normDate;
      }
      if (count >= 200) {
        const ts = parseToTimestamp(normDate);
        if (ts > maxTimestamp) {
          maxTimestamp = ts;
          latestCompleteDate = normDate;
        }
      }
    });

    const targetNormalizedDate = latestCompleteDate || fallbackDate;
    console.log(`Latest normalized date in Supabase: ${targetNormalizedDate}`);

    const possibleDbValues = [];
    if (targetNormalizedDate) {
      const parts = targetNormalizedDate.split('/');
      if (parts.length === 3) {
        possibleDbValues.push(`${parts[0]}/${parts[1]}`);
        possibleDbValues.push(targetNormalizedDate);
        possibleDbValues.push(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        possibleDbValues.push(targetNormalizedDate);
      }
    }
    console.log('Possible DB values for filter:', possibleDbValues);

    console.log('Fetching Supabase stock data for latest date...');
    const promise1 = supabase.from('silver_estoque').select('*').in('data_atualizacao', possibleDbValues).range(0, 999);
    const promise2 = supabase.from('silver_estoque').select('*').in('data_atualizacao', possibleDbValues).range(1000, 1999);
    const promise3 = supabase.from('silver_estoque').select('*').in('data_atualizacao', possibleDbValues).range(2000, 2999);

    const [res1, res2, res3] = await Promise.all([promise1, promise2, promise3]);
    if (res1.error || res2.error || res3.error) {
      console.error('Error fetching from Supabase:', res1.error || res2.error || res3.error);
      return;
    }

    const dbRows = [...(res1.data || []), ...(res2.data || []), ...(res3.data || [])];
    console.log(`Loaded ${dbRows.length} rows from Supabase for this date.`);

    const latestDbRows = dbRows.filter(r => {
      const sku = r.sku_produto || '';
      const desc = r.descricao_produto || '';
      return sku.toLowerCase().includes('dry') || sku.includes('2350') || sku.includes('2351') || sku.includes('2352') || sku.includes('2353') || sku.includes('2355') ||
             desc.toLowerCase().includes('dry') || desc.includes('2350');
    });
    console.log(`Found ${latestDbRows.length} DRY-related rows in Supabase for latest date.`);

    // Group DB rows by SKU and Local (summing up to handle potential duplicate entries)
    const dbSummary = {};
    latestDbRows.forEach(r => {
      const key = `${r.sku_produto.toUpperCase().trim()}|${r.local_estoque.toUpperCase().trim()}`;
      if (!dbSummary[key]) {
        dbSummary[key] = { sku: r.sku_produto, local: r.local_estoque, qtd: 0, desc: r.descricao_produto };
      }
      dbSummary[key].qtd += r.quantidade_disponivel;
    });

    console.log('\n--- COMPARING QUANTITIES (SHEET vs SUPABASE) ---');
    
    const allKeys = new Set([...Object.keys(sheetSummary), ...Object.keys(dbSummary)]);
    
    let diffCount = 0;
    allKeys.forEach(key => {
      const sheet = sheetSummary[key];
      const db = dbSummary[key];
      
      const sheetQtd = sheet ? sheet.qtd : 0;
      const dbQtd = db ? db.qtd : 0;
      
      if (sheetQtd !== dbQtd) {
        diffCount++;
        console.log(`Key: ${key}`);
        console.log(`  Sheet: Qtd = ${sheetQtd} (rows: ${sheet ? sheet.rows.join(', ') : 'N/A'})`);
        console.log(`  DB:    Qtd = ${dbQtd} (desc: ${db ? db.desc : 'N/A'})`);
      }
    });

    if (diffCount === 0) {
      console.log('✅ All quantities match perfectly between Sheet and Supabase!');
    } else {
      console.log(`❌ Found ${diffCount} differences in stock quantities!`);
    }

  } catch (error) {
    console.error('Exception:', error);
  }
}

run();
