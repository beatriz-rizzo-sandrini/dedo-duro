const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const EXCEL_PATH = path.join('C:', 'Users', 'beatriz.rizzo', 'Desktop', 'arrumar descricao.xlsx');

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

async function run() {
  console.log('🚀 Iniciando script de atualização de descrições por nome...');

  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const nameMap = {};
  for (const row of rows) {
    const oldName = String(row['no dedo duro'] || '').trim();
    const newName = String(row['como deve ficar pq ta na senior'] || '').trim();
    if (oldName && newName && oldName !== 'undefined' && newName !== 'undefined') {
      nameMap[oldName] = newName;
    }
  }
  
  console.log(`✅ Mapa criado com ${Object.keys(nameMap).length} nomes para substituir.`);

  // Supabase Update
  console.log('\n☁️  3. Iniciando atualização no Supabase Remoto...');
  try {
    for (const table of ['silver_vendas', 'silver_estoque', 'silver_reposicao']) {
      console.log(`   ⏳ Atualizando ${table}...`);
      const dbData = await fetchTable(table, 'id, descricao_produto');
      const updates = [];
      for (const r of dbData) {
        if (r.descricao_produto && nameMap[r.descricao_produto.trim()]) {
          updates.push({ id: r.id, descricao_produto: nameMap[r.descricao_produto.trim()] });
        }
      }
      if (updates.length > 0) {
        console.log(`   🔄 Enviando ${updates.length} atualizações para ${table}...`);
        for(let i=0; i < updates.length; i+=100) {
            let chunk = updates.slice(i, i+100);
            await Promise.all(chunk.map(u => supabase.from(table).update({descricao_produto: u.descricao_produto}).eq('id', u.id)));
        }
        console.log(`   ✅ Atualizações em ${table} concluídas.`);
      } else {
        console.log(`   ✅ Nenhuma atualização necessária em ${table}.`);
      }
    }
    
    console.log(`   ⏳ Atualizando silver_mapeamento_sku...`);
    const dbMapeamento = await fetchTable('silver_mapeamento_sku', 'id, descricao_oficial');
    const updatesMap = [];
    for (const r of dbMapeamento) {
      if (r.descricao_oficial && nameMap[r.descricao_oficial.trim()]) {
         updatesMap.push({ id: r.id, descricao_oficial: nameMap[r.descricao_oficial.trim()] });
      }
    }
    if (updatesMap.length > 0) {
      console.log(`   🔄 Enviando ${updatesMap.length} atualizações para silver_mapeamento_sku...`);
      for(let i=0; i < updatesMap.length; i+=100) {
          let chunk = updatesMap.slice(i, i+100);
          await Promise.all(chunk.map(u => supabase.from('silver_mapeamento_sku').update({descricao_oficial: u.descricao_oficial}).eq('id', u.id)));
      }
      console.log(`   ✅ Atualizações em silver_mapeamento_sku concluídas.`);
    } else {
        console.log(`   ✅ Nenhuma atualização necessária em silver_mapeamento_sku.`);
    }

  } catch (err) {
    console.error('💥 Erro ao atualizar Supabase:', err.message);
  }

  console.log('\n🎉 Atualização concluída!');
  process.exit(0);
}

run();
