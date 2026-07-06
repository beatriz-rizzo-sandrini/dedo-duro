require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', 'backup_descricoes_supabase.json');

async function fetchTableData(tableName, fields) {
  let data = [];
  let start = 0;
  const limit = 1000;

  while (true) {
    const { data: page, error } = await supabase
      .from(tableName)
      .select(fields)
      .range(start, start + limit - 1);

    if (error) {
      throw error;
    }

    if (!page || page.length === 0) break;

    data = data.concat(page);
    if (page.length < limit) break;
    start += limit;
  }

  return data;
}

async function runBackup() {
  console.log('Iniciando backup de descrições do Supabase...');

  try {
    const backupData = {
      silver_vendas: [],
      silver_estoque: [],
      silver_reposicao: [],
      silver_mapeamento_sku: []
    };

    // 1. Vendas
    const vendas = await fetchTableData('silver_vendas', 'id, data_venda, local_venda, sku_produto, descricao_produto');
    backupData.silver_vendas = vendas.map(r => ({
      id: r.id,
      data_venda: r.data_venda,
      local_venda: r.local_venda,
      sku: r.sku_produto,
      desc: r.descricao_produto
    }));
    console.log(`- silver_vendas: ${vendas.length} registros obtidos.`);

    // 2. Estoque
    const estoque = await fetchTableData('silver_estoque', 'id, data_atualizacao, sku_produto, local_estoque, descricao_produto');
    backupData.silver_estoque = estoque.map(r => ({
      id: r.id,
      data_atualizacao: r.data_atualizacao,
      sku: r.sku_produto,
      local_estoque: r.local_estoque,
      desc: r.descricao_produto
    }));
    console.log(`- silver_estoque: ${estoque.length} registros obtidos.`);

    // 3. Reposicao
    const reposicao = await fetchTableData('silver_reposicao', 'id, sku_produto, numero_nota_fiscal, local_destino, descricao_produto');
    backupData.silver_reposicao = reposicao.map(r => ({
      id: r.id,
      sku: r.sku_produto,
      numero_nota_fiscal: r.numero_nota_fiscal,
      local_destino: r.local_destino,
      desc: r.descricao_produto
    }));
    console.log(`- silver_reposicao: ${reposicao.length} registros obtidos.`);

    // 4. Mapeamento
    const mapeamento = await fetchTableData('silver_mapeamento_sku', 'id, sku_plataforma, plataforma, descricao_oficial');
    backupData.silver_mapeamento_sku = mapeamento.map(r => ({
      id: r.id,
      sku_plataforma: r.sku_plataforma,
      plataforma: r.plataforma,
      desc: r.descricao_oficial
    }));
    console.log(`- silver_mapeamento_sku: ${mapeamento.length} registros obtidos.`);

    console.log(`Salvando backup em: ${BACKUP_PATH}...`);
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log('Backup concluído com sucesso!');

  } catch (err) {
    console.error('Erro ao realizar backup de descrições:', err.message);
    process.exit(1);
  }
}

runBackup().catch(console.error);
