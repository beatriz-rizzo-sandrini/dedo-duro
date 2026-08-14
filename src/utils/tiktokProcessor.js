import * as XLSX from 'xlsx';

export async function processTikTokFiles(files) {
  // files is an object: { creators, products, videos, lives }
  // each property is a File object

  const readSheet = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const rawCreator = await readSheet(files.creators);
  const rawProduct = await readSheet(files.products);
  const rawVideo = await readSheet(files.videos);
  const rawLive = await readSheet(files.lives);

  // --- Normalização (Cópia exata do backend) ---
  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    return Number(str) || 0;
  };

  const creators = rawCreator.map(row => ({
    creator_name: row['Username'] || row['Nome de Usuário'] || row['Criador'] || row['Creator Name'],
    items_sold: parseNum(row['Items sold'] || row['Itens vendidos'] || row['Itens Vendidos']),
    orders: parseNum(row['Orders'] || row['Pedidos']),
    gmv: parseNum(row['GMV']),
    refunds: parseNum(row['Refunds'] || row['Reembolsos'] || row['Cancelamentos']),
    commission: parseNum(row['Commission'] || row['Comissão']),
    video_count: parseNum(row['Number of videos'] || row['Número de vídeos'] || row['Vídeos']),
    live_count: parseNum(row['Number of LIVEs'] || row['Número de LIVEs'] || row['LIVEs']),
    live_duration_seconds: 0
  })).filter(c => c.creator_name);

  const products = rawProduct.map(row => ({
    product_name: row['Product Name'] || row['Nome do produto'],
    product_id: String(row['Product ID'] || row['ID do produto'] || ''),
    items_sold: parseNum(row['Items sold'] || row['Itens vendidos']),
    orders: parseNum(row['Orders'] || row['Pedidos']),
    gmv: parseNum(row['GMV']),
    refunds: parseNum(row['Refunds'] || row['Reembolsos'] || row['Cancelamentos']),
    commission: parseNum(row['Commission'] || row['Comissão'])
  })).filter(p => p.product_name);

  const extractProductIds = (str) => {
    if (!str) return [];
    return String(str).split(',').map(s => s.trim());
  };

  const videos = rawVideo.map(row => ({
    video_title: row['Video Title'] || row['Título do vídeo'],
    video_id: String(row['Video ID'] || row['ID do vídeo'] || ''),
    creator_name: row['Username'] || row['Nome de Usuário'],
    product_ids: extractProductIds(row['Product ID'] || row['ID do produto']),
    product_names: extractProductIds(row['Product Name'] || row['Nome do produto']),
    views: parseNum(row['Video views'] || row['Visualizações de vídeo']),
    clicks: parseNum(row['Product clicks'] || row['Cliques no produto']),
    orders: parseNum(row['Orders'] || row['Pedidos']),
    gmv: parseNum(row['GMV']),
    datetime: row['Video Publish Time'] || row['Horário de Publicação do Vídeo'] || row['Date'] || row['Data'],
    date: (row['Video Publish Time'] || row['Horário de Publicação do Vídeo'] || row['Date'] || row['Data'] || '').substring(0, 10)
  })).filter(v => v.video_title);

  const lives = rawLive.map(row => ({
    live_title: row['LIVE Title'] || row['Título da LIVE'],
    live_id: String(row['LIVE ID'] || row['ID da LIVE'] || ''),
    creator_name: row['Username'] || row['Nome de Usuário'],
    product_ids: extractProductIds(row['Product ID'] || row['ID do produto']),
    product_names: extractProductIds(row['Product Name'] || row['Nome do produto']),
    duration_seconds: parseNum(row['LIVE Duration'] || row['Duração da LIVE']),
    views: parseNum(row['LIVE views'] || row['Visualizações da LIVE']),
    clicks: parseNum(row['Product clicks'] || row['Cliques no produto']),
    orders: parseNum(row['Orders'] || row['Pedidos']),
    gmv: parseNum(row['GMV']),
    datetime: row['LIVE Start Time'] || row['Horário de Início da LIVE'] || row['Date'] || row['Data'],
    date: (row['LIVE Start Time'] || row['Horário de Início da LIVE'] || row['Date'] || row['Data'] || '').substring(0, 10)
  })).filter(l => l.live_title);

  // --- Processamento (Afinidade e Agrupamentos) ---
  const creatorMap = {};
  creators.forEach(c => creatorMap[c.creator_name] = c);

  lives.forEach(l => {
    if (l.creator_name && creatorMap[l.creator_name]) {
      creatorMap[l.creator_name].live_duration_seconds += (l.duration_seconds || 0);
    }
  });

  const productMap = {};
  products.forEach(p => productMap[p.product_id] = p);

  const unified_affinity = [];

  const addToAffinity = (item, type) => {
    const cName = item.creator_name;
    const itemGmv = item.gmv || 0;
    
    if (item.product_ids && item.product_ids.length > 0) {
      item.product_ids.forEach((pId, idx) => {
        const pName = item.product_names[idx] || productMap[pId]?.product_name || `Produto ${pId}`;
        unified_affinity.push({
          creator_name: cName,
          product_id: pId,
          product_name: pName,
          format: type,
          content_id: type === 'video' ? item.video_id : item.live_id,
          gmv_presence: itemGmv,
          orders_presence: item.orders || 0,
          views: item.views || 0,
          clicks: item.clicks || 0,
          date: item.date,
          datetime: item.datetime
        });
      });
    } else {
      unified_affinity.push({
        creator_name: cName,
        product_id: null,
        product_name: null,
        format: type,
        content_id: type === 'video' ? item.video_id : item.live_id,
        gmv_presence: itemGmv,
        orders_presence: item.orders || 0,
        views: item.views || 0,
        clicks: item.clicks || 0,
        date: item.date,
        datetime: item.datetime
      });
    }
  };

  videos.forEach(v => addToAffinity(v, 'video'));
  lives.forEach(l => addToAffinity(l, 'live'));

  // --- Auto-detect Period ---
  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';
  
  [...videos, ...lives].forEach(item => {
    if (item.date && item.date.length >= 10) {
      if (item.date < minDate) minDate = item.date;
      if (item.date > maxDate) maxDate = item.date;
    }
  });
  
  const period = minDate !== '9999-12-31' ? `${minDate.replace(/-/g,'')} - ${maxDate.replace(/-/g,'')}` : "Período Desconhecido";

  const finalData = {
    metadata: {
      generated_at: new Date().toISOString(),
      period: period,
      total_gmv: products.reduce((acc, p) => acc + (p.gmv || 0), 0)
    },
    creators,
    products,
    videos,
    lives,
    unified_affinity
  };

  return finalData;
}
