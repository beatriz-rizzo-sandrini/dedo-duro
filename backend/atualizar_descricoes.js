const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('./db');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const EXCEL_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', 'Produtos Senior_padronizado_v5.xlsx');

// Auxiliar pagination function for Supabase
async function fetchTable(tableName, selectFields) {
  let allData = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Erro ao buscar ${tableName}: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allData;
}

// Auxiliar bulk upsert function for Supabase
async function upsertEmLotes(tabela, dados, onConflict, tamanhoLote = 500) {
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict });
    if (error) {
      console.error(`   ❌ Erro ao atualizar lote em ${tabela}:`, error.message);
      throw error;
    }
    console.log(`   📦 Lote ${i / tamanhoLote + 1}: ${lote.length} registros atualizados em ${tabela}...`);
  }
}

async function run() {
  console.log('🚀 Iniciando script de atualização de descrições...');

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Arquivo Excel não encontrado em: ${EXCEL_PATH}`);
    process.exit(1);
  }

  // 1. Ler o arquivo Excel e montar o mapa SKU -> Descrição Padronizada
  console.log(`📖 Carregando planilha: ${EXCEL_PATH}...`);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const skuMap = {};
  
  // Encontrar nomes corretos de colunas (tratando encoding corrompido no Excel)
  let skuColName = null;
  let descColName = null;

  if (rows.length > 0) {
    const sample = rows[0];
    for (const key of Object.keys(sample)) {
      const cleanKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cleanKey.includes('cdigo do produto') || cleanKey.includes('codigo do produto') || cleanKey === 'sku') {
        skuColName = key;
      }
      if (cleanKey === 'descricao_padronizada') {
        descColName = key;
      }
    }
  }

  if (!skuColName || !descColName) {
    console.error('❌ Não foi possível mapear as colunas SKU ou descricao_padronizada no Excel.');
    console.error('Colunas encontradas:', rows.length > 0 ? Object.keys(rows[0]) : 'Nenhuma');
    process.exit(1);
  }

  console.log(`🔎 Mapeando SKU via coluna: "${skuColName}" e Descrição via coluna: "${descColName}"`);

  let loadedCount = 0;
  for (const row of rows) {
    const sku = String(row[skuColName] || '').trim();
    const desc = String(row[descColName] || '').trim();
    if (sku && desc) {
      skuMap[sku] = desc;
      loadedCount++;
    }
  }

  console.log(`✅ Mapa criado com ${loadedCount} SKUs padronizados.`);

  // 2. ATUALIZAR MYSQL LOCAL
  console.log('\n💻 2. Iniciando atualização no MySQL Local (localhost)...');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let localEstoqueCount = 0;
    let localVendasCount = 0;
    let localReposicaoCount = 0;

    console.log('   🔍 Coletando SKUs únicos existentes no MySQL local...');
    const [vendasRows] = await connection.query('SELECT DISTINCT sku_produto FROM silver_vendas');
    const [estoqueRows] = await connection.query('SELECT DISTINCT sku_produto FROM silver_estoque');
    const [reposicaoRows] = await connection.query('SELECT DISTINCT sku_produto FROM silver_reposicao');

    const localVendasSkus = new Set(vendasRows.map(r => r.sku_produto));
    const localEstoqueSkus = new Set(estoqueRows.map(r => r.sku_produto));
    const localReposicaoSkus = new Set(reposicaoRows.map(r => r.sku_produto));

    console.log(`   📊 Encontrados SKUs no MySQL: ${localEstoqueSkus.size} no estoque, ${localVendasSkus.size} nas vendas, ${localReposicaoSkus.size} nas reposições`);

    console.log('   🔄 Atualizando descrições no MySQL...');

    // Atualizar estoque
    for (const sku of localEstoqueSkus) {
      const desc = skuMap[sku];
      if (desc) {
        const [resEstoque] = await connection.query(
          'UPDATE silver_estoque SET descricao_produto = ? WHERE sku_produto = ? AND (descricao_produto IS NULL OR descricao_produto != ?)',
          [desc, sku, desc]
        );
        localEstoqueCount += resEstoque.affectedRows;
      }
    }

    // Atualizar vendas
    for (const sku of localVendasSkus) {
      const desc = skuMap[sku];
      if (desc) {
        const [resVendas] = await connection.query(
          'UPDATE silver_vendas SET descricao_produto = ? WHERE sku_produto = ? AND (descricao_produto IS NULL OR descricao_produto != ?)',
          [desc, sku, desc]
        );
        localVendasCount += resVendas.affectedRows;
      }
    }

    // Atualizar reposições
    for (const sku of localReposicaoSkus) {
      const desc = skuMap[sku];
      if (desc) {
        const [resReposicao] = await connection.query(
          'UPDATE silver_reposicao SET descricao_produto = ? WHERE sku_produto = ? AND (descricao_produto IS NULL OR descricao_produto != ?)',
          [desc, sku, desc]
        );
        localReposicaoCount += resReposicao.affectedRows;
      }
    }

    await connection.commit();
    console.log(`   ✅ MySQL Atualizado!`);
    console.log(`      └ silver_estoque: ${localEstoqueCount} linhas modificadas`);
    console.log(`      └ silver_vendas: ${localVendasCount} linhas modificadas`);
    console.log(`      └ silver_reposicao: ${localReposicaoCount} linhas modificadas`);

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao atualizar MySQL local:', err.message);
  } finally {
    connection.release();
  }

  // 3. ATUALIZAR SUPABASE REMOTO
  console.log('\n☁️  3. Iniciando atualização no Supabase Remoto...');
  try {
    // A. silver_vendas
    console.log('   ⏳ Buscando dados de silver_vendas no Supabase...');
    const dbVendas = await fetchTable('silver_vendas', 'id, data_venda, local_venda, sku_produto, descricao_produto');
    const updateVendas = [];
    for (const r of dbVendas) {
      const padronizada = skuMap[r.sku_produto];
      if (padronizada && r.descricao_produto !== padronizada) {
        updateVendas.push({ 
          id: r.id, 
          data_venda: r.data_venda,
          local_venda: r.local_venda,
          sku_produto: r.sku_produto,
          descricao_produto: padronizada 
        });
      }
    }
    if (updateVendas.length > 0) {
      console.log(`   🔄 Enviando ${updateVendas.length} atualizações para silver_vendas no Supabase...`);
      await upsertEmLotes('silver_vendas', updateVendas, 'id');
    } else {
      console.log('   ✅ silver_vendas já está 100% atualizada no Supabase.');
    }

    // B. silver_estoque
    console.log('   ⏳ Buscando dados de silver_estoque no Supabase...');
    const dbEstoque = await fetchTable('silver_estoque', 'id, data_atualizacao, sku_produto, local_estoque, descricao_produto');
    const updateEstoque = [];
    for (const r of dbEstoque) {
      const padronizada = skuMap[r.sku_produto];
      if (padronizada && r.descricao_produto !== padronizada) {
        updateEstoque.push({ 
          id: r.id, 
          data_atualizacao: r.data_atualizacao,
          sku_produto: r.sku_produto,
          local_estoque: r.local_estoque,
          descricao_produto: padronizada 
        });
      }
    }
    if (updateEstoque.length > 0) {
      console.log(`   🔄 Enviando ${updateEstoque.length} atualizações para silver_estoque no Supabase...`);
      await upsertEmLotes('silver_estoque', updateEstoque, 'id');
    } else {
      console.log('   ✅ silver_estoque já está 100% atualizada no Supabase.');
    }

    // C. silver_reposicao
    console.log('   ⏳ Buscando dados de silver_reposicao no Supabase...');
    const dbReposicao = await fetchTable('silver_reposicao', 'id, sku_produto, numero_nota_fiscal, local_destino, descricao_produto');
    const updateReposicao = [];
    for (const r of dbReposicao) {
      const padronizada = skuMap[r.sku_produto];
      if (padronizada && r.descricao_produto !== padronizada) {
        updateReposicao.push({ 
          id: r.id, 
          sku_produto: r.sku_produto,
          numero_nota_fiscal: r.numero_nota_fiscal,
          local_destino: r.local_destino,
          descricao_produto: padronizada 
        });
      }
    }
    if (updateReposicao.length > 0) {
      console.log(`   🔄 Enviando ${updateReposicao.length} atualizações para silver_reposicao no Supabase...`);
      await upsertEmLotes('silver_reposicao', updateReposicao, 'id');
    } else {
      console.log('   ✅ silver_reposicao já está 100% atualizada no Supabase.');
    }

    // D. silver_mapeamento_sku
    console.log('   ⏳ Buscando dados de silver_mapeamento_sku no Supabase...');
    const dbMapeamento = await fetchTable('silver_mapeamento_sku', 'id, sku_plataforma, plataforma, sku_senior, descricao_oficial');
    const updateMapeamento = [];
    for (const r of dbMapeamento) {
      const padronizada = skuMap[r.sku_plataforma] || skuMap[r.sku_senior];
      if (padronizada && r.descricao_oficial !== padronizada) {
        updateMapeamento.push({ 
          id: r.id, 
          sku_plataforma: r.sku_plataforma,
          plataforma: r.plataforma,
          descricao_oficial: padronizada 
        });
      }
    }
    if (updateMapeamento.length > 0) {
      console.log(`   🔄 Enviando ${updateMapeamento.length} atualizações para silver_mapeamento_sku no Supabase...`);
      await upsertEmLotes('silver_mapeamento_sku', updateMapeamento, 'id');
    } else {
      console.log('   ✅ silver_mapeamento_sku já está 100% atualizada no Supabase.');
    }

    console.log('\n🎉 Todas as bases foram atualizadas com sucesso!');

  } catch (err) {
    console.error('💥 Erro ao atualizar Supabase:', err.message);
  } finally {
    await pool.end();
  }
}

run();
