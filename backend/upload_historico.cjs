require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function upsertEmLotes(tabela, dados, chaves) {
  const tamanhoLote = 500;
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase
      .from(tabela)
      .upsert(lote, { onConflict: chaves });
    
    if (error) {
      console.error(`Erro ao fazer upsert no lote ${i} - ${i + lote.length}:`, error.message);
    } else {
      console.log(`Lote ${i} - ${i + lote.length} processado com sucesso.`);
    }
  }
}

function parseExcelDate(excelSerial) {
  if (typeof excelSerial === 'string') {
    // Tenta interpretar formato DD/MM/YYYY
    const match = excelSerial.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    // Tenta formato YYYY-MM-DD
    const match2 = excelSerial.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match2) {
      return excelSerial.split('T')[0];
    }
    return excelSerial;
  }
  
  if (typeof excelSerial !== 'number') return null;
  // O Excel começa em 1 de janeiro de 1900 (serial 1)
  // O JS começa em 1 de janeiro de 1970
  // Diferença é 25569 dias (ajustado para bug do ano bissexto 1900 no Excel)
  const date = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
  date.setUTCHours(date.getUTCHours() + 3); // Ajuste timezone Brasil
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function run() {
  const files = ['vendas_abril.xlsx', 'vendas_maio.xlsx', 'vendas_junho.xlsx'];
  const downloadsPath = 'C:\\Users\\beatriz.rizzo\\Downloads';
  const insertData = [];

  for (const filename of files) {
    const filePath = path.join(downloadsPath, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
      continue;
    }

    console.log(`Lendo ${filename}...`);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['VENDAS'];
    if (!sheet) {
      console.log(`⚠️ Aba 'VENDAS' não encontrada em ${filename}`);
      continue;
    }
    // Pegamos a matriz crua para analisar por índices
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // As colunas de uma aba principal 'VENDAS', conforme sincronizador_supabase.js, são:
    // 0: Data, 1: Local, 2: SKU, 3: Descrição, 4: Qtd, 5: Marca

    // Pular linha 0 se for cabeçalho
    const startIndex = (data[0] && String(data[0][0]).toLowerCase().includes('data')) ? 1 : 0;
    
    let rowsProcessed = 0;
    for (let i = startIndex; i < data.length; i++) {
      const r = data[i];
      if (!r || !r.length) continue;
      
      let dataExcel = r[0];
      let local = r[1];
      let sku = r[2];
      let desc = r[3];
      let qtd = r[4];
      let marca = r[5];
      
      let dataSQL = parseExcelDate(dataExcel);
      
      if (sku === 'SA0A6230063ABBYCN390409') sku = 'SA0A6230063ABBYCN390408';
      if (sku === 'AD000IF4135ABAJCN430031') sku = 'AD000HP6011ADABCN430026';
      
      if (dataSQL && sku && local) {
        const cleanLocal = String(local).toUpperCase().trim();
        insertData.push({
          data_venda: dataSQL,
          local_venda: cleanLocal,
          sku_produto: String(sku).trim(),
          descricao_produto: desc || '',
          marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
          quantidade_vendida: Number(qtd) || 0
        });
        rowsProcessed++;
      }
    }
    console.log(`-> Extraídos ${rowsProcessed} registros de ${filename}`);
  }

  // Deduplicar localmente agregando quantidade, como o sincronizador original
  const mapaUnicos = {};
  for (const item of insertData) {
    const chave = `${item.data_venda}|${item.local_venda}|${item.sku_produto}`;
    if (mapaUnicos[chave]) {
      mapaUnicos[chave].quantidade_vendida += item.quantidade_vendida;
    } else {
      mapaUnicos[chave] = { ...item };
    }
  }
  const dadosUnicos = Object.values(mapaUnicos);

  console.log(`Total consolidado para subir ao banco: ${dadosUnicos.length} registros.`);
  if (dadosUnicos.length > 0) {
    console.log(`Iniciando Upsert na tabela silver_vendas...`);
    await upsertEmLotes('silver_vendas', dadosUnicos, 'data_venda, local_venda, sku_produto');
    console.log('✅ Upload concluído com sucesso!');
  }
}

run();
