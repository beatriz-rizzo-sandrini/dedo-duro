const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { parseProductDescription } = require('./../src/utils/productParser.js');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';
const estoqueUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`;

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonStr);
    return data.table.rows;
  } catch (error) {
    console.error("Erro ao fazer parse", error);
    return [];
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

async function fetchSandriniCasa() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/1CzdDnDQSJLca-qvkRUmkXgxjvDSMPr70UlyW_uj4KQo/gviz/tq?tqx=out:json&gid=1363555604`;
    const res = await axios.get(url);
    const rows = parseGoogleJSON(res.data);
    const map = {};
    rows.forEach(r => {
      if (!r || !r.c) return;
      const sku = String(r.c[3]?.v || '').trim().toUpperCase();
      const qtd = Number(r.c[5]?.v) || 0;
      const brand = String(r.c[2]?.v || 'SANDRINI').trim().toUpperCase();
      const desc = r.c[4]?.v || '';
      if (sku) {
        if (!map[sku]) {
          map[sku] = { estoqueCasa: 0, expedicao: 0, brand, desc };
        }
        map[sku].estoqueCasa += qtd;
      }
    });

    // Fetch expedicao
    try {
      const sandriniExpUrl = `https://docs.google.com/spreadsheets/d/1EsG5ZNcNmU_DPXhWousiSWo8CHf4Ak3k/export?format=csv&gid=1109424210`;
      const expRes = await axios.get(sandriniExpUrl);
      const expLines = expRes.data.split(/\r?\n/);
      if (expLines.length > 1) {
        const expHeaders = parseCSVLine(expLines[1]);
        const expIdx = expHeaders.indexOf('EXPEDIÇÃO -105');
        const finalExpIdx = expIdx !== -1 ? expIdx : 4;
        
        for (let i = 2; i < expLines.length; i++) {
          if (!expLines[i].trim()) continue;
          const cols = parseCSVLine(expLines[i]);
          const sku = String(cols[0] || '').trim().toUpperCase();
          const expedicaoVal = Number(cols[finalExpIdx]) || 0;
          if (sku && expedicaoVal > 0) {
            if (!map[sku]) {
              map[sku] = { estoqueCasa: 0, expedicao: 0, brand: 'SANDRINI', desc: '' };
            }
            map[sku].expedicao += expedicaoVal;
          }
        }
      }
    } catch (expErr) {
      console.error("Erro expedicao:", expErr.message);
    }
    return map;
  } catch (err) {
    console.error("Erro Sandrini Casa:", err.message);
    return {};
  }
}

async function run() {
  try {
    console.log('1. Fetching external Sandrini Casa and Expedicao maps...');
    const sandriniCasaMap = await fetchSandriniCasa();
    console.log(`Loaded ${Object.keys(sandriniCasaMap).length} SKUs from Sandrini Casa Map.`);

    // 2. Fetch platform stock from Supabase (vw_estoque_consolidado)
    console.log('2. Fetching platform stock from Supabase...');
    const { data: dbRows, error } = await supabase
      .from('vw_estoque_consolidado')
      .select('*')
      .or('sku_produto.ilike.%dry%,sku_produto.ilike.%2350%,sku_produto.ilike.%2351%,sku_produto.ilike.%2352%,sku_produto.ilike.%2353%,sku_produto.ilike.%2355%');

    if (error) {
      console.error(error);
      return;
    }

    const dates = [...new Set(dbRows.map(r => r.data_atualizacao))].sort();
    const latestDate = dates[dates.length - 1];
    console.log(`Latest stock date in Supabase: ${latestDate}`);

    const latestDbRows = dbRows.filter(r => r.data_atualizacao === latestDate);
    console.log(`Loaded ${latestDbRows.length} rows for the latest date.`);

    // Simulate Sellout.jsx grouping
    const stats = {};
    const COL_ESTOQUE = { DATA: 0, SKU: 1, DESC: 2, LOCAL: 3, MARCA: 4, QTD: 5, VALOR: 6 };

    // Format DB rows into frontend rows
    const estoqueRows = latestDbRows.map(r => ({
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

    // Process estoqueRows (Supabase platform stock)
    estoqueRows.forEach(r => {
      const sku = String(r?.c?.[COL_ESTOQUE.SKU]?.v || "");
      const local = String(r?.c?.[COL_ESTOQUE.LOCAL]?.v || "").toUpperCase();
      const qtd = Number(r?.c?.[COL_ESTOQUE.QTD]?.v) || 0;
      const marca = String(r?.c?.[COL_ESTOQUE.MARCA]?.v || "Sem Marca").toUpperCase().trim();
      const rawDesc = r?.c?.[COL_ESTOQUE.DESC]?.v || "";
      const skuPlat = r?.c?.[7]?.v || "";

      if (sku) {
        const parsed = parseProductDescription(rawDesc, sku, local.includes("BUY CLOCK"), marca);
        const prodKey = `${parsed.baseTitle}|${marca}`;

        if (!stats[prodKey]) {
          stats[prodKey] = {
            descricao: parsed.baseTitle,
            marca,
            totalEstoque: 0,
            cores: {},
            skusArr: []
          };
        }

        if (sku && !stats[prodKey].skusArr.includes(sku)) stats[prodKey].skusArr.push(sku);
        if (skuPlat && !stats[prodKey].skusArr.includes(skuPlat)) stats[prodKey].skusArr.push(skuPlat);

        stats[prodKey].totalEstoque += qtd;

        const corKey = parsed.color;
        if (!stats[prodKey].cores[corKey]) {
          stats[prodKey].cores[corKey] = { cor: corKey, totalEstoque: 0, variacoes: {} };
        }
        stats[prodKey].cores[corKey].totalEstoque += qtd;

        const varKey = `${sku}|${parsed.size}`;
        if (!stats[prodKey].cores[corKey].variacoes[varKey]) {
          stats[prodKey].cores[corKey].variacoes[varKey] = {
            sku,
            skuPlat,
            size: parsed.size,
            estoquePlataforma: 0,
            estoqueCasa: 0,
            expedicao: 0,
            estoqueTotal: 0
          };
        }
        
        const isPlat = local.includes('MELI') || local.includes('AMAZON') || local.includes('MAGALU') || local.includes('SHOPEE') || local.includes('DAFITI');
        if (isPlat) {
          stats[prodKey].cores[corKey].variacoes[varKey].estoquePlataforma += qtd;
        }
      }
    });

    // Inject CD Stock (Sandrini Casa Map)
    Object.values(stats).forEach(prod => {
      Object.values(prod.cores).forEach(cor => {
        Object.values(cor.variacoes).forEach(v => {
          let qtyCasa = 0;
          let qtyExpedicao = 0;
          
          const key1 = String(v.sku || '').toUpperCase().trim();
          const key2 = String(v.skuPlat || '').toUpperCase().trim();
          
          if (key1 && sandriniCasaMap[key1] !== undefined) {
            qtyCasa = sandriniCasaMap[key1].estoqueCasa || 0;
            qtyExpedicao = sandriniCasaMap[key1].expedicao || 0;
          } else if (key2 && sandriniCasaMap[key2] !== undefined) {
            qtyCasa = sandriniCasaMap[key2].estoqueCasa || 0;
            qtyExpedicao = sandriniCasaMap[key2].expedicao || 0;
          }
          
          v.estoqueCasa = qtyCasa;
          v.expedicao = qtyExpedicao;
          v.estoqueTotal = v.estoquePlataforma + qtyCasa + qtyExpedicao;
        });
        
        // Sum variation stock to color
        cor.totalEstoque = Object.values(cor.variacoes).reduce((sum, v) => sum + v.estoqueTotal, 0);
      });
      // Sum color stock to product
      prod.totalEstoque = Object.values(prod.cores).reduce((sum, c) => sum + c.totalEstoque, 0);
    });

    // 3. Print Results for Dry Fit products
    console.log('\n================ CONSOLIDATED DRY FIT STOCK IN DASHBOARD ================');
    Object.entries(stats).forEach(([prodKey, prod]) => {
      if (prodKey.toLowerCase().includes('dry')) {
        console.log(`\n📦 MODELO: ${prod.descricao} (${prod.marca})`);
        console.log(`   Total Consolidado no Painel: ${prod.totalEstoque}`);
        console.log('   Cores e Variações:');
        Object.values(prod.cores).forEach(cor => {
          console.log(`   🎨 Cor: ${cor.cor} (Total: ${cor.totalEstoque})`);
          Object.values(cor.variacoes).forEach(v => {
            console.log(`      └─ Tamanho: ${v.size} | SKU: ${v.sku} | SkuPlat: ${v.skuPlat || 'N/A'}`);
            console.log(`         Plataforma (MELI/AMZ/etc): ${v.estoquePlataforma} | Casa (CD): ${v.estoqueCasa} | Expedição: ${v.expedicao} | Total Var: ${v.estoqueTotal}`);
          });
        });
      }
    });

  } catch (err) {
    console.error(err);
  }
}

run();
