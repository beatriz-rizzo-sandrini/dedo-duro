const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsPath = 'C:\\Users\\beatriz.rizzo\\Downloads';
const files = {
  agosto_live: path.join(downloadsPath, 'vendas_live_agosto.xlsx'),
  agosto_video: path.join(downloadsPath, 'vendas_video_agosto.xlsx'),
  julho_live: path.join(downloadsPath, 'vendas_live_julho.xlsx'),
  julho_video: path.join(downloadsPath, 'vendas_video_julho.xlsx'),
};

function parseDateToDay(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(' ')[0].split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    return { day, month };
  }
  return null;
}

function parseCurrency(str) {
  if (!str) return 0;
  let s = String(str).replace('R$', '').trim();
  s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

function readSales(filePath, type, expectedMonth) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Arquivo não encontrado: ${filePath}`);
    return [];
  }
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length < 2) return [];
  const headers = data[0];
  
  const creatorIdx = headers.indexOf('Nome do criador');
  const productIdx = headers.indexOf('ID do produto');
  const salesIdx = headers.findIndex(h => h.includes('Itens vendidos'));
  const gmvIdx = headers.findIndex(h => h.includes('GMV atribuído'));
  const dateIdx = type === 'video' ? headers.indexOf('Data de publicação') : headers.indexOf('Horário de início da LIVE');
  
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[creatorIdx]) continue;
    
    let creator = String(row[creatorIdx]).trim();
    let product = row[productIdx] ? String(row[productIdx]).trim() : 'Desconhecido';
    let quantityStr = String(row[salesIdx] || '0').replace(/\./g, '');
    let quantity = parseInt(quantityStr, 10) || 0;
    
    let gmv = parseCurrency(row[gmvIdx]);
    
    let dayObj = parseDateToDay(row[dateIdx]);
    let day = null;
    if (dayObj) {
       if (dayObj.month === expectedMonth) {
         day = dayObj.day;
       }
    }
    
    result.push({ creator, product, quantity, gmv, day });
  }
  return result;
}

const dataAgostoLive = readSales(files.agosto_live, 'live', 8);
const dataAgostoVideo = readSales(files.agosto_video, 'video', 8);
const dataJulhoLive = readSales(files.julho_live, 'live', 7);
const dataJulhoVideo = readSales(files.julho_video, 'video', 7);

// 1. Group by Creator (and keep products inside for charts)
const creatorsMap = {};

function addCreatorData(records, month, type) {
  for (const r of records) {
    if (r.quantity <= 0 && r.gmv <= 0) continue;
    const key = r.creator;
    if (!creatorsMap[key]) {
      creatorsMap[key] = {
        creator: r.creator,
        julho_live: 0,
        julho_video: 0,
        agosto_live: 0,
        agosto_video: 0,
        total_items: 0,
        total_gmv: 0,
        productsMap: {}
      };
    }
    const prop = `${month}_${type}`;
    creatorsMap[key][prop] += r.quantity;
    creatorsMap[key].total_items += r.quantity;
    creatorsMap[key].total_gmv += r.gmv;
    
    if (!creatorsMap[key].productsMap[r.product]) {
        creatorsMap[key].productsMap[r.product] = {
            product: r.product,
            julho_live: 0,
            julho_video: 0,
            agosto_live: 0,
            agosto_video: 0
        };
    }
    creatorsMap[key].productsMap[r.product][prop] += r.quantity;
  }
}

addCreatorData(dataAgostoLive, 'agosto', 'live');
addCreatorData(dataAgostoVideo, 'agosto', 'video');
addCreatorData(dataJulhoLive, 'julho', 'live');
addCreatorData(dataJulhoVideo, 'julho', 'video');

const finalCreatorsArray = Object.values(creatorsMap).map(c => {
    return {
        ...c,
        products: Object.values(c.productsMap)
    }
}).sort((a, b) => b.total_items - a.total_items);

finalCreatorsArray.forEach(c => delete c.productsMap);

// 2. Group by Day for GMV
const dailyMap = {};
for(let i=1; i<=31; i++) {
    dailyMap[i] = { day: i, julho: 0, agosto: 0 };
}

function addDailyGMV(records, month) {
    for (const r of records) {
        if (r.day && r.day >= 1 && r.day <= 31) {
            dailyMap[r.day][month] += r.gmv;
        }
    }
}

addDailyGMV(dataJulhoLive, 'julho');
addDailyGMV(dataJulhoVideo, 'julho');
addDailyGMV(dataAgostoLive, 'agosto');
addDailyGMV(dataAgostoVideo, 'agosto');

// Filter out days > 11 for August since it's only up to 11 in the example (or just return all days up to max active)
let maxDay = 31;
while(maxDay > 0 && dailyMap[maxDay].julho === 0 && dailyMap[maxDay].agosto === 0) {
    maxDay--;
}
const finalDailyArray = Object.values(dailyMap).filter(d => d.day <= maxDay);

const outDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'marketplace_data.json'),
  JSON.stringify({ creators: finalCreatorsArray, dailyGMV: finalDailyArray }, null, 2),
  'utf-8'
);

console.log(`Gerado marketplace_data.json com ${finalCreatorsArray.length} criadores e dados diários até dia ${maxDay}!`);
