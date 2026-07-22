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
  console.log('Fetching JUNHO tab from Google Sheets...');
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=JUNHO`;
  
  try {
    const response = await axios.get(url);
    const { cols, rows } = parseGoogleJSONFull(response.data);
    
    console.log('Columns in JUNHO tab:');
    cols.forEach((c, idx) => {
      console.log(`[Col ${idx}] ID: ${c.id} | Label: "${c.label}"`);
    });
    
    console.log('\nFirst 5 rows in JUNHO tab:');
    rows.slice(0, 5).forEach((r, rowIdx) => {
      console.log(`Row ${rowIdx + 1}:`);
      r.c.forEach((cell, cellIdx) => {
        console.log(`  - Col ${cellIdx}: Val: "${cell?.v}" | Formatted: "${cell?.f}"`);
      });
    });
  } catch (err) {
    console.error('Error fetching sheet:', err.message);
  }
}

run();
