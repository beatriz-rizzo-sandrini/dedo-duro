const axios = require('axios');

const SPREADSHEET_ID = '1A_K3440z4w-vwryh3SgssPIa4MlsZn3k987ksbx80vU';
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function run() {
  const response = await axios.get(url);
  const rows = parseGoogleJSON(response.data);
  console.log(`Inspect first 50 rows in Google Sheet ESTOQUE:`);
  
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const r = rows[i];
    const c0 = r?.c?.[0];
    const sku = r?.c?.[1]?.v;
    console.log(`Row ${i + 1}: SKU=${sku}, Col0_V=${c0?.v}, Col0_F=${c0?.f}`);
  }
}

run().catch(console.error);
