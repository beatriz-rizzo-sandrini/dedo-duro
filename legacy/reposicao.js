console.log("Reposição carregada!");

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const envioParam = params.get("envio");
  if (envioParam) {
    const selectEnvio = document.getElementById("filtro-envio-rep");
    const btnAplicar = document.getElementById("btn-aplicar-rep");
    const tentarAplicar = () => {
      if ([...selectEnvio.options].some(o => o.value === envioParam)) {
        selectEnvio.value = envioParam;
        btnAplicar.click();
      } else {
        setTimeout(tentarAplicar, 200);
      }
    };
    tentarAplicar();
  }

  document.getElementById("loader")?.classList.remove("hidden");
  const url = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=CAMINHO";

  let allRows = [];
  let currentSort = { column: null, asc: true };

  fetch(url)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substring(47).slice(0, -2));
      allRows = json.table.rows;
      preencherFiltros(allRows);
      aplicarFiltroReposicao();
    })
    .catch(err => console.error("Erro ao carregar reposição:", err));

  function preencherFiltros(rows) {
    const selLocal = document.getElementById("filtro-local-rep");
    const selStatus = document.getElementById("filtro-status-rep");
    const selEnvio = document.getElementById("filtro-envio-rep");

    const locais = new Set();
    const statusSet = new Set();
    const enviosSet = new Set();

    rows.forEach(r => {
      const local = String(r.c[2]?.v ?? "").toUpperCase().trim();   // Local destino
      const status = String(r.c[5]?.v ?? "").toUpperCase().trim();  // Status
      
      // Ajuste para capturar sempre envio como texto, preservando alfanuméricos
      let envio = "";
      if (r.c[7]?.f) {
        envio = r.c[7].f.toUpperCase().trim();
      } else if (r.c[7]?.v != null) {
        envio = String(r.c[7].v).toUpperCase().trim();
      }

      if (local) locais.add(local);
      if (status) statusSet.add(status);
      if (envio) enviosSet.add(envio);
    });

    selLocal.innerHTML = '<option value="">Todos</option>';
    locais.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selLocal.appendChild(opt);
    });

    selStatus.innerHTML = '<option value="">Todos</option>';
    statusSet.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selStatus.appendChild(opt);
    });

    selEnvio.innerHTML = '<option value="">Todos</option>';
    enviosSet.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selEnvio.appendChild(opt);
    });
  }

  document.getElementById("btn-aplicar-rep").addEventListener("click", aplicarFiltroReposicao);

  function aplicarFiltroReposicao() {
    const filtroLocal = document.getElementById("filtro-local-rep").value.toUpperCase();
    const filtroStatus = document.getElementById("filtro-status-rep").value.toUpperCase();
    const filtroEnvio = document.getElementById("filtro-envio-rep").value.toUpperCase();

    const tbody = document.querySelector("#tabela-rep tbody");
    const thead = document.querySelector("#tabela-rep thead tr");
    const totalSpan = document.getElementById("total-rep");
    tbody.innerHTML = "";

    let totalGeral = 0;
    const agrupadoEnvio = {};

    allRows.forEach(r => {
      const sku = r.c[0]?.v || "";
      const descricao = r.c[1]?.v || "";
      const local = String(r.c[2]?.v ?? "").toUpperCase().trim();
      const quantidade = r.c[4]?.v || 0;
      const status = String(r.c[5]?.v ?? "").toUpperCase().trim();
      let previsaoRaw = r.c[6]?.v || "";
      let previsao = "";
      if(typeof previsaoRaw === "object" && previsaoRaw?.f) {
        previsao = previsaoRaw.f; // já vem formatado
      } else if(typeof previsaoRaw === "string" && previsaoRaw.includes("Date")) {
        const m = previsaoRaw.match(/Date\((\d+),(\d+),(\d+)\)/);
        if(m){
          const ano = m[1];
          const mes = String(parseInt(m[2]) + 1).padStart(2,"0");
          const dia = String(m[3]).padStart(2,"0");
          previsao = `${dia}/${mes}/${ano}`;
        }
      } else {
        previsao = previsaoRaw;
      }
      
      // Ajuste para capturar sempre envio como texto, preservando alfanuméricos
      let envio = "";
      if (r.c[7]?.f) {
        envio = r.c[7].f.toUpperCase().trim();
      } else if (r.c[7]?.v != null) {
        envio = String(r.c[7].v).toUpperCase().trim();
      }

      // Filtros
      if (filtroLocal && local !== filtroLocal) return;
      if (filtroStatus && status !== filtroStatus) return;
      if (filtroEnvio && envio !== filtroEnvio) return;

      totalGeral += quantidade;

      const chaveEnvio = `${local}||${envio}||${status}||${previsao}`;

      if (!agrupadoEnvio[chaveEnvio]) {
        agrupadoEnvio[chaveEnvio] = { 
          local, envio, status, previsao, total: 0, descricoes: {}
        };
      }
      agrupadoEnvio[chaveEnvio].total += quantidade;

      if (!agrupadoEnvio[chaveEnvio].descricoes[descricao]) {
        agrupadoEnvio[chaveEnvio].descricoes[descricao] = { descricao, total: 0, skus: [] };
      }
      agrupadoEnvio[chaveEnvio].descricoes[descricao].total += quantidade;
      agrupadoEnvio[chaveEnvio].descricoes[descricao].skus.push({
        sku, quantidade, status, previsao
      });
    });

    totalSpan.textContent = totalGeral;

    let envios = Object.values(agrupadoEnvio);

    // Ordenação por envio ou total
    if (currentSort.column) {
      envios.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
      });
    }

    // Renderizar primeiro nível (envios)
    envios.forEach(env => {
      const trEnvio = document.createElement("tr");
      trEnvio.style.cursor = "pointer";
      trEnvio.innerHTML = `
        <td>${env.local}</td>
        <td>${env.envio}</td>
        <td>${env.total}</td>
        <td>${env.status}</td>
        <td>${env.previsao}</td>
      `;

      trEnvio.addEventListener("click", () => {
        const expanded = trEnvio.classList.contains("expanded");
        // sempre limpar detalhes antes
        tbody.querySelectorAll(".detalhe-envio").forEach(el => el.remove());
        tbody.querySelectorAll(".detalhe-desc").forEach(el => el.remove());
        tbody.querySelectorAll("tr").forEach(row => row.classList.remove("expanded"));
        if (expanded) {
          trEnvio.classList.remove("expanded");
          return;
        }
        trEnvio.classList.add("expanded");

        // Dentro do envio, agrupar descrições
        Object.values(env.descricoes).forEach(desc => {
          const trDesc = document.createElement("tr");
          trDesc.classList.add("detalhe-envio");
          trDesc.style.cursor = "pointer";
          trDesc.innerHTML = `
            <td style="padding-left:30px;">${desc.descricao}</td>
<td></td>
            <td colspan="4">${desc.total}</td>
          `;

          trDesc.addEventListener("click", (e) => {
            e.stopPropagation();
            const descExpanded = trDesc.classList.contains("expanded");
            tbody.querySelectorAll(".detalhe-desc").forEach(el => el.remove());
            tbody.querySelectorAll("tr").forEach(row => row.classList.remove("expanded-desc"));
            if (descExpanded) {
              trDesc.classList.remove("expanded");
              return;
            }
            trDesc.classList.add("expanded");

            desc.skus.forEach(skuItem => {
              const trSku = document.createElement("tr");
              trSku.classList.add("detalhe-desc");
              trSku.innerHTML = `
                <td style="padding-left:60px;">${skuItem.sku}</td>
                <td></td>
                <td>${skuItem.quantidade}</td>
                <td colspan="2"></td>
              `;
              trSku.style.background = "#f9f9f9";
              tbody.insertBefore(trSku, trDesc.nextSibling);
            });
          });

          tbody.insertBefore(trDesc, trEnvio.nextSibling);
        });
      });

      tbody.appendChild(trEnvio);
    });

    // Atualizar ícones do cabeçalho
    thead.querySelectorAll("th").forEach(th => {
      const col = th.dataset.col;
      let icon = "⇅";
      if (currentSort.column === col) {
        icon = currentSort.asc ? "▲" : "▼";
      }
      th.innerHTML = th.textContent.split(" ")[0] + " " + icon;
    });

    // Adicionar evento de ordenação
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
        aplicarFiltroReposicao();
      };
    });

    document.getElementById('btn-exportar')?.addEventListener('click', exportarTabelaReposicao);
    document.getElementById('loader')?.classList.add('hidden');
  }
});

function exportarTabelaReposicao() {
  const tabela = document.getElementById("tabela-rep");
  if (!tabela) return;
  const linhas = tabela.querySelectorAll("tr");
  const linhasArray = Array.from(linhas).map(row => Array.from(row.cells).map(cell => cell.innerText.replace(/;/g, ",")));
  const csvContent = "\uFEFF" + linhasArray.map(e => e.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", "reposicao_a_caminho.csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
