
const urlEstoque = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=ESTOQUE";
const urlBadStock = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=badstock";
const urlVendas = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=vendas";

let estoqueRows = [];
let badStockRows = [];
let vendasRows = [];

function parseJSONResponse(text) {
  return JSON.parse(text.substring(47).slice(0, -2)).table.rows;
}

function carregarDadosAlertas() {
  return Promise.all([
    fetch(urlEstoque).then(r => r.text()).then(parseJSONResponse),
    fetch(urlVendas).then(r => r.text()).then(parseJSONResponse),
    fetch(urlBadStock).then(r => r.text()).then(parseJSONResponse),
  ]).then(([estoque, vendas, badstock]) => {
    estoqueRows = estoque;
    vendasRows = vendas;
    badStockRows = badstock;
  });
}

function temReposicaoCentral(sku) {
  const estoqueCentral = estoqueRows.filter(r => {
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    return ["STAND BY","EXP MINAS"].includes(local) && (r.c[1]?.v || "") === sku;
  }).reduce((soma, r) => soma + (r.c[5]?.v || 0), 0);
  return estoqueCentral > 0;
}

function buscarAlertas() {
  const ini = document.getElementById("data-inicial").value;
  const fim = document.getElementById("data-final").value;
  const tipo = document.getElementById("tipo-alerta").value;
  if (!ini || !fim) {
    alert("Selecione o período!");
    return;
  }

  const diasPeriodo = (new Date(fim) - new Date(ini)) / (1000 * 60 * 60 * 24) + 1;
  const tabela = document.getElementById("tabela-alertas");
  tabela.innerHTML = "";
  let totalAlertas = 0;

  const vendasMap = {};
  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(ini) || data > new Date(fim)) return;
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const sku = r.c[2]?.v || "";
    const qtd = r.c[4]?.v || 0;
    const key = local + "|" + sku;
    if (!vendasMap[key]) vendasMap[key] = 0;
    vendasMap[key] += qtd;
  });

  estoqueRows.forEach(r => {
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtdEstoque = r.c[5]?.v || 0;
    const key = local + "|" + sku;
    const vendas = vendasMap[key] || 0;
    const media = diasPeriodo > 0 ? vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(qtdEstoque / media) : (vendas > 0 ? 0 : "∞");

    let alertaTipo = null;
    let alertaIcone = "";

    const isBad = badStockRows.some(bs => {
      const skuB = (bs.c[1]?.v || "").trim().toLowerCase();
      const localB = (bs.c[2]?.v || "").trim().toLowerCase();
      return sku.trim().toLowerCase() === skuB && local.trim().toLowerCase() === localB;
    });

    if (isBad) {
      alertaTipo = "badstock";
      alertaIcone = "⛔ Badstock";
    } else if (qtdEstoque === 0 && vendas > 0) {
      alertaTipo = "ruptura";
      alertaIcone = "🔴 Ruptura";
    } else if (typeof cobertura === "number" && cobertura < 60) {
      alertaTipo = "cobertura";
      alertaIcone = "⚠️ Cobertura baixa";
      if (temReposicaoCentral(sku)) {
        alertaTipo = "reposicao";
        alertaIcone = "🛒 Reposição disponível";
      }
    }

    if (alertaTipo && (tipo === "todos" || tipo === alertaTipo)) {
      totalAlertas++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${local}</td>
        <td>${sku}</td>
        <td>${qtdEstoque}</td>
        <td>${vendas}</td>
        <td>${cobertura}</td>
        <td>${alertaIcone}</td>
        <td><button class="btn-padrao" onclick="adicionarCarrinhoAlerta('${local}','${sku}',${qtdEstoque},${vendas},'${cobertura}')">🛒</button></td>
      `;
      tabela.appendChild(tr);
    }
  });

  document.getElementById("total-alertas").textContent = totalAlertas;
}

document.getElementById("exportar-alertas").addEventListener("click", () => {
  const linhas = document.querySelectorAll("#tabela-alertas tr");
  if (!linhas.length) {
    alert("Nenhum alerta para exportar!");
    return;
  }
  let csv = "Local;SKU;Estoque;Vendas;Cobertura;Alerta\n";
  linhas.forEach(tr => {
    const cols = tr.querySelectorAll("td");
    const values = Array.from(cols).slice(0, 6).map(td => td.textContent);
    csv += values.join(";") + "\n";
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "alertas_estoque.csv";
  link.click();
});

let carrinhoAlertas = [];
function adicionarCarrinhoAlerta(local, sku, estoque, vendas, cobertura) {
  carrinhoAlertas.push({local, sku, estoque, vendas, cobertura});
  alert("SKU adicionado ao carrinho de alertas!");
}

window.addEventListener("load", () => {
  carregarDadosAlertas().then(() => {
    document.getElementById("btn-buscar").addEventListener("click", buscarAlertas);
    enableSortableTable('tabela-alertas');
  });
});



function enableSortableTable(tableId) {
  const table = document.getElementById(tableId);
  const headers = table.querySelectorAll("th");
  headers.forEach((th, index) => {
    let asc = true;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const tbody = table.querySelector("tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const isNumeric = rows.some(r => !isNaN(r.children[index].textContent.trim().replace(",", ".")));

      rows.sort((a, b) => {
        let valA = a.children[index].textContent.trim();
        let valB = b.children[index].textContent.trim();

        if (isNumeric) {
          valA = parseFloat(valA.replace(/[^0-9.-]/g, "").replace(",", ".")) || 0;
          valB = parseFloat(valB.replace(/[^0-9.-]/g, "").replace(",", ".")) || 0;
        }

        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });

      rows.forEach(r => tbody.appendChild(r));
      asc = !asc;
    });
  });
}
