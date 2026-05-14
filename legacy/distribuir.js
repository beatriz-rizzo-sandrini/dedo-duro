
document.getElementById("input-xml").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  document.getElementById("file-name").textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(e.target.result, "application/xml");
    const produtos = Array.from(xml.getElementsByTagName("det"));

    const tbody = document.querySelector("#tabela-itens tbody");
    tbody.innerHTML = "";

    produtos.forEach(item => {
      const prod = item.getElementsByTagName("prod")[0];
      const sku = prod.getElementsByTagName("cProd")[0]?.textContent || "";
      const nome = prod.getElementsByTagName("xProd")[0]?.textContent || "";
      const qtd = parseInt(prod.getElementsByTagName("qCom")[0]?.textContent || "0");

      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${sku}</td><td>${nome}</td><td>${qtd}</td>`;
      tbody.appendChild(tr);
    });

    atualizarResultado();
  };
  reader.readAsText(file);
});

document.querySelectorAll(".toggle-canal").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("ativo");
    renderizarPercentuais();
    atualizarResultado();
  });
});

function renderizarPercentuais() {
  const container = document.getElementById("percentuais-container");
  container.innerHTML = "";

  const ativos = document.querySelectorAll(".toggle-canal.ativo");
  ativos.forEach((el, i) => {
    const canal = el.dataset.canal;
    const input = document.createElement("input");
    input.className = "input-padrao percentual-input";
    input.type = "number";
    input.dataset.canal = canal;
    input.placeholder = "%";
    input.min = 0;
    input.max = 100;

    input.addEventListener("input", () => {
      const val = parseFloat(input.value || "0");
      if (i === 0 && ativos.length > 1) {
        const proximo = container.querySelectorAll("input")[1];
        if (proximo) proximo.value = 100 - val;
      }
      atualizarResultado();

      // foco automático no próximo
      if (input.value.length >= 2 && container.querySelectorAll("input")[i + 1]) {
        container.querySelectorAll("input")[i + 1].focus();
      }
    });

    const label = document.createElement("label");
    label.innerHTML = `${canal}: `;
    label.appendChild(input);
    container.appendChild(label);
  });
}

function atualizarResultado() {
  const linhas = document.querySelectorAll("#tabela-itens tbody tr");
  const resultado = document.querySelector("#resultado-tabela tbody");
  const header = document.getElementById("resultado-header");
  const inputs = Array.from(document.querySelectorAll(".percentual-input"));

  let canais = inputs.map(i => ({
    nome: i.dataset.canal,
    percentual: parseFloat(i.value || "0")
  }));

  let headerHTML = `<tr><th>Descrição</th><th>Total</th>`;
  canais.forEach(c => {
    headerHTML += `<th>${c.nome} (${c.percentual}%)</th>`;
  });
  headerHTML += `<th>Restante</th></tr>`;
  header.innerHTML = headerHTML;

  resultado.innerHTML = "";
  linhas.forEach(linha => {
    const desc = linha.children[1].textContent;
    const total = parseInt(linha.children[2].textContent);

    let linhaHTML = `<td>${desc}</td><td>${total}</td>`;
    let usado = 0;

    canais.forEach(c => {
      const qtd = Math.round((c.percentual / 100) * total);
      usado += qtd;
      linhaHTML += `<td>${qtd}</td>`;
    });

    linhaHTML += `<td>${total - usado}</td>`;
    const tr = document.createElement("tr");
    tr.innerHTML = linhaHTML;
    resultado.appendChild(tr);
  });
}


function exportarCSV() {
  const table = document.querySelector("#resultado-tabela");
  const rows = Array.from(table.querySelectorAll("tr"));
  const csv = rows.map(row => {
    const cols = Array.from(row.querySelectorAll("th, td")).map(col => col.innerText);
    return cols.join(";");
  }).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "distribuicao_nf.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


function renderizarPercentuais() {
  const container = document.getElementById("percentuais-container");
  container.innerHTML = "";

  const ativos = document.querySelectorAll(".toggle-canal.ativo");
  ativos.forEach(el => {
    const canal = el.dataset.canal;
    const input = document.createElement("input");
    input.className = "input-padrao percentual-input";
    input.type = "number";
    input.dataset.canal = canal;
    input.placeholder = "%";
    input.min = 0;
    input.max = 100;

    input.addEventListener("input", () => {
      atualizarResultado();
      atualizarRestantePercentual();
    });

    const label = document.createElement("label");
    label.innerHTML = `${canal}: `;
    label.appendChild(input);
    container.appendChild(label);
  });

  atualizarRestantePercentual();
}

function atualizarRestantePercentual() {
  const inputs = Array.from(document.querySelectorAll(".percentual-input"));
  const soma = inputs.reduce((acc, el) => acc + (parseFloat(el.value || "0") || 0), 0);
  document.getElementById("restante-pct").textContent = Math.max(0, 100 - soma).toFixed(1) + "%";
}

function atualizarResultado() {
  const linhas = document.querySelectorAll("#tabela-itens tbody tr");
  const resultado = document.querySelector("#resultado-tabela tbody");
  const header = document.getElementById("resultado-header");
  const inputs = Array.from(document.querySelectorAll(".percentual-input"));

  let canais = inputs.map(i => ({
    nome: i.dataset.canal,
    percentual: parseFloat(i.value || "0")
  }));

  let totalPct = canais.reduce((acc, c) => acc + (c.percentual || 0), 0);
  let restantePct = Math.max(0, 100 - totalPct);

  let headerHTML = `<tr><th>Descrição</th><th>Total</th>`;
  canais.forEach(c => {
    headerHTML += `<th>${c.nome} (${c.percentual || 0}%)</th>`;
  });
  headerHTML += `<th>Restante (${restantePct.toFixed(1)}%)</th></tr>`;
  header.innerHTML = headerHTML;

  resultado.innerHTML = "";
  linhas.forEach(linha => {
    const desc = linha.children[1].textContent;
    const total = parseInt(linha.children[2].textContent);

    let linhaHTML = `<td>${desc}</td><td>${total}</td>`;
    let usado = 0;

    canais.forEach(c => {
      const qtd = Math.round((c.percentual / 100) * total);
      usado += qtd;
      linhaHTML += `<td>${qtd}</td>`;
    });

    const restanteQtd = total - usado;
    linhaHTML += `<td>${restanteQtd}</td>`;
    const tr = document.createElement("tr");
    tr.innerHTML = linhaHTML;
    resultado.appendChild(tr);
  });
}
