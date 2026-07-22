const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hpisoqyionulahtqfwsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaXNvcXlpb251bGFodHFmd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzAzMzIsImV4cCI6MjA5MzA0NjMzMn0.72Ee7OLRPKO8bmIH6vwvCp9AYjK_tVovoYFVRDOXZJo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetSku = 'KPM04000014100CO0P0027';
  console.log(`📡 Buscando SKU Plataforma "${targetSku}" em silver_mapeamento_sku...`);
  
  try {
    const { data, error } = await supabase
      .from('silver_mapeamento_sku')
      .select('*')
      .eq('sku_plataforma', targetSku);

    if (error) {
      throw error;
    }

    console.log(`Mapeamentos encontrados: ${data.length}`);
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

run();
