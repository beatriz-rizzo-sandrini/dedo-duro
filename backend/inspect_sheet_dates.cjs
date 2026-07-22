const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSONFull(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows || [];
  } catch (error) {
    return [];
  }
}

async function inspectTab(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  try {
    const response = await axios.get(url);
    const rows = parseGoogleJSONFull(response.data);
    
    const dates = new Set();
    const rawDates = new Set();
    
    rows.forEach(r => {
      if (r && r.c && r.c[0]) {
        if (r.c[0].f) dates.add(r.c[0].f);
        if (r.c[0].v) rawDates.add(r.c[0].v);
      }
    });
    
    console.log(`\n--- Tab: ${tabName} ---`);
    console.log('Formatted Dates (c[0].f):', Array.from(dates));
    console.log('Raw Dates (c[0].v):', Array.from(rawDates));
  } catch (err) {
    console.error(`Error inspecting ${tabName}:`, err.message);
  }
}

async function run() {
  await inspectTab('ESTOQUE');
  await inspectTab('ESTOQUE1');
  await inspectTab('VENDAS');
}

run();
