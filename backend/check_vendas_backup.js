const fs = require('fs');
const readline = require('readline');

const filePath = 'C:\\Users\\beatriz.rizzo\\Downloads\\backup_completo_supabase_2026-07-10T14-04-48-291Z (1).sql';

async function processLineByLine() {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let inVendas = false;
  let countsByMonth = {};

  for await (const line of rl) {
    if (line.includes('INSERT INTO silver_vendas')) {
        inVendas = true;
        // The first line might also contain data, e.g. VALUES (1, '2026-05-01',...)
        const matches = line.match(/\('?\d{4}-\d{2}-\d{2}'?,/g);
        if (matches) {
            for (let m of matches) {
                const date = m.replace(/[\(',]/g, '');
                const month = date.substring(0, 7);
                countsByMonth[month] = (countsByMonth[month] || 0) + 1;
            }
        }
    } else if (inVendas) {
        if (line.includes('INSERT INTO ')) {
            inVendas = false;
        } else {
            // Check for dates in the line
            const matches = line.match(/\('?\d{4}-\d{2}-\d{2}'?,/g) || line.match(/, '?(\d{4}-\d{2}-\d{2})'?,/g);
            if (matches) {
                for (let m of matches) {
                    const date = m.replace(/[\(', ]/g, '');
                    if (date.length === 10) {
                        const month = date.substring(0, 7);
                        countsByMonth[month] = (countsByMonth[month] || 0) + 1;
                    }
                }
            }
            if (line.trim().endsWith(';')) {
                inVendas = false; // end of insert statement
            }
        }
    }
  }
  
  console.log("Vendas counts by month in backup:");
  for (let month in countsByMonth) {
      console.log(`${month}: ${countsByMonth[month]}`);
  }
}

processLineByLine();
