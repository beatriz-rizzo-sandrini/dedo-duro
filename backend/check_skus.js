const { createClient } = require('@supabase/supabase-js');
const { parseProductDescription } = require('../src/utils/productParser.js');

const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const skus = [
    'KSA05000002355CM0P0288',
    'KSA040077046ELCM0P0211',
    'KSA08000002350CM0P0292'
  ];

  for (const s of skus) {
    const { data, error } = await supabase
      .from('silver_estoque')
      .select('sku_produto, descricao_produto')
      .eq('sku_produto', s);
    
    if (error) {
      console.error(error);
      continue;
    }
    
    const unique = Array.from(new Set(data.map(x => x.descricao_produto)));
    console.log(`\n================ SKU: ${s} ================`);
    unique.forEach(desc => {
      const parsed = parseProductDescription(desc, s);
      console.log(`Desc: "${desc}"`);
      console.log(`Parsed Title: "${parsed.baseTitle}"`);
      console.log(`Parsed Color: "${parsed.color}"`);
      console.log(`Parsed Size:  "${parsed.size}"`);
    });
  }
}

run().catch(console.error);
