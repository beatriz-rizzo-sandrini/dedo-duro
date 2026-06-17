const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

const SHEET_URLS = {
  vendas: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS`,
  estoque: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`,
  caminho: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=CAMINHO`,
  badstock: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=BAD STOCK`,
  mapeamento: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=525427301`
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

async function getSpreadsheetTabs(spreadsheetId) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const res = await axios.get(url);
    const html = res.data;
    const tabNames = [];
    const regex = /"goog-inline-block docs-sheet-tab-caption">([^<]+)/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      tabNames.push(m[1].toUpperCase().trim());
    }
    if (tabNames.length === 0) {
      const altRegex = /{"name":"([^"]+)","id":\d+/g;
      while ((m = altRegex.exec(html)) !== null) {
        if (!['WORKBOOK', 'GLOBAL', 'GRID'].includes(m[1].toUpperCase())) {
          tabNames.push(m[1].toUpperCase().trim());
        }
      }
    }
    return tabNames;
  } catch (err) {
    console.error('⚠️ Erro ao listar abas da planilha:', err.message);
    return [];
  }
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
  let query = '';
  if (!isFullSync) {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    console.log(`   ⚡ Modo Otimizado Ativo: Buscando vendas desde ${dateStr} (últimos 3 dias)...`);
    query = encodeURIComponent(`SELECT * WHERE A >= date '${dateStr}'`);
    url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=VENDAS&tq=${query}`;
  } else {
    console.log(`   🐘 Modo Completo Ativo: Sincronizando todo o histórico da planilha...`);
  }

  const insertData = [];
  const integracaoMeliAtiva = process.env.INTEGRACAO_MELI_ATIVA === 'true';

  function processarLinhas(rows, isMonthlyTab = false) {
    for (const r of rows) {
      if (!r || !r.c) continue;

      let dataSQL, local, sku, desc, qtd, marca;

      if (isMonthlyTab) {
        // Monthly tab columns: DATA (0), SKU (1), DESCRIÇÃO (2), PLATAFORMA (3), MARCA (4), QUANTIDADE (5)
        dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
        sku = r.c[1]?.v || null;
        desc = r.c[2]?.v || null;
        local = r.c[3]?.v || null;
        marca = r.c[4]?.v || null;
        qtd = r.c[5]?.v || null;
      } else {
        // Standard VENDAS tab columns: DATA (0), LOCAL (1), SKU (2), DESCRIÇÃO (3), QTD (4), MARCA (5)
        dataSQL = parseDateToSQL(r.c[0]?.f, r.c[0]?.v);
        local = r.c[1]?.v || null;
        sku = r.c[2]?.v || null;
        desc = r.c[3]?.v || null;
        qtd = r.c[4]?.v || null;
        marca = r.c[5]?.v || null;
      }

      if (dataSQL && sku && local) {
        const cleanLocal = String(local).toUpperCase().trim();
        if (integracaoMeliAtiva && (cleanLocal === 'MELI SP' || cleanLocal === 'MELI SP BUY CLOCK')) {
          // Ignora vendas da planilha para MELI SP se a integração via API estiver ativa
          continue;
        }
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

  try {
    console.log('   Buscando aba principal "VENDAS"...');
    const mainRows = await fetchSheetData(url);
    if (mainRows && mainRows.length > 0) {
      processarLinhas(mainRows, false);
    }
  } catch (err) {
    console.warn(`⚠️ Erro ao buscar aba principal VENDAS:`, err.message);
  }

  // Tenta buscar também a aba mensal (ex: JUNHO) caso ela exista de fato na planilha no mês atual
  const MONTHS = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  const currentMonthTab = MONTHS[new Date().getMonth()];
  
  const activeTabs = await getSpreadsheetTabs(SPREADSHEET_ID);
  
  if (currentMonthTab && currentMonthTab !== 'VENDAS' && activeTabs.includes(currentMonthTab)) {
    let monthlyUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentMonthTab)}`;
    if (!isFullSync && query) {
      monthlyUrl += `&tq=${query}`;
    }
    
    try {
      console.log(`   🗓️ Buscando aba mensal ativa diretamente: "${currentMonthTab}"...`);
      const monthlyRows = await fetchSheetData(monthlyUrl);
      if (monthlyRows && monthlyRows.length > 0) {
        console.log(`   📦 Encontradas ${monthlyRows.length} linhas na aba "${currentMonthTab}".`);
        processarLinhas(monthlyRows, true);
      }
    } catch (err) {
      console.log(`   ℹ️ Aba mensal "${currentMonthTab}" não está ativa ou não pôde ser carregada:`, err.message);
    }
  } else {
    console.log(`   ℹ️ Aba mensal "${currentMonthTab}" não existe ou está inativa na planilha.`);
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

  // Deduplica por data+sku+local (soma as quantidades para preservar o total correto)
  const mapaEstoque = {};
  for (const item of insertData) {
    const chave = `${item.data_atualizacao}|${item.sku_produto}|${item.local_estoque}`;
    if (mapaEstoque[chave]) {
      mapaEstoque[chave].quantidade_disponivel += item.quantidade_disponivel;
    } else {
      mapaEstoque[chave] = { ...item };
    }
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

function obterMarcaPorSkuEDesc(sku, desc) {
  const cleanSku = String(sku || "").trim().toUpperCase();
  const cleanDesc = String(desc || "").trim().toUpperCase();

  // 1. Check SKU prefix
  if (cleanSku.startsWith('SA') || cleanSku.startsWith('KSA') || cleanSku.startsWith('K4C') || cleanSku.startsWith('129') || cleanSku.startsWith('K10') || cleanSku.startsWith('000')) {
    return 'SANDRINI';
  }
  if (cleanSku.startsWith('FL') || cleanSku.startsWith('KFL') || cleanSku.startsWith('F0')) {
    return 'FILA';
  }
  if (cleanSku.startsWith('AD') || cleanSku.startsWith('KAD')) {
    return 'ADIDAS';
  }
  if (cleanSku.startsWith('LP') || cleanSku.startsWith('KLP') || cleanSku.startsWith('523') || cleanSku.startsWith('LU') || cleanSku.startsWith('K64') || cleanSku.startsWith('K6M')) {
    return 'LUPO';
  }
  if (cleanSku.startsWith('UM') || cleanSku.startsWith('KUM')) {
    return 'UMBRO';
  }
  if (cleanSku.startsWith('KA') && !cleanSku.startsWith('KAD')) {
    return 'KAGIVA';
  }
  if (cleanSku.startsWith('NB') || cleanSku.startsWith('KNB')) {
    return 'NEW BALANCE';
  }
  if (cleanSku.startsWith('PM') || cleanSku.startsWith('KPM') || cleanSku.startsWith('K5C') || cleanSku.startsWith('K9M') || cleanSku.startsWith('ME')) {
    return 'PUMA';
  }
  if (cleanSku.startsWith('OL')) {
    return 'OLYMPIKUS';
  }
  if (cleanSku.startsWith('AS')) {
    return 'ASICS';
  }
  if (cleanSku.startsWith('MO')) {
    return 'MOLECA';
  }
  if (cleanSku.startsWith('VI') || cleanSku.startsWith('VZ')) {
    return 'VIZZANO';
  }
  if (cleanSku.startsWith('AZ')) {
    return 'AZALEIA';
  }
  if (cleanSku.startsWith('TO')) {
    return 'TOPPER';
  }
  if (cleanSku.startsWith('KO')) {
    return 'KORTEX';
  }
  if (cleanSku.startsWith('BE')) {
    return 'BEIRA RIO';
  }
  if (cleanSku.startsWith('MR')) {
    return 'MORMAII';
  }
  if (cleanSku.startsWith('AC')) {
    return 'ACTVITA';
  }
  if (cleanSku.startsWith('BO')) {
    return 'BOTTES';
  }
  if (cleanSku.startsWith('CO')) {
    return 'CONFORT';
  }
  if (cleanSku.startsWith('NA') || cleanSku.startsWith('KNA')) {
    return 'NAUTICA';
  }
  if (cleanSku.startsWith('13')) {
    return 'SPEEDO';
  }
  if (cleanSku.startsWith('20')) {
    return 'MORMAII';
  }
  if (cleanSku.startsWith('21')) {
    return 'TECHNOS';
  }
  if (cleanSku.startsWith('32')) {
    return 'MONDAINE';
  }
  if (cleanSku.startsWith('40')) {
    return 'LOBA';
  }
  if (cleanSku.startsWith('44')) {
    return 'SECULUS';
  }
  if (cleanSku.startsWith('54') || cleanSku.startsWith('55') || cleanSku.startsWith('56')) {
    return 'MOLECA';
  }
  if (cleanSku.startsWith('71')) {
    return 'MODARE';
  }
  if (cleanSku.startsWith('78')) {
    return 'ZORBA';
  }
  if (cleanSku.startsWith('83') || cleanSku.startsWith('99')) {
    return 'MONDAINE';
  }
  if (cleanSku.startsWith('SU')) {
    return 'SPEEDO';
  }
  if (cleanSku.startsWith('CU')) {
    return 'SANDRINI';
  }
  if (cleanSku.startsWith('CP')) {
    return 'CHAMPION';
  }
  if (cleanSku.startsWith('RO')) {
    return 'ORIENT';
  }
  if (cleanSku.startsWith('MB')) {
    return 'ORIENT';
  }
  if (cleanSku.startsWith('CN')) {
    return 'CHAMPION';
  }
  if (cleanSku.startsWith('RT')) {
    return 'TECHNOS';
  }
  if (cleanSku.startsWith('JP')) {
    return 'JOTA PE';
  }
  if (cleanSku.startsWith('SK')) {
    return 'SKECHERS';
  }
  if (cleanSku.startsWith('KMS')) {
    return 'MASH';
  }

  // 2. Fallback to checking terms in description/SKU
  if (cleanDesc.includes('SANDRINI') || cleanSku.includes('SANDRINI')) return 'SANDRINI';
  if (cleanDesc.includes('FILA') || cleanSku.includes('FILA')) return 'FILA';
  if (cleanDesc.includes('ADIDAS') || cleanSku.includes('ADIDAS')) return 'ADIDAS';
  if (cleanDesc.includes('LUPO') || cleanSku.includes('LUPO')) return 'LUPO';
  if (cleanDesc.includes('UMBRO') || cleanSku.includes('UMBRO')) return 'UMBRO';
  if (cleanDesc.includes('KAGIVA') || cleanSku.includes('KAGIVA')) return 'KAGIVA';
  if (cleanDesc.includes('NEW BALANCE') || cleanSku.includes('NEWBALANCE')) return 'NEW BALANCE';
  if (cleanDesc.includes('PUMA') || cleanSku.includes('PUMA')) return 'PUMA';
  if (cleanDesc.includes('OLYMPIKUS') || cleanSku.includes('OLYMPIKUS')) return 'OLYMPIKUS';
  if (cleanDesc.includes('ASICS') || cleanSku.includes('ASICS')) return 'ASICS';
  if (cleanDesc.includes('MOLECA') || cleanSku.includes('MOLECA')) return 'MOLECA';
  if (cleanDesc.includes('VIZZANO') || cleanSku.includes('VIZZANO')) return 'VIZZANO';
  if (cleanDesc.includes('AZALEIA') || cleanSku.includes('AZALEIA')) return 'AZALEIA';
  if (cleanDesc.includes('TOPPER') || cleanSku.includes('TOPPER')) return 'TOPPER';
  if (cleanDesc.includes('KORTEX') || cleanSku.includes('KORTEX')) return 'KORTEX';
  if (cleanDesc.includes('BEIRA RIO') || cleanDesc.includes('BEIRARIO')) return 'BEIRA RIO';
  if (cleanDesc.includes('MORMAII') || cleanSku.includes('MORMAII')) return 'MORMAII';
  if (cleanDesc.includes('ACTVITA') || cleanSku.includes('ACTVITA')) return 'ACTVITA';
  if (cleanDesc.includes('NAUTICA') || cleanSku.includes('NAUTICA')) return 'NAUTICA';

  return 'Sem Marca';
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

      if (skuPlat && plat && String(skuPlat).trim() !== 'SKU Plataforma' && String(skuPlat).trim() !== 'SKU Plataf') {
        let finalSkuSen = skuSen ? String(skuSen).trim() : null;
        let finalDesc = desc ? String(desc).trim() : null;

        // CORREÇÃO DE SEGURANÇA: Evitar mapear produtos Dry Fit da Sandrini para SKU Sênior da Lupo
        const isSandriniDry = 
          (skuPlat.toUpperCase().includes('DRY') || skuPlat.toUpperCase().includes('2350') || skuPlat.toUpperCase().includes('2351') || skuPlat.toUpperCase().includes('2352') || skuPlat.toUpperCase().includes('2353') || skuPlat.toUpperCase().includes('2355')) && 
          !skuPlat.toUpperCase().startsWith('LP') && 
          !skuPlat.toUpperCase().startsWith('KLP');

        const isMappedToLupo = 
          finalSkuSen && 
          (finalSkuSen.toUpperCase().startsWith('LP') || finalSkuSen.toUpperCase().startsWith('KLP') || (finalDesc && finalDesc.toUpperCase().includes('LUPO')));

        if (isSandriniDry && isMappedToLupo) {
          const skuPlatUpper = skuPlat.toUpperCase().trim();
          finalSkuSen = skuPlatUpper; // Sênior = Plataforma para não misturar com Lupo

          if (skuPlatUpper.startsWith('K4') || skuPlatUpper.startsWith('KIT4')) {
            finalDesc = 'Kit 4 Camisetas Dry Sandrini Manga Curta';
          } else if (skuPlatUpper.startsWith('K2') || skuPlatUpper.startsWith('KIT2')) {
            finalDesc = 'Kit 2 Camisetas Dry Sandrini Manga Curta';
          } else if (skuPlatUpper.startsWith('K3') || skuPlatUpper.startsWith('KIT3')) {
            finalDesc = 'Kit 3 Camisetas Dry Sandrini Manga Curta';
          } else if (skuPlatUpper.startsWith('K5') || skuPlatUpper.startsWith('KIT5')) {
            finalDesc = 'Kit 5 Camisetas Dry Sandrini Manga Curta';
          } else if (skuPlatUpper.startsWith('K8') || skuPlatUpper.startsWith('KIT8')) {
            finalDesc = 'Kit 8 Camisetas Dry Sandrini Manga Curta';
          } else if (skuPlatUpper.startsWith('K') || skuPlatUpper.includes('KIT')) {
            finalDesc = 'Kit Camisetas Dry Sandrini Manga Curta';
          } else {
            // Individual
            if (skuPlatUpper.includes('2351') || skuPlatUpper.includes('2352') || skuPlatUpper.includes('2353') || skuPlatUpper.includes('ML')) {
              finalDesc = 'Camiseta Dry Fit Sandrini M.l';
            } else {
              finalDesc = 'Camiseta Dry Fit Sandrini M.c';
            }
          }
        }

        const skuToClassify = finalSkuSen || String(skuPlat).trim();
        const brand = obterMarcaPorSkuEDesc(skuToClassify, finalDesc);

        insertData.push({
          sku_plataforma: String(skuPlat).trim(),
          plataforma: String(plat).toUpperCase().trim(),
          sku_senior: finalSkuSen,
          descricao_oficial: finalDesc,
          marca_oficial: brand
        });
      }
    }

    // Adiciona mapeamentos para Fila Duality 2 que estão faltando
    const missingFilaMappings = [
      // Feminino GRF/PTO/CBR 6851
      { skuPlat: 'F02R00172CGRPTCBRT35', skuSen: 'FL000012871BPAACS350258', desc: 'Tênis Fila Duality 2 Feminino' },
      { skuPlat: 'F02R00172CGRPTCBRT36', skuSen: 'FL000012871BPAACS360257', desc: 'Tênis Fila Duality 2 Feminino' },
      { skuPlat: 'F02R00172CGRPTCBRT37', skuSen: 'FL000012871BPAACS370256', desc: 'Tênis Fila Duality 2 Feminino' },
      { skuPlat: 'F02R00172CGRPTCBRT38', skuSen: 'FL000012871BPAACS380259', desc: 'Tênis Fila Duality 2 Feminino' },
      { skuPlat: 'F02R00172CGRPTCBRT39', skuSen: 'FL000012871BPAACS390261', desc: 'Tênis Fila Duality 2 Feminino' },
      { skuPlat: 'F02R00172CGRPTCBRT40', skuSen: 'FL000012871BPAACS400260', desc: 'Tênis Fila Duality 2 Feminino' },
      
      // Masculino CBRPTLR
      { skuPlat: 'F01R00165CBRPTLRT38', skuSen: 'FL000012871ABAAAV380268', desc: 'Tênis Fila Duality 2 Masculino' },
      { skuPlat: 'F01R00165CBRPTLRT39', skuSen: 'FL000012871ABAAAV390273', desc: 'Tênis Fila Duality 2 Masculino' },
      { skuPlat: 'F01R00165CBRPTLRT40', skuSen: 'FL000012871ABAAAV400272', desc: 'Tênis Fila Duality 2 Masculino' },
      { skuPlat: 'F01R00165CBRPTLRT41', skuSen: 'FL000012871ABAAAV410271', desc: 'Tênis Fila Duality 2 Masculino' },
      { skuPlat: 'F01R00165CBRPTLRT42', skuSen: 'FL000012871ABAAAV420270', desc: 'Tênis Fila Duality 2 Masculino' },
      { skuPlat: 'F01R00165CBRPTLRT43', skuSen: 'FL000012871ABAAAV430269', desc: 'Tênis Fila Duality 2 Masculino' },
    ];

    const platforms = ['MELI SP', 'MELI MG', 'NETSHOES', 'DAFITI', 'SHOPEE', 'AMAZON', 'MAGALU'];
    for (const mapping of missingFilaMappings) {
      for (const plat of platforms) {
        insertData.push({
          sku_plataforma: mapping.skuPlat,
          plataforma: plat,
          sku_senior: mapping.skuSen,
          descricao_oficial: mapping.desc,
          marca_oficial: 'FILA'
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
    return true;
  } catch (error) {
    console.error('💥 Falha geral na sincronização:', error);
    return false;
  }
}

const runOnce = process.argv.includes('--once');

if (runOnce) {
  console.log('⚡ Executando sincronização única (--once)...');
  rodarSincronizacao().then((success) => {
    if (success) {
      console.log('✅ Sincronização concluída.');
      process.exit(0);
    } else {
      console.error('❌ Sincronização concluída com erros.');
      process.exit(1);
    }
  });
} else {
  // 1. Executa imediatamente ao iniciar
  rodarSincronizacao();

  // 2. Agenda para rodar de 1 em 1 hora (todo minuto 0)
  // Formato: (minuto hora dia mes dia-da-semana)
  cron.schedule('0 * * * *', () => {
    rodarSincronizacao();
  });

  console.log('🕒 Agendador configurado: O script rodará automaticamente a cada 1 hora.');
}
