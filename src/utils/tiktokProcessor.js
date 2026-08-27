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
              if (Object.prototype.hasOwnProperty.call(row, key)) {
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

  const cleanStr = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const getCol = (row, ...possibleKeys) => {
    // 1. Busca exata de prioridade (ignorando maiúsculas e acentos)
    for (let pk of possibleKeys) {
      const cleanPk = cleanStr(pk);
      for (let key in row) {
        if (cleanStr(key) === cleanPk) {
          return row[key];
        }
      }
    }

    // 2. Busca por substring, ignorando colunas de duração e taxa quando não solicitadas
    for (let pk of possibleKeys) {
      const cleanPk = cleanStr(pk);
      for (let key in row) {
        const cleanKey = cleanStr(key);
        if (!cleanPk.includes('duracao') && !cleanPk.includes('tempo') && (cleanKey.includes('duracao') || cleanKey.includes('taxa') || cleanKey.includes('tempo medio') || cleanKey.includes('aov') || cleanKey.includes('gpm'))) {
          continue;
        }
        if (cleanKey.includes(cleanPk)) {
          return row[key];
        }
      }
    }
    return undefined;
  };

  const creators = rawCreator.map(row => ({
    creator_name: getCol(row, 'nome do criador', 'username', 'usuário', 'criador', 'creator'),
    items_sold: parseNum(getCol(row, 'itens vendidos atribuídos ao criador', 'itens vendidos', 'items sold', 'vendidos')),
    orders: parseNum(getCol(row, 'pedidos atribuídos', 'orders', 'pedido')),
    gmv: parseNum(getCol(row, 'gmv atribuído ao criador', 'gmv', 'receita')),
    refunds: parseNum(getCol(row, 'reembolsos', 'refunds', 'cancelamento')),
    commission: parseNum(getCol(row, 'comissão estimada', 'comissão', 'commission')),
    video_count: parseNum(getCol(row, 'vídeos', 'number of videos', 'número de vídeos')),
    live_count: parseNum(getCol(row, 'transmissões ao vivo', 'number of lives', 'número de lives', 'lives')),
    live_duration_seconds: 0
  })).filter(c => c.creator_name);

  const products = rawProduct.map(row => ({
    product_name: getCol(row, 'nome do produto', 'product name'),
    product_id: String(getCol(row, 'id do produto', 'product id') || ''),
    items_sold: parseNum(getCol(row, 'itens vendidos atribuídos ao criador', 'itens vendidos', 'items sold', 'vendidos')),
    orders: parseNum(getCol(row, 'pedidos atribuídos', 'orders', 'pedido')),
    gmv: parseNum(getCol(row, 'gmv atribuído ao criador', 'gmv', 'receita')),
    refunds: parseNum(getCol(row, 'reembolsos', 'refunds', 'cancelamento')),
    commission: parseNum(getCol(row, 'comissão estimada', 'comissão', 'commission'))
  })).filter(p => p.product_name);

  const extractProductIds = (str) => {
    if (!str) return [];
    return String(str).split(',').map(s => s.trim());
  };

  const videos = rawVideo.map(row => ({
    video_title: getCol(row, 'título do vídeo', 'título', 'video title', 'vídeo', 'video') || 'Vídeo sem título',
    video_id: String(getCol(row, 'id do vídeo', 'video id') || ''),
    creator_name: getCol(row, 'nome do criador', 'username', 'usuário', 'criador', 'creator'),
    product_ids: extractProductIds(getCol(row, 'id do produto', 'product id')),
    product_names: extractProductIds(getCol(row, 'nome do produto', 'product name')),
    views: parseNum(getCol(row, 'visualizações de vídeo', 'visualizações', 'video views', 'impressões do produto em vídeos', 'impressões', 'views', 'view')),
    clicks: parseNum(getCol(row, 'cliques no produto do vídeo', 'cliques no produto', 'cliques', 'product clicks', 'click')),
    orders: parseNum(getCol(row, 'pedidos atribuídos a vídeos', 'pedidos atribuídos', 'pedidos', 'orders', 'pedido')),
    gmv: parseNum(getCol(row, 'gmv atribuído a vídeo de afiliados', 'gmv atribuído', 'gmv', 'receita', 'faturamento')),
    datetime: getCol(row, 'data de publicação', 'publicação', 'publish time', 'date', 'data', 'horário'),
    date: parseToISO(getCol(row, 'data de publicação', 'publicação', 'publish time', 'date', 'data', 'horário'))
  })).filter(v => v.video_id || v.creator_name);

  const calculateDuration = (row) => {
    let dur = parseNum(getCol(row, 'duração da live', 'live duration', 'duração', 'duracao'));
    if (dur) return dur;
    
    const startStr = getCol(row, 'horário de início da live', 'início', 'inicio', 'start time');
    const endStr = getCol(row, 'horário de término da live', 'término', 'termino', 'fim', 'end time');
    if (startStr && endStr) {
      const dStart = new Date(startStr);
      const dEnd = new Date(endStr);
      if (!isNaN(dStart) && !isNaN(dEnd)) {
        return Math.floor((dEnd - dStart) / 1000);
      }
    }
    return 0;
  };

  const lives = rawLive.map(row => ({
    live_title: getCol(row, 'título da live', 'título', 'live title', 'transmissão', 'live') || 'Live sem título',
    live_id: String(getCol(row, 'id da live', 'live id') || ''),
    creator_name: getCol(row, 'nome do criador', 'username', 'usuário', 'criador', 'creator'),
    product_ids: extractProductIds(getCol(row, 'id do produto', 'product id')),
    product_names: extractProductIds(getCol(row, 'nome do produto', 'product name')),
    duration_seconds: calculateDuration(row),
    views: parseNum(getCol(row, 'impressões', 'impressões de produtos em lives', 'espectadores', 'visualizações de vídeo', 'visualizações', 'live views', 'views')),
    clicks: parseNum(getCol(row, 'cliques no produto', 'cliques', 'product clicks', 'click')),
    orders: parseNum(getCol(row, 'pedidos atribuídos à live', 'pedidos atribuídos', 'pedidos', 'orders', 'pedido')),
    gmv: parseNum(getCol(row, 'gmv atribuído à live do criador', 'gmv atribuído', 'gmv', 'receita', 'faturamento')),
    datetime: getCol(row, 'horário de início da live', 'início', 'inicio', 'start time', 'date', 'data', 'horário'),
    date: parseToISO(getCol(row, 'horário de início da live', 'início', 'inicio', 'start time', 'date', 'data', 'horário'))
  })).filter(l => l.live_id || l.creator_name);

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

  let detectedPeriod = null;
  const fileArray = Object.values(files);
  for (let f of fileArray) {
    if (f && f.name) {
      const match = f.name.match(/(\d{8})[-_](\d{8})/);
      if (match) {
        const start = match[1];
        const end = match[2];
        const formatBrFromCompact = (str) => `${str.slice(6,8)}/${str.slice(4,6)}/${str.slice(0,4)}`;
        detectedPeriod = `${formatBrFromCompact(start)} - ${formatBrFromCompact(end)}`;
        break;
      }
    }
  }
  
  const period = detectedPeriod || `Importação_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}_${Math.floor(Math.random() * 10000)}`;

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

  let periodMinDate = null;
  let periodMaxDate = null;

  validDataList.forEach(data => {
    merged.metadata.total_gmv += (data.metadata.total_gmv || 0);

    if (data.metadata && data.metadata.period && data.metadata.period.includes('-')) {
      const parts = data.metadata.period.split('-');
      if (parts.length === 2) {
        const parseDate = (dStr) => {
          const p = dStr.trim().split('/');
          if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`);
          return new Date(dStr.trim());
        };
        const d1 = parseDate(parts[0]);
        const d2 = parseDate(parts[1]);
        if (!isNaN(d1)) {
          if (!periodMinDate || d1 < periodMinDate) periodMinDate = d1;
          if (!periodMaxDate || d1 > periodMaxDate) periodMaxDate = d1;
        }
        if (!isNaN(d2)) {
          if (!periodMinDate || d2 < periodMinDate) periodMinDate = d2;
          if (!periodMaxDate || d2 > periodMaxDate) periodMaxDate = d2;
        }
      }
    }

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
      } else {
        const mv = videoMap[v.video_id];
        mv.gmv = (mv.gmv || 0) + (v.gmv || 0);
        mv.orders = (mv.orders || 0) + (v.orders || 0);
        mv.views = (mv.views || 0) + (v.views || 0);
        mv.clicks = (mv.clicks || 0) + (v.clicks || 0);
      }
    });

    // Lives
    (data.lives || []).forEach(l => {
      if (!l.live_id) return;
      if (!liveMap[l.live_id]) {
        liveMap[l.live_id] = { ...l };
      } else {
        const ml = liveMap[l.live_id];
        ml.gmv = (ml.gmv || 0) + (l.gmv || 0);
        ml.orders = (ml.orders || 0) + (l.orders || 0);
        ml.views = (ml.views || 0) + (l.views || 0);
        ml.clicks = (ml.clicks || 0) + (l.clicks || 0);
        ml.duration_seconds = (ml.duration_seconds || 0) + (l.duration_seconds || 0);
      }
    });

    // Affinity
    (data.unified_affinity || []).forEach(a => {
      const key = `${a.content_id}_${a.product_id}`;
      if (!affinityMap[key]) {
        affinityMap[key] = { ...a };
      } else {
        const ma = affinityMap[key];
        ma.gmv_presence = (ma.gmv_presence || 0) + (a.gmv_presence || 0);
        ma.orders_presence = (ma.orders_presence || 0) + (a.orders_presence || 0);
        ma.views = (ma.views || 0) + (a.views || 0);
        ma.clicks = (ma.clicks || 0) + (a.clicks || 0);
      }
    });
  });

  if (periodMinDate && periodMaxDate) {
    const fmt = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
    merged.metadata.period = `${fmt(periodMinDate)} - ${fmt(periodMaxDate)}`;
  }

  merged.creators = Object.values(creatorMap);
  merged.products = Object.values(productMap);
  merged.videos = Object.values(videoMap);
  merged.lives = Object.values(liveMap);
  merged.unified_affinity = Object.values(affinityMap);

  return merged;
}
