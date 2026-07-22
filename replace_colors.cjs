const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'src/pages'),
  path.join(__dirname, 'src/components')
];

function processDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const before = content;
      content = content.replace(/'var\(--tooltip-bg, rgba\(15, 23, 42, 0\.9\)\)'/g, "'var(--tooltip-bg)'");
      content = content.replace(/"var\(--tooltip-bg, rgba\(15, 23, 42, 0\.9\)\)"/g, '"var(--tooltip-bg)"');
      content = content.replace(/'rgba\(15, 23, 42, 0\.9\)'/g, "'var(--tooltip-bg)'");
      content = content.replace(/"rgba\(15, 23, 42, 0\.9\)"/g, '"var(--tooltip-bg)"');
      
      if (content !== before) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Modified:', fullPath);
      }
    }
  }
}

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    processDir(dir);
  }
}
