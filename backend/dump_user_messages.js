const fs = require('fs');
const readline = require('readline');

const TRANSCRIPT_PATH = 'C:\\Users\\beatriz.rizzo\\.gemini\\antigravity\\brain\\067fc73d-81bd-4a81-9b1d-d23cb3a8792b\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  console.log('📖 Extraindo todas as mensagens do usuário sobre SKU, Cores e Descrições...');
  
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    console.error('Arquivo transcript.jsonl não encontrado.');
    return;
  }

  const fileStream = fs.createReadStream(TRANSCRIPT_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.source === 'USER_EXPLICIT' && obj.content) {
        const text = obj.content.toLowerCase();
        if (text.includes('sku') || text.includes('cor') || text.includes('descri') || text.includes('mapea')) {
          console.log(`\n----------------------------------------`);
          console.log(`[Passo ${obj.step_index}]`);
          console.log(obj.content);
        }
      }
    } catch (e) {
      // Ignora JSONs malformados
    }
  }
}

run();
