const axios = require('axios');

async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/export?format=csv&gid=525427301';
  console.log('📡 Fetching mapping CSV from Google Sheets...');
  const res = await axios.get(url);
  const csv = res.data;
  const lines = csv.split('\n');
  console.log(`Fetched ${lines.length} lines.`);

  const targets = ['KNA1000NUB2652CN0G0007', 'KNA1000NUB2652CNGG0008', 'K10CSM2875SORTG', 'K10CSM2875SORTGG'];
  const matches = [];

  lines.forEach((line, idx) => {
    const hasTarget = targets.some(t => line.toUpperCase().includes(t.toUpperCase()));
    if (hasTarget) {
      matches.push({ lineNum: idx + 1, content: line.trim() });
    }
  });

  console.log(`Found ${matches.length} matching lines in Google Sheets:`);
  console.log(JSON.stringify(matches, null, 2));
}

run().catch(console.error);
