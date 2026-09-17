const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

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

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    return [];
  }
}

function parseDateToSQL(f, v) {
  if (f && typeof f === 'string' && f.includes('/')) {
    const parts = f.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (v && typeof v === 'string' && v.includes('/')) {
    const parts = v.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (v && typeof v === 'string' && v.startsWith('Date(')) {
    const match = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const year = match[1];
      const month = String(parseInt(match[2]) + 1).padStart(2, '0');
      const day = String(match[3]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

async function upsertEmLotes(tabela, dados, onConflict, tamanhoLote = 500) {
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict });
    if (error) {
      console.error(`Erro no lote ${i / tamanhoLote + 1} de ${tabela}:`, error.message);
      throw error;
    }
    console.log(`- ${tabela}: lote ${i / tamanhoLote + 1} (${lote.length} registros) enviado.`);
  }
}

async function run() {
  console.log('=== SINCRONIZANDO VENDAS DO RELATÓRIO DIÁRIO (09/08/2026 até 09/09/2026) ===\n');

  // Let's check sheet sources
  const insertData = [];

  function processarLinhas(rows, isMonthlyTab = false) {
    for (const r of rows) {
      if (!r || !r.c) continue;
      let dataSQL, local, sku, desc, qtd, marca;

      if (isMonthlyTab) {
        dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
        sku = r.c[1]?.v || null;
        desc = r.c[2]?.v || null;
        local = r.c[3]?.v || null;
        marca = r.c[4]?.v || null;
        qtd = r.c[5]?.v || null;
      } else {
        dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
        local = r.c[1]?.v || null;
        sku = r.c[2]?.v || null;
        desc = r.c[3]?.v || null;
        qtd = r.c[4]?.v || null;
        marca = r.c[5]?.v || null;
      }

      if (sku === 'SA0A6230063ABBYCN390409') sku = 'SA0A6230063ABBYCN390408';
      if (sku === 'AD000IF4135ABAJCN430031') sku = 'AD000HP6011ADABCN430026';

      if (dataSQL && sku && local) {
        const cleanLocal = String(local).toUpperCase().trim();
        insertData.push({
          data_venda: dataSQL,
          local_venda: cleanLocal,
          sku_produto: String(sku).trim(),
          descricao_produto: desc,
          marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
          quantidade_vendida: Number(qtd) || 0
        });
      }
    }
  }

  // 1. Aba VENDAS
  try {
    console.log('Buscando aba VENDAS...');
    const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`);
    const rows = parseGoogleJSON(res.data);
    console.log(`Aba VENDAS: ${rows.length} linhas`);
    processarLinhas(rows, false);
  } catch(e) {
    console.warn('Erro VENDAS:', e.message);
  }

  // 2. Aba SETEMBRO
  try {
    console.log('Buscando aba SETEMBRO...');
    const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=SETEMBRO`);
    const rows = parseGoogleJSON(res.data);
    console.log(`Aba SETEMBRO: ${rows.length} linhas`);
    processarLinhas(rows, true);
  } catch(e) {
    console.warn('Erro SETEMBRO:', e.message);
  }

  // 3. Aba AGOSTO
  try {
    console.log('Buscando aba AGOSTO...');
    const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=AGOSTO`);
    const rows = parseGoogleJSON(res.data);
    console.log(`Aba AGOSTO: ${rows.length} linhas`);
    processarLinhas(rows, true);
  } catch(e) {
    console.warn('Erro AGOSTO:', e.message);
  }

  // 4. Se houver gid=1070878202 diretamente
  try {
    console.log('Buscando gid=1070878202 (export CSV)...');
    const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1070878202`);
    const lines = res.data.split(/\r?\n/);
    console.log(`gid 1070878202: ${lines.length} linhas`);
    if (lines.length > 1) {
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCSVLine(lines[i]);
        // Data, SKU, Descrição, Plataforma, Marca, Quantidade... OR Data, Local, SKU...
        const dataStr = cols[0] || '';
        const dataSQL = parseDateToSQL(dataStr, dataStr);
        if (!dataSQL) continue;

        // Check columns
        let sku, desc, local, marca, qtd;
        // Check if cols[1] is local or SKU
        if (cols[3] && ['MELI SP', 'MELI MG', 'AMAZON', 'MAGALU', 'SHOPEE', 'TIKTOK'].some(p => cols[3].toUpperCase().includes(p))) {
          sku = cols[1];
          desc = cols[2];
          local = cols[3];
          marca = cols[4];
          qtd = cols[5];
        } else if (cols[1] && ['MELI SP', 'MELI MG', 'AMAZON', 'MAGALU', 'SHOPEE', 'TIKTOK'].some(p => cols[1].toUpperCase().includes(p))) {
          local = cols[1];
          sku = cols[2];
          desc = cols[3];
          qtd = cols[4];
          marca = cols[5];
        } else {
          // Default
          sku = cols[1];
          desc = cols[2];
          local = cols[3];
          marca = cols[4];
          qtd = cols[5];
        }

        if (sku === 'SA0A6230063ABBYCN390409') sku = 'SA0A6230063ABBYCN390408';
        if (sku === 'AD000IF4135ABAJCN430031') sku = 'AD000HP6011ADABCN430026';

        if (dataSQL && sku && local) {
          insertData.push({
            data_venda: dataSQL,
            local_venda: String(local).toUpperCase().trim(),
            sku_produto: String(sku).trim(),
            descricao_produto: desc,
            marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
            quantidade_vendida: Number(String(qtd).replace(/\./g, '')) || 0
          });
        }
      }
    }
  } catch(e) {
    console.warn('Erro gid 1070878202:', e.message);
  }

  console.log(`\nTotal bruto de vendas lidas de todas as abas: ${insertData.length}`);

  // Filtrar intervalo solicitado: 2026-08-09 até 2026-09-09
  const DATA_INICIO = '2026-08-09';
  const DATA_FIM = '2026-09-09';

  const vendasPeriodo = insertData.filter(d => d.data_venda >= DATA_INICIO && d.data_venda <= DATA_FIM);
  console.log(`Total no período (${DATA_INICIO} até ${DATA_FIM}): ${vendasPeriodo.length} linhas.`);

  // Agregação / Deduplicação por (data_venda, local_venda, sku_produto)
  const mapa = {};
  for (const item of vendasPeriodo) {
    const chave = `${item.data_venda}|${item.local_venda}|${item.sku_produto}`;
    if (mapa[chave]) {
      // Se tiver descrição ou marca preenchida, preserva
      if (!mapa[chave].descricao_produto && item.descricao_produto) mapa[chave].descricao_produto = item.descricao_produto;
      if (mapa[chave].marca === 'Sem Marca' && item.marca !== 'Sem Marca') mapa[chave].marca = item.marca;
      mapa[chave].quantidade_vendida += item.quantidade_vendida;
    } else {
      mapa[chave] = { ...item };
    }
  }

  const dadosUnicos = Object.values(mapa);
  console.log(`Total de registros únicos consolidados: ${dadosUnicos.length}`);

  // Resumo por plataforma
  const porPlat = {};
  let totalPecas = 0;
  for (const d of dadosUnicos) {
    porPlat[d.local_venda] = (porPlat[d.local_venda] || 0) + d.quantidade_vendida;
    totalPecas += d.quantidade_vendida;
  }
  console.log('\n--- RESUMO DE PEÇAS POR PLATAFORMA (09/08 A 09/09) ---');
  console.log(porPlat);
  console.log(`TOTAL GERAL DE PEÇAS: ${totalPecas}\n`);

  // Upsert no Supabase
  console.log('Iniciando upsert no Supabase (silver_vendas)...');
  await upsertEmLotes('silver_vendas', dadosUnicos, 'data_venda, local_venda, sku_produto');
  console.log('\n✅ UPSERT CONCLUÍDO COM SUCESSO NO SUPABASE!');
}

run();
