const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vckcnhwqucnsajpdkkfl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Deletando relatórios de 02/07/2026 - 11/08/2026...");
  const { data, error } = await supabase
    .from('tiktok_reports')
    .delete()
    .eq('period', '02/07/2026 - 11/08/2026');
    
  if (error) {
    console.error("Erro ao deletar:", error);
  } else {
    console.log("Relatórios deletados com sucesso!");
  }
}

run();
