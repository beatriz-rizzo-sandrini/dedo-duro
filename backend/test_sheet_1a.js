const axios = require('axios');

async function test() {
  const spreadsheetId = '1A_K3440z4w-vwryh3SgssPIa4MlsZn3k987ksbx80vU';
  console.log(`Downloading first tab of spreadsheet ${spreadsheetId} as CSV...`);
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    const res = await axios.get(url);
    const text = res.data;
    const lines = text.split(/\r?\n/);
    console.log(`Total rows downloaded: ${lines.length}`);
    console.log('Sample rows (first 5):');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      console.log(`Row ${i}: ${lines[i]}`);
    }
  } catch (error) {
    console.error('Error fetching sheet 1A:', error.message);
  }
}

test().catch(console.error);
