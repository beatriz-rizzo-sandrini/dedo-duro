import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

// Abas do Google Sheets (estoque atual, cobertura, badstock, sellout)
const SHEETS_FROM_GS = ['estoque', 'badstock', 'caminho', 'sellout'];

// Data de corte do histórico de vendas no Supabase
const VENDAS_CUTOFF = '2026-03-29';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_KEY = '__dedo_duro_data_hybrid1__';

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
      .from('silver_vendas')
      .select('data_venda, local_venda, sku_produto, descricao_produto, quantidade_vendida, marca')
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
    from += PAGE_SIZE;
  }

  console.log(`[DataContext] Vendas carregadas do Supabase: ${allData.length} registros desde ${VENDAS_CUTOFF}`);

  // Transforma para o formato {c:[{v,f}]} que todas as páginas esperam
  // c[0]=data  c[1]=local  c[2]=sku  c[3]=desc  c[4]=qtd  c[5]=marca
  return allData.map(r => ({
    c: [
      { v: r.data_venda, f: sqlDateToBR(r.data_venda) },
      { v: r.local_venda },
      { v: r.sku_produto },
      { v: r.descricao_produto },
      { v: r.quantidade_vendida },
      { v: r.marca },
    ]
  }));
}

// ── Context ───────────────────────────────────────────────────────────────────

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAll = async (force = false) => {
    if (!force) {
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
      // Busca em paralelo: Google Sheets (estoque/caminho/badstock/sellout) + Supabase (vendas)
      const [gsResults, vendas] = await Promise.all([
        Promise.all(SHEETS_FROM_GS.map(async name => ({ name, rows: await fetchSheet(name) }))),
        fetchVendasSupabase(),
      ]);

      const combined = { vendas };
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
