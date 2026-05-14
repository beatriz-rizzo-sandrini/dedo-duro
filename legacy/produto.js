
function temReposicaoCentral(sku) {
  const estoqueCentral = produtoFiltrado.filter(r => {
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    return ["STAND BY","EXP MINAS"].includes(local) && (r.c[1]?.v || "") === sku;
  }).reduce((soma, r) => soma + (r.c[5]?.v || 0), 0);
  return estoqueCentral > 0;
}




function corPorLocal(local) {
  switch (local) {
    case "DAFITI": return "#000000"; // preto
    case "MAGALU": return "#cce5ff"; // azul claro
    case "STAND BY": return "#d4edda"; // verde claro
    case "MELI SP": return "#fff3cd"; // amarelo claro
    case "AMAZON": return "#ffe5cc"; // laranja claro
    case "SHOPEE SPORTS": return "#ffecd1"; // laranja ainda mais claro
    case "MELI MG": return "#fef9e7"; // amarelo bem claro
    case "EXP MINAS": return "#e6d5f7"; // roxo claro
    default: return "#f9f9f9";
  }
}


function corTextoPorLocal(local) {
  return local === "DAFITI" ? "white" : "black";
}



console.log("Produto carregado!");


const urlEstoque = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=ESTOQUE";
const urlBadStock = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=badstock";
const urlVendas = "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=vendas";

let estoqueRows = [];
let badStockRows = [];
let vendasRows = [];
let produtoFiltrado = [];


function isSKUComProblema(sku, local) {
  if (!badStockRows || badStockRows.length === 0) return false;
  return badStockRows.some(r => {
    const skuB = (r.c[1]?.v || "").trim().toLowerCase();
    const localB = (r.c[2]?.v || "").trim().toLowerCase();
    return sku.trim().toLowerCase() === skuB && local.trim().toLowerCase() === localB;
  });
}


function parseJSONResponse(text) {
  return JSON.parse(text.substring(47).slice(0, -2)).table.rows;
}

function formatReal(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function carregarDados() {
  Promise.all([
    fetch(urlEstoque).then(r => r.text()).then(parseJSONResponse),
    fetch(urlVendas).then(r => r.text()).then(parseJSONResponse),
    fetch(urlBadStock).then(r => r.text()).then(parseJSONResponse),
  ]).then(([estoque, vendas, badstock]) => {
    badStockRows = badstock;
    estoqueRows = estoque;
    vendasRows = vendas;
  });
}

function buscarProduto() {
  const termo = document.getElementById("input-produto").value.toLowerCase().trim();
  produtoFiltrado = estoqueRows.filter(r => (r.c[2]?.v || "").toLowerCase().includes(termo));
  const tabela = document.getElementById("tabela-produto");
  tabela.innerHTML = "";

  const agrupado = {};
  let valorTotal = 0;

  produtoFiltrado.forEach(r => {
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const qtd = r.c[5]?.v || 0;
    const valor = r.c[6]?.v || 0;
    if (!agrupado[local]) agrupado[local] = { valor: 0, qtd: 0 };
    agrupado[local].valor += valor;
    agrupado[local].qtd += qtd;
    valorTotal += valor;
  });

  document.getElementById("nome-produto").textContent = produtoFiltrado[0]?.c[2]?.v || "-";
  document.getElementById("total-skus").textContent = new Set(produtoFiltrado.map(r => r.c[1]?.v)).size;
  document.getElementById("valor-total").textContent = formatReal(valorTotal);

  // monta a estrutura inicial da tabela por local
  Object.entries(agrupado).forEach(([local, info]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${local}</td>
      <td>${formatReal(info.valor)}</td>`;
      tr.style.background = corPorLocal(local);
      tr.style.color = corTextoPorLocal(local);
      tr.innerHTML += `
      <td>${info.qtd}</td>
      <td>0</td>
      <td>-</td>
    `;
    document.getElementById("tabela-produto").appendChild(tr);
  });
}

function buscarVendas() {
  const ini = document.getElementById("data-inicial").value;
  const fim = document.getElementById("data-final").value;
  if (!ini || !fim) return;

  const diasPeriodo = (new Date(fim) - new Date(ini)) / (1000 * 60 * 60 * 24) + 1;
  const tabela = document.getElementById("tabela-produto");

  // cria mapa de descrições buscadas
  const descricoes = new Set(produtoFiltrado.map(r => (r.c[2]?.v || "").toLowerCase().trim()));

  // map de vendas por local
  const vendasPorLocal = {};
  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(ini) || data > new Date(fim)) return;

    const descVenda = (r.c[3]?.v || "").toLowerCase().trim();
    if (!descricoes.has(descVenda)) return;

    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (!vendasPorLocal[local]) vendasPorLocal[local] = 0;
    vendasPorLocal[local] += qtd;
  });

  const locaisJaExibidos = new Set();

  // atualiza linhas existentes
  for (let tr of tabela.querySelectorAll("tr")) {
    const local = tr.children[0].textContent;
    const qtdEstoque = parseInt(tr.children[2].textContent);
    const vendas = vendasPorLocal[local] || 0;
    const media = diasPeriodo > 0 ? vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(qtdEstoque / media) : "Sem vendas";

    // Indicador de ruptura por plataforma
    if (qtdEstoque === 0 && vendas > 0) {
      tr.children[0].innerHTML += ' <span title="Ruptura" style="color:red; margin-left:6px;">⚠️</span>';
    }

    tr.children[3].textContent = vendas;
    tr.children[4].textContent = cobertura;

    const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
    const reposicao = Math.round((media * diasDesejados) - qtdEstoque);
    const tdReposicao = document.createElement("td");
    tdReposicao.textContent = reposicao > 0 ? reposicao : "-";
    tr.appendChild(tdReposicao);

    locaisJaExibidos.add(local);
  }

  // adiciona linhas extras para locais que só têm vendas
  Object.entries(vendasPorLocal).forEach(([local, qtd]) => {
    if (!locaisJaExibidos.has(local)) {
      const media = diasPeriodo > 0 ? qtd / diasPeriodo : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${local}</td>
        <td>R$ 0,00</td>`;
        tr.style.background = corPorLocal(local);
        tr.style.color = corTextoPorLocal(local);
        tr.innerHTML += `
        <td>0</td>
        <td>${qtd}</td>
        <td>${media > 0 ? "Sem estoque" : "-"}</td>
      `;
      const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
    const reposicao = Math.round(media * diasDesejados);
    const tdReposicao = document.createElement("td");
    tdReposicao.textContent = reposicao > 0 ? reposicao : "-";
    tr.appendChild(tdReposicao);

    tabela.appendChild(tr);
    }
  });
}

window.addEventListener("load", () => {
  carregarDados();
  document.getElementById("btn-buscar").addEventListener("click", () => {
    buscarProduto();
    buscarVendas();
    ativarDetalhamento();
  });
});


// Função para detalhar SKUs ao clicar na linha da tabela

function detalharSKUsPorLocal(trPrincipal, localSelecionado, diasPeriodo) {
  const tbody = document.getElementById("tabela-produto");
  const descricaoBase = document.getElementById("nome-produto").textContent.toLowerCase().trim();

  tbody.querySelectorAll(".sku-detalhe").forEach(el => el.remove());
  tbody.querySelectorAll("tr").forEach(row => row.classList.remove("expanded"));

  trPrincipal.classList.add("expanded");

  const skusMap = {};

  produtoFiltrado.forEach(r => {
    const desc = (r.c[2]?.v || "").toLowerCase().trim();
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtd = r.c[5]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].estoque += qtd;
      skusMap[sku].valor += (r.c[6]?.v || 0);
    }
  });

  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(document.getElementById("data-inicial").value) ||
        data > new Date(document.getElementById("data-final").value)) return;

    const desc = (r.c[3]?.v || "").toLowerCase().trim();
    const sku = r.c[2]?.v || "";
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].vendas += qtd;
    }
  });

  Object.entries(skusMap).forEach(([sku, info]) => {
    const media = diasPeriodo > 0 ? info.vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(info.estoque / media) : (info.vendas > 0 ? "Sem estoque" : "∞");
    const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
    const reposicao = Math.round((media * diasDesejados) - info.estoque);
    let alerta = "";
    if (info.estoque === 0 && info.vendas > 0) {
      alerta += ' <span title="Ruptura" style="color:red; margin-left:6px;">⚠️</span>';
    }
    if (isSKUComProblema(sku, localSelecionado)) {
      alerta += ' <span title="SKU com histórico de problema" style="color:red; margin-left:6px;">⛔</span>';
    }

    const tr = document.createElement("tr");
    tr.classList.add("sku-detalhe");
    tr.style.background = "#f9f9f9";
    tr.innerHTML = `
      <td></td><td></td><td style="padding-left: 30px;">${sku}${alerta}</td><td>${info.estoque}</td><td>${info.vendas}</td><td>${cobertura}</td><td>${reposicao > 0 ? reposicao : "-"}</td><td><button class="btn-padrao" style="padding:4px 8px;">🛒</button></td>
    `;
    tbody.insertBefore(tr, trPrincipal.nextSibling);
  });

  atualizarGraficoLocal(localSelecionado);
}


// Adiciona eventos aos <tr> após buscar vendas
function ativarDetalhamento() {
  const diasPeriodo = (new Date(document.getElementById("data-final").value) -
                       new Date(document.getElementById("data-inicial").value)) / (1000 * 60 * 60 * 24) + 1;

  document.querySelectorAll("#tabela-produto tr").forEach(tr => {
    tr.addEventListener("click", () => {
      if (tr.classList.contains("expanded")) {
        tr.classList.remove("expanded");
        document.querySelectorAll(".sku-detalhe").forEach(el => el.remove());
        return;
      }
      const local = tr.children[0].textContent;
      detalharSKUsPorLocal(tr, local, diasPeriodo);
    });
  });
}


document.getElementById("input-produto").addEventListener("input", function () {
  const termo = this.value.toLowerCase().trim();
  const sugestoes = new Set();

  if (termo.length === 0) {
    document.getElementById("sugestoes-produto").style.display = "none";
    document.getElementById("sugestoes-produto").innerHTML = "";
    return;
  }

  estoqueRows.forEach(r => {
    const nome = (r.c[2]?.v || "").toLowerCase();
    if (nome.includes(termo)) {
      sugestoes.add(r.c[2]?.v || "");
    }
  });

  const lista = document.getElementById("sugestoes-produto");
  lista.innerHTML = "";
  sugestoes.forEach(nome => {
    const li = document.createElement("li");
    li.textContent = nome;
    li.style.padding = "8px 12px";
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      document.getElementById("input-produto").value = nome;
      lista.innerHTML = "";
      lista.style.display = "none";
    });
    li.addEventListener("mouseover", () => {
      li.style.background = "#f0f0f0";
    });
    li.addEventListener("mouseout", () => {
      li.style.background = "white";
    });
    lista.appendChild(li);
  });

  lista.style.display = sugestoes.size > 0 ? "block" : "none";
});

document.addEventListener("click", (e) => {
  if (!document.getElementById("input-produto").contains(e.target)) {
    document.getElementById("sugestoes-produto").style.display = "none";
  }
});



// Buscar descrição pelo SKU
document.getElementById("input-sku").addEventListener("change", function () {
  const skuDigitado = this.value.trim();
  if (!skuDigitado) return;

  // Procura no estoque
  const item = estoqueRows.find(r => (r.c[1]?.v || "").toString().trim() === skuDigitado);

  if (item) {
    const descricao = item.c[2]?.v || "";
    document.getElementById("input-produto").value = descricao;
    buscarProduto(); // já filtra pelo nome do produto
  } else {
    alert("❌ SKU não encontrado");
  }
});


// ===================== CARRINHO POR SKU =====================
let carrinho = [];

function atualizarBotaoCarrinho() {
  document.getElementById("carrinho-btn").textContent = `🛒 Carrinho (${carrinho.length})`;
}

function adicionarAoCarrinhoSKU(dados) {
  carrinho.push(dados);
  atualizarBotaoCarrinho();
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarBotaoCarrinho();
  renderCarrinhoModal();
}

function renderCarrinhoModal() {
  const tbody = document.querySelector("#carrinho-tabela tbody");
  tbody.innerHTML = "";
  carrinho.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.local}</td>
      <td>${item.sku}</td>
      <td>${item.estoque}</td>
      <td>${item.vendas}</td>
      <td>${item.cobertura}</td>
      <td>${item.reposicao}</td>
      <td><button class="btn-padrao" style="background:#e74c3c" onclick="removerDoCarrinho(${index})">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("modal-carrinho").style.display = "flex";
}

document.getElementById("carrinho-btn").addEventListener("click", renderCarrinhoModal);

document.getElementById("exportar-carrinho").addEventListener("click", () => {
  if (carrinho.length === 0) {
    alert("Carrinho vazio!");
    return;
  }
  let csv = "Produto;Local;SKU;Estoque;Vendas;Cobertura;Reposição\n";
  carrinho.forEach(item => {
    csv += `${item.produto};${item.local};${item.sku};${item.estoque};${item.vendas};${item.cobertura};${item.reposicao}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "carrinho_compras_skus.csv";
  link.click();
});

// Alterando detalhamento de SKU para adicionar campo editável e botão carrinho
const originalDetalharSKUsPorLocal = detalharSKUsPorLocal;
detalharSKUsPorLocal = function(trPrincipal, localSelecionado, diasPeriodo) {
  const tbody = document.getElementById("tabela-produto");
  const descricaoBase = document.getElementById("nome-produto").textContent.toLowerCase().trim();

  tbody.querySelectorAll(".sku-detalhe").forEach(el => el.remove());
  tbody.querySelectorAll("tr").forEach(row => row.classList.remove("expanded"));

  trPrincipal.classList.add("expanded");

  const skusMap = {};

  produtoFiltrado.forEach(r => {
    const desc = (r.c[2]?.v || "").toLowerCase().trim();
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtd = r.c[5]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].estoque += qtd;
      skusMap[sku].valor += (r.c[6]?.v || 0);
    }
  });

  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(document.getElementById("data-inicial").value) ||
        data > new Date(document.getElementById("data-final").value)) return;

    const desc = (r.c[3]?.v || "").toLowerCase().trim();
    const sku = r.c[2]?.v || "";
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].vendas += qtd;
    }
  });

  const produtoNome = document.getElementById("nome-produto").textContent;

  Object.entries(skusMap).forEach(([sku, info]) => {
    const media = diasPeriodo > 0 ? info.vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(info.estoque / media) : (info.vendas > 0 ? "Sem estoque" : "∞");
    const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
    const reposicaoSugerida = Math.round((media * diasDesejados) - info.estoque);
    let alerta = "";
    if (info.estoque === 0 && info.vendas > 0) {
      alerta += ' <span title="Ruptura" style="color:red; margin-left:6px;">⚠️</span>';
    }
    if (isSKUComProblema(sku, localSelecionado)) {
      alerta += ' <span title="SKU com histórico de problema" style="color:red; margin-left:6px;">⛔</span>';
    }

    const tr = document.createElement("tr");
    tr.classList.add("sku-detalhe");
    tr.style.background = "#f9f9f9";

    const inputReposicao = document.createElement("input");
    inputReposicao.type = "number";
    inputReposicao.value = reposicaoSugerida > 0 ? reposicaoSugerida : 0;
    inputReposicao.style.width = "70px";
    inputReposicao.style.padding = "4px";

    const btnAdd = document.createElement("button");
    btnAdd.textContent = "🛒";
    btnAdd.classList.add("btn-padrao");
    btnAdd.style.padding = "4px 8px";
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      animarItemParaCarrinho(btnAdd);
      adicionarAoCarrinhoSKU({
        produto: produtoNome,
        local: localSelecionado,
        sku: sku,
        estoque: info.estoque,
        vendas: info.vendas,
        cobertura: cobertura,
        reposicao: parseInt(inputReposicao.value) || 0
      });
    });

    const tdReposicao = document.createElement("td");
    tdReposicao.appendChild(inputReposicao);
    const tdCarrinho = document.createElement("td");
    tdCarrinho.appendChild(btnAdd);

    tr.innerHTML = `
      <td style="padding-left: 30px;">${sku}${alerta}</td>
      <td>${info.estoque}</td>
      <td>${info.vendas}</td>
      <td>${cobertura}</td>
    `;
    tr.appendChild(tdReposicao);
    tr.appendChild(tdCarrinho);

    tbody.insertBefore(tr, trPrincipal.nextSibling);
  });

  atualizarGraficoLocal(localSelecionado);
};


// ===================== AJUSTES FINAIS DO CARRINHO =====================

// Adicionar todos os SKUs do local ao carrinho
function adicionarTodosSKUsDoLocal(localSelecionado) {
  const diasPeriodo = (new Date(document.getElementById("data-final").value) -
                       new Date(document.getElementById("data-inicial").value)) / (1000 * 60 * 60 * 24) + 1;
  const produtoNome = document.getElementById("nome-produto").textContent;
  const descricaoBase = produtoNome.toLowerCase().trim();

  const skusMap = {};

  // Agrupar SKUs do local
  produtoFiltrado.forEach(r => {
    const desc = (r.c[2]?.v || "").toLowerCase().trim();
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtd = r.c[5]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].estoque += qtd;
      skusMap[sku].valor += (r.c[6]?.v || 0);
    }
  });

  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(document.getElementById("data-inicial").value) ||
        data > new Date(document.getElementById("data-final").value)) return;

    const desc = (r.c[3]?.v || "").toLowerCase().trim();
    const sku = r.c[2]?.v || "";
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].vendas += qtd;
    }
  });

  const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");

  // Adicionar todos os SKUs ao carrinho sem duplicar
  Object.entries(skusMap).forEach(([sku, info]) => {
    const media = diasPeriodo > 0 ? info.vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(info.estoque / media) : (info.vendas > 0 ? "Sem estoque" : "∞");
    const reposicaoSugerida = Math.round((media * diasDesejados) - info.estoque);
    const reposicaoFinal = reposicaoSugerida > 0 ? reposicaoSugerida : 0;

    // Verifica se já existe no carrinho (não duplica)
    const existe = carrinho.find(item => item.local === localSelecionado && item.sku === sku);
    if (!existe) {
      carrinho.push({
        produto: produtoNome,
        local: localSelecionado,
        sku: sku,
        estoque: info.estoque,
        vendas: info.vendas,
        cobertura: cobertura,
        reposicao: reposicaoFinal
      });
    }
  });

  atualizarBotaoCarrinho();
  alert("✅ Todos os SKUs do local " + localSelecionado + " foram adicionados ao carrinho!");
}

// Atualizar render do modal (sem nome do produto)
function renderCarrinhoModal() {
  const tbody = document.querySelector("#carrinho-tabela tbody");
  tbody.innerHTML = "";
  carrinho.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.local}</td>
      <td>${item.sku}</td>
      <td>${item.estoque}</td>
      <td>${item.vendas}</td>
      <td>${item.cobertura}</td>
      <td>${item.reposicao}</td>
      <td style="text-align:center;"><button class="btn-padrao" style="background:#e74c3c" onclick="removerDoCarrinho(${index})">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("modal-carrinho").style.display = "flex";
}

// Exportar e limpar carrinho
document.getElementById("exportar-carrinho").addEventListener("click", () => {
  if (carrinho.length === 0) {
    alert("Carrinho vazio!");
    return;
  }
  let csv = "Produto;Local;SKU;Estoque;Vendas;Cobertura;Reposição\n";
  carrinho.forEach(item => {
    csv += `${item.produto};${item.local};${item.sku};${item.estoque};${item.vendas};${item.cobertura};${item.reposicao}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "carrinho_compras_skus.csv";
  link.click();

  // Limpar carrinho após exportar
  carrinho = [];
  atualizarBotaoCarrinho();
  document.getElementById("modal-carrinho").style.display = "none";
});

// Adicionar botão carrinho direto na linha do LOCAL
const originalBuscarVendas = buscarVendas;
buscarVendas = function() {
  originalBuscarVendas();

  document.querySelectorAll("#tabela-produto tr").forEach(tr => {
    const local = tr.children[0].textContent;

    const tdExtra = document.createElement("td");
    tdExtra.style.textAlign = "center";
    const btnAddTodos = document.createElement("button");
    btnAddTodos.textContent = "🛒";
    btnAddTodos.classList.add("btn-padrao");
    btnAddTodos.style.padding = "4px 8px";
    btnAddTodos.addEventListener("click", (e) => {
      e.stopPropagation();
      adicionarTodosSKUsDoLocal(local);
    });
    tdExtra.appendChild(btnAddTodos);
    tr.appendChild(tdExtra);
  });
};


// ===================== FIX: Evitar duplicados e exportação única =====================

// Sobrescrevendo função para garantir que não exporte duplicado
document.getElementById("exportar-carrinho").onclick = () => {
  if (carrinho.length === 0) {
    alert("Carrinho vazio!");
    return;
  }
  let csv = "Produto;Local;SKU;Estoque;Vendas;Cobertura;Reposição\n";
  carrinho.forEach(item => {
    csv += `${item.produto};${item.local};${item.sku};${item.estoque};${item.vendas};${item.cobertura};${item.reposicao}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "carrinho_compras_skus.csv";
  link.click();

  // Limpar carrinho após exportar
  carrinho = [];
  atualizarBotaoCarrinho();
  document.getElementById("modal-carrinho").style.display = "none";
};

// Ajustar adicionarAoCarrinhoSKU para não permitir duplicados
function adicionarAoCarrinhoSKU(dados) {
  const existe = carrinho.find(
    item => item.local === dados.local && item.sku === dados.sku
  );
  if (existe) {
    alert("⚠️ Este SKU já está no carrinho!");
    return;
  }
  carrinho.push(dados);
  atualizarBotaoCarrinho();
}

// Ajustar adicionarTodosSKUsDoLocal para não duplicar
function adicionarTodosSKUsDoLocal(localSelecionado) {
  const diasPeriodo = (new Date(document.getElementById("data-final").value) -
                       new Date(document.getElementById("data-inicial").value)) / (1000 * 60 * 60 * 24) + 1;
  const produtoNome = document.getElementById("nome-produto").textContent;
  const descricaoBase = produtoNome.toLowerCase().trim();

  const skusMap = {};

  produtoFiltrado.forEach(r => {
    const desc = (r.c[2]?.v || "").toLowerCase().trim();
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtd = r.c[5]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].estoque += qtd;
      skusMap[sku].valor += (r.c[6]?.v || 0);
    }
  });

  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(document.getElementById("data-inicial").value) ||
        data > new Date(document.getElementById("data-final").value)) return;

    const desc = (r.c[3]?.v || "").toLowerCase().trim();
    const sku = r.c[2]?.v || "";
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].vendas += qtd;
    }
  });

  const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
  let novosAdicionados = 0;

  Object.entries(skusMap).forEach(([sku, info]) => {
    const media = diasPeriodo > 0 ? info.vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(info.estoque / media) : (info.vendas > 0 ? "Sem estoque" : "∞");
    const reposicaoSugerida = Math.round((media * diasDesejados) - info.estoque);
    const reposicaoFinal = reposicaoSugerida > 0 ? reposicaoSugerida : 0;

    const existe = carrinho.find(item => item.local === localSelecionado && item.sku === sku);
    if (!existe) {
      carrinho.push({
        produto: produtoNome,
        local: localSelecionado,
        sku: sku,
        estoque: info.estoque,
        vendas: info.vendas,
        cobertura: cobertura,
        reposicao: reposicaoFinal
      });
      novosAdicionados++;
    }
  });

  atualizarBotaoCarrinho();
  if (novosAdicionados > 0) {
    alert("✅ " + novosAdicionados + " SKUs do local " + localSelecionado + " foram adicionados ao carrinho!");
  } else {
    alert("⚠️ Todos os SKUs deste local já estão no carrinho!");
  }
}


// ===================== SISTEMA DE NOTIFICAÇÃO ESTILIZADA =====================
// sobrescrito

// sobrescrito

// sobrescrito

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60";
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12";
  } else {
    notificacao.style.background = "#2980b9";
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transition = "opacity 0.3s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);
  setTimeout(() => (notificacao.style.opacity = "1"), 50);
  setTimeout(() => {
    notificacao.style.opacity = "0";
    setTimeout(() => notificacao.remove(), 300);
  }, 2500);
}

// sobrescrito

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60";
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12";
  } else {
    notificacao.style.background = "#2980b9";
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.top = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transition = "opacity 0.3s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);
  setTimeout(() => (notificacao.style.opacity = "1"), 50);
  setTimeout(() => {
    notificacao.style.opacity = "0";
    setTimeout(() => notificacao.remove(), 300);
  }, 2500);
}

// sobrescrito

// sobrescrito

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60";
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12";
  } else {
    notificacao.style.background = "#2980b9";
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transition = "opacity 0.3s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);
  setTimeout(() => (notificacao.style.opacity = "1"), 50);
  setTimeout(() => {
    notificacao.style.opacity = "0";
    setTimeout(() => notificacao.remove(), 300);
  }, 2500);
}

// sobrescrito

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.left = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60";
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12";
  } else {
    notificacao.style.background = "#2980b9";
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

// sobrescrito

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.bottom = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "10px 16px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transform = "translateY(20px)";
  notificacao.style.transition = "opacity 0.4s ease, transform 0.4s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateY(0)";
  }, 50);

  // Sumir com animação
  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateY(20px)";
    setTimeout(() => notificacao.remove(), 400);
  }, 2500);
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.textContent = mensagem;
  notificacao.style.position = "fixed";
  notificacao.style.top = "20px";
  notificacao.style.right = "20px";
  notificacao.style.padding = "12px 20px";
  notificacao.style.borderRadius = "6px";
  notificacao.style.fontWeight = "500";
  notificacao.style.color = "#fff";
  notificacao.style.zIndex = "5000";
  notificacao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  notificacao.style.opacity = "0";
  notificacao.style.transition = "opacity 0.3s ease";

  if (tipo === "success") {
    notificacao.style.background = "#27ae60"; // verde sucesso
  } else if (tipo === "warning") {
    notificacao.style.background = "#f39c12"; // laranja alerta
  } else {
    notificacao.style.background = "#2980b9"; // azul padrão
  }

  document.body.appendChild(notificacao);
  setTimeout(() => (notificacao.style.opacity = "1"), 50);
  setTimeout(() => {
    notificacao.style.opacity = "0";
    setTimeout(() => notificacao.remove(), 300);
  }, 2500);
}

// ===================== FIX EXPORT ÚNICO =====================
document.getElementById("exportar-carrinho").onclick = () => {
  if (carrinho.length === 0) {
    mostrarNotificacao("Carrinho vazio!", "warning");
    return;
  }
  let csv = "Produto;Local;SKU;Estoque;Vendas;Cobertura;Reposição\n";
  carrinho.forEach(item => {
    csv += `${item.produto};${item.local};${item.sku};${item.estoque};${item.vendas};${item.cobertura};${item.reposicao}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "carrinho_compras_skus.csv";
  link.click();

  mostrarNotificacao("Carrinho exportado com sucesso!", "success");

  // Limpar carrinho após exportar
  carrinho = [];
  atualizarBotaoCarrinho();
  document.getElementById("modal-carrinho").style.display = "none";
};

// ===================== EVITAR DUPLICADOS COM NOTIFICAÇÃO =====================
function adicionarAoCarrinhoSKU(dados) {
  const existe = carrinho.find(
    item => item.local === dados.local && item.sku === dados.sku
  );
  if (existe) {
    mostrarNotificacao("SKU já está no carrinho!", "warning");
    return;
  }
  carrinho.push(dados);
  atualizarBotaoCarrinho();
  mostrarNotificacao("SKU adicionado ao carrinho!", "success");
}

// ===================== ADICIONAR TODOS SKUs DO LOCAL =====================
function adicionarTodosSKUsDoLocal(localSelecionado) {
  const diasPeriodo = (new Date(document.getElementById("data-final").value) -
                       new Date(document.getElementById("data-inicial").value)) / (1000 * 60 * 60 * 24) + 1;
  const produtoNome = document.getElementById("nome-produto").textContent;
  const descricaoBase = produtoNome.toLowerCase().trim();

  const skusMap = {};

  produtoFiltrado.forEach(r => {
    const desc = (r.c[2]?.v || "").toLowerCase().trim();
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtd = r.c[5]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].estoque += qtd;
      skusMap[sku].valor += (r.c[6]?.v || 0);
    }
  });

  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(document.getElementById("data-inicial").value) ||
        data > new Date(document.getElementById("data-final").value)) return;

    const desc = (r.c[3]?.v || "").toLowerCase().trim();
    const sku = r.c[2]?.v || "";
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].vendas += qtd;
    }
  });

  const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
  let novosAdicionados = 0;

  Object.entries(skusMap).forEach(([sku, info]) => {
    const media = diasPeriodo > 0 ? info.vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(info.estoque / media) : (info.vendas > 0 ? "Sem estoque" : "∞");
    const reposicaoSugerida = Math.round((media * diasDesejados) - info.estoque);
    const reposicaoFinal = reposicaoSugerida > 0 ? reposicaoSugerida : 0;

    const existe = carrinho.find(item => item.local === localSelecionado && item.sku === sku);
    if (!existe) {
      carrinho.push({
        produto: produtoNome,
        local: localSelecionado,
        sku: sku,
        estoque: info.estoque,
        vendas: info.vendas,
        cobertura: cobertura,
        reposicao: reposicaoFinal
      });
      novosAdicionados++;
    }
  });

  atualizarBotaoCarrinho();
  if (novosAdicionados > 0) {
    mostrarNotificacao(novosAdicionados + " SKUs adicionados do local " + localSelecionado, "success");
  } else {
    mostrarNotificacao("Todos os SKUs deste local já estão no carrinho!", "warning");
  }
}


// ===================== AJUSTE VISUAL DA EXPANSÃO =====================

// Sobrescrevendo detalharSKUsPorLocal com layout alinhado
detalharSKUsPorLocal = function(trPrincipal, localSelecionado, diasPeriodo) {
  const tbody = document.getElementById("tabela-produto");
  const descricaoBase = document.getElementById("nome-produto").textContent.toLowerCase().trim();

  // Remove qualquer detalhe anterior
  tbody.querySelectorAll(".sku-detalhe").forEach(el => el.remove());
  tbody.querySelectorAll("tr").forEach(row => row.classList.remove("expanded"));

  trPrincipal.classList.add("expanded");

  const skusMap = {};

  produtoFiltrado.forEach(r => {
    const desc = (r.c[2]?.v || "").toLowerCase().trim();
    const local = (r.c[3]?.v || "").toUpperCase().trim();
    const sku = r.c[1]?.v || "";
    const qtd = r.c[5]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].estoque += qtd;
      skusMap[sku].valor += (r.c[6]?.v || 0);
    }
  });

  vendasRows.forEach(r => {
    const dataStr = r.c[0]?.f;
    if (!dataStr) return;
    const [d, m, y] = dataStr.split("/");
    const data = new Date(`${y}-${m}-${d}`);
    if (data < new Date(document.getElementById("data-inicial").value) ||
        data > new Date(document.getElementById("data-final").value)) return;

    const desc = (r.c[3]?.v || "").toLowerCase().trim();
    const sku = r.c[2]?.v || "";
    const local = (r.c[1]?.v || "").toUpperCase().trim();
    const qtd = r.c[4]?.v || 0;

    if (desc === descricaoBase && local === localSelecionado) {
      if (!skusMap[sku]) skusMap[sku] = { estoque: 0, vendas: 0, valor: 0 };
      skusMap[sku].vendas += qtd;
    }
  });

  const produtoNome = document.getElementById("nome-produto").textContent;

  Object.entries(skusMap).forEach(([sku, info]) => {
    const media = diasPeriodo > 0 ? info.vendas / diasPeriodo : 0;
    const cobertura = media > 0 ? Math.round(info.estoque / media) : (info.vendas > 0 ? "Sem estoque" : "∞");
    const diasDesejados = parseInt(document.getElementById("dias-cobertura").value || "0");
    const reposicaoSugerida = Math.round((media * diasDesejados) - info.estoque);
    let alerta = "";
    if (info.estoque === 0 && info.vendas > 0) {
      alerta += ' <span title="Ruptura" style="color:red; margin-left:6px;">⚠️</span>';
    }
    if (isSKUComProblema(sku, localSelecionado)) {
      alerta += ' <span title="SKU com histórico de problema" style="color:red; margin-left:6px;">⛔</span>';
    }

    const tr = document.createElement("tr");
    tr.classList.add("sku-detalhe");

    // SKU alinhado
    const tdSKU = document.createElement("td");
    tdSKU.style.paddingLeft = "40px";
    
tdSKU.innerHTML = sku + alerta;
if ((typeof cobertura === "number" && cobertura < 60) && temReposicaoCentral(sku)) {
  tdSKU.innerHTML += ' <span title="Reposição disponível no estoque central" style="color:green; margin-left:6px;">🛒</span>';
}


    // Valor
    // Valor
    const tdValor = document.createElement("td");
    tdValor.textContent = formatReal(info.valor);

    // Estoque
    const tdEstoque = document.createElement("td");
    
    const chaveCaminhoDetalhe = sku + "||" + localSelecionado;
    
    let qtdCaminho = 0;
    if (window.mapaCaminho[sku + "||" + localSelecionado]) {
      qtdCaminho = window.mapaCaminho[sku + "||" + localSelecionado].qtd || 0;
    }
    tdEstoque.textContent = info.estoque;  // não soma caminho ou conferência

    // Tooltip detalhado
    let tooltip = `Disponível: ${info.estoque}`;
    if (qtdCaminho > 0) {
      tooltip += `\nA caminho: ${qtdCaminho}`;
    }
    tdEstoque.title = tooltip;



    // Vendas
    const tdVendas = document.createElement("td");
    tdVendas.textContent = info.vendas;

    // Cobertura
    const tdCobertura = document.createElement("td");
    tdCobertura.textContent = cobertura;

    // Reposição com input estilizado
    const tdReposicao = document.createElement("td");
    const inputReposicao = document.createElement("input");
    inputReposicao.type = "number";
    inputReposicao.value = reposicaoSugerida > 0 ? reposicaoSugerida : 0;
    inputReposicao.classList.add("input-padrao");
    inputReposicao.style.width = "80px";
    tdReposicao.appendChild(inputReposicao);

    // Botão carrinho
    const tdCarrinho = document.createElement("td");
    tdCarrinho.style.textAlign = "center";
    const btnAdd = document.createElement("button");
    btnAdd.textContent = "🛒";
    btnAdd.classList.add("btn-padrao");
    btnAdd.style.padding = "4px 8px";
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      animarItemParaCarrinho(btnAdd);
      adicionarAoCarrinhoSKU({
        produto: produtoNome,
        local: localSelecionado,
        sku: sku,
        estoque: info.estoque,
        vendas: info.vendas,
        cobertura: cobertura,
        reposicao: parseInt(inputReposicao.value) || 0
      });
    });
    tdCarrinho.appendChild(btnAdd);

    // Preencher na mesma ordem da tabela principal
    tr.appendChild(tdSKU);
    tr.appendChild(tdValor);
    tr.appendChild(tdEstoque);
    tr.appendChild(tdVendas);
    tr.appendChild(tdCobertura);
    tr.appendChild(tdReposicao);
    tr.appendChild(tdCarrinho);

    // Inserir logo abaixo da linha principal
    tbody.insertBefore(tr, trPrincipal.nextSibling);
  });

  atualizarGraficoLocal(localSelecionado);
};


function animarItemParaCarrinho(botao) {
  const carrinhoBtn = document.getElementById("carrinho-btn");
  const iconClone = document.createElement("div");
  iconClone.textContent = "🛒";
  iconClone.style.position = "fixed";
  iconClone.style.fontSize = "20px";
  iconClone.style.zIndex = "6000";

  // posição inicial
  const rectStart = botao.getBoundingClientRect();
  iconClone.style.left = rectStart.left + "px";
  iconClone.style.top = rectStart.top + "px";

  document.body.appendChild(iconClone);

  // posição final
  const rectEnd = carrinhoBtn.getBoundingClientRect();
  const deltaX = rectEnd.left - rectStart.left;
  const deltaY = rectEnd.top - rectStart.top;

  iconClone.animate([
    { transform: "translate(0,0)", opacity: 1 },
    { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.5)`, opacity: 0.5 }
  ], {
    duration: 800,
    easing: "ease-in-out"
  });

  setTimeout(() => iconClone.remove(), 800);
}



// === HOOK CAMINHO SEM REDECLARAÇÕES ===

// Cria apenas se não existir
window.urlCaminho = window.urlCaminho || "https://docs.google.com/spreadsheets/d/1bFMoSCDOGZb0Jh-f4f_0OS8HiSYXdG5XgwCrz9KYS_Y/gviz/tq?tqx=out:json&sheet=CAMINHO";
window.mapaCaminho = window.mapaCaminho || {};

// Hook no carregarDados: injeta mais um fetch sem sobrescrever totalmente
if (!window.carregarDadosHooked) {
  const carregarDadosOriginal = carregarDados;
  carregarDados = function() {
    Promise.all([
      fetch(urlEstoque).then(r => r.text()).then(parseJSONResponse),
      fetch(urlVendas).then(r => r.text()).then(parseJSONResponse),
      fetch(urlBadStock).then(r => r.text()).then(parseJSONResponse),
      fetch(window.urlCaminho).then(r => r.text()).then(parseJSONResponse)
    ]).then(([estoque, vendas, badstock, caminho]) => {
      badStockRows = badstock;
      estoqueRows = estoque;
      vendasRows = vendas;

      // monta mapa consolidado
      window.mapaCaminho = {};
      caminho.forEach(r => {
        const sku = (r.c[0]?.v || "").trim();
        const local = (r.c[2]?.v || "").toUpperCase().trim();
        const qtd = r.c[4]?.v || 0;
        const status = (r.c[5]?.v || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim();
        if (!sku || !local) return;
  if (status === "FINALIZADO") return; // ignora entradas finalizadas

        const chave = sku + "||" + local;
        if (!window.mapaCaminho[chave]) {
          window.mapaCaminho[chave] = { qtd: 0, status: "A CAMINHO", envio: r.c[7]?.v || "" };
        }
        window.mapaCaminho[chave].qtd += qtd;

        if (status.includes("CONFER")) {
          window.mapaCaminho[chave].status = "EM CONFERENCIA";
        }
      });
    });
  };
  window.carregarDadosHooked = true;
}

// Hook no detalharSKUsPorLocal: só adiciona caminhão após render
if (!window.detalharHooked) {
  const detalharOriginal = detalharSKUsPorLocal;
  detalharSKUsPorLocal = function(trPrincipal, localSelecionado, diasPeriodo) {
    detalharOriginal(trPrincipal, localSelecionado, diasPeriodo);

    document.querySelectorAll(".sku-detalhe").forEach(tr => {
      const skuCell = tr.querySelector("td:first-child");
      if (!skuCell) return;
      const sku = skuCell.textContent.split(" ")[0].trim();
      const chave = sku + "||" + localSelecionado;

      // remove caminhões antigos
      skuCell.querySelectorAll(".truck-icon").forEach(el => el.remove());

      if (window.mapaCaminho[chave]) {
        const info = window.mapaCaminho[chave];
        let cor = "green";
        let texto = "A caminho";
        let icone = "🚚";

        if (info.status.includes("CONFER")) {
          cor = "#f39c12";
          texto = "Em conferência";
          icone = "🚛";
        }

        const span = document.createElement("a");
        span.classList.add("truck-icon");
        span.style.color = cor;
        span.style.marginLeft = "6px";
        span.style.textDecoration = "none";
        span.style.cursor = "pointer";
        span.title = `${texto}: ${info.qtd} unid.`;
        const envioNum = (info.envio || "");  // opcionalmente pode ser preenchido no mapa
        span.href = "reposicao.html?envio=" + encodeURIComponent(envioNum);
        span.textContent = icone;
        skuCell.appendChild(span);
      }
    });
  };
  window.detalharHooked = true;
}


// === Funções do gráfico interativo ===
let graficoInstancia = null;

function renderGraficoVendas(dados) {
  const ctx = document.getElementById('grafico-vendas').getContext('2d');
  const labels = dados.map(d => d.data);
  const vendas = dados.map(d => d.vendas);

  if (graficoInstancia) graficoInstancia.destroy();

  if (vendas.length === 0) {
    document.getElementById("grafico-resumo").innerHTML = "<i>Sem vendas para este local no período selecionado.</i>";
    graficoInstancia = new Chart(ctx, { type:'bar', data:{labels:[],datasets:[]}, options:{responsive:true} });
    return;
  }

  const media = vendas.reduce((a,b)=>a+b,0)/vendas.length;
  const desvio = Math.sqrt(vendas.map(v=>Math.pow(v-media,2)).reduce((a,b)=>a+b,0)/vendas.length);
  const maxVendas = Math.max(...vendas);
  const minVendas = Math.min(...vendas);

  const ultimos7 = vendas.slice(-7).reduce((a,b)=>a+b,0)/Math.min(7,vendas.length);
  const ultimos30 = vendas.slice(-30).reduce((a,b)=>a+b,0)/Math.min(30,vendas.length);
  const tendencia = ultimos30>0?((ultimos7-ultimos30)/ultimos30*100).toFixed(1):0;

  graficoInstancia = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Vendas diárias', data:vendas, backgroundColor:'#4aa3ff' },
        { label:'Média', data:Array(vendas.length).fill(media), type:'line', borderColor:'orange', borderWidth:2, pointRadius:0 },
        { label:'Média + Desvio', data:Array(vendas.length).fill(media+desvio), type:'line', borderColor:'green', borderDash:[5,5], borderWidth:1, pointRadius:0 },
        { label:'Média - Desvio', data:Array(vendas.length).fill(Math.max(media-desvio,0)), type:'line', borderColor:'red', borderDash:[5,5], borderWidth:1, pointRadius:0 }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
  });

  document.getElementById("grafico-resumo").innerHTML = `
    <div><strong>📊 Resumo Geral</strong></div>
    Média geral: <b>${media.toFixed(1)}</b> vendas/dia | Desvio Padrão: ±<b>${desvio.toFixed(1)}</b><br>
    Pico: <b>${maxVendas}</b> | Vale: <b>${minVendas}</b><br><br>
    Média últimos 30 dias: <b>${ultimos30.toFixed(1)}</b> | Média últimos 7 dias: <b>${ultimos7.toFixed(1)}</b><br>
    Tendência: <b style="color:${tendencia<0?'red':'green'}">${tendencia}% vs 30d</b>`;
}

function atualizarGraficoLocal(localSelecionado) {
  const ini = document.getElementById("data-inicial").value;
  const fim = document.getElementById("data-final").value;
  const descricaoBase = document.getElementById("nome-produto").textContent.toLowerCase().trim();

  const mapaPorData = {};
  vendasRows.forEach(r=>{
    const dataStr=r.c[0]?.f;
    if(!dataStr)return;
    const [d,m,y]=dataStr.split("/");
    const dataVenda=new Date(`${y}-${m}-${d}`);
    if(ini && dataVenda<new Date(ini))return;
    if(fim && dataVenda>new Date(fim))return;

    const descVenda=(r.c[3]?.v||"").toLowerCase().trim();
    const localVenda=(r.c[1]?.v||"").toUpperCase().trim();
    const qtd=r.c[4]?.v||0;

    if(descVenda===descricaoBase && localVenda===localSelecionado){
      const chave=`${d}/${m}`;
      if(!mapaPorData[chave])mapaPorData[chave]=0;
      mapaPorData[chave]+=qtd;
    }
  });

  const dadosGrafico=Object.entries(mapaPorData)
    .map(([data,vendas])=>({data,vendas}))
    .sort((a,b)=>{
      const[da,ma]=a.data.split("/").map(Number);
      const[db,mb]=b.data.split("/").map(Number);
      return new Date(2025,ma-1,da)-new Date(2025,mb-1,db);
    });

  renderGraficoVendas(dadosGrafico);
}
