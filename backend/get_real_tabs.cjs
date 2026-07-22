const axios = require('axios');

async function run() {
  const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
  const htmlUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
  console.log(`📡 Scraping tab names from: ${htmlUrl}`);
  
  try {
    const response = await axios.get(htmlUrl);
    const html = response.data;
    
    const tabNames = [];
    // Pattern inside Google Sheets edit HTML for tabs
    const regex = /"goog-inline-block docs-sheet-tab-caption">([^<]+)/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      tabNames.push(m[1]);
    }
    
    console.log('Tabs found in active spreadsheet:');
    console.log(tabNames);
    
    if (tabNames.length === 0) {
      // Try alternative pattern in case the Google Sheets UI HTML updated
      const altRegex = /{"name":"([^"]+)","id":\d+/g;
      const altNames = [];
      while ((m = altRegex.exec(html)) !== null) {
        if (!['Workbook', 'Global', 'Grid'].includes(m[1])) {
          altNames.push(m[1]);
        }
      }
      console.log('Alternative pattern tabs found:');
      console.log(altNames);
    }
  } catch (error) {
    console.error('Error scraping:', error.message);
  }
}

run();
