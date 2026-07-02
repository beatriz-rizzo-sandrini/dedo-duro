const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

async function run() {
  console.log('Querying silver_estoque for:', 'SA0007011SACMCNCN0G0336');
  const { data: est, error: estErr } = await supabase.from('silver_estoque').select('*').ilike('sku_produto', '%SA0007011%');
  if (estErr) console.error(estErr);
  console.log('SILVER_ESTOQUE:', JSON.stringify(est, null, 2));
  
  const { data: map, error: mapErr } = await supabase.from('silver_mapeamento_sku').select('*').ilike('sku_senior', '%SA0007011%');
  if (mapErr) console.error(mapErr);
  console.log('SILVER_MAPEAMENTO:', JSON.stringify(map, null, 2));
}
run();
