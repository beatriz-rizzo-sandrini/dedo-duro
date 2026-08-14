const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Caminhos dos arquivos exportados
const DOWNLOADS_DIR = 'C:\\Users\\beatriz.rizzo\\Downloads';
const FILES = {
  creator: path.join(DOWNLOADS_DIR, 'Transaction_Analysis_Creator_List_20260701-20260731.xlsx'),
  live: path.join(DOWNLOADS_DIR, 'Transaction_Analysis_Live_List_20260701-20260731.xlsx'),
  product: path.join(DOWNLOADS_DIR, 'Transaction_Analysis_Product_List_20260701-20260731.xlsx'),
  video: path.join(DOWNLOADS_DIR, 'Transaction_Analysis_Video_List_20260701-20260731.xlsx')
};

// Arquivo de saída para o Frontend
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'marketplace_data_v2.json');

// Função auxiliar para converter valores monetários em números
function parseCurrency(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9,-]/g, '').replace(',', '.');
  return Number(cleaned) || 0;
}

// Função auxiliar para converter porcentagens em números
function parsePercentage(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace('%', '').replace(',', '.');
  return (Number(cleaned) || 0) / 100;
}

function parseInteger(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseInt(String(val).replace(/[^0-9-]/g, ''), 10) || 0;
}

// Ler o Excel e pegar a primeira aba (considerando que a primeira linha possa ter metadados e o cabeçalho real esteja na linha 2 ou 3)
// No TikTok, geralmente as primeiras 5 linhas tem filtros, o cabeçalho começa na linha 6
function readTikTokExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    return [];
  }
  
  console.log(`Lendo: ${path.basename(filePath)}...`);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Converte para array de arrays primeiro para pular as linhas de cabeçalho inútil
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Encontrar onde está o cabeçalho real. Vamos procurar por "Nome do criador" ou "Título"
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => typeof cell === 'string' && (cell.includes('Nome do criador') || cell.includes('ID do produto') || cell.includes('Título do vídeo') || cell.includes('Título da LIVE')))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
     console.warn(`Aviso: Cabeçalho não encontrado em ${path.basename(filePath)}, usando linha 0`);
     headerIndex = 0;
  }

  const headers = rawData[headerIndex];
  const rows = [];
  
  for (let i = headerIndex + 1; i < rawData.length; i++) {
    const rowRaw = rawData[i];
    if (!rowRaw || rowRaw.length === 0) continue;
    
    // Ignorar linhas de total
    if (String(rowRaw[0]).includes('Total')) continue;

    const rowObj = {};
    headers.forEach((header, idx) => {
      if (header) {
        rowObj[header.trim()] = rowRaw[idx];
      }
    });
    rows.push(rowObj);
  }
  
  return rows;
}

function processCreator(data) {
  return data.map(row => ({
    creator_name: row['Nome do criador'] || '',
    creator_handle: row['Identificador do criador'] || '',
    gmv: parseCurrency(row['GMV atribuído ao criador']),
    refunds: parseCurrency(row['Reembolsos']),
    commission: parseCurrency(row['Comissão estimada']),
    buyers: parseInteger(row['Clientes']),
    orders: parseInteger(row['Pedidos atribuídos']),
    items_sold: parseInteger(row['Itens vendidos atribuídos ao criador']),
    live_count: parseInteger(row['Transmissões ao vivo']),
    video_count: parseInteger(row['Vídeos']),
    live_duration_seconds: 0
  }));
}

function processProduct(data) {
  return data.map(row => ({
    product_id: String(row['ID do produto'] || ''),
    product_name: row['Nome do produto'] || '',
    gmv: parseCurrency(row['GMV atribuído ao criador']),
    refunds: parseCurrency(row['Reembolsos']),
    commission: parseCurrency(row['Comissão estimada']),
    buyers: parseInteger(row['Clientes']),
    orders: parseInteger(row['Pedidos atribuídos']),
  }));
}

function processVideo(data) {
  return data.map(row => {
    const pIdStr = String(row['ID do produto'] || '');
    const pNameStr = row['Nome do produto'] || '';
    // Format date if possible, else keep string
    let pubDate = row['Data de publicação'] || '';
    if (pubDate && typeof pubDate === 'string' && pubDate.includes('/')) {
      // Assuming DD/MM/YYYY
      const parts = pubDate.split(' ')[0].split('/');
      if (parts.length === 3) pubDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    return {
      video_id: String(row['ID do vídeo'] || ''),
      video_title: row['Título do vídeo'] || '',
      creator_name: row['Nome do criador'] || '',
      product_ids: pIdStr.split(',').map(s => s.trim()).filter(Boolean),
      product_names: pNameStr.split(',').map(s => s.trim()).filter(Boolean),
      gmv: parseCurrency(row['GMV atribuído a vídeo de afiliados']),
      views: parseInteger(row['Visualizações de vídeo']),
      clicks: parseInteger(row['Cliques no produto do vídeo']),
      orders: parseInteger(row['Pedidos atribuídos a vídeos']),
      date: pubDate,
      datetime: row['Data de publicação'] || ''
    };
  });
}

function processLive(data) {
  return data.map(row => {
    const pIdStr = String(row['ID do produto'] || '');
    const pNameStr = row['Nome do produto'] || '';
    
    let startStr = row['Horário de início da LIVE'] || '';
    let endStr = row['Horário de término da LIVE'] || '';
    let durationSec = 0;
    if (startStr && endStr) {
      const d1 = new Date(startStr);
      const d2 = new Date(endStr);
      if (!isNaN(d1) && !isNaN(d2)) {
        durationSec = Math.max(0, (d2 - d1) / 1000);
      }
    }
    
    let pubDate = startStr;
    if (pubDate && typeof pubDate === 'string' && pubDate.includes('/')) {
      const parts = pubDate.split(' ')[0].split('/');
      if (parts.length === 3) pubDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    return {
      live_id: String(row['ID da LIVE'] || ''),
      live_title: row['Título da LIVE'] || '',
      creator_name: row['Nome do criador'] || '',
      product_ids: pIdStr.split(',').map(s => s.trim()).filter(Boolean),
      product_names: pNameStr.split(',').map(s => s.trim()).filter(Boolean),
      gmv: parseCurrency(row['GMV atribuído à LIVE do criador']),
      views: parseInteger(row['Impressões']),
      clicks: parseInteger(row['Cliques no produto']),
      orders: parseInteger(row['Pedidos atribuídos à LIVE']),
      duration_seconds: durationSec,
      date: pubDate,
      datetime: startStr
    };
  });
}

async function main() {
  console.log("Iniciando consolidação dos dados do TikTok Shop...");

  const rawCreator = readTikTokExcel(FILES.creator);
  const rawProduct = readTikTokExcel(FILES.product);
  const rawVideo = readTikTokExcel(FILES.video);
  const rawLive = readTikTokExcel(FILES.live);

  const creators = processCreator(rawCreator);
  const products = processProduct(rawProduct);
  const videos = processVideo(rawVideo);
  const lives = processLive(rawLive);

  // Cross-reference dictionaries for fast lookup
  const creatorMap = {};
  creators.forEach(c => creatorMap[c.creator_name] = c);

  // Agrega duração das lives nos criadores
  lives.forEach(l => {
    if (l.creator_name && creatorMap[l.creator_name]) {
      creatorMap[l.creator_name].live_duration_seconds += (l.duration_seconds || 0);
    }
  });

  const productMap = {};
  products.forEach(p => productMap[p.product_id] = p);

  // Explode Lives & Videos into a unified (Creator, Product, Format) table for Affinity / Funnel analyses
  // Caution: GMV is not distributed evenly among products, it's just marked as "presence"
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
          // We assign GMV fully to this record for reference, but MUST CAUTION against summing them naively
          gmv_presence: itemGmv,
          orders_presence: item.orders || 0,
          views: item.views || 0,
          clicks: item.clicks || 0,
          date: item.date,
          datetime: item.datetime
        });
      });
    } else {
      // Content with no specific product ID linked
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

  const finalData = {
    metadata: {
      generated_at: new Date().toISOString(),
      period: "20260701-20260731"
    },
    creators,
    products,
    videos,
    lives,
    unified_affinity, // The exploded table requested
    raw: {
      creator_sample: rawCreator[0] || null,
      product_sample: rawProduct[0] || null,
      video_sample: rawVideo[0] || null,
      live_sample: rawLive[0] || null
    }
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalData, null, 2), 'utf-8');
  console.log(`Dados consolidados salvos localmente em: ${OUTPUT_PATH}`);
  
  // --- UPLOAD PARA SUPABASE ---
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Subindo dados para o Supabase na tabela tiktok_reports...');
  const { data, error } = await supabase
    .from('tiktok_reports')
    .insert([
      { 
        period: finalData.metadata.period,
        data: finalData 
      }
    ]);

  if (error) {
    console.error('Erro ao subir para o Supabase:', error.message);
  } else {
    console.log('✅ Upload concluído com sucesso!');
  }

  console.log(`- Criadores: ${finalData.creators.length}`);
  console.log(`- Produtos: ${finalData.products.length}`);
  console.log(`- Vídeos: ${finalData.videos.length}`);
  console.log(`- Lives: ${finalData.lives.length}`);
}

main().catch(console.error);
