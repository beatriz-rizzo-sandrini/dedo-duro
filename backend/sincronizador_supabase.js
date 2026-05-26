const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const SPREADSHEET_ID = '1A_K3440z4w-vwryh3SgssPIa4MlsZn3k987ksbx80vU';

const SHEET_URLS = {
  vendas: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`,
  estoque: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`,
  caminho: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=CAMINHO`,
  badstock: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=BAD STOCK`,
  mapeamento: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=230578226`
};

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Envia dados em lotes para evitar limite de tamanho do Supabase
async function upsertEmLotes(tabela, dados, onConflict, tamanhoLote = 500) {
  for (let i = 0; i < dados.length; i += tamanhoLote) {
    const lote = dados.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict });
    if (error) {
      console.error(`❌ Erro no lote ${i / tamanhoLote + 1} de ${tabela}:`, error.message);
      throw error;
    }
    console.log(`   📦 Lote ${i / tamanhoLote + 1}: ${lote.length} registros enviados para ${tabela}...`);
  }
}

// Converte a data do Google Sheets para formato SQL (yyyy-mm-dd)
// Aceita tanto "28/04/2026" quanto o objeto Date(year,month,day) do gviz API
function parseDateToSQL(f, v) {
  // Caso 1: campo formatado "28/04/2026"
  if (f && typeof f === 'string' && f.includes('/')) {
    const parts = f.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  // Caso 2: valor bruto como string "Date(2026,3,28)" do Google gviz
  if (v && typeof v === 'string' && v.startsWith('Date(')) {
    const match = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const year = match[1];
      const month = String(parseInt(match[2]) + 1).padStart(2, '0'); // mês é 0-indexado no gviz
      const day = String(match[3]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

// ==========================================
// FUNÇÕES DE EXTRAÇÃO E LIMPEZA
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
  
  const insertData = [];
  
  for (const r of rows) {
    if (!r || !r.c) continue;
    const dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
    const local = r.c[1]?.v || null;
    const sku = r.c[2]?.v || null;
    const desc = r.c[3]?.v || null;
    const qtd = r.c[4]?.v || null;
    const marca = r.c[5]?.v || null;

    if (dataSQL && sku && local) {
      insertData.push({
        data_venda: dataSQL,
        local_venda: String(local).toUpperCase().trim(),
        sku_produto: String(sku).trim(),
        descricao_produto: desc,
        marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
        quantidade_vendida: Number(qtd) || 0
      });
    }
  }

  // Deduplica dentro do próprio lote
  const mapa = {};
  for (const item of insertData) {
    const chave = `${item.data_venda}|${item.local_venda}|${item.sku_produto}`;
    if (mapa[chave]) {
      mapa[chave].quantidade_vendida += item.quantidade_vendida;
    } else {
      mapa[chave] = { ...item };
    }
  }
  const dadosUnicos = Object.values(mapa);

  // Apaga APENAS as datas que estão no lote atual (preserva o histórico de datas anteriores!)
  const datasNoBanco = [...new Set(dadosUnicos.map(d => d.data_venda))];
  console.log(`   🗓️ Atualizando ${datasNoBanco.length} datas: ${datasNoBanco.join(', ')}`);
  for (const data of datasNoBanco) {
    await supabase.from('silver_vendas').delete().eq('data_venda', data);
  }

  // Upsert em lotes
  await upsertEmLotes('silver_vendas', dadosUnicos, 'data_venda, local_venda, sku_produto');
  console.log(`✅ Vendas Sincronizadas! (${dadosUnicos.length} registros únicos de ${insertData.length} linhas)`);
}

async function syncEstoque() {
  console.log('🔄 Sincronizando Estoque...');
  const rows = await fetchSheetData(SHEET_URLS.estoque);

  const insertData = [];

  for (const r of rows) {
    if (!r || !r.c) continue;
    const dataStr = r.c[0]?.f || r.c[0]?.v || null;
    const sku = r.c[1]?.v || null;
    const desc = r.c[2]?.v || null;
    const local = r.c[3]?.v || null;
    const marca = r.c[4]?.v || null;
    const qtd = r.c[5]?.v || null;
    const valor = r.c[6]?.v || null;

    if (sku && local) {
      insertData.push({
        data_atualizacao: dataStr,
        sku_produto: String(sku).trim(),
        descricao_produto: desc,
        marca: (marca && String(marca).trim() !== '') ? String(marca).trim() : 'Sem Marca',
        local_estoque: String(local).toUpperCase().trim(),
        quantidade_disponivel: Number(qtd) || 0,
        valor_unitario: Number(valor) || 0
      });
    }
  }

  // Deduplica por data+sku+local (pega o último valor encontrado)
  const mapaEstoque = {};
  for (const item of insertData) {
    const chave = `${item.data_atualizacao}|${item.sku_produto}|${item.local_estoque}`;
    mapaEstoque[chave] = item;
  }
  const dadosUnicosEstoque = Object.values(mapaEstoque);

  // Apaga APENAS as datas que estão no lote atual (preserva o histórico!)
  const datasNoBanco = [...new Set(dadosUnicosEstoque.map(d => d.data_atualizacao))];
  console.log(`   🗓️ Atualizando ${datasNoBanco.length} datas de estoque: ${datasNoBanco.join(', ')}`);
  for (const data of datasNoBanco) {
    await supabase.from('silver_estoque').delete().eq('data_atualizacao', data);
  }

  await upsertEmLotes('silver_estoque', dadosUnicosEstoque, 'data_atualizacao, sku_produto, local_estoque');
  console.log(`✅ Estoque Sincronizado! (${dadosUnicosEstoque.length} registros únicos)`);
}

async function syncReposicao() {
  console.log('🔄 Sincronizando Reposições (Caminho)...');
  const rows = await fetchSheetData(SHEET_URLS.caminho);

  await supabase.from('silver_reposicao').delete().neq('id', 0);

  const insertData = [];

  for (const r of rows) {
    if (!r || !r.c) continue;
    const sku = r.c[0]?.v || null;
    const desc = r.c[1]?.v || null;
    const local = r.c[2]?.v || null;
    const qtd = r.c[4]?.v || null;
    const status = r.c[5]?.v || null;
    const prev = r.c[6]?.f || r.c[6]?.v || null;
    const nf = r.c[7]?.f || r.c[7]?.v || null;

    if (sku && local && nf) {
      insertData.push({
        sku_produto: String(sku).trim(),
        descricao_produto: desc,
        local_destino: String(local).toUpperCase().trim(),
        quantidade_enviada: Number(qtd) || 0,
        status_envio: status,
        previsao_chegada: prev,
        numero_nota_fiscal: String(nf).trim()
      });
    }
  }

  // Deduplica por sku+nf+local
  const mapaReposicao = {};
  for (const item of insertData) {
    const chave = `${item.sku_produto}|${item.numero_nota_fiscal}|${item.local_destino}`;
    mapaReposicao[chave] = item;
  }
  const dadosUnicosReposicao = Object.values(mapaReposicao);

  await upsertEmLotes('silver_reposicao', dadosUnicosReposicao, 'sku_produto, numero_nota_fiscal, local_destino');
  console.log(`✅ Reposições Sincronizadas! (${dadosUnicosReposicao.length} registros únicos)`);
}

async function syncBadstock() {
  console.log('🔄 Sincronizando Badstock...');
  const rows = await fetchSheetData(SHEET_URLS.badstock);

  await supabase.from('silver_badstock').delete().neq('id', 0);

  const insertData = [];

  for (const r of rows) {
    if (!r || !r.c) continue;
    const sku = r.c[1]?.v || null;
    const local = r.c[2]?.v || null;

    if (sku && local) {
      insertData.push({
        sku_produto: String(sku).trim(),
        local_badstock: String(local).toLowerCase().trim()
      });
    }
  }

  // Deduplica por sku+local
  const mapaBadstock = {};
  for (const item of insertData) {
    const chave = `${item.sku_produto}|${item.local_badstock}`;
    mapaBadstock[chave] = item;
  }
  const dadosUnicosBadstock = Object.values(mapaBadstock);

  await upsertEmLotes('silver_badstock', dadosUnicosBadstock, 'sku_produto, local_badstock');
  console.log(`✅ Badstock Sincronizado! (${dadosUnicosBadstock.length} registros únicos)`);
}

function parseGoogleJSONFull(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return {
      cols: data.table.cols || [],
      rows: data.table.rows || []
    };
  } catch (error) {
    console.error("Erro ao fazer parse do JSON completo do Google Sheets", error);
    return { cols: [], rows: [] };
  }
}

async function fetchSheetDataFull(url) {
  const response = await axios.get(url);
  return parseGoogleJSONFull(response.data);
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

function validarColunasMapeamento(headers) {
  if (!headers || !Array.isArray(headers) || headers.length < 4) {
    return false;
  }
  const label0 = (headers[0] || "").toUpperCase().trim();
  const label1 = (headers[1] || "").toUpperCase().trim();
  const label2 = (headers[2] || "").toUpperCase().trim();
  const label3 = (headers[3] || "").toUpperCase().trim();

  // Se carregou a aba de vendas por padrão (Causa 1), a coluna 0 será "DATA" ou "SKU"
  if (label0 === "DATA" || label0 === "SKU") {
    return false;
  }

  // Verifica se contém termos-chave esperados
  const hasSenior = label0.includes("SENIOR") || label0.includes("SÊNIOR");
  const hasDesc = label1.includes("DESC") || label1.includes("DESCRIÇÃO") || label1.includes("DESCRICAO") || label1.includes("NOME");
  const hasPlat = label2.includes("PLAT");
  const hasSkuPlat = label3.includes("PLAT");

  return hasSenior && hasDesc && hasPlat && hasSkuPlat;
}

async function syncMapeamento() {
  console.log('🔄 Sincronizando Mapeamento de SKUs (via CSV)...');
  try {
    const response = await axios.get(SHEET_URLS.mapeamento);
    const csvText = response.data;
    const rawLines = csvText.split(/\r?\n/);

    if (rawLines.length === 0) {
      console.log('   Nenhum dado encontrado no CSV. Pulando...');
      return;
    }

    const headers = parseCSVLine(rawLines[0]);
    if (!validarColunasMapeamento(headers)) {
      console.warn('⚠️  [AVISO] A aba MAPEAMENTO não existe ou está com cabeçalhos inválidos!');
      console.warn('   Os cabeçalhos esperados na primeira linha são: [SKU Sênior, Descrição Oficial (ou Nome Sênior), Plataforma, SKU Plataforma]');
      console.warn('   ⚠️ Sincronização do de-para ABORTADA por segurança para não corromper os dados!');
      return;
    }

    const insertData = [];

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line.trim()) continue;

      const cols = parseCSVLine(line);
      const skuSen = cols[0] || null;
      const desc = cols[1] || null;
      const plat = cols[2] || null;
      const skuPlat = cols[3] || null;
      const marca = null; // A planilha atual não tem coluna de marca

      if (skuPlat && plat && String(skuPlat).trim() !== 'SKU Plataforma' && String(skuPlat).trim() !== 'SKU Plataf') {
        insertData.push({
          sku_plataforma: String(skuPlat).trim(),
          plataforma: String(plat).toUpperCase().trim(),
          sku_senior: skuSen ? String(skuSen).trim() : null,
          descricao_oficial: desc ? String(desc).trim() : null,
          marca_oficial: marca
        });
      }
    }

    // Deduplica por sku_plataforma + plataforma
    const mapa = {};
    for (const item of insertData) {
      const chave = `${item.sku_plataforma}|${item.plataforma}`;
      mapa[chave] = item;
    }
    const dadosUnicos = Object.values(mapa);

    if (dadosUnicos.length > 0) {
      console.log('   🧹 Limpando mapeamentos antigos da base de dados...');
      await supabase.from('silver_mapeamento_sku').delete().neq('plataforma', 'FOR_DELETE_ALL');

      await upsertEmLotes('silver_mapeamento_sku', dadosUnicos, 'sku_plataforma, plataforma');
      console.log(`✅ Mapeamento Sincronizado! (${dadosUnicos.length} registros únicos obtidos de ${insertData.length} linhas do CSV)`);
    } else {
      console.log(`   Nenhum registro válido extraído da aba MAPEAMENTO.`);
    }
  } catch (error) {
    console.error('❌ Erro na sincronização do mapeamento via CSV:', error.message);
  }
}



// Sincronização Principal
async function rodarSincronizacao() {
  console.log(`\n🚀 [${new Date().toLocaleString()}] Iniciando Robô Sincronizador...`);
  try {
    await syncVendas();
    await syncEstoque();
    await syncReposicao();
    await syncBadstock();
    await syncMapeamento();
    console.log(`🎉 [${new Date().toLocaleString()}] Todas as bases sincronizadas com sucesso!`);
    console.log('💤 Aguardando próxima execução (de hora em hora)...');
  } catch (error) {
    console.error('💥 Falha geral na sincronização:', error);
  }
}

// 1. Executa imediatamente ao iniciar
rodarSincronizacao();

// 2. Agenda para rodar de 1 em 1 hora (todo minuto 0)
// Formato: (minuto hora dia mes dia-da-semana)
cron.schedule('0 * * * *', () => {
  rodarSincronizacao();
});

console.log('🕒 Agendador configurado: O script rodará automaticamente a cada 1 hora.');
