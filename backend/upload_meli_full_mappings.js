const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

function obterMarcaPorSkuEDesc(sku, desc) {
  const cleanSku = String(sku || "").trim().toUpperCase();
  const cleanDesc = String(desc || "").trim().toUpperCase();

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
    return 'KOCK';
  }
  if (cleanSku.startsWith('NK') || cleanSku.startsWith('NIKE')) {
    return 'NIKE';
  }
  if (cleanSku.startsWith('PEN')) {
    return 'PENALTY';
  }
  if (cleanSku.startsWith('MI')) {
    return 'MIZUNO';
  }

  // Fallbacks by description text
  if (cleanDesc.includes('SANDRINI')) return 'SANDRINI';
  if (cleanDesc.includes('PUMA')) return 'PUMA';
  if (cleanDesc.includes('ADIDAS')) return 'ADIDAS';
  if (cleanDesc.includes('FILA')) return 'FILA';
  if (cleanDesc.includes('LUPO')) return 'LUPO';
  if (cleanDesc.includes('UMBRO')) return 'UMBRO';
  if (cleanDesc.includes('OLYMPIKUS')) return 'OLYMPIKUS';
  if (cleanDesc.includes('ASICS')) return 'ASICS';
  if (cleanDesc.includes('SKECHERS') || cleanSku.includes('SK')) return 'SKECHERS';
  if (cleanDesc.includes('MASH')) return 'MASH';
  if (cleanDesc.includes('ZORBA')) return 'ZORBA';
  if (cleanDesc.includes('KAGIVA')) return 'KAGIVA';
  if (cleanDesc.includes('PENALTY')) return 'PENALTY';
  if (cleanDesc.includes('FERRACINI') || cleanSku.includes('FERRACINI')) return 'FERRACINI';
  if (cleanDesc.includes('KLIN') || cleanSku.includes('KLIN')) return 'KLIN';
  if (cleanDesc.includes('CAVALERA') || cleanSku.includes('CAVALERA')) return 'CAVALERA';
  if (cleanDesc.includes('BULL TERRIER') || cleanSku.includes('BULLTERRIER')) return 'BULL TERRIER';
  if (cleanDesc.includes('TOMMY') || cleanSku.includes('TOMMY')) return 'TOMMY HILFIGER';
  if (cleanDesc.includes('ARAMIS') || cleanSku.includes('ARAMIS')) return 'ARAMIS';

  return 'Sem Marca';
}

async function run() {
  const excelPath = 'C:\\Users\\beatriz.rizzo\\Downloads\\estoque_meli_sp.xlsx';
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Planilha não encontrada em: ${excelPath}`);
    return;
  }
  
  console.log(`📖 Lendo planilha ${excelPath}...`);
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`📊 Total de linhas: ${rows.length}`);
    
    const insertData = [];
    const mapaUnico = {}; // Evitar duplicidades na planilha

    rows.forEach(r => {
      const invId = r['Código ML'] ? String(r['Código ML']).trim() : null;
      const sku = r['SKU'] ? String(r['SKU']).trim() : null;
      const desc = r['Produto'] ? String(r['Produto']).trim() : '';
      
      if (invId && sku && invId !== 'Código ML') {
        const cleanSku = sku.toUpperCase();
        const brand = obterMarcaPorSkuEDesc(cleanSku, desc);
        const chave = `${invId}|MELI_FULL_MAP`;
        
        mapaUnico[chave] = {
          sku_plataforma: invId,
          plataforma: 'MELI_FULL_MAP',
          sku_senior: cleanSku,
          descricao_oficial: desc,
          marca_oficial: brand
        };
      }
    });
    
    const payload = Object.values(mapaUnico);
    console.log(`🧩 Total de mapeamentos únicos a enviar: ${payload.length}`);
    
    if (payload.length === 0) {
      console.log('⚠️ Nenhum mapeamento válido encontrado na planilha.');
      return;
    }
    
    // 1. Limpa mapeamentos MELI_FULL_MAP antigos
    console.log('🧹 Limpando mapeamentos MELI_FULL_MAP anteriores do Supabase...');
    const { error: delErr } = await supabase
      .from('silver_mapeamento_sku')
      .delete()
      .eq('plataforma', 'MELI_FULL_MAP');
      
    if (delErr) {
      console.error('❌ Erro ao deletar no Supabase:', delErr.message);
      return;
    }
    
    // 2. Insere os novos em lotes de 200
    const batchSize = 200;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error: insErr } = await supabase
        .from('silver_mapeamento_sku')
        .insert(batch);
        
      if (insErr) {
        console.error('❌ Erro ao inserir lote no Supabase:', insErr.message);
        return;
      }
      console.log(`  - Lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(payload.length / batchSize)} enviado...`);
    }
    
    console.log('\n🎉 Mapeamento de Full do Mercado Livre atualizado com sucesso no Supabase!');
  } catch (err) {
    console.error('❌ Erro no processo:', err.message);
  }
}

run();
