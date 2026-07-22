const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

async function run() {
  console.log('Fetching raw cells from Google Sheets...');
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=JUNHO`;
  
  try {
    const response = await axios.get(url);
    const text = response.data;
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    
    const rows = data.table.rows || [];
    console.log(`Total rows: ${rows.length}`);
    
    if (rows.length > 0) {
      console.log('First row raw cells:');
      console.log(JSON.stringify(rows[0].c, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
