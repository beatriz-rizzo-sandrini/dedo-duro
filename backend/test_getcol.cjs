const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:\\Users\\beatriz.rizzo\\Downloads';

const parseNum = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  return Number(str) || 0;
};

const getCol = (row, ...possibleKeys) => {
  for (let key in row) {
    if (typeof key === 'string') {
      const lowerKey = key.toLowerCase();
      for (let pk of possibleKeys) {
        if (lowerKey.includes(pk.toLowerCase())) {
          return row[key];
        }
      }
    }
  }
  return undefined;
};

const processFile = (prefix) => {
  const files = fs.readdirSync(downloadsDir).filter(f => f.includes(prefix) && f.endsWith('.xlsx'));
  if (files.length === 0) return [];
  const file = path.join(downloadsDir, files[0]);
  const workbook = xlsx.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => {
      if (typeof cell !== 'string') return false;
      const s = cell.toLowerCase();
      return s.includes('username') || s.includes('nome de usuário') || s.includes('product id') || s.includes('id do produto') || s.includes('video title') || s.includes('título do vídeo') || s.includes('live title') || s.includes('título da live') || s.includes('criador');
    })) {
      headerIndex = i;
      break;
    }
  }

  const json = xlsx.utils.sheet_to_json(sheet, { 
    range: headerIndex !== -1 ? headerIndex : 0,
    raw: false
  });

  return json.map(row => {
    const newRow = {};
    for (let key in row) {
      if (row.hasOwnProperty(key)) {
        newRow[key.trim().toLowerCase()] = row[key];
      }
    }
    return newRow;
  });
};

const calculateDuration = (row) => {
  let dur = parseNum(getCol(row, 'live duration', 'duração da live'));
  if (dur) return dur;
  
  const startStr = getCol(row, 'start time', 'início');
  const endStr = getCol(row, 'end time', 'término');
  if (startStr && endStr) {
    const dStart = new Date(startStr);
    const dEnd = new Date(endStr);
    if (!isNaN(dStart) && !isNaN(dEnd)) {
      return Math.floor((dEnd - dStart) / 1000);
    }
  }
  return 0;
};

const rawLive = processFile('Transaction_Analysis_Live');
const lives = rawLive.map(row => ({
  live_title: getCol(row, 'live title', 'título da live', 'transmissão', 'live'),
  creator_name: getCol(row, 'username', 'usuário', 'criador', 'creator'),
  duration_seconds: calculateDuration(row)
})).filter(l => l.live_title);

console.log(`Parsed ${lives.length} lives`);
if (lives.length > 0) {
  console.log("First Live:", lives[0]);
}

const rawCreator = processFile('Transaction_Analysis_Creator');
const creators = rawCreator.map(row => ({
  creator_name: getCol(row, 'username', 'usuário', 'criador', 'creator'),
  live_duration_seconds: 0
})).filter(c => c.creator_name);

const creatorMap = {};
creators.forEach(c => creatorMap[c.creator_name] = c);

lives.forEach(l => {
  if (l.creator_name && creatorMap[l.creator_name]) {
    creatorMap[l.creator_name].live_duration_seconds += (l.duration_seconds || 0);
  }
});

console.log("Creator Map anderson:", creatorMap['anderson_oficial___']);
