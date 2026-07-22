const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SPREADSHEET_NEW = '1A_K3440z4w-vwryh3SgssPIa4MlsZn3k987ksbx80vU';
const SPREADSHEET_OLD = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

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

async function sumSheet(id, label) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;
  try {
    const response = await axios.get(url);
    const rows = parseGoogleJSON(response.data);
    let totalQty = 0;
    let validRows = 0;
    rows.forEach(r => {
      if (!r || !r.c) return;
      const sku = r.c[1]?.v;
      const qty = Number(r.c[5]?.v) || 0;
      if (sku) {
        totalQty += qty;
        validRows++;
      }
    });
    console.log(`Planilha [${label}]: ${validRows} linhas ativas, total_quantidade = ${totalQty}`);
  } catch (e) {
    console.error(`Erro ao carregar planilha [${label}]:`, e.message);
  }
}

async function sumSupabase(date) {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('vw_estoque_consolidado')
      .select('quantidade_disponivel, data_atualizacao')
      .eq('data_atualizacao', date)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(error);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  let totalQty = 0;
  allData.forEach(r => {
    totalQty += Number(r.quantidade_disponivel) || 0;
  });
  console.log(`Supabase [Data: ${date}]: ${allData.length} linhas, total_quantidade = ${totalQty}`);
}

async function run() {
  await sumSheet(SPREADSHEET_NEW, "NOVA SHEET (A_K3440...)");
  await sumSheet(SPREADSHEET_OLD, "VELHA SHEET (bFMoSC...)");
  await sumSupabase("26/05");
  await sumSupabase("27/05/2026");
}

run().catch(console.error);
