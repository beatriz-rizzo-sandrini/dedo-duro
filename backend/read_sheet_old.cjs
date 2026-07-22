const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
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
  console.log("Fetching OLD Google Sheet ESTOQUE directly...");
  const response = await axios.get(url);
  const rows = parseGoogleJSON(response.data);
  console.log(`Total rows in OLD Google Sheet ESTOQUE: ${rows.length}`);
  
  const dateCounts = {};
  rows.forEach((r, idx) => {
    if (!r || !r.c) return;
    const dateStr = r.c[0]?.f || r.c[0]?.v || null;
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
  });
  
  console.log("Dates in OLD Google Sheet ESTOQUE:");
  console.log(JSON.stringify(dateCounts, null, 2));
  
  if (rows.length > 0) {
    console.log("First row:");
    console.log(rows[0]?.c?.map(c => c?.v || c?.f));
  }
}

run().catch(console.error);
