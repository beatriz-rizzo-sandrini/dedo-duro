const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
require('dotenv').config();

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Iniciando sincronização do Supabase para o MySQL local...');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dedo_duro',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const connection = await pool.getConnection();

  try {
    console.log('Garantindo existência da tabela silver_mapeamento_sku local...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS silver_mapeamento_sku (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku_plataforma VARCHAR(255) NOT NULL,
        plataforma VARCHAR(255) NOT NULL,
        sku_senior VARCHAR(255),
        descricao_oficial VARCHAR(255),
        marca_oficial VARCHAR(255),
        UNIQUE KEY uk_mapeamento (sku_plataforma, plataforma)
      ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 1. Sincronizar silver_vendas
    console.log('Sincronizando silver_vendas...');
    await connection.query('TRUNCATE TABLE silver_vendas');
    
    let allVendas = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_vendas')
        .select('data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida')
        .range(from, from + limit - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      allVendas = allVendas.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }
    console.log(`Vendas baixadas: ${allVendas.length} registros.`);
    
    const loteVendas = 2000;
    for (let i = 0; i < allVendas.length; i += loteVendas) {
      const chunk = allVendas.slice(i, i + loteVendas);
      const values = chunk.map(r => [
        r.data_venda,
        r.local_venda,
        r.sku_produto,
        r.descricao_produto,
        Number(r.quantidade_vendida) || 0
      ]);
      await connection.query(`
        INSERT INTO silver_vendas (data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
          descricao_produto = VALUES(descricao_produto),
          quantidade_vendida = VALUES(quantidade_vendida)
      `, [values]);
      console.log(`- Vendas enviadas: ${i + chunk.length} de ${allVendas.length}...`);
    }
    
    // 2. Sincronizar silver_estoque
    console.log('Sincronizando silver_estoque...');
    await connection.query('TRUNCATE TABLE silver_estoque');
    
    let allEstoque = [];
    from = 0;
    hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_estoque')
        .select('data_atualizacao, sku_produto, descricao_produto, local_estoque, quantidade_disponivel, valor_unitario')
        .range(from, from + limit - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      allEstoque = allEstoque.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }
    console.log(`Estoque baixado: ${allEstoque.length} registros.`);
    
    for (let i = 0; i < allEstoque.length; i += loteVendas) {
      const chunk = allEstoque.slice(i, i + loteVendas);
      const values = chunk.map(r => [
        r.data_atualizacao,
        r.sku_produto,
        r.descricao_produto,
        r.local_estoque,
        Number(r.quantidade_disponivel) || 0,
        Number(r.valor_unitario) || 0
      ]);
      await connection.query(`
        INSERT INTO silver_estoque (data_atualizacao, sku_produto, descricao_produto, local_estoque, quantidade_disponivel, valor_unitario)
        VALUES ?
        ON DUPLICATE KEY UPDATE 
          descricao_produto = VALUES(descricao_produto),
          quantidade_disponivel = VALUES(quantidade_disponivel),
          valor_unitario = VALUES(valor_unitario)
      `, [values]);
      console.log(`- Estoque enviado: ${i + chunk.length} de ${allEstoque.length}...`);
    }

    // 3. Sincronizar silver_reposicao
    console.log('Sincronizando silver_reposicao...');
    await connection.query('TRUNCATE TABLE silver_reposicao');
    
    let allReposicao = [];
    from = 0;
    hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_reposicao')
        .select('sku_produto, descricao_produto, local_destino, quantidade_enviada, status_envio, previsao_chegada, numero_nota_fiscal')
        .range(from, from + limit - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      allReposicao = allReposicao.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }
    console.log(`Reposições baixadas: ${allReposicao.length} registros.`);
    
    if (allReposicao.length > 0) {
      for (let i = 0; i < allReposicao.length; i += loteVendas) {
        const chunk = allReposicao.slice(i, i + loteVendas);
        const values = chunk.map(r => [
          r.sku_produto,
          r.descricao_produto,
          r.local_destino,
          Number(r.quantidade_enviada) || 0,
          r.status_envio,
          r.previsao_chegada,
          r.numero_nota_fiscal
        ]);
        await connection.query(`
          INSERT INTO silver_reposicao (sku_produto, descricao_produto, local_destino, quantidade_enviada, status_envio, previsao_chegada, numero_nota_fiscal)
          VALUES ?
          ON DUPLICATE KEY UPDATE 
            descricao_produto = VALUES(descricao_produto),
            quantidade_enviada = VALUES(quantidade_enviada),
            status_envio = VALUES(status_envio),
            previsao_chegada = VALUES(previsao_chegada)
        `, [values]);
        console.log(`- Reposições enviadas: ${i + chunk.length} de ${allReposicao.length}...`);
      }
    }

    // 4. Sincronizar silver_badstock
    console.log('Sincronizando silver_badstock...');
    await connection.query('TRUNCATE TABLE silver_badstock');
    
    let allBadstock = [];
    from = 0;
    hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_badstock')
        .select('sku_produto, local_badstock')
        .range(from, from + limit - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      allBadstock = allBadstock.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }
    console.log(`Badstock baixado: ${allBadstock.length} registros.`);
    
    if (allBadstock.length > 0) {
      for (let i = 0; i < allBadstock.length; i += loteVendas) {
        const chunk = allBadstock.slice(i, i + loteVendas);
        const values = chunk.map(r => [
          r.sku_produto,
          r.local_badstock
        ]);
        await connection.query(`
          INSERT INTO silver_badstock (sku_produto, local_badstock)
          VALUES ?
          ON DUPLICATE KEY UPDATE 
            local_badstock = VALUES(local_badstock)
        `, [values]);
        console.log(`- Badstock enviado: ${i + chunk.length} de ${allBadstock.length}...`);
      }
    }

    // 5. Sincronizar silver_mapeamento_sku
    console.log('Sincronizando silver_mapeamento_sku...');
    await connection.query('TRUNCATE TABLE silver_mapeamento_sku');
    
    let allMapeamentos = [];
    from = 0;
    hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_mapeamento_sku')
        .select('sku_plataforma, plataforma, sku_senior, descricao_oficial, marca_oficial')
        .range(from, from + limit - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      allMapeamentos = allMapeamentos.concat(data);
      hasMore = data.length === limit;
      from += limit;
    }
    console.log(`Mapeamento baixado: ${allMapeamentos.length} registros.`);
    
    if (allMapeamentos.length > 0) {
      for (let i = 0; i < allMapeamentos.length; i += loteVendas) {
        const chunk = allMapeamentos.slice(i, i + loteVendas);
        const values = chunk.map(r => [
          r.sku_plataforma,
          r.plataforma,
          r.sku_senior,
          r.descricao_oficial,
          r.marca_oficial
        ]);
        await connection.query(`
          INSERT INTO silver_mapeamento_sku (sku_plataforma, plataforma, sku_senior, descricao_oficial, marca_oficial)
          VALUES ?
          ON DUPLICATE KEY UPDATE 
            sku_senior = VALUES(sku_senior),
            descricao_oficial = VALUES(descricao_oficial),
            marca_oficial = VALUES(marca_oficial)
        `, [values]);
        console.log(`- Mapeamento enviado: ${i + chunk.length} de ${allMapeamentos.length}...`);
      }
    }

    console.log('Sincronização concluída com sucesso. Banco local atualizado com o Supabase.');

  } catch (error) {
    console.error('Erro durante a sincronização:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
