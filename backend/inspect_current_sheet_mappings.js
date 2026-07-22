const axios = require('axios');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"|"$/g, ''));
}

async function run() {
  const url = `https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/export?format=csv&gid=525427301`;
  console.log('Downloading live mapping CSV...');
  const res = await axios.get(url);
  const csvText = res.data;
  const lines = csvText.split(/\r?\n/);
  console.log(`Total rows downloaded: ${lines.length}`);

  console.log('\n--- Checking row values for CAMISETADRY2350 ---');
  let matchCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('CAMISETADRY2350')) {
      matchCount++;
      const cols = parseCSVLine(line);
      console.log(`Row ${i}: SKU Sen: "${cols[0]}" | Desc Sen: "${cols[1]}" | Plat: "${cols[2]}" | SKU Plat: "${cols[3]}"`);
    }
  }
  console.log(`Total CAMISETADRY2350 matches in live Google Sheets CSV: ${matchCount}`);
}

run().catch(console.error);
