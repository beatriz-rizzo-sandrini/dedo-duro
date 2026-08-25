const https = require('https');
const fs = require('fs');
const path = require('path');

const sheets = [
  { id: '1AHUEmljhFrlhZTh1yepC3k5fAgpCs4l-3IHDh2Ir9es', gid: '1649902671', name: 'sheet1' },
  { id: '1sDGRCdh7KFlb_2R7pYwlI6PYzp3HNknvOcZOiM8B9rs', gid: '1649902671', name: 'sheet2' },
  { id: '1WZc1-Z4hChw4Y9bI8-xdySWdotgTsMZQTsgVX1N7s3A', gid: '1649902671', name: 'sheet3' },
  { id: '111F35ZUybND0ZCYMTACcSt9NJ4WO6g--DqnnJ4ThYvs', gid: '50728516', name: 'sheet4' }
];

function downloadCSV(sheet) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv&gid=${sheet.gid}`;
    let data = '';

    https.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.on('data', chunk => data += chunk);
          redirectRes.on('end', () => resolve({ name: sheet.name, data }));
        }).on('error', reject);
      } else {
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ name: sheet.name, data }));
      }
    }).on('error', reject);
  });
}

async function run() {
  try {
    const results = await Promise.all(sheets.map(downloadCSV));
    
    let totalRows = 0;
    
    results.forEach(result => {
        const lines = result.data.split('\n');
        // skip header
        let rowCount = lines.length > 1 ? lines.length - 1 : 0;
        
        // simple parsing
        let countByMonth = {};
        for(let i=1; i<lines.length; i++) {
            if(!lines[i].trim()) continue;
            // Assuming date is in one of the columns. Let's just find anything looking like a date DD/MM/YYYY or YYYY-MM-DD
            const dateMatch = lines[i].match(/(\d{2})\/(\d{2})\/(\d{4})/) || lines[i].match(/(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                let month;
                if (dateMatch[0].includes('/')) {
                   // DD/MM/YYYY
                   month = `${dateMatch[3]}-${dateMatch[2]}`;
                } else {
                   // YYYY-MM-DD
                   month = `${dateMatch[1]}-${dateMatch[2]}`;
                }
                countByMonth[month] = (countByMonth[month] || 0) + 1;
            }
        }
        
        console.log(`--- ${result.name} ---`);
        console.log(`Total linhas brutas: ${rowCount}`);
        console.log(`Datas encontradas:`, countByMonth);
        totalRows += rowCount;
    });
    console.log(`---`);
    console.log(`Total geral de linhas (somando as planilhas): ${totalRows}`);
  } catch(e) {
      console.error(e);
  }
}

run();
