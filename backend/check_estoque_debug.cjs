const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

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

async function check() {
  console.log('--- 1. GOOGLE SHEETS ESTOQUE ---');
  const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const rows = parseGoogleJSON(res.data);
  console.log('Total rows in sheet ESTOQUE:', rows.length);
  
  const sheetLocals = {};
  const sheetDates = {};
  for (const r of rows) {
    if (!r || !r.c) continue;
    const d = r.c[0]?.f || r.c[0]?.v;
    const l = r.c[3]?.v;
    const sku = r.c[1]?.v;
    sheetDates[d] = (sheetDates[d] || 0) + 1;
    sheetLocals[l] = (sheetLocals[l] || 0) + 1;
  }
  console.log('Sheet Dates:', sheetDates);
  console.log('Sheet Locals:', sheetLocals);
  
  console.log('\n--- 2. SUPABASE SILVER_ESTOQUE (LATEST DATES) ---');
  const { data: dbData, error } = await supabase
    .from('silver_estoque')
    .select('data_atualizacao, local_estoque, quantidade_disponivel')
    .order('data_atualizacao', { ascending: false })
    .limit(3000);

  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  
  const dbSummary = {};
  for (const r of dbData) {
    const d = r.data_atualizacao;
    const l = r.local_estoque;
    if (!dbSummary[d]) dbSummary[d] = {};
    dbSummary[d][l] = (dbSummary[d][l] || 0) + 1;
  }
  console.log('DB Summary by date:', JSON.stringify(dbSummary, null, 2));
}

check().catch(console.error);
