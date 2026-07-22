const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const emojiRegex = /[\p{Emoji_Presentation}\uFE0F]/gu;

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const lines = content.split('\n');
  let found = false;
  lines.forEach((line, i) => {
    if (line.match(emojiRegex) && !line.includes('//')) {
      console.log(`[${file}:${i + 1}] ${line.trim()}`);
      found = true;
    }
  });
}
