/**
 * marketplaceCache.js
 * Gerenciador de cache local via IndexedDB para relatórios do TikTok Marketplace.
 * Permite carregamento instantâneo (0ms) e sincronização leve em segundo plano (SWR).
 */

const DB_NAME = 'DedoDuro_MarketplaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'tiktok_reports_store';
const CACHE_KEY = 'reports_data';
const META_KEY = 'reports_meta';

function openDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('Falha ao abrir IndexedDB para marketplace:', request.error);
      resolve(null);
    };
  });
}

export async function getCachedReports() {
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Erro ao ler cache do Marketplace:', err);
    return null;
  }
}

export async function setCachedReports(reports) {
  try {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(reports, CACHE_KEY);
      
      // Salva resumo dos metadados para checagem rápida
      const meta = (reports || []).map(r => ({ id: r.id, created_at: r.created_at, period: r.period }));
      store.put(meta, META_KEY);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Erro ao salvar cache do Marketplace:', err);
  }
}

export async function getCachedMeta() {
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(META_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearMarketplaceCache() {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (err) {
    console.warn('Erro ao limpar cache do Marketplace:', err);
  }
}
