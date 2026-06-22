const axios = require('axios');
const pool = require('./db');
const cron = require('node-cron');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

const SHEET_URLS = {
  vendas: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=vendas`,
  estoque: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`,
  caminho: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=CAMINHO`,
  badstock: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=badstock`
};

const SPREADSHEET_SANDRINI_ID = '1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo';
const SPREADSHEET_BUYCLOCK_ID = '1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k';

const EXTRA_ESTOQUE_URLS = {
  sandrini: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_SANDRINI_ID}/gviz/tq?tqx=out:json&gid=1363555604`,
  buyclock: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_BUYCLOCK_ID}/export?format=csv&gid=1072598256`
};

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse do JSON do Google Sheets", error);
    return [];
  }
}

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

function cleanNumeric(val) {
  if (!val) return 0;
  const clean = val.replace(/[^0-9,\.-]/g, '').replace(',', '.');
  return Number(clean) || 0;
}

async function fetchSheetData(url) {
  const response = await axios.get(url);
  return parseGoogleJSON(response.data);
}

// ==========================================
// FUNÇÕES DE EXTRAÇÃO E LIMPEZA (Bronze -> Silver)
// ==========================================

async function syncVendas() {
  console.log('🔄 Sincronizando Vendas...');
  const isFullSync = process.argv.includes('--full');
  let url = SHEET_URLS.vendas;
  if (!isFullSync) {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    console.log(`   ⚡ Modo Otimizado Ativo: Buscando vendas desde ${dateStr} (últimos 3 dias)...`);
    const query = encodeURIComponent(`SELECT * WHERE A >= date '${dateStr}'`);
    url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=vendas&tq=${query}`;
  } else {
    console.log(`   🐘 Modo Completo Ativo: Sincronizando todo o histórico da planilha...`);
  }
  const rows = await fetchSheetData(url);
  
  // Truncate Bronze for fresh copy
  await pool.query('TRUNCATE TABLE bronze_vendas');
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const r of rows) {
      if (!r || !r.c) continue;
      const dataStr = r.c[0]?.f || r.c[0]?.v || null;
      const local = r.c[1]?.v || null;
      const sku = r.c[2]?.v || null;
      const desc = r.c[3]?.v || null;
      const qtd = r.c[4]?.v || null;

      // Inserir Bronze
      await connection.query(`
        INSERT INTO bronze_vendas (coluna_data, coluna_local, coluna_sku, coluna_descricao, coluna_quantidade) 
        VALUES (?, ?, ?, ?, ?)
      `, [dataStr, local, sku, desc, qtd]);

      // Tratar dados para Silver
      if (dataStr && dataStr.includes('/') && sku && local) {
        const [d, m, y] = dataStr.split('/');
        const dataSQL = `${y}-${m}-${d}`;
        
        await connection.query(`
          INSERT INTO silver_vendas (data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            descricao_produto = VALUES(descricao_produto),
            quantidade_vendida = VALUES(quantidade_vendida)
        `, [dataSQL, String(local).toUpperCase().trim(), String(sku).trim(), desc, Number(qtd) || 0]);
      }
    }
    
    await connection.commit();
    console.log('✅ Vendas Sincronizadas!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro em syncVendas:', err);
  } finally {
    connection.release();
  }
}

async function syncEstoque() {
  console.log('🔄 Sincronizando Estoque...');
  const rows = await fetchSheetData(SHEET_URLS.estoque);
  
  let commonStockDate = null;
  for (const r of rows) {
    if (r && r.c && (r.c[0]?.f || r.c[0]?.v)) {
      commonStockDate = r.c[0]?.f || r.c[0]?.v;
      break;
    }
  }
  if (!commonStockDate) {
    const today = new Date();
    commonStockDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
  console.log(`   🗓️ Rótulo de data a ser usado para Estoque Casa: "${commonStockDate}"`);

  let sandriniRows = [];
  try {
    console.log('   📥 Buscando estoque CD SJN da Sandrini...');
    sandriniRows = await fetchSheetData(EXTRA_ESTOQUE_URLS.sandrini);
    console.log(`   ✅ Encontradas ${sandriniRows.length} linhas para Sandrini CD SJN.`);
  } catch (err) {
    console.error('   ⚠️ Falha ao buscar estoque da Sandrini:', err.message);
  }

  let buyclockRows = [];
  try {
    console.log('   📥 Buscando estoque INVENTÁRIO_BUY da Buyclock...');
    const response = await axios.get(EXTRA_ESTOQUE_URLS.buyclock);
    const csvText = response.data;
    const lines = csvText.split(/\r?\n/);
    
    if (lines.length > 2) {
      const headers = parseCSVLine(lines[2]);
      const estoqueCasaIdx = headers.indexOf('ESTOQUE CASA');
      
      if (estoqueCasaIdx !== -1) {
        for (let i = 3; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = parseCSVLine(lines[i]);
          const sku = cols[0];
          const qtd = cols[estoqueCasaIdx];
          const cost = cols[34];
          const brand = cols[2];
          
          if (sku && sku.trim() !== '') {
            buyclockRows.push({
              sku: sku.trim(),
              qtd: Number(qtd) || 0,
              cost: cleanNumeric(cost),
              brand: brand ? brand.trim() : 'Sem Marca'
            });
          }
        }
        console.log(`   ✅ Encontrados ${buyclockRows.length} itens para Buyclock.`);
      } else {
        console.warn('   ⚠️ Coluna "ESTOQUE CASA" não encontrada na planilha da Buyclock!');
      }
    }
  } catch (err) {
    console.error('   ⚠️ Falha ao buscar estoque da Buyclock:', err.message);
  }

  await pool.query('TRUNCATE TABLE bronze_estoque');
  await pool.query('TRUNCATE TABLE silver_estoque');
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Inserir estoque principal
    for (const r of rows) {
      if (!r || !r.c) continue;
      const dataStr = r.c[0]?.f || r.c[0]?.v || null;
      const sku = r.c[1]?.v || null;
      const desc = r.c[2]?.v || null;
      const local = r.c[3]?.v || null;
      const qtd = r.c[5]?.v || null;
      const valor = r.c[6]?.v || null;

      await connection.query(`
        INSERT INTO bronze_estoque (coluna_data_atualizacao, coluna_sku, coluna_descricao, coluna_local, coluna_quantidade, coluna_valor) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [dataStr, sku, desc, local, qtd, valor]);

      if (sku && local) {
        await connection.query(`
          INSERT INTO silver_estoque (data_atualizacao, sku_produto, descricao_produto, local_estoque, quantidade_disponivel, valor_unitario)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            quantidade_disponivel = VALUES(quantidade_disponivel),
            valor_unitario = VALUES(valor_unitario),
            data_atualizacao = VALUES(data_atualizacao)
        `, [dataStr, String(sku).trim(), desc, String(local).toUpperCase().trim(), Number(qtd) || 0, Number(valor) || 0]);
      }
    }

    // 2. Inserir estoque Sandrini
    for (const r of sandriniRows) {
      if (!r || !r.c) continue;
      const sku = r.c[3]?.v || null;
      const desc = r.c[4]?.v || null;
      const brand = r.c[2]?.v || 'SANDRINI';
      const qtd = r.c[5]?.v || null;
      const cost = r.c[7]?.v || null;

      if (sku) {
        await connection.query(`
          INSERT INTO bronze_estoque (coluna_data_atualizacao, coluna_sku, coluna_descricao, coluna_local, coluna_quantidade, coluna_valor) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [commonStockDate, sku, desc, 'ESTOQUE CASA', qtd, cost]);

        await connection.query(`
          INSERT INTO silver_estoque (data_atualizacao, sku_produto, descricao_produto, marca, local_estoque, quantidade_disponivel, valor_unitario)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            quantidade_disponivel = VALUES(quantidade_disponivel),
            valor_unitario = VALUES(valor_unitario),
            data_atualizacao = VALUES(data_atualizacao)
        `, [commonStockDate, String(sku).trim(), desc, String(brand).trim(), 'ESTOQUE CASA', Number(qtd) || 0, Number(cost) || 0]);
      }
    }

    // 3. Inserir estoque Buyclock
    for (const item of buyclockRows) {
      if (item.sku) {
        await connection.query(`
          INSERT INTO bronze_estoque (coluna_data_atualizacao, coluna_sku, coluna_descricao, coluna_local, coluna_quantidade, coluna_valor) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [commonStockDate, item.sku, null, 'ESTOQUE CASA BUY CLOCK', item.qtd, item.cost]);

        await connection.query(`
          INSERT INTO silver_estoque (data_atualizacao, sku_produto, descricao_produto, marca, local_estoque, quantidade_disponivel, valor_unitario)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            quantidade_disponivel = VALUES(quantidade_disponivel),
            valor_unitario = VALUES(valor_unitario),
            data_atualizacao = VALUES(data_atualizacao)
        `, [commonStockDate, String(item.sku).trim(), null, String(item.brand).trim(), 'ESTOQUE CASA BUY CLOCK', Number(item.qtd) || 0, Number(item.cost) || 0]);
      }
    }
    
    await connection.commit();
    console.log('✅ Estoque Sincronizado!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro em syncEstoque:', err);
  } finally {
    connection.release();
  }
}

async function syncReposicao() {
  console.log('🔄 Sincronizando Reposições (Caminho)...');
  const rows = await fetchSheetData(SHEET_URLS.caminho);
  
  await pool.query('TRUNCATE TABLE bronze_caminho');
  await pool.query('TRUNCATE TABLE silver_reposicao');
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const r of rows) {
      if (!r || !r.c) continue;
      const sku = r.c[0]?.v || null;
      const desc = r.c[1]?.v || null;
      const local = r.c[2]?.v || null;
      const qtd = r.c[4]?.v || null;
      const status = r.c[5]?.v || null;
      const prev = r.c[6]?.f || r.c[6]?.v || null;
      const nf = r.c[7]?.f || r.c[7]?.v || null;

      await connection.query(`
        INSERT INTO bronze_caminho (coluna_sku, coluna_descricao, coluna_local_destino, coluna_quantidade, coluna_status, coluna_previsao, coluna_envio_nf) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [sku, desc, local, qtd, status, prev, nf]);

      if (sku && local && nf) {
        await connection.query(`
          INSERT INTO silver_reposicao (sku_produto, descricao_produto, local_destino, quantidade_enviada, status_envio, previsao_chegada, numero_nota_fiscal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            quantidade_enviada = VALUES(quantidade_enviada),
            status_envio = VALUES(status_envio),
            previsao_chegada = VALUES(previsao_chegada)
        `, [String(sku).trim(), desc, String(local).toUpperCase().trim(), Number(qtd) || 0, status, prev, String(nf).trim()]);
      }
    }
    
    await connection.commit();
    console.log('✅ Reposições Sincronizadas!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro em syncReposicao:', err);
  } finally {
    connection.release();
  }
}

async function syncBadstock() {
  console.log('🔄 Sincronizando Badstock...');
  const rows = await fetchSheetData(SHEET_URLS.badstock);
  
  await pool.query('TRUNCATE TABLE bronze_badstock');
  await pool.query('TRUNCATE TABLE silver_badstock');
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const r of rows) {
      if (!r || !r.c) continue;
      const sku = r.c[1]?.v || null;
      const local = r.c[2]?.v || null;

      await connection.query(`
        INSERT INTO bronze_badstock (coluna_sku, coluna_local) 
        VALUES (?, ?)
      `, [sku, local]);

      if (sku && local) {
        await connection.query(`
          INSERT INTO silver_badstock (sku_produto, local_badstock)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE local_badstock = VALUES(local_badstock)
        `, [String(sku).trim(), String(local).toLowerCase().trim()]);
      }
    }
    
    await connection.commit();
    console.log('✅ Badstock Sincronizado!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro em syncBadstock:', err);
  } finally {
    connection.release();
  }
}

// Sincronização Principal
async function rodarSincronizacao() {
  console.log('🚀 Iniciando Robô Sincronizador...');
  try {
    await syncVendas();
    await syncEstoque();
    await syncReposicao();
    await syncBadstock();
    console.log('🎉 Todas as bases sincronizadas com sucesso!');
  } catch (error) {
    console.error('💥 Falha geral na sincronização:', error);
  }
}

// Agendar para rodar a cada 1 hora (0 * * * *)
// cron.schedule('0 * * * *', rodarSincronizacao);

// Executa imediatamente para testar
rodarSincronizacao();
