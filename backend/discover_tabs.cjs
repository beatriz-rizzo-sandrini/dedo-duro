const axios = require('axios');

async function discoverAll() {
  const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  console.log(`📡 Fetching available sheets from Google Sheets visual API error response...`);
  
  try {
    const response = await axios.get(url);
    const text = response.data;
    
    const match = text.match(/Available sheets: \[(.*?)\]/);
    if (match) {
      console.log('Available sheets in active spreadsheet:', match[1]);
    } else {
      console.log('Could not extract sheets from standard error. Full text snippet:', text.substring(0, 1000));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

discoverAll().catch(console.error);
