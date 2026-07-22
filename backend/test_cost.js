// Use global fetch

async function checkBuyclock() {
  try {
    const url = 'https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1072598256';
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    
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
    
    for (let i = 3; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const sku = String(cols[0] || '').trim().toUpperCase();
      if (sku === 'SA0007011SACMCNCN0G0336') {
        const costVal = cols[34];
        console.log('FOUND IN BUYCLOCK CSV:', sku);
        console.log('Raw cost value string:', costVal);
        const parsedCost = Number(String(costVal || '').replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;
        console.log('Parsed cost Number:', parsedCost);
        console.log('Math test (parsedCost * 22714):', parsedCost * 22714);
      }
    }
  } catch(e) { console.error(e); }
}

checkBuyclock();
