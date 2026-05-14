console.log("Estoque carregado!");

window.addEventListener("load", () => {
  document.getElementById("loader")?.classList.remove("hidden");
  const url = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=ESTOQUE";

  let allRows = [];
  let currentSort = { column: null, asc: true };

  fetch(url)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substring(47).slice(0, -2));
      allRows = json.table.rows;
      preencherLocais(allRows);
      preencherMarcas(allRows);
      aplicarFiltroEstoque();
    })
    .catch(err => console.error("Erro ao carregar estoque:", err));

  function preencherLocais(rows) {
    const select = document.getElementById("filtro-local-estoque");
    const locais = new Set();
    rows.forEach(r => {
      const local = (r.c[3]?.v || "").toUpperCase().trim();
      if (local) locais.add(local);
    });
    select.innerHTML = '<option value="">Todos</option>';
    locais.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      select.appendChild(opt);
    });
  }

  function preencherMarcas(rows) {
    const select = document.getElementById("filtro-marca-estoque");
    const marcas = new Set();
    rows.forEach(r => {
      const marca = (r.c[4]?.v || "").toUpperCase().trim(); // Coluna E
      if (marca) marcas.add(marca);
    });
    select.innerHTML = '<option value="">Todas</option>';
    marcas.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    });
  }

  document.getElementById("btn-aplicar-estoque").addEventListener("click", aplicarFiltroEstoque);

  function aplicarFiltroEstoque() {
    const filtroLocal = document.getElementById("filtro-local-estoque").value.toUpperCase();
    const filtroMarca = document.getElementById("filtro-marca-estoque").value.toUpperCase();
    const tbody = document.querySelector("#tabela-estoque tbody");
    const thead = document.querySelector("#tabela-estoque thead tr");
    const totalSpan = document.getElementById("total-estoque");
    tbody.innerHTML = "";

    let totalGeral = 0;
    const agrupado = {};

    allRows.forEach(r => {
      const sku = r.c[1]?.v || "";
      const descricao = r.c[2]?.v || "";
      const local = (r.c[3]?.v || "").toUpperCase().trim();
      const marca = (r.c[4]?.v || "").toUpperCase().trim();
      const quantidade = r.c[5]?.v || 0;

      if (filtroLocal && local !== filtroLocal) return;
      if (filtroMarca && marca !== filtroMarca) return;

      totalGeral += quantidade;

      if (!agrupado[descricao]) {
        agrupado[descricao] = { descricao, total: 0, itens: [] };
      }
      agrupado[descricao].total += quantidade;
      agrupado[descricao].itens.push({ sku, local, quantidade });
    });

    totalSpan.textContent = totalGeral;

    let linhas = Object.values(agrupado);

    if (currentSort.column) {
      linhas.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
      });
    }

    linhas.forEach(prod => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td>${prod.descricao}</td>
        <td>${prod.total}</td>
      `;

      tr.addEventListener("click", () => {
        const expanded = tr.classList.contains("expanded");
        tbody.querySelectorAll(".detalhe-produto").forEach(el => el.remove());
        tbody.querySelectorAll("tr").forEach(row => row.classList.remove("expanded"));
        if (expanded) return;
        tr.classList.add("expanded");

        prod.itens.forEach(item => {
          const trDet = document.createElement("tr");
          trDet.classList.add("detalhe-produto");

          let detalheTexto = filtroLocal
            ? `SKU: ${item.sku}`
            : `SKU: ${item.sku} | Local: ${item.local}`;

          trDet.innerHTML = `
            <td style="padding-left:30px;">${detalheTexto}</td>
            <td>${item.quantidade}</td>
          `;
          trDet.style.background = "#f9f9f9";
          tbody.insertBefore(trDet, tr.nextSibling);
        });
      });

      tbody.appendChild(tr);
    });

    thead.querySelectorAll("th").forEach(th => {
      const col = th.dataset.col;
      let icon = "⇅";
      if (currentSort.column === col) {
        icon = currentSort.asc ? "▲" : "▼";
      }
      th.innerHTML = th.textContent.split(" ")[0] + " " + icon;
    });

    thead.querySelectorAll("th").forEach(th => {
      th.style.cursor = "pointer";
      th.onclick = () => {
        const col = th.dataset.col;
        if (currentSort.column === col) {
          currentSort.asc = !currentSort.asc;
        } else {
          currentSort.column = col;
          currentSort.asc = true;
        }
        aplicarFiltroEstoque();
      };
    });

    document.getElementById('btn-exportar')?.addEventListener('click', exportarTabelaEstoque);
    document.getElementById('loader')?.classList.add('hidden');
  }
});

function exportarTabelaEstoque() {
  const tabela = document.getElementById("tabela-estoque");
  if (!tabela) return;
  const linhas = tabela.querySelectorAll("tr");
  const linhasArray = Array.from(linhas).map(row => Array.from(row.cells).map(cell => cell.innerText.replace(/;/g, ",")));
  const csvContent = "\uFEFF" + linhasArray.map(e => e.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", "estoque_agrupado.csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}