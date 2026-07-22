const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\beatriz.rizzo\\.gemini\\antigravity\\brain\\c6ff5216-3b96-4b3a-85d7-f10120745cdf\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  console.log("Searching conversation history for rules...");
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepCount = 0;
  for await (const line of rl) {
    stepCount++;
    try {
      const obj = JSON.parse(line);
      // We look for USER messages or planning/parser discussions
      const content = obj.content || '';
      if (obj.source === 'USER_EXPLICIT' || content.toUpperCase().includes('A623') || content.toUpperCase().includes('LOGICA') || content.toUpperCase().includes('REGRA')) {
        console.log(`\n[Passo ${stepCount} - Origem: ${obj.source}]`);
        console.log(content.substring(0, 1000));
      }
    } catch (e) {
      // skip
    }
  }
}

run().catch(console.error);
