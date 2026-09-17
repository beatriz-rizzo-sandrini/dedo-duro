const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SPREADSHEET_ID = '1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y';

function parseGoogleJSON(text) {
  try {
    const jsonStr = text.substring(47).slice(0, -2);
    return JSON.parse(jsonStr).table.rows;
  } catch (e) {
    return [];
  }
}

async function testConsolidatedAeroSpark() {
  const res = await axios.get(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=ESTOQUE`);
  const sheetRows = parseGoogleJSON(res.data);

  let totalSparkMeliSp = 0;
  let totalSparkAll = 0;
  let sparkCostMeliSp = 0;

  for (const r of sheetRows) {
    if (!r || !r.c) continue;
    const sku = String(r.c[1]?.v || '').trim().toUpperCase();
    const desc = String(r.c[2]?.v || '').trim();
    const local = String(r.c[3]?.v || '').trim().toUpperCase();
    const qtd = Number(r.c[5]?.v) || 0;
    const valor = Number(r.c[6]?.v) || 0;

    const isAeroSpark = 
      sku.startsWith('SA001841') ||
      sku.startsWith('SA000001841') ||
      sku.includes('1841') ||
      sku.includes('SPARK') ||
      desc.toUpperCase().includes('SPARK') ||
      desc.toUpperCase().includes('1841');

    if (isAeroSpark) {
      totalSparkAll += qtd;
      if (local === 'MELI SP') {
        totalSparkMeliSp += qtd;
        sparkCostMeliSp += (qtd * valor);
      }
    }
  }

  console.log(`Total Aero Spark em MELI SP com todas as variações unificadas: ${totalSparkMeliSp} peças`);
  console.log(`Valor Total de Custo em MELI SP: R$ ${sparkCostMeliSp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Total Aero Spark em TODOS os locais: ${totalSparkAll} peças`);
}

testConsolidatedAeroSpark().catch(console.error);
