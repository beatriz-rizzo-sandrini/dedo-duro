import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * Hook para buscar dados do Supabase de forma otimizada.
 * @param {string} table - Nome da tabela ou view.
 * @param {object} options - Opções de filtro, ordenação e limites.
 */
export function useSupabase(table, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from(table).select(options.select || '*');

      // Aplicar filtros básicos se fornecidos
      if (options.filters) {
        options.filters.forEach(f => {
          if (f.type === 'eq') query = query.eq(f.column, f.value);
          if (f.type === 'gte') query = query.gte(f.column, f.value);
          if (f.type === 'lte') query = query.lte(f.column, f.value);
          if (f.type === 'in') query = query.in(f.column, f.value);
        });
      }

      // Ordenação
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
      }

      // Limite (Paginação)
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.range) {
        query = query.range(options.range.from, options.range.to);
      }

      const { data: result, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;
      setData(result);
    } catch (err) {
      console.error(`Erro ao buscar dados de ${table}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [table, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook para múltiplas consultas simultâneas no Supabase.
 */
export function useMultipleSupabase(queries) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const results = {};
        
        await Promise.all(Object.entries(queries).map(async ([key, config]) => {
          let query = supabase.from(config.table).select(config.select || '*');
          
          if (config.filters) {
            config.filters.forEach(f => {
              if (f.type === 'eq') query = query.eq(f.column, f.value);
            });
          }

          const { data: res, error: err } = await query;
          if (err) throw err;
          results[key] = res;
        }));

        setData(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [JSON.stringify(queries)]);

  return { data, loading, error };
}
