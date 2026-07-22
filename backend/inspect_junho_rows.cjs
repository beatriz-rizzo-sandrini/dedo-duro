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
  console.log('Fetching first 25 rows of JUNHO...');
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=JUNHO`;
  
  try {
    const response = await axios.get(url);
    const { rows } = parseGoogleJSONFull(response.data);
    
    console.log(`Total rows found: ${rows.length}`);
    rows.slice(0, 25).forEach((r, idx) => {
      const dateCell = r.c[0];
      const skuCell = r.c[1];
      const descCell = r.c[2];
      const localCell = r.c[3];
      const qtyCell = r.c[5];
      
      console.log(`[Row ${idx+1}] Date v: "${dateCell?.v}" | Date f: "${dateCell?.f}" | SKU: "${skuCell?.v}" | Desc: "${descCell?.v}" | Local: "${localCell?.v}" | Qty: "${qtyCell?.v}"`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
