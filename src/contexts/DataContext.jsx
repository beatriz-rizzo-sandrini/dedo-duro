import React, { createContext, useContext, useState, useEffect } from 'react';

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

// Abas do Google Sheets
const SHEETS_FROM_GS = ['estoque', 'badstock', 'caminho', 'sellout', 'vendas'];

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
      // Busca todas as abas do Google Sheets em paralelo
      const gsResults = await Promise.all(
        SHEETS_FROM_GS.map(async name => ({ name, rows: await fetchSheet(name) }))
      );

      const combined = {};
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
