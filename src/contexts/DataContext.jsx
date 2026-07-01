import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';
import { autoResolveMeliSku, normalizeBrand } from '../utils/productParser.js';
import { normalizeDateStr, parseToTimestamp } from '../utils/dateUtils.js';
import { useAuth } from './AuthContext.jsx';

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

// Abas do Google Sheets (badstock, caminho, sellout) - estoque e vendas vem do Supabase
const SHEETS_FROM_GS = [];

// Data de corte do histórico de vendas no Supabase
const VENDAS_CUTOFF = '2026-03-29';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_KEY = '__dedo_duro_data_hybrid4__';

// ── Google Sheets ─────────────────────────────────────────────────────────────

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const parsed = JSON.parse(jsonStr);
    return parsed.table.rows;
  } catch {
    return [];
  }
}

async function fetchSheet(name) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${name}`;
  const res = await fetch(url);
  const text = await res.text();
  return parseGoogleJSON(text);
}

// ── Vendas do Supabase (histórico desde 29/03/2026) ─────────────────────────

// Converte "2026-05-12" → "12/05/2026" (formato esperado pelas páginas no campo .f)
function sqlDateToBR(d) {
  if (!d) return '';
  const parts = String(d).split('-');
  if (parts.length !== 3) return String(d);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function fetchVendasSupabase() {
  const PAGE_SIZE = 1000;
  
  // Cutoff dinâmico de 40 dias atrás para manter o carregamento leve e estável
  const today = new Date();
  const cutoffDate = new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000);
  const dynamicCutoff = cutoffDate.toISOString().split('T')[0];
  
  try {
    // 1. Obtém o total de registros (head request rápido)
    const { count, error: countError } = await supabase
      .from('vw_vendas_consolidadas')
      .select('*', { count: 'exact', head: true })
      .gte('data_venda', dynamicCutoff);

    if (countError) throw countError;

    const totalRows = count || 0;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);
    console.log(`[DataContext] Carregando vendas desde ${dynamicCutoff}: ${totalRows} registros (${totalPages} páginas em paralelo)`);

    if (totalPages === 0) return [];

    // 2. Dispara consultas em paralelo
    const promises = [];
    for (let page = 0; page < totalPages; page++) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      promises.push(
        supabase
          .from('vw_vendas_consolidadas')
          .select('data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida, marca')
          .gte('data_venda', dynamicCutoff)
          .order('data_venda', { ascending: false })
          .range(from, to)
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          })
      );
    }

    const results = await Promise.all(promises);
    let allData = [];
    results.forEach(res => {
      allData = allData.concat(res);
    });

    return allData.map(r => ({
      c: [
        { v: r.data_venda, f: sqlDateToBR(r.data_venda) },
        { v: r.local_venda },
        { v: r.sku_produto },
        { v: r.descricao_produto },
        { v: Number(r.quantidade_vendida) || 0 },
        { v: r.marca },
      ]
    }));
  } catch (err) {
    console.warn('[DataContext] Falha no fetch paralelo de vendas, usando fallback sequencial:', err?.message);
    
    // Fallback sequencial
    let allData = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('vw_vendas_consolidadas')
        .select('data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida, marca')
        .gte('data_venda', dynamicCutoff)
        .order('data_venda', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('[DataContext] Falha no fallback sequencial de vendas:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    return allData.map(r => ({
      c: [
        { v: r.data_venda, f: sqlDateToBR(r.data_venda) },
        { v: r.local_venda },
        { v: r.sku_produto },
        { v: r.descricao_produto },
        { v: Number(r.quantidade_vendida) || 0 },
        { v: r.marca },
      ]
    }));
  }
}

// ── Estoque do Supabase (tabela silver_estoque mapeada via view) ─────────────

async function fetchEstoqueSupabase() {
  const PAGE_SIZE = 1000;
  
  try {
    let possibleDbValues = null;
    try {
      const { data: dateRows, error: dateError } = await supabase
        .from('silver_estoque')
        .select('data_atualizacao')
        .order('id', { ascending: false })
        .limit(2000);
      
      if (!dateError && dateRows && dateRows.length > 0) {
        const dateCounts = {};
        dateRows.forEach(r => {
          const dStr = r.data_atualizacao;
          if (dStr) {
            const norm = normalizeDateStr(dStr);
            dateCounts[norm] = (dateCounts[norm] || 0) + 1;
          }
        });

        let maxTimestamp = 0;
        let latestCompleteDate = "";
        let maxCount = 0;
        let fallbackDate = "";

        Object.entries(dateCounts).forEach(([normDate, count]) => {
          if (count > maxCount) {
            maxCount = count;
            fallbackDate = normDate;
          }
          if (count >= 200) {
            const ts = parseToTimestamp(normDate);
            if (ts > maxTimestamp) {
              maxTimestamp = ts;
              latestCompleteDate = normDate;
            }
          }
        });

        const targetNormalizedDate = latestCompleteDate || fallbackDate;
        if (targetNormalizedDate) {
          possibleDbValues = [];
          const parts = targetNormalizedDate.split('/');
          if (parts.length === 3) {
            possibleDbValues.push(`${parts[0]}/${parts[1]}`);
            possibleDbValues.push(targetNormalizedDate);
            possibleDbValues.push(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
          } else {
            possibleDbValues.push(targetNormalizedDate);
          }
        }
      }
    } catch (dateErr) {
      console.warn('[DataContext] Falha ao obter datas de estoque do Supabase, buscando tudo como fallback:', dateErr);
    }

    // 1. Obtém o total de registros (head request rápido)
    let query = supabase.from('vw_estoque_consolidado').select('*', { count: 'exact', head: true });
    if (possibleDbValues) {
      query = query.in('data_atualizacao', possibleDbValues);
    }
    const { count, error: countError } = await query;

    if (countError) throw countError;

    const totalRows = count || 0;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);
    console.log(`[DataContext] Carregando estoque: ${totalRows} registros (${totalPages} páginas em paralelo)`);

    if (totalPages === 0) return [];

    // 2. Dispara consultas em paralelo
    const promises = [];
    for (let page = 0; page < totalPages; page++) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let pageQuery = supabase
        .from('vw_estoque_consolidado')
        .select('id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario')
        .order('id', { ascending: false })
        .range(from, to);

      if (possibleDbValues) {
        pageQuery = pageQuery.in('data_atualizacao', possibleDbValues);
      }

      promises.push(
        pageQuery.then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
      );
    }

    const results = await Promise.all(promises);
    let allData = [];
    results.forEach(res => {
      allData = allData.concat(res);
    });

    return allData.map(r => ({
      c: [
        { v: r.data_atualizacao, f: r.data_atualizacao },
        { v: r.sku_produto },
        { v: r.descricao_produto },
        { v: r.local_estoque },
        { v: r.marca },
        { v: Number(r.quantidade_disponivel) || 0 },
        { v: Number(r.valor_unitario) || 0 }
      ]
    }));
  } catch (err) {
    console.warn('[DataContext] Falha no fetch paralelo de estoque, usando fallback sequencial:', err?.message);
    
    // Fallback sequencial
    let allData = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('vw_estoque_consolidado')
        .select('id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario')
        .order('id', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('[DataContext] Falha no fallback sequencial de estoque:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    return allData.map(r => ({
      c: [
        { v: r.data_atualizacao, f: r.data_atualizacao },
        { v: r.sku_produto },
        { v: r.descricao_produto },
        { v: r.local_estoque },
        { v: r.marca },
        { v: Number(r.quantidade_disponivel) || 0 },
        { v: Number(r.valor_unitario) || 0 }
      ]
    }));
  }
}

async function fetchCaminhoSupabase() {
  console.log('[DataContext] Buscando reposição (caminho) do Supabase...');
  const { data, error } = await supabase
    .from('silver_reposicao')
    .select('sku_produto, descricao_produto, local_destino, quantidade_enviada, status_envio, previsao_chegada, numero_nota_fiscal')
    .neq('status_envio', 'FINALIZADO');
  if (error) {
    console.error('Erro ao buscar reposicao do Supabase:', error.message);
    return [];
  }
  return data.map(r => ({
    c: [
      { v: r.sku_produto },
      { v: r.descricao_produto },
      { v: r.local_destino },
      null,
      { v: Number(r.quantidade_enviada) || 0 },
      { v: r.status_envio },
      { v: r.previsao_chegada },
      { v: r.numero_nota_fiscal }
    ]
  }));
}

async function fetchBadstockSupabase() {
  console.log('[DataContext] Buscando badstock do Supabase...');
  const { data, error } = await supabase
    .from('silver_badstock')
    .select('sku_produto, local_badstock');
  if (error) {
    console.error('Erro ao buscar badstock do Supabase:', error.message);
    return [];
  }
  return data.map(r => ({
    c: [
      null,
      { v: r.sku_produto },
      { v: r.local_badstock }
    ]
  }));
}

async function fetchSandriniCasa() {
  try {
    console.log('[DataContext] Buscando estoque Sandrini Casa de planilha externa...');
    const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/gviz/tq?tqx=out:json&gid=1363555604`;
    const res = await fetch(url);
    const text = await res.text();
    const rows = parseGoogleJSON(text);
    const map = {};
    rows.forEach(r => {
      if (!r || !r.c) return;
      const sku = String(r.c[4]?.v || '').trim().toUpperCase();
      const qtd = Number(r.c[6]?.v) || 0;
      const brand = String(r.c[3]?.v || 'SANDRINI').trim().toUpperCase();
      const desc = r.c[5]?.v || '';
      const cost = Number(String(r.c[8]?.v || '').replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;
      if (sku) {
        if (!map[sku]) {
          map[sku] = { estoqueCasa: 0, expedicao: 0, brand, desc, cost };
        }
        map[sku].estoqueCasa += qtd;
      }
    });

    try {
      console.log('[DataContext] Buscando expedição Sandrini da aba INVENTÁRIO_SANDRINI...');
      const sandriniExpUrl = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210`;
      const expRes = await fetch(sandriniExpUrl);
      const expText = await expRes.text();
      const expLines = expText.split(/\r?\n/);
      if (expLines.length > 1) {
        const expHeaders = parseCSVLine(expLines[1]); // Linha 1 contém os cabeçalhos
        const expIdx = expHeaders.indexOf('EXPEDIÇÃO -105');
        const finalExpIdx = expIdx !== -1 ? expIdx : 4;
        
        for (let i = 2; i < expLines.length; i++) {
          if (!expLines[i].trim()) continue;
          const cols = parseCSVLine(expLines[i]);
          const sku = String(cols[0] || '').trim().toUpperCase();
          const expedicaoVal = Number(cols[finalExpIdx]) || 0;
          if (sku && expedicaoVal > 0) {
            if (!map[sku]) {
              map[sku] = { estoqueCasa: 0, expedicao: 0, brand: 'SANDRINI', desc: '', cost: 0 };
            }
            map[sku].expedicao += expedicaoVal;
          }
        }
      }
    } catch (expErr) {
      console.error("Erro ao carregar expedição Sandrini da planilha externa:", expErr.message);
    }

    return map;
  } catch (err) {
    console.error("Erro ao carregar planilha Sandrini Casa:", err.message);
    return {};
  }
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

async function fetchBuyclockCasa() {
  try {
    console.log('[DataContext] Buscando estoque Buyclock Casa de planilha externa via CSV...');
    const url = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1072598256`;
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const map = {};
    
    if (lines.length > 2) {
      const headers = parseCSVLine(lines[2]); // Linha index 2 contém cabeçalhos no CSV
      const estoqueCasaIdx = headers.indexOf('ESTOQUE CASA');
      const expedicaoIdx = headers.indexOf('EXPEDIÇÃO -105');
      
      const finalEstoqueIdx = estoqueCasaIdx !== -1 ? estoqueCasaIdx : 37;
      const finalExpedicaoIdx = expedicaoIdx !== -1 ? expedicaoIdx : 4;
      
      for (let i = 3; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCSVLine(lines[i]);
        const sku = String(cols[0] || '').trim().toUpperCase();
        const ean = String(cols[1] || '').trim();
        const brand = String(cols[2] || '').trim().toUpperCase();
        const estoqueCasaVal = Number(cols[finalEstoqueIdx]) || 0;
        const expedicaoVal = Number(cols[finalExpedicaoIdx]) || 0;
        const costVal = cols[34];
        const cost = Number(String(costVal || '').replace(/[^0-9,\.-]/g, '').replace(',', '.')) || 0;
        if (sku) {
          if (!map[sku]) {
            map[sku] = { estoqueCasa: 0, expedicao: 0, brand: '', ean: '', cost: 0 };
          }
          map[sku].estoqueCasa += estoqueCasaVal;
          map[sku].expedicao += expedicaoVal;
          map[sku].brand = brand || map[sku].brand;
          map[sku].ean = ean || map[sku].ean;
          map[sku].cost = cost || map[sku].cost;
        }
      }
    }
    return map;
  } catch (err) {
    console.error("Erro ao carregar planilha Buyclock Casa via CSV:", err.message);
    return {};
  }
}



async function fetchMapeamentosSupabase() {
  try {
    console.log('[DataContext] Buscando mapeamentos do Supabase (produção)...');
    const PAGE_SIZE = 1000;
    let allData = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('silver_mapeamento_sku')
        .select('sku_plataforma, plataforma, sku_senior, descricao_oficial')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.warn('[DataContext] Falha ao buscar mapeamentos do Supabase:', error.message);
        break;
      }

      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }
    console.log(`[DataContext] Mapeamentos carregados do Supabase: ${allData.length} registros`);
    return allData;
  } catch (err) {
    console.warn('[DataContext] API Local offline. Buscando mapeamentos...', err.message);
    return [];
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAll = async (force = false) => {
    const isDev = import.meta.env.DEV;
    if (!force && !isDev) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { ts, sheets } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL_MS) {
            setData(sheets);
            setLastFetch(new Date(ts));
            setLoading(false);
            return;
          }
        }
      } catch { /* ignora */ }
    }

    setLoading(true);
    setError(null);

    try {
      // Busca em paralelo: Google Sheets (se houver) + Supabase (vendas, estoque, caminho, badstock, mapeamento) + Planilhas Externas
      const [gsResults, vendas, estoque, caminho, badstock, mappings, sandriniCasaMap, buyclockCasaMap] = await Promise.all([
        Promise.all(SHEETS_FROM_GS.map(async name => ({ name, rows: await fetchSheet(name) }))),
        fetchVendasSupabase(),
        fetchEstoqueSupabase(),
        fetchCaminhoSupabase(),
        fetchBadstockSupabase(),
        fetchMapeamentosSupabase(),
        fetchSandriniCasa(),
        fetchBuyclockCasa()
      ]);

      // Cria o lookup de mapeamento
      const mapLookup = {};
      const globalSkuMap = {};
      mappings.forEach(m => {
        const platSku = String(m.sku_plataforma || "").trim().toUpperCase();
        const plat = String(m.plataforma || "").trim().toUpperCase();
        const skuSenior = String(m.sku_senior || "").trim().toUpperCase();
        const descOficial = String(m.descricao_oficial || "").trim();
        if (platSku && plat) {
          mapLookup[`${platSku}|${plat}`] = {
            sku_senior: skuSenior,
            descricao_oficial: descOficial
          };
        }
        if (platSku && skuSenior) {
          globalSkuMap[platSku] = {
            sku_senior: skuSenior,
            descricao_oficial: descOficial
          };
        }
      });

      // 1. Traduz Vendas
      const mappedVendas = vendas.map(r => {
        const rawSku = String(r.c[6]?.v || r.c[2]?.v || "").trim().toUpperCase();
        const rawLocal = String(r.c[1]?.v || "").trim().toUpperCase();
        const mapping = mapLookup[`${rawSku}|${rawLocal}`] || globalSkuMap[rawSku];

        let mappedSku = mapping?.sku_senior || r.c[2]?.v || "";
        let mappedDesc = mapping?.descricao_oficial || r.c[3]?.v || "";

        // Auto-resolução de SKUs brutos do Mercado Livre (MLB...) baseados na descrição
        mappedSku = autoResolveMeliSku(mappedSku, mappedDesc);

        return {
          c: [
            r.c[0], // data
            r.c[1], // local
            { v: mappedSku }, // sku mapped
            { v: mappedDesc }, // desc mapped
            r.c[4], // qtd
            { v: normalizeBrand(r.c[5]?.v || "", mappedSku, mappedDesc) }, // brand normalized
            { v: rawSku } // index 6: original platform SKU
          ]
        };
      });

      // 2. Traduz Estoque
      const mappedEstoque = estoque.map(r => {
        const rawSku = String(r.c[7]?.v || r.c[1]?.v || "").trim().toUpperCase();
        const rawLocal = String(r.c[3]?.v || "").trim().toUpperCase();
        const mapping = mapLookup[`${rawSku}|${rawLocal}`] || globalSkuMap[rawSku];

        let mappedSku = mapping?.sku_senior || r.c[1]?.v || "";
        let mappedDesc = mapping?.descricao_oficial || r.c[2]?.v || "";

        // Auto-resolução de SKUs brutos do Mercado Livre (MLB...) baseados na descrição
        mappedSku = autoResolveMeliSku(mappedSku, mappedDesc);

        return {
          c: [
            r.c[0], // data
            { v: mappedSku }, // sku mapped
            { v: mappedDesc }, // desc mapped
            r.c[3], // local
            { v: normalizeBrand(r.c[4]?.v || "", mappedSku, mappedDesc) }, // brand normalized
            r.c[5], // qtd
            r.c[6], // valor
            { v: rawSku } // index 7: original platform SKU
          ]
        };
      });

      // 3. Traduz Caminho/Reposicao se vier do Google Sheets direto
      const mappedCaminho = caminho.map(r => {
        if (r.c[8]) return r; // Já mapeado pelo localhost

        const rawSku = String(r.c[0]?.v || "").trim().toUpperCase();
        const rawLocal = String(r.c[2]?.v || "").trim().toUpperCase();
        const mapping = mapLookup[`${rawSku}|${rawLocal}`] || globalSkuMap[rawSku];

        const mappedSku = mapping?.sku_senior || rawSku;
        const mappedDesc = mapping?.descricao_oficial || r.c[1]?.v || "";

        return {
          c: [
            { v: mappedSku }, // sku mapped
            { v: mappedDesc }, // desc mapped
            r.c[2], // local
            r.c[3], // NF/envio (não usado)
            r.c[4], // qtd
            r.c[5], // status
            r.c[6], // previsao
            r.c[7], // NF
            { v: rawSku } // index 8: original platform SKU
          ]
        };
      });

      // 4. Traduz Badstock se vier do Google Sheets direto
      const mappedBadstock = badstock.map(r => {
        if (r.c[3]) return r; // Já mapeado pelo localhost

        const rawSku = String(r.c[1]?.v || "").trim().toUpperCase();
        const rawLocal = String(r.c[2]?.v || "").trim().toUpperCase();
        const mapping = mapLookup[`${rawSku}|${rawLocal}`];

        const mappedSku = mapping?.sku_senior || rawSku;

        return {
          c: [
            r.c[0], // não usado
            { v: mappedSku }, // sku mapped
            r.c[2], // local
            { v: rawSku } // index 3: original platform SKU
          ]
        };
      });

      const combined = { 
        vendas: mappedVendas, 
        estoque: mappedEstoque, 
        caminho: mappedCaminho, 
        badstock: mappedBadstock,
        sandriniCasaMap,
        buyclockCasaMap
      };
      gsResults.forEach(({ name, rows }) => { combined[name] = rows; });

      setData(combined);
      setLastFetch(new Date());

      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), sheets: combined }));
      } catch { /* ignora quota */ }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAll();
    } else {
      setData({});
      setLoading(true);
    }
  }, [user]);

  return (
    <DataContext.Provider value={{ data, loading, error, lastFetch, refetch: () => fetchAll(true) }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
