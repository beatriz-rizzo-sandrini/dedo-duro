const axios = require('axios');

const SPREADSHEET_ID = '1A_K3440z4w-vwryh3SgssPIa4MlsZn3k987ksbx80vU';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON do Google Sheets", error);
    return [];
  }
}

async function run() {
  console.log("Fetching Google Sheet ESTOQUE directly...");
  const response = await axios.get(url);
  const rows = parseGoogleJSON(response.data);
  console.log(`Total rows in Google Sheet ESTOQUE: ${rows.length}`);
  
  const dateCounts = {};
  rows.forEach((r, idx) => {
    if (!r || !r.c) return;
    const dateStr = r.c[0]?.f || r.c[0]?.v || null;
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
  });
  
  console.log("Dates in Google Sheet ESTOQUE:");
  console.log(JSON.stringify(dateCounts, null, 2));
  
  // Show first 5 rows and last 5 rows
  console.log("\nFirst 5 rows:");
  console.log(rows.slice(0, 5).map(r => r?.c?.map(c => c?.v || c?.f)));
  
  console.log("\nLast 5 rows:");
  console.log(rows.slice(-5).map(r => r?.c?.map(c => c?.v || c?.f)));
}

run().catch(console.error);
