require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Downloads', 'backup_descricoes_supabase.json');

async function upsertInBatches(tableName, data, onConflict, batchSize = 500) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict });
    if (error) {
      console.error(`Erro ao restaurar lote em ${tableName}:`, error.message);
      throw error;
    }
    console.log(`- ${tableName}: lote ${i / batchSize + 1} (${batch.length} registros) enviado.`);
  }
}

async function runRestore() {
  console.log('Iniciando restauração do backup de descrições...');

  if (!fs.existsSync(BACKUP_PATH)) {
    console.error(`Arquivo de backup não encontrado em: ${BACKUP_PATH}`);
    process.exit(1);
  }

  try {
    const backupData = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));

    // 1. Vendas
    if (backupData.silver_vendas && backupData.silver_vendas.length > 0) {
      console.log(`Restaurando silver_vendas (${backupData.silver_vendas.length} registros)...`);
      const payload = backupData.silver_vendas.map(r => ({
        id: r.id,
        data_venda: r.data_venda,
        local_venda: r.local_venda,
        sku_produto: r.sku,
        descricao_produto: r.desc
      }));
      await upsertInBatches('silver_vendas', payload, 'id');
    }

    // 2. Estoque
    if (backupData.silver_estoque && backupData.silver_estoque.length > 0) {
      console.log(`Restaurando silver_estoque (${backupData.silver_estoque.length} registros)...`);
      const payload = backupData.silver_estoque.map(r => ({
        id: r.id,
        data_atualizacao: r.data_atualizacao,
        sku_produto: r.sku,
        local_estoque: r.local_estoque,
        descricao_produto: r.desc
      }));
      await upsertInBatches('silver_estoque', payload, 'id');
    }

    // 3. Reposicao
    if (backupData.silver_reposicao && backupData.silver_reposicao.length > 0) {
      console.log(`Restaurando silver_reposicao (${backupData.silver_reposicao.length} registros)...`);
      const payload = backupData.silver_reposicao.map(r => ({
        id: r.id,
        sku_produto: r.sku,
        numero_nota_fiscal: r.numero_nota_fiscal,
        local_destino: r.local_destino,
        descricao_produto: r.desc
      }));
      await upsertInBatches('silver_reposicao', payload, 'id');
    }

    // 4. Mapeamento
    if (backupData.silver_mapeamento_sku && backupData.silver_mapeamento_sku.length > 0) {
      console.log(`Restaurando silver_mapeamento_sku (${backupData.silver_mapeamento_sku.length} registros)...`);
      const payload = backupData.silver_mapeamento_sku.map(r => ({
        id: r.id,
        sku_plataforma: r.sku_plataforma,
        plataforma: r.plataforma,
        descricao_oficial: r.desc
      }));
      await upsertInBatches('silver_mapeamento_sku', payload, 'id');
    }

    console.log('Restauração concluída com sucesso!');

  } catch (err) {
    console.error('Erro ao restaurar backup:', err.message);
    process.exit(1);
  }
}

runRestore().catch(console.error);
