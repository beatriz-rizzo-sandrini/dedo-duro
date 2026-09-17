const fs = require('fs');
let code = fs.readFileSync('c:/Users/beatriz.rizzo/Desktop/Sistema de Gestão Estoque DEDO DURO/src/utils/productParser.js', 'utf8');
code = code.replace(/import\s+seniorCatalog\s+from\s+['\"].*?seniorCatalog\.json['\"];/, 'const seniorCatalog = {};');
code = code.replace(/export\s+function/g, 'function');
code = code.replace(/export\s+const/g, 'const');
code += '\nconsole.log(parseProductDescription(\'#N/A\', \'FLF01L00390ABAQAF382145\', false, \'FILA\'));';
fs.writeFileSync('C:/Users/beatriz.rizzo/Desktop/test_parser.js', code);
