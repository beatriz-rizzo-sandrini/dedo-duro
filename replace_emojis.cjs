const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

function addImports(content, imports) {
  const importMatch = content.match(/import\s+{[^}]*}\s+from\s+['"]lucide-react['"];/);
  if (importMatch) {
    let existingImports = importMatch[0];
    let newImports = existingImports;
    imports.forEach(imp => {
      if (!existingImports.includes(imp)) {
        newImports = newImports.replace('}', `, ${imp} }`);
      }
    });
    return content.replace(existingImports, newImports);
  } else {
    return content.replace(/import React[^;]*;/i, `$&\\nimport { ${imports.join(', ')} } from 'lucide-react';`);
  }
}

// 1. Estoque.jsx
let estoque = fs.readFileSync(path.join(pagesDir, 'Estoque.jsx'), 'utf8');
estoque = estoque.replace(/<span style=\{\{ fontSize: '24px' \}\}>🏷️<\/span>/g, '<Tags size={28} color="#64748b" />');
estoque = estoque.replace(/<span style=\{\{ fontSize: '24px' \}\}>📦<\/span>/g, '<Package size={28} color="#3b82f6" />');
estoque = estoque.replace(/<span style=\{\{ fontSize: '24px' \}\}>💰<\/span>/g, '<Banknote size={28} color="#10b981" />');
estoque = estoque.replace(/<span style=\{\{ fontSize: '16px' \}\}>🎨<\/span>/g, '<Palette size={16} color="#64748b" />');
estoque = estoque.replace(/🎨 Cor:/g, '<Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}/> Cor:');
estoque = addImports(estoque, ['Tags', 'Package', 'Banknote', 'Palette']);
fs.writeFileSync(path.join(pagesDir, 'Estoque.jsx'), estoque);

// 2. Cobertura.jsx, Vendas.jsx, Sellout.jsx
['Cobertura.jsx', 'Vendas.jsx', 'Sellout.jsx'].forEach(file => {
  let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  content = content.replace(/<span style=\{\{ fontSize: '16px' \}\}>🎨<\/span>/g, '<Palette size={16} color="#64748b" />');
  content = content.replace(/🎨 Cor:/g, '<Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}/> Cor:');
  content = addImports(content, ['Palette']);
  fs.writeFileSync(path.join(pagesDir, file), content);
});

// 3. Produto.jsx
let produto = fs.readFileSync(path.join(pagesDir, 'Produto.jsx'), 'utf8');
produto = produto.replace(/{s\.isRuptura && ' 🔴'}/g, "{s.isRuptura && <AlertCircle size={14} color=\"#ef4444\" style={{marginLeft: '4px', display: 'inline-block', verticalAlign: 'middle'}}/>}");
produto = produto.replace(/{s\.isBad && ' ⛔'}/g, "{s.isBad && <AlertOctagon size={14} color=\"#b45309\" style={{marginLeft: '4px', display: 'inline-block', verticalAlign: 'middle'}}/>}");
produto = produto.replace(/<span style=\{\{ fontSize: '16px' \}\}>🎨<\/span>/g, '<Palette size={16} color="#64748b" />');
produto = produto.replace(/🎨 Cor:/g, '<Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}/> Cor:');
produto = produto.replace(/🔴 Ruptura/g, '<AlertCircle size={10} style={{ marginRight: "2px", display: "inline-block", verticalAlign: "middle" }}/> Ruptura');
produto = produto.replace(/⛔ Bad/g, '<AlertOctagon size={10} style={{ marginRight: "2px", display: "inline-block", verticalAlign: "middle" }}/> Bad');
produto = produto.replace(/<div style=\{\{ fontSize: '48px', marginBottom: '16px' \}\}>🔎<\/div>/g, '<div style={{ marginBottom: "16px", color: "#94a3b8" }}><Search size={48} /></div>');
produto = produto.replace(/<button onClick=\{([^}]+)\}>❌<\/button>/g, '<button onClick={$1} style={{background: "none", border: "none", cursor: "pointer", color: "#ef4444"}}><X size={16} /></button>');
produto = addImports(produto, ['Palette', 'AlertCircle', 'AlertOctagon', 'Search', 'X']);
fs.writeFileSync(path.join(pagesDir, 'Produto.jsx'), produto);

// 4. Reposicao.jsx
let rep = fs.readFileSync(path.join(pagesDir, 'Reposicao.jsx'), 'utf8');
rep = rep.replace(/📦 Lotes \(NF\)/g, '<Package size={16} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }}/> Lotes (NF)');
rep = rep.replace(/👟 Por Produto/g, '<ShoppingBag size={16} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }}/> Por Produto');
rep = rep.replace(/<span style=\{\{ fontSize: '18px' \}\}>👟<\/span>/g, '<ShoppingBag size={18} color="#64748b" />');
rep = rep.replace(/<span style=\{\{ fontSize: '14px' \}\}>🎨<\/span>/g, '<Palette size={14} color="#64748b" />');
rep = rep.replace(/<span style=\{\{ fontSize: '16px' \}\}>🎨<\/span>/g, '<Palette size={16} color="#64748b" />');
rep = rep.replace(/🎨 Cor:/g, '<Palette size={14} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}/> Cor:');
rep = addImports(rep, ['Package', 'ShoppingBag', 'Palette']);
fs.writeFileSync(path.join(pagesDir, 'Reposicao.jsx'), rep);

// 5. Alertas.jsx
let alerta = fs.readFileSync(path.join(pagesDir, 'Alertas.jsx'), 'utf8');
alerta = alerta.replace(/alertaI = "⛔ Badstock";/g, 'alertaI = "Badstock";');
alerta = alerta.replace(/alertaI = "🔴 Ruptura";/g, 'alertaI = "Ruptura";');
alerta = alerta.replace(/alertaI = "⚠️ Cobertura crítica";/g, 'alertaI = "Cobertura crítica";');
alerta = alerta.replace(/alertaI = "🛒 Reposição disponível";/g, 'alertaI = "Reposição disponível";');
alerta = alerta.replace(/\{row\.alertaI\}/g, '{row.alertaI === "Badstock" ? <AlertOctagon size={14} color="#b45309" style={{marginRight:"4px", verticalAlign:"middle"}}/> : row.alertaI === "Ruptura" ? <AlertCircle size={14} color="#ef4444" style={{marginRight:"4px", verticalAlign:"middle"}}/> : row.alertaI === "Cobertura crítica" ? <AlertTriangle size={14} color="#f59e0b" style={{marginRight:"4px", verticalAlign:"middle"}}/> : row.alertaI === "Reposição disponível" ? <ShoppingCart size={14} color="#10b981" style={{marginRight:"4px", verticalAlign:"middle"}}/> : null} {row.alertaI}');
alerta = addImports(alerta, ['AlertOctagon', 'AlertCircle', 'AlertTriangle', 'ShoppingCart']);
fs.writeFileSync(path.join(pagesDir, 'Alertas.jsx'), alerta);
