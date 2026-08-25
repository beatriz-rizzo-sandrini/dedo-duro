const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:\\Users\\beatriz.rizzo\\Downloads';

const readSheet = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => typeof cell === 'string' && (cell.includes('Username') || cell.includes('Nome de Usuário') || cell.includes('Product ID') || cell.includes('Video Title') || cell.includes('LIVE Title')))) {
      headerIndex = i;
      break;
    }
  }
  
  return xlsx.utils.sheet_to_json(sheet, { 
    range: headerIndex !== -1 ? headerIndex : 0,
    raw: false
  });
};

const vFile = path.join(downloadsDir, 'Transaction_Analysis_Video_List_20260701-20260731.xlsx');
const rawVideo = readSheet(vFile);

console.log("Videos raw count:", rawVideo.length);
if (rawVideo.length > 0) {
   console.log("Keys da primeira linha:", Object.keys(rawVideo[0]));
   const v0 = rawVideo[0];
   console.log("Título do vídeo:", v0['Título do vídeo'] || v0['Video Title']);
   console.log("Date:", v0['Horário de Publicação do Vídeo']);
}

const videos = rawVideo.map(row => ({
    video_title: row['Video Title'] || row['Título do vídeo'],
    date: (row['Video Publish Time'] || row['Horário de Publicação do Vídeo'] || row['Date'] || row['Data'] || '').substring(0, 10)
})).filter(v => v.video_title);

console.log("Videos filtered count:", videos.length);
if (videos.length > 0) {
  console.log("First filtered video:", videos[0]);
}

let minDate = '9999-12-31';
videos.forEach(item => {
    if (item.date && item.date.length >= 10) {
      if (item.date < minDate) minDate = item.date;
    }
});
console.log("minDate:", minDate);
