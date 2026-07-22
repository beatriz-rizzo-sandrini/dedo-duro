const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSONFull(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return {
      cols: data.table.cols || [],
      rows: data.table.rows || []
    };
  } catch (error) {
    console.error("Error parsing Google Sheets JSON", error);
    return { cols: [], rows: [] };
  }
}

async function run() {
  console.log('Analyzing unique dates in main VENDAS tab...');
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`;
  
  try {
    const response = await axios.get(url);
    const { rows } = parseGoogleJSONFull(response.data);
    
    console.log(`Total rows in VENDAS: ${rows.length}`);
    
    const dateCounts = {};
    for (const r of rows) {
      if (!r || !r.c || !r.c[0]) continue;
      const f = r.c[0].f || String(r.c[0].v || '');
      dateCounts[f] = (dateCounts[f] || 0) + 1;
    }
    
    console.log('Unique dates in VENDAS and their row counts:');
    Object.entries(dateCounts).sort((a,b) => b[1] - a[1]).slice(0, 20).forEach(([date, count]) => {
      console.log(`- Date: "${date}" | Count: ${count} rows`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
