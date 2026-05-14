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

async function fetchSheetData(url) {
  const response = await axios.get(url);
  return parseGoogleJSON(response.data);
}

// ==========================================
// FUNÇÕES DE EXTRAÇÃO E LIMPEZA (Bronze -> Silver)
// ==========================================

async function syncVendas() {
  console.log('🔄 Sincronizando Vendas...');
  const rows = await fetchSheetData(SHEET_URLS.vendas);
  
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
  
  await pool.query('TRUNCATE TABLE bronze_estoque');
  // Truncate silver to keep it as a "snapshot" of the current moment as user wants (since they delete daily)
  // Wait! The user deletes old sales. Stock is a static snapshot. Let's just clear silver_estoque and reload it.
  await pool.query('TRUNCATE TABLE silver_estoque');
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
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
