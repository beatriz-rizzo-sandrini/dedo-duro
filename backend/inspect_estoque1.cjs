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
    return { cols: [], rows: [] };
  }
}

async function run() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;
  try {
    const response = await axios.get(url);
    const { cols, rows } = parseGoogleJSONFull(response.data);
    
    console.log('--- ESTOQUE1 Columns ---');
    cols.forEach((c, idx) => {
      console.log(`Col ${idx}: ID="${c.id}" Label="${c.label}" Type="${c.type}"`);
    });
    
    console.log(`\nTotal rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log('\nSample Row 1:');
      rows[0].c.forEach((cell, idx) => {
        console.log(`Col ${idx}: v="${cell?.v}" f="${cell?.f}"`);
      });
    }
  } catch (err) {
    console.error(err.message);
  }
}

run();
