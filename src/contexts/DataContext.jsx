import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

// Abas do Google Sheets (badstock, caminho, sellout) - estoque e vendas vem do Supabase
const SHEETS_FROM_GS = ['sellout'];

// Data de corte do histórico de vendas no Supabase
const VENDAS_CUTOFF = '2026-03-29';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_KEY = '__dedo_duro_data_hybrid5__';

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
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('vw_vendas_consolidadas')
      .select('data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida, marca, sku_original_plataforma')
      .gte('data_venda', VENDAS_CUTOFF)
      .order('data_venda', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn('[DataContext] Falha ao buscar vendas do Supabase:', error?.message);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += data.length;
  }

  console.log(`[DataContext] Vendas carregadas do Supabase: ${allData.length} registros desde ${VENDAS_CUTOFF}`);

  // Transforma para o formato {c:[{v,f}]} que todas as páginas esperam
  // c[0]=data  c[1]=local  c[2]=sku  c[3]=desc  c[4]=qtd  c[5]=marca  c[6]=sku_original_plataforma
  return allData.map(r => ({
    c: [
      { v: r.data_venda, f: sqlDateToBR(r.data_venda) },
      { v: r.local_venda },
      { v: r.sku_produto },
      { v: r.descricao_produto },
      { v: Number(r.quantidade_vendida) || 0 },
      { v: r.marca },
      { v: r.sku_original_plataforma }
    ]
  }));
}

// ── Estoque do Supabase (tabela silver_estoque mapeada via view) ─────────────

async function fetchEstoqueSupabase() {
  // 1. Busca a data mais recente do estoque de forma instantânea
  const { data: latestDateData, error: latestDateErr } = await supabase
    .from('vw_estoque_consolidado')
    .select('data_atualizacao')
    .order('id', { ascending: false })
    .limit(1);

  if (latestDateErr) {
    console.warn('[DataContext] Falha ao buscar data mais recente do estoque:', latestDateErr.message);
    return [];
  }

  const latestDate = latestDateData?.[0]?.data_atualizacao;
  if (!latestDate) {
    console.warn('[DataContext] Nenhuma data encontrada no estoque.');
    return [];
  }

  console.log(`[DataContext] Buscando estoque para a data mais recente: "${latestDate}"`);

  // 2. Busca apenas os registros dessa data
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('vw_estoque_consolidado')
      .select('id, data_atualizacao, sku_produto, descricao_produto, local_estoque, marca, quantidade_disponivel, valor_unitario, sku_original_plataforma')
      .eq('data_atualizacao', latestDate)
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn('[DataContext] Falha ao buscar estoque do Supabase:', error?.message);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += data.length;
  }

  console.log(`[DataContext] Estoque carregado do Supabase: ${allData.length} registros para a data ${latestDate}`);

  // Transforma para o formato {c:[{v,f}]} que todas as páginas esperam para o estoque:
  // c[0]=data  c[1]=sku  c[2]=desc  c[3]=local  c[4]=marca  c[5]=qtd  c[6]=valor  c[7]=sku_original_plataforma
  return allData.map(r => ({
    c: [
      { v: r.data_atualizacao, f: r.data_atualizacao },
      { v: r.sku_produto },
      { v: r.descricao_produto },
      { v: r.local_estoque },
      { v: r.marca },
      { v: Number(r.quantidade_disponivel) || 0 },
      { v: Number(r.valor_unitario) || 0 },
      { v: r.sku_original_plataforma }
    ]
  }));
}

async function fetchCaminho() {
  console.log('[DataContext] Buscando caminho do Google Sheets...');
  return fetchSheet('CAMINHO');
}

async function fetchBadstock() {
  console.log('[DataContext] Buscando badstock do Supabase (produção)...');
  
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('silver_badstock')
      .select('sku_produto, local_badstock')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn('[DataContext] Falha ao buscar badstock do Supabase:', error?.message);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += data.length;
  }

  console.log(`[DataContext] Badstock carregado do Supabase: ${allData.length} registros`);

  // Transforma para o formato {c:[{v}]} que todas as páginas esperam
  // c[0]=não usado  c[1]=sku  c[2]=local  c[3]=original_sku
  return allData.map(r => ({
    c: [
      { v: '' },
      { v: r.sku_produto },
      { v: r.local_badstock },
      { v: r.sku_produto } // index 3
    ]
  }));
}

async function fetchMapeamentosSupabase() {
  try {
    console.log('[DataContext] Buscando mapeamentos do Supabase (produção)...');
    const PAGE_SIZE = 2000;
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

// ── Compressão e Decompressão para Caching ─────────────────────────────────────

function compressData(sheets) {
  const compact = {};
  
  if (sheets.vendas) {
    compact.v = sheets.vendas.map(r => [
      r.c[0]?.v,
      r.c[0]?.f,
      r.c[1]?.v,
      r.c[2]?.v,
      r.c[3]?.v,
      r.c[4]?.v,
      r.c[5]?.v,
      r.c[6]?.v
    ]);
  }
  
  if (sheets.estoque) {
    compact.e = sheets.estoque.map(r => [
      r.c[0]?.v,
      r.c[1]?.v,
      r.c[2]?.v,
      r.c[3]?.v,
      r.c[4]?.v,
      r.c[5]?.v,
      r.c[6]?.v,
      r.c[7]?.v
    ]);
  }
  
  if (sheets.caminho) {
    compact.c = sheets.caminho.map(r => [
      r.c[0]?.v,
      r.c[1]?.v,
      r.c[2]?.v,
      r.c[3]?.v,
      r.c[4]?.v,
      r.c[5]?.v,
      r.c[6]?.v,
      r.c[7]?.v,
      r.c[8]?.v
    ]);
  }
  
  if (sheets.badstock) {
    compact.b = sheets.badstock.map(r => [
      r.c[0]?.v,
      r.c[1]?.v,
      r.c[2]?.v,
      r.c[3]?.v
    ]);
  }
  
  if (sheets.sellout) {
    compact.s = sheets.sellout;
  }
  
  return compact;
}

function decompressData(compact) {
  const sheets = {};
  
  if (compact.v) {
    sheets.vendas = compact.v.map(arr => ({
      c: [
        { v: arr[0], f: arr[1] },
        { v: arr[2] },
        { v: arr[3] },
        { v: arr[4] },
        { v: arr[5] },
        { v: arr[6] },
        { v: arr[7] }
      ]
    }));
  }
  
  if (compact.e) {
    sheets.estoque = compact.e.map(arr => ({
      c: [
        { v: arr[0], f: arr[0] },
        { v: arr[1] },
        { v: arr[2] },
        { v: arr[3] },
        { v: arr[4] },
        { v: arr[5] },
        { v: arr[6] },
        { v: arr[7] }
      ]
    }));
  }
  
  if (compact.c) {
    sheets.caminho = compact.c.map(arr => ({
      c: [
        { v: arr[0] },
        { v: arr[1] },
        { v: arr[2] },
        { v: arr[3] },
        { v: arr[4] },
        { v: arr[5] },
        { v: arr[6] },
        { v: arr[7] },
        { v: arr[8] }
      ]
    }));
  }
  
  if (compact.b) {
    sheets.badstock = compact.b.map(arr => ({
      c: [
        { v: arr[0] },
        { v: arr[1] },
        { v: arr[2] },
        { v: arr[3] }
      ]
    }));
  }
  
  if (compact.s) {
    sheets.sellout = compact.s;
  }
  
  return sheets;
}

// ── Context ───────────────────────────────────────────────────────────────────

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAll = async (force = false) => {
    const isDev = import.meta.env.DEV;
    if (!force && !isDev) {
      try {
        let cachedData = null;
        if ('caches' in window) {
          const cache = await caches.open('dedo-duro-cache-v1');
          const cachedResponse = await cache.match('/data-cache');
          if (cachedResponse) {
            cachedData = await cachedResponse.text();
          }
        }
        
        if (!cachedData) {
          cachedData = sessionStorage.getItem(CACHE_KEY);
        }

        if (cachedData) {
          const { ts, compact } = JSON.parse(cachedData);
          if (Date.now() - ts < CACHE_TTL_MS) {
            const sheets = decompressData(compact);
            setData(sheets);
            setLastFetch(new Date(ts));
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[DataContext] Falha ao ler cache:', err.message);
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Busca em paralelo: Google Sheets (sellout) + Supabase/Local (vendas, estoque, caminho, badstock) + Mapeamentos
      const [gsResults, vendas, estoque, caminho, badstock, mappings] = await Promise.all([
        Promise.all(SHEETS_FROM_GS.map(async name => ({ name, rows: await fetchSheet(name) }))),
        fetchVendasSupabase(),
        fetchEstoqueSupabase(),
        fetchCaminho(),
        fetchBadstock(),
        fetchMapeamentosSupabase(),
      ]);

      // Cria o lookup de mapeamento
      const mapLookup = {};
      mappings.forEach(m => {
        const platSku = String(m.sku_plataforma || "").trim().toUpperCase();
        const plat = String(m.plataforma || "").trim().toUpperCase();
        if (platSku && plat) {
          mapLookup[`${platSku}|${plat}`] = {
            sku_senior: String(m.sku_senior || "").trim().toUpperCase(),
            descricao_oficial: String(m.descricao_oficial || "").trim()
          };
        }
      });

      // 1. Traduz Vendas se vier do Supabase direto (quando API local offline)
      const mappedVendas = vendas.map(r => {
        if (r.c[6]) return r; // Já mapeado pelo localhost

        const rawSku = String(r.c[2]?.v || "").trim().toUpperCase();
        const rawLocal = String(r.c[1]?.v || "").trim().toUpperCase();
        const mapping = mapLookup[`${rawSku}|${rawLocal}`];

        const mappedSku = mapping?.sku_senior || rawSku;
        const mappedDesc = mapping?.descricao_oficial || r.c[3]?.v || "";

        return {
          c: [
            r.c[0], // data
            r.c[1], // local
            { v: mappedSku }, // sku mapped
            { v: mappedDesc }, // desc mapped
            r.c[4], // qtd
            r.c[5], // marca
            { v: rawSku } // index 6: original platform SKU
          ]
        };
      });

      // 2. Traduz Estoque se vier do Supabase direto (quando API local offline)
      const mappedEstoque = estoque.map(r => {
        if (r.c[7]) return r; // Já mapeado pelo localhost

        const rawSku = String(r.c[1]?.v || "").trim().toUpperCase();
        const rawLocal = String(r.c[3]?.v || "").trim().toUpperCase();
        const mapping = mapLookup[`${rawSku}|${rawLocal}`];

        const mappedSku = mapping?.sku_senior || rawSku;
        const mappedDesc = mapping?.descricao_oficial || r.c[2]?.v || "";

        return {
          c: [
            r.c[0], // data
            { v: mappedSku }, // sku mapped
            { v: mappedDesc }, // desc mapped
            r.c[3], // local
            r.c[4], // marca
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
        const mapping = mapLookup[`${rawSku}|${rawLocal}`];

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
        badstock: mappedBadstock 
      };
      gsResults.forEach(({ name, rows }) => { combined[name] = rows; });

      setData(combined);
      setLastFetch(new Date());

      try {
        const compact = compressData(combined);
        const payload = JSON.stringify({ ts: Date.now(), compact });

        if ('caches' in window) {
          const cache = await caches.open('dedo-duro-cache-v1');
          await cache.put('/data-cache', new Response(payload, {
            headers: { 'Content-Type': 'application/json' }
          }));
        } else {
          sessionStorage.setItem(CACHE_KEY, payload);
        }
      } catch (e) {
        console.warn('[DataContext] Falha ao salvar no cache (quota excedida?):', e.message);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

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
