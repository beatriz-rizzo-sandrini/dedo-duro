// Conversor
document.getElementById("input-excel").addEventListener("change", function(e) {
  window.selectedFile = e.target.files[0];
  document.getElementById("btn-processar").disabled = !window.selectedFile;
});

document.getElementById("btn-processar").addEventListener("click", function() {
  const plataforma = document.getElementById("plataforma").value;
  if (!window.selectedFile) return alert("Selecione uma planilha primeiro!");
  if (!plataforma) return alert("Escolha uma plataforma!");

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    
    function parseCSVLine(line, delimiter) {
      if (line.includes(`"`) === false) {
        return line.split(delimiter).map(val => val.trim());
      }
      const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      return line.split(regex).map(val => val.replace(/^"|"$/g, '').trim());
    }

    const rawRows = text.split(/\r?\n/).filter(r => r.trim());
    if (rawRows.length < 2) {
      alert("Não foi possível encontrar os dados suficientes.");
      return;
    }

    const delimiter = rawRows[0].includes(';') ? ';' : (rawRows[0].includes('\t') ? '\t' : ',');
    const headers = parseCSVLine(rawRows[0], delimiter);
    
    const sheet = [];
    for (let i = 1; i < rawRows.length; i++) {
       const vals = parseCSVLine(rawRows[i], delimiter);
       const rowObj = {};
       headers.forEach((h, idx) => {
         rowObj[h] = vals[idx] !== undefined ? vals[idx] : "";
       });
       sheet.push(rowObj);
    }

    // Função auxiliar para buscar colunas
    function getColName(possibles, row) {
      for (let key of Object.keys(row)) {
        for (let name of possibles) {
          if (key.toLowerCase().includes(name.toLowerCase())) return key;
        }
      }
      return null;
    }

    // Conversores de data
    function converteDataPortugues(texto) {
      const meses = {
        "janeiro": "01","fevereiro": "02","março": "03","abril": "04","maio": "05","junho": "06",
        "julho": "07","agosto": "08","setembro": "09","outubro": "10","novembro": "11","dezembro": "12"
      };
      let txt = texto.toLowerCase().replace("hs.", "").trim();
      let match = txt.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/);
      if (match) {
        let dia = match[1].padStart(2, "0");
        let mes = meses[match[2]] || "01";
        let ano = match[3];
        return `${dia}/${mes}/${ano}`;
      }
      let d = new Date(texto);
      if (!isNaN(d)) {
        let dia = String(d.getDate()).padStart(2,"0");
        let mes = String(d.getMonth()+1).padStart(2,"0");
        return `${dia}/${mes}/${d.getFullYear()}`;
      }
      if (texto.includes("-")) {
        let partes = texto.split("-");
        if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      if (texto.includes("/")) return texto.split(" ")[0];
      return texto;
    }
    function converteDataPadrao(texto) {
      let d = new Date(texto);
      if (!isNaN(d)) {
        let dia = String(d.getDate()).padStart(2,"0");
        let mes = String(d.getMonth()+1).padStart(2,"0");
        return `${dia}/${mes}/${d.getFullYear()}`;
      }
      if (texto.includes("T")) return texto.split("T")[0].split("-").reverse().join("/");
      if (texto.includes("-")) {
        let partes = texto.split("-");
        if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      if (texto.includes("/")) return texto.split(" ")[0];
      return texto;
    }

    // Configurações de cada plataforma
    const config = {
      mercado_livre: {
        colData: ["data da venda"],
        colSKU: ["sku"],
        colQtd: ["unidades"],
        funcData: converteDataPortugues,
        hasDate: true
      },
      amazon: {
        colData: ["data de envio","order date","purchase date"],
        colSKU: ["sku do vendedor","seller sku"],
        colQtd: ["quantidade","quantity"],
        funcData: converteDataPadrao,
        hasDate: true
      },
      magalu: {
        colData: ["data do pedido"],
        colSKU: ["codigo sku","codigo sku seller"],
        colQtd: ["quantidade de itens"],
        funcData: converteDataPadrao,
        hasDate: true
      },
      dafiti: {
        colData: [],
        colSKU: ["seller sku"],
        colQtd: ["gross order items","qty"],
        funcData: null,
        hasDate: false
      },
      shopee: {
        colData: [],
        colSKU: ["reference","product code","sku"],
        colQtd: ["quantity","qty"],
        funcData: null,
        hasDate: false
      }
    };

    const cfg = config[plataforma];
    const sampleRow = sheet[0];
    const colData = cfg.hasDate ? getColName(cfg.colData, sampleRow) : null;
    const colSKU = getColName(cfg.colSKU, sampleRow);
    const colUnits = getColName(cfg.colQtd, sampleRow);

    if (!colSKU || !colUnits) {
      alert("Não consegui localizar as colunas para esta plataforma.");
      return;
    }

    let filtrado = sheet.map(row => ({
      data: cfg.hasDate ? row[colData] : "",
      sku: String(row[colSKU]).trim(),
      unidades: Number(row[colUnits]) || 0
    })).filter(r => r.sku && r.unidades);

    if (!filtrado.length) {
      alert("Nenhuma linha válida encontrada.");
      return;
    }

    // Converter datas se existir
    if (cfg.hasDate) {
      filtrado.forEach(r => {
        r.data = cfg.funcData ? cfg.funcData(String(r.data)) : String(r.data);
      });
    }

    // Agrupar
    const agrupado = {};
    filtrado.forEach(r => {
      const key = (cfg.hasDate ? r.data + "|" : "") + r.sku;
      if (!agrupado[key]) agrupado[key] = { data: r.data, sku: r.sku, unidades: 0 };
      agrupado[key].unidades += r.unidades;
    });

    const finalData = Object.values(agrupado).map(item => {
      if (cfg.hasDate) {
        return {
          Data: item.data,
          SKU: item.sku,
          "Quantidade Vendida": item.unidades
        };
      } else {
        return {
          SKU: item.sku,
          "Quantidade Vendida": item.unidades
        };
      }
    });

    // Ordenar por data se existir
    if (cfg.hasDate) {
      finalData.sort((a,b) => {
        const [dA,mA,yA] = a.Data.split("/").map(Number);
        const [dB,mB,yB] = b.Data.split("/").map(Number);
        return new Date(yA,mA-1,dA) - new Date(yB,mB-1,dB);
      });
    }

    let csvContent = "\uFEFF";
    if (finalData.length > 0) {
      const finalHeaders = Object.keys(finalData[0]);
      csvContent += finalHeaders.join(";") + "\n";
      finalData.forEach(r => {
        csvContent += finalHeaders.map(h => String(r[h]).replace(/;/g, ",")).join(";") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.getElementById("download-link");
    link.href = url;
    link.download = "planilha_corrigida.csv";
    link.textContent = "Baixar Planilha Corrigida (.csv)";
    link.style.display = "inline-block";
  };
  reader.readAsText(window.selectedFile, "utf-8");
});
