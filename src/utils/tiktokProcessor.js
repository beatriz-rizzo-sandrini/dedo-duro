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
          
          // Converter para array de arrays para descobrir a linha do cabeçalho
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let headerIndex = -1;
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (row && row.some(cell => {
              if (typeof cell !== 'string') return false;
              const s = cell.toLowerCase();
              return s.includes('username') || s.includes('nome de usuário') || s.includes('product id') || s.includes('id do produto') || s.includes('video title') || s.includes('título do vídeo') || s.includes('live title') || s.includes('título da live');
            })) {
              headerIndex = i;
              break;
            }
          }
          
          // Se não encontrou, assume 0. Se encontrou, usa o range. raw: false garante que as datas venham formatadas como string.
          const json = XLSX.utils.sheet_to_json(worksheet, { 
            range: headerIndex !== -1 ? headerIndex : 0,
            raw: false
          });
          
          // Normaliza todas as chaves para lowercase para evitar problemas de case no Excel do TikTok
          const normalizedJson = json.map(row => {
            const newRow = {};
            for (let key in row) {
              if (row.hasOwnProperty(key)) {
                newRow[key.trim().toLowerCase()] = row[key];
              }
            }
            return newRow;
          });
          
          resolve(normalizedJson);
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

  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    return Number(str) || 0;
  };

  const parseToISO = (str) => {
    if (!str) return '';
    const datePart = String(str).substring(0, 10);
    const parts = datePart.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) { // MM/DD/YYYY or DD/MM/YYYY
        let m = Number(parts[0]);
        let d = Number(parts[1]);
        if (m > 12) {
          d = Number(parts[0]);
          m = Number(parts[1]);
        }
        return `${parts[2]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      } else if (parts[0].length === 4) { // YYYY-MM-DD
        return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
      }
    }
    return datePart;
  };

  const creators = rawCreator.map(row => ({
    creator_name: row['username'] || row['nome de usuário'] || row['criador'] || row['creator name'],
    items_sold: parseNum(row['items sold'] || row['itens vendidos']),
    orders: parseNum(row['orders'] || row['pedidos']),
    gmv: parseNum(row['gmv']),
    refunds: parseNum(row['refunds'] || row['reembolsos'] || row['cancelamentos']),
    commission: parseNum(row['commission'] || row['comissão']),
    video_count: parseNum(row['number of videos'] || row['número de vídeos'] || row['vídeos']),
    live_count: parseNum(row['number of lives'] || row['número de lives'] || row['lives']),
    live_duration_seconds: 0
  })).filter(c => c.creator_name);

  const products = rawProduct.map(row => ({
    product_name: row['product name'] || row['nome do produto'],
    product_id: String(row['product id'] || row['id do produto'] || ''),
    items_sold: parseNum(row['items sold'] || row['itens vendidos']),
    orders: parseNum(row['orders'] || row['pedidos']),
    gmv: parseNum(row['gmv']),
    refunds: parseNum(row['refunds'] || row['reembolsos'] || row['cancelamentos']),
    commission: parseNum(row['commission'] || row['comissão'])
  })).filter(p => p.product_name);

  const extractProductIds = (str) => {
    if (!str) return [];
    return String(str).split(',').map(s => s.trim());
  };

  const videos = rawVideo.map(row => ({
    video_title: row['video title'] || row['título do vídeo'],
    video_id: String(row['video id'] || row['id do vídeo'] || ''),
    creator_name: row['username'] || row['nome de usuário'],
    product_ids: extractProductIds(row['product id'] || row['id do produto']),
    product_names: extractProductIds(row['product name'] || row['nome do produto']),
    views: parseNum(row['video views'] || row['visualizações de vídeo']),
    clicks: parseNum(row['product clicks'] || row['cliques no produto']),
    orders: parseNum(row['orders'] || row['pedidos']),
    gmv: parseNum(row['gmv']),
    datetime: row['video publish time'] || row['horário de publicação do vídeo'] || row['date'] || row['data'],
    date: parseToISO(row['video publish time'] || row['horário de publicação do vídeo'] || row['date'] || row['data'])
  })).filter(v => v.video_title);

  const lives = rawLive.map(row => ({
    live_title: row['live title'] || row['título da live'],
    live_id: String(row['live id'] || row['id da live'] || ''),
    creator_name: row['username'] || row['nome de usuário'],
    product_ids: extractProductIds(row['product id'] || row['id do produto']),
    product_names: extractProductIds(row['product name'] || row['nome do produto']),
    duration_seconds: parseNum(row['live duration'] || row['duração da live']),
    views: parseNum(row['live views'] || row['visualizações da live']),
    clicks: parseNum(row['product clicks'] || row['cliques no produto']),
    orders: parseNum(row['orders'] || row['pedidos']),
    gmv: parseNum(row['gmv']),
    datetime: row['live start time'] || row['horário de início da live'] || row['date'] || row['data'],
    date: parseToISO(row['live start time'] || row['horário de início da live'] || row['date'] || row['data'])
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
  let minDateStr = '9999-12-31';
  let maxDateStr = '0000-01-01';
  
  [...videos, ...lives].forEach(item => {
    if (item.date && item.date.length >= 10) {
      if (item.date < minDateStr) minDateStr = item.date;
      if (item.date > maxDateStr) maxDateStr = item.date;
    }
  });
  
  const formatBr = (dStr) => {
    const p = dStr.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return dStr;
  };
  
  const period = minDateStr !== '9999-12-31' ? `${formatBr(minDateStr)} - ${formatBr(maxDateStr)}` : "Período Desconhecido";

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

export function mergeMarketplaceData(reportsArray) {
  if (!reportsArray || reportsArray.length === 0) return null;
  if (reportsArray.length === 1) return reportsArray[0].data;

  // 1. Desduplicação por Período
  // reportsArray contém objetos do Supabase: { created_at, period, data }
  const latestPerPeriod = {};
  reportsArray.forEach(row => {
    const p = row.period || row.data.metadata.period || "unknown";
    if (!latestPerPeriod[p]) {
      latestPerPeriod[p] = row.data;
      latestPerPeriod[p]._created_at = row.created_at;
    } else if (new Date(row.created_at) > new Date(latestPerPeriod[p]._created_at)) {
      latestPerPeriod[p] = row.data;
      latestPerPeriod[p]._created_at = row.created_at;
    }
  });

  const validDataList = Object.values(latestPerPeriod);

  // 2. Fundir os dados
  const merged = {
    metadata: {
      generated_at: new Date().toISOString(),
      period: "Consolidado",
      total_gmv: 0
    },
    creators: [],
    products: [],
    videos: [],
    lives: [],
    unified_affinity: []
  };

  const creatorMap = {};
  const productMap = {};
  const videoMap = {};
  const liveMap = {};
  const affinityMap = {};

  let minDateStr = '9999-12-31';
  let maxDateStr = '0000-01-01';

  validDataList.forEach(data => {
    merged.metadata.total_gmv += (data.metadata.total_gmv || 0);

    // Creators
    (data.creators || []).forEach(c => {
      if (!c.creator_name) return;
      if (!creatorMap[c.creator_name]) {
        creatorMap[c.creator_name] = { ...c };
      } else {
        const mc = creatorMap[c.creator_name];
        mc.items_sold = (mc.items_sold || 0) + (c.items_sold || 0);
        mc.orders = (mc.orders || 0) + (c.orders || 0);
        mc.gmv = (mc.gmv || 0) + (c.gmv || 0);
        mc.refunds = (mc.refunds || 0) + (c.refunds || 0);
        mc.commission = (mc.commission || 0) + (c.commission || 0);
        mc.video_count = (mc.video_count || 0) + (c.video_count || 0);
        mc.live_count = (mc.live_count || 0) + (c.live_count || 0);
        mc.live_duration_seconds = (mc.live_duration_seconds || 0) + (c.live_duration_seconds || 0);
      }
    });

    // Products
    (data.products || []).forEach(p => {
      if (!p.product_id) return;
      if (!productMap[p.product_id]) {
        productMap[p.product_id] = { ...p };
      } else {
        const mp = productMap[p.product_id];
        mp.items_sold = (mp.items_sold || 0) + (p.items_sold || 0);
        mp.orders = (mp.orders || 0) + (p.orders || 0);
        mp.gmv = (mp.gmv || 0) + (p.gmv || 0);
        mp.refunds = (mp.refunds || 0) + (p.refunds || 0);
        mp.commission = (mp.commission || 0) + (p.commission || 0);
      }
    });

    // Videos
    (data.videos || []).forEach(v => {
      if (!v.video_id) return;
      if (!videoMap[v.video_id]) {
        videoMap[v.video_id] = { ...v };
        if (v.date && v.date.length >= 10) {
          if (v.date < minDateStr) minDateStr = v.date;
          if (v.date > maxDateStr) maxDateStr = v.date;
        }
      }
    });

    // Lives
    (data.lives || []).forEach(l => {
      if (!l.live_id) return;
      if (!liveMap[l.live_id]) {
        liveMap[l.live_id] = { ...l };
        if (l.date && l.date.length >= 10) {
          if (l.date < minDateStr) minDateStr = l.date;
          if (l.date > maxDateStr) maxDateStr = l.date;
        }
      }
    });

    // Affinity
    (data.unified_affinity || []).forEach(a => {
      const key = `${a.content_id}_${a.product_id}`;
      if (!affinityMap[key]) {
        affinityMap[key] = { ...a };
      }
    });
  });

  const formatBr = (dStr) => {
    const p = dStr.split('-');
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return dStr;
  };

  if (minDateStr !== '9999-12-31' && maxDateStr !== '0000-01-01') {
    merged.metadata.period = `${formatBr(minDateStr)} - ${formatBr(maxDateStr)}`;
  }

  merged.creators = Object.values(creatorMap);
  merged.products = Object.values(productMap);
  merged.videos = Object.values(videoMap);
  merged.lives = Object.values(liveMap);
  merged.unified_affinity = Object.values(affinityMap);

  return merged;
}
