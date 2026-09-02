import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Search, Copy, Check, Printer, Layers, Cpu, Database, 
  Boxes, GitBranch, ArrowRight, ArrowLeft, ShieldCheck, Terminal, Sparkles, 
  TrendingUp, Box, Tags, Truck, Activity, Bell, Store, FileSpreadsheet, 
  FileEdit, Users, Server, ExternalLink, Code2, Globe, ShoppingBag, 
  Palette, ClipboardList, CheckCircle2, AlertCircle, Clock, Calendar, 
  ArrowDown, ChevronRight, HelpCircle, CheckCheck, RefreshCw, Eye,
  Sliders, ArrowUpRight, FileCheck, CheckSquare, Zap, ChevronDown
} from 'lucide-react';
import './Documentacao.css';

const TECH_STACK = [
  { name: "JavaScript (ES6+)", category: "Linguagem", version: "Modern ES", desc: "Linguagem principal utilizada em todo o ecossistema (Frontend, Backend, scripts ETL e parsers).", badge: "Linguagem" },
  { name: "React 19", category: "Frontend", version: "19.2.5", desc: "Biblioteca reativa moderna para construção da SPA, utilizando Context API e Hooks customizados.", badge: "Framework" },
  { name: "Vite 8", category: "Ferramenta", version: "8.0.10", desc: "Bundler ultrarrápido com Hot Module Replacement (HMR) e compilação otimizada de assets.", badge: "Build Tool" },
  { name: "SQL (PostgreSQL)", category: "Banco de Dados", version: "Postgres 15+", desc: "Linguagem de banco para queries analíticas, índices de alta performance e views consolidadas no Supabase.", badge: "Database" },
  { name: "Supabase SDK", category: "Backend / DB", version: "2.105.1", desc: "Cliente oficial para conexão direta, queries paralelas, upserts e autenticação no PostgreSQL em nuvem.", badge: "BaaS" },
  { name: "Node.js & Express", category: "Backend", version: "4.18+", desc: "Servidor RESTful e ambiente de execução para os robôs de sincronização em segundo plano.", badge: "API Server" },
  { name: "Google Gemini IA", category: "Inteligência Artificial", version: "1.5 / 3.6 Flash", desc: "API generativa do Google para criação automática de títulos padronizados e descrições SEO no módulo de cadastro.", badge: "GenAI" },
  { name: "Framer Motion", category: "Frontend", version: "12.38.0", desc: "Motor de animações fluidas para transições de páginas, interações de cards e feedbacks visuais.", badge: "UI / Animações" },
  { name: "Chart.js & Recharts", category: "Visualização", version: "4.5 / 3.10", desc: "Renderização de gráficos de evolução temporal de vendas, curvas ABC e distribuição por canais.", badge: "Data Viz" },
  { name: "XLSX & jsPDF", category: "Exportação", version: "0.18 / 4.2", desc: "Geração de planilhas Excel estruturadas para fornecedores e exportação de relatórios em PDF.", badge: "Export" }
];

const MODULES_LIST = [
  { id: 'dashboard', name: 'Dashboard', route: '/', icon: Layers, desc: 'Hub visual central com KPIs macro, atalhos rápidos e visão panorâmica de todo o negócio.' },
  { id: 'vendas', name: 'Vendas', route: '/vendas', icon: TrendingUp, desc: 'Relatórios analíticos de sellout com filtros temporais, curvas ABC de produtos e marcas, e faturamento consolidado.' },
  { id: 'cobertura', name: 'Cobertura', route: '/cobertura', icon: Boxes, desc: 'Cálculo de Dias de Cobertura (DDC), giro médio diário, estoque físico + a caminho e faixas de risco de ruptura.' },
  { id: 'estoque', name: 'Estoque', route: '/estoque', icon: Box, desc: 'Consulta de saldos de estoque por data histórica, múltiplos centros de distribuição e valorização de custo.' },
  { id: 'produto', name: 'Produto', route: '/produto', icon: Tags, desc: 'Ficha técnica individual por SKU com histórico de consumo, canais de venda e fornecedores homologados.' },
  { id: 'reposicao', name: 'Reposição', route: '/reposicao', icon: Truck, desc: 'Acompanhamento de mercadorias em trânsito (a caminho), notas fiscais de envio e previsões de entrega.' },
  { id: 'sellout', name: 'Sellout', route: '/sellout', icon: Activity, desc: 'Análise do escoamento na ponta final do cliente e comparativos de performance entre marcas parceiras.' },
  { id: 'alertas', name: 'Alertas', route: '/alertas', icon: Bell, desc: 'Varredura automática de rupturas iminentes de estoque, produtos estagnados e divergências cadastrais.' },
  { id: 'marketplace', name: 'Marketplace (TikTok)', route: '/marketplace', icon: Store, desc: 'Conciliação e análise de vendas por criadores, afiliados e métricas de transmissões ao vivo (lives).' },
  { id: 'planilha', name: 'Pedidos de Compra', route: '/planilha', icon: FileSpreadsheet, desc: 'Automação de pedidos de compras baseados em lead time de fornecedor e metas de cobertura em dias.' },
  { id: 'cadastro', name: 'Cadastro Inteligente', route: '/cadastro', icon: FileEdit, desc: 'Padronização de códigos de cor, tamanhos e geração de descrições ricas com Inteligência Artificial (Gemini).' },
  { id: 'usuarios', name: 'Usuários & Permissões', route: '/usuarios', icon: Users, desc: 'Gestão de acessos com níveis de privilégio (Admin, Gestor, Operador) e ferramenta de redefinição de senhas.' }
];

export default function Documentacao() {
  // Inicialmente null para exibir APENAS as 2 opções principais
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('produtos');
  const [codeCopied, setCodeCopied] = useState('');
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, type = 'all') => {
    navigator.clipboard.writeText(text);
    setCodeCopied(type);
    setTimeout(() => setCodeCopied(''), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectPillar = (pillar) => {
    setSelectedPillar(pillar);
    if (pillar === 'site') {
      setSelectedTopic('produtos');
    } else {
      setSelectedTopic('paginas');
    }
  };

  return (
    <div className="doc-page-container">
      {/* Cabeçalho Unificado */}
      <header className="doc-page-header">
        <div className="doc-header-left">
          <div className="doc-tag-pill">
            <Sparkles size={13} /> Base de Conhecimento Sandrini
          </div>
          <h1 className="doc-page-title">Central de Documentação</h1>
          <p className="doc-page-desc">
            {selectedPillar === null 
              ? 'Selecione abaixo qual área você deseja consultar:' 
              : selectedPillar === 'site' 
                ? 'Guias de criação de produtos, marketing visual e expedição de pedidos da loja virtual.'
                : 'Manual detalhado das 12 telas, rotina do relatório diário e inteligência de estoque do Dedo Duro.'}
          </p>
        </div>

        <div className="doc-header-right">
          <button 
            className="doc-header-btn"
            onClick={() => copyToClipboard(`https://github.com/beatriz-rizzo-sandrini/dedo-duro`, 'link')}
          >
            {codeCopied === 'link' ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
            <span>{codeCopied === 'link' ? 'Copiado' : 'Copiar Link'}</span>
          </button>
          <button className="doc-header-btn primary" onClick={handlePrint}>
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. TELA INICIAL: APENAS AS DUAS OPÇÕES                                   */}
      {/* ========================================================================= */}
      {selectedPillar === null ? (
        <div className="doc-select-portal">
          <div className="doc-two-cards-grid">
            {/* Opção 1: Site */}
            <div 
              className="doc-pillar-hub-card card-site"
              onClick={() => handleSelectPillar('site')}
            >
              <div className="pillar-hub-icon-bubble site">
                <Globe size={30} />
              </div>
              <div className="pillar-hub-badge">E-commerce</div>
              <h2 className="pillar-hub-title">Site & Loja Virtual</h2>
              <p className="pillar-hub-desc">
                Criação de produtos com SEO, padronização fotográfica, configuração de banners, vitrines, cupons e fluxo de expedição de pedidos.
              </p>

              <div className="pillar-hub-items">
                <span><ShoppingBag size={14} /> Criação de Produtos</span>
                <span><Palette size={14} /> Marketing e Tema</span>
                <span><ClipboardList size={14} /> Gerenciar Pedidos</span>
              </div>

              <div className="pillar-hub-footer">
                <span className="hub-link-text">Acessar Documentação do Site</span>
                <ArrowRight size={18} className="hub-arrow" />
              </div>
            </div>

            {/* Opção 2: Dedo Duro */}
            <div 
              className="doc-pillar-hub-card card-dedo"
              onClick={() => handleSelectPillar('dedo')}
            >
              <div className="pillar-hub-icon-bubble dedo">
                <ShieldCheck size={30} />
              </div>
              <div className="pillar-hub-badge">Sistema Interno</div>
              <h2 className="pillar-hub-title">Sistema Dedo Duro</h2>
              <p className="pillar-hub-desc">
                Manual de cada uma das 12 telas do sistema, passo a passo para preencher o relatório diário e arquitetura técnica do banco de dados.
              </p>

              <div className="pillar-hub-items">
                <span><Layers size={14} /> Cada Página: Como Funciona</span>
                <span><FileSpreadsheet size={14} /> Relatório Diário</span>
                <span><Cpu size={14} /> Arquitetura & Dados</span>
              </div>

              <div className="pillar-hub-footer">
                <span className="hub-link-text">Acessar Documentação do Dedo Duro</span>
                <ArrowRight size={18} className="hub-arrow" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. TELA INTERNA (SUBTÓPICOS E CONTEÚDO)                                   */
        /* ========================================================================= */
        <div className="doc-content-portal">
          {/* Barra de Navegação: Voltar + Breadcrumb */}
          <div className="doc-top-nav-bar">
            <button 
              className="doc-nav-back-button"
              onClick={() => setSelectedPillar(null)}
            >
              <ArrowLeft size={16} />
              <span>Voltar para as Opções</span>
            </button>

            <div className="doc-nav-path">
              <span>Central</span>
              <ChevronRight size={14} />
              <strong>{selectedPillar === 'site' ? 'Site & Loja Virtual' : 'Sistema Dedo Duro'}</strong>
            </div>
          </div>

          {/* Abas dos Subtópicos */}
          <div className="doc-tabs-bar">
            {selectedPillar === 'site' ? (
              <>
                <button 
                  className={`doc-tab-btn ${selectedTopic === 'produtos' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('produtos')}
                >
                  <ShoppingBag size={16} />
                  <span>Criação de Produtos</span>
                </button>
                <button 
                  className={`doc-tab-btn ${selectedTopic === 'marketing' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('marketing')}
                >
                  <Palette size={16} />
                  <span>Marketing e Tema</span>
                </button>
                <button 
                  className={`doc-tab-btn ${selectedTopic === 'pedidos' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('pedidos')}
                >
                  <ClipboardList size={16} />
                  <span>Gerenciar Pedidos</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  className={`doc-tab-btn ${selectedTopic === 'paginas' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('paginas')}
                >
                  <Layers size={16} />
                  <span>Cada Página: Como Funciona</span>
                </button>
                <button 
                  className={`doc-tab-btn ${selectedTopic === 'rotina' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('rotina')}
                >
                  <FileSpreadsheet size={16} />
                  <span>Como Preencher o Relatório Diário</span>
                </button>
                <button 
                  className={`doc-tab-btn ${selectedTopic === 'arquitetura' ? 'active' : ''}`}
                  onClick={() => setSelectedTopic('arquitetura')}
                >
                  <Cpu size={16} />
                  <span>Arquitetura Técnica & Banco</span>
                </button>
              </>
            )}
          </div>

          {/* Painel de Conteúdo */}
          <main className="doc-panel-box">
            {/* SITE: CRIAÇÃO DE PRODUTOS */}
            {selectedPillar === 'site' && selectedTopic === 'produtos' && (
              <div className="doc-topic-body">
                <div className="topic-header-row">
                  <span className="topic-badge">Manual de Cadastro</span>
                  <h2>Criação de Produtos no E-commerce</h2>
                  <p className="topic-intro">
                    Diretrizes para cadastro de novos produtos, estrutura de títulos, fotografia profissional e SEO para alta conversão.
                  </p>
                </div>

                <div className="formula-highlight-box">
                  <div className="formula-title">
                    <Sparkles size={18} /> Fórmula Recomendada para Título Comercial
                  </div>
                  <div className="formula-code">
                    [Tipo de Produto] + [Marca] + [Linha/Modelo] + [Diferencial ou Quantidade do Kit]
                  </div>
                  <div className="formula-example">
                    <em>Exemplo:</em> Kit 3 Cuecas Boxer Lupo Algodão com Elastano Sem Costura Antimicrobial
                  </div>
                </div>

                <div className="doc-grid-2x2">
                  <div className="doc-info-card">
                    <div className="card-icon-round"><Boxes size={18} /></div>
                    <h3>Grade de Variações (Cor & Tamanho)</h3>
                    <p>Agrupamento padronizado de variações para a loja:</p>
                    <ul>
                      <li><strong>Produto Pai:</strong> Agrupa as variações compartilhando a descrição principal.</li>
                      <li><strong>Variações Filhas:</strong> Cada combinação de Cor x Tamanho (ex: Preto / M).</li>
                      <li><strong>Tabela de Medidas:</strong> Inserção de tabela de medidas em centímetros para diminuir trocas.</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><Eye size={18} /></div>
                    <h3>Padrão Fotográfico & Mídia</h3>
                    <p>Normas para aprovação das fotos no catálogo:</p>
                    <ul>
                      <li><strong>Resolução Mínima:</strong> 1200 x 1200 pixels (1:1 quadrada).</li>
                      <li><strong>1ª Foto (Capa):</strong> Fundo branco puro (#FFFFFF), peça centralizada e sem logomarcas promocionais.</li>
                      <li><strong>Fotos Secundárias:</strong> Visão traseira, detalhes do tecido/elástico e foto no corpo.</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><FileEdit size={18} /></div>
                    <h3>Ficha Técnica & Descrição SEO</h3>
                    <p>Informações indispensáveis para o consumidor e Google:</p>
                    <ul>
                      <li><strong>Benefícios de Uso:</strong> Texto comercial destacando conforto e versatilidade.</li>
                      <li><strong>Composição Têxtil:</strong> Percentual exato dos fios (ex: 95% Algodão, 5% Elastano).</li>
                      <li><strong>Instruções de Lavagem:</strong> Preservação e durabilidade da peça.</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><TrendingUp size={18} /></div>
                    <h3>Precificação & Estoque</h3>
                    <p>Configuração comercial na plataforma:</p>
                    <ul>
                      <li><strong>Preço De / Por:</strong> Preço original tachado e promocional em destaque.</li>
                      <li><strong>Estoque Mínimo:</strong> Quantidade de segurança para evitar venda sem estoque.</li>
                      <li><strong>Markup:</strong> Considerar comissões de gateway e embalagem no preço final.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SITE: MARKETING E TEMA */}
            {selectedPillar === 'site' && selectedTopic === 'marketing' && (
              <div className="doc-topic-body">
                <div className="topic-header-row">
                  <span className="topic-badge">Design & Conversão</span>
                  <h2>Marketing e Tema da Loja Virtual</h2>
                  <p className="topic-intro">
                    Configuração de banners da página inicial, vitrines dinâmicas, promoções de carrinho e pixels de rastreamento.
                  </p>
                </div>

                <div className="banner-guide-row">
                  <div className="banner-guide-col">
                    <span className="guide-label">🖥️ Desktop Hero Banner</span>
                    <strong>1920 x 600 px</strong>
                    <p>Foco visual no centro para legibilidade em monitores wide.</p>
                  </div>
                  <div className="banner-guide-col">
                    <span className="guide-label">📱 Mobile Hero Banner</span>
                    <strong>800 x 800 px</strong>
                    <p>Formato quadrado otimizado para telas verticais de smartphones.</p>
                  </div>
                  <div className="banner-guide-col">
                    <span className="guide-label">🖼️ Mosaico de Categorias</span>
                    <strong>600 x 400 px</strong>
                    <p>Banners para coleções estratégicas (Lupo, Kits, Linha Térmica).</p>
                  </div>
                </div>

                <div className="doc-grid-2x2">
                  <div className="doc-info-card">
                    <div className="card-icon-round"><Store size={18} /></div>
                    <h3>Vitrines Inteligentes da Home</h3>
                    <p>Organização dinâmica baseada nos dados do Dedo Duro:</p>
                    <ul>
                      <li><strong>Mais Vendidos:</strong> Vitrine no topo com os produtos de maior giro.</li>
                      <li><strong>Ofertas da Semana:</strong> Produtos selecionados com desconto para acelerar saída.</li>
                      <li><strong>Kits Especiais:</strong> Ofertas progressivas (compre mais por menos).</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><Tags size={18} /></div>
                    <h3>Cupons & Promoções</h3>
                    <p>Ações de atração e recuperação de carrinho:</p>
                    <ul>
                      <li><strong>Primeira Compra:</strong> Cupom <code>SANDRINI10</code> para novos cadastros.</li>
                      <li><strong>Desconto Progressivo:</strong> Leve 3 Pague 2 ou 15% OFF a partir de 4 peças.</li>
                      <li><strong>Regras de Segurança:</strong> Limite de uso por CPF e validade definida.</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><Activity size={18} /></div>
                    <h3>Pixels de Conversão</h3>
                    <p>Alimentação dos algoritmos de tráfego pago:</p>
                    <ul>
                      <li><strong>Meta Pixel:</strong> Rastreamento de visualização, adição ao carrinho e compra.</li>
                      <li><strong>Google Analytics 4:</strong> Origem do tráfego e ticket médio.</li>
                      <li><strong>TikTok Pixel:</strong> Otimização de conversões para criadores de conteúdo.</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><ShieldCheck size={18} /></div>
                    <h3>Réguas de Confiança</h3>
                    <p>Selos de credibilidade para aumentar a taxa de conversão:</p>
                    <ul>
                      <li>Selo de Compra Segura SSL e antifraude.</li>
                      <li>Primeira Troca Grátis em até 7 dias corridos.</li>
                      <li>Atendimento humano via WhatsApp em destaque.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SITE: GERENCIAR PEDIDOS */}
            {selectedPillar === 'site' && selectedTopic === 'pedidos' && (
              <div className="doc-topic-body">
                <div className="topic-header-row">
                  <span className="topic-badge">Operação Logística</span>
                  <h2>Gerenciamento e Expedição de Pedidos</h2>
                  <p className="topic-intro">
                    Fluxo do pedido da confirmação do pagamento até a entrega final e procedimento de trocas.
                  </p>
                </div>

                <div className="order-steps-container">
                  <div className="order-mini-step">
                    <div className="mini-step-badge">1</div>
                    <h4>Aprovado</h4>
                    <p>Pagamento confirmado pelo gateway antifraude.</p>
                  </div>
                  <div className="order-step-chevron"><ArrowRight size={16} /></div>

                  <div className="order-mini-step">
                    <div className="mini-step-badge">2</div>
                    <h4>Separação</h4>
                    <p>Coleta física no armazém por lista de lote.</p>
                  </div>
                  <div className="order-step-chevron"><ArrowRight size={16} /></div>

                  <div className="order-mini-step">
                    <div className="mini-step-badge">3</div>
                    <h4>Conferência & NF</h4>
                    <p>Bipagem dos itens, emissão da NF-e e etiqueta.</p>
                  </div>
                  <div className="order-step-chevron"><ArrowRight size={16} /></div>

                  <div className="order-mini-step">
                    <div className="mini-step-badge">4</div>
                    <h4>Despachado</h4>
                    <p>Coleta da transportadora e envio de rastreio.</p>
                  </div>
                </div>

                <div className="doc-grid-2x2" style={{ marginTop: '24px' }}>
                  <div className="doc-info-card">
                    <div className="card-icon-round"><Truck size={18} /></div>
                    <h3>Conferência com Bipagem</h3>
                    <p>Prevenção de envio de produtos trocados:</p>
                    <ul>
                      <li>Leitura obrigatória do código de barras de cada produto contra a nota.</li>
                      <li>Conferência de tamanho e cor especialmente em kits.</li>
                      <li>Embalagem inviolável devidamente lacrada.</li>
                    </ul>
                  </div>

                  <div className="doc-info-card">
                    <div className="card-icon-round"><RefreshCw size={18} /></div>
                    <h3>Trocas e Devoluções</h3>
                    <p>Diretrizes de pós-venda:</p>
                    <ul>
                      <li>Prazo legal de 7 dias corridos após o recebimento para arrependimento.</li>
                      <li>Geração de autorização de postagem gratuita nos Correios.</li>
                      <li>Vistoria: produto em perfeito estado volta ao estoque; avariado vira <em>badstock</em>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* DEDO DURO: CADA PÁGINA COMO FUNCIONA */}
            {selectedPillar === 'dedo' && selectedTopic === 'paginas' && (
              <div className="doc-topic-body">
                <div className="topic-header-row">
                  <span className="topic-badge">Guia das Telas</span>
                  <h2>Cada Página do Dedo Duro: Como Funciona</h2>
                  <p className="topic-intro">
                    O Dedo Duro conta com 12 telas estratégicas integradas para controle rigoroso de estoque e sellout.
                  </p>
                </div>

                <div className="modules-compact-grid">
                  {MODULES_LIST.map((mod) => {
                    const IconComp = mod.icon;
                    return (
                      <div key={mod.id} className="module-compact-card">
                        <div className="module-compact-top">
                          <div className="module-bubble"><IconComp size={18} /></div>
                          <span className="module-route">{mod.route}</span>
                        </div>
                        <h4>{mod.name}</h4>
                        <p>{mod.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="formula-highlight-box" style={{ marginTop: '24px' }}>
                  <div className="formula-title">
                    <Boxes size={18} /> Fórmula de Cobertura de Estoque (DDC)
                  </div>
                  <div className="formula-code">
                    DDC = (Estoque Disponível + Estoque a Caminho) ÷ Giro Médio Diário
                  </div>
                  <div className="coverage-legend-row">
                    <span className="cov-badge red">🚨 Ruptura (0 dias)</span>
                    <span className="cov-badge yellow">⚠️ Crítico (1 a 14 dias)</span>
                    <span className="cov-badge green">✅ Saudável (15 a 45 dias)</span>
                    <span className="cov-badge blue">📦 Excesso (&gt; 60 dias)</span>
                  </div>
                </div>
              </div>
            )}

            {/* DEDO DURO: COMO PREENCHER O RELATÓRIO DIÁRIO */}
            {selectedPillar === 'dedo' && selectedTopic === 'rotina' && (
              <div className="doc-topic-body">
                <div className="topic-header-row">
                  <span className="topic-badge">Rotina Operacional</span>
                  <h2>Como Preencher o Relatório Diário</h2>
                  <p className="topic-intro">
                    Procedimento padrão matinal para a equipe importar e conferir os dados diários com precisão.
                  </p>
                </div>

                <div className="routine-timeline-compact">
                  <div className="routine-row">
                    <div className="routine-hour"><Clock size={15} /> 08:30 - 09:15</div>
                    <div className="routine-detail">
                      <h4>1. Extração dos Relatórios</h4>
                      <p>Baixar relatórios de vendas e inventário do dia anterior:</p>
                      <div className="source-tags">
                        <span>Mercado Livre Full (SP e MG)</span>
                        <span>ERP Senior X (Faturamento & Matriz)</span>
                        <span>TikTok Shop Seller Center</span>
                      </div>
                    </div>
                  </div>

                  <div className="routine-row">
                    <div className="routine-hour"><Clock size={15} /> 09:15 - 09:40</div>
                    <div className="routine-detail">
                      <h4>2. Padronização das Planilhas</h4>
                      <p>Conferir colunas obrigatórias aceitas pelos parsers:</p>
                      <div className="table-wrapper-clean">
                        <table className="clean-table">
                          <thead>
                            <tr>
                              <th>Data (DD/MM/AAAA)</th>
                              <th>Local / Canal</th>
                              <th>SKU Produto</th>
                              <th>Descrição</th>
                              <th>Quantidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><code>02/09/2026</code></td>
                              <td><code>ML FULL SP</code></td>
                              <td><code>LU7890-001-M</code></td>
                              <td>Cueca Boxer Lupo M</td>
                              <td><code>120</code></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="routine-row">
                    <div className="routine-hour"><Clock size={15} /> 09:40 - 10:00</div>
                    <div className="routine-detail">
                      <h4>3. Resolução de SKUs Não Mapeados</h4>
                      <p>
                        Se houver produto novo sem reconhecimento de marca, vincule o código da plataforma ao SKU do Senior ERP na tabela <code>silver_mapeamento_sku</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="interactive-checklist-box">
                  <h4><CheckSquare size={18} /> Checklist Matinal do Gestor</h4>
                  <div className="checklist-group">
                    <label className={`chk-label ${checkedItems['c1'] ? 'checked' : ''}`} onClick={() => toggleCheck('c1')}>
                      <input type="checkbox" checked={!!checkedItems['c1']} onChange={() => {}} />
                      <span>Total de peças do Dashboard confere com a soma dos relatórios?</span>
                    </label>
                    <label className={`chk-label ${checkedItems['c2'] ? 'checked' : ''}`} onClick={() => toggleCheck('c2')}>
                      <input type="checkbox" checked={!!checkedItems['c2']} onChange={() => {}} />
                      <span>Produtos com estoque zerado foram informados para pausa nos anúncios?</span>
                    </label>
                    <label className={`chk-label ${checkedItems['c3'] ? 'checked' : ''}`} onClick={() => toggleCheck('c3')}>
                      <input type="checkbox" checked={!!checkedItems['c3']} onChange={() => {}} />
                      <span>Todas as notas de reposição despachadas foram cadastradas em Reposição?</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* DEDO DURO: ARQUITETURA TÉCNICA */}
            {selectedPillar === 'dedo' && selectedTopic === 'arquitetura' && (
              <div className="doc-topic-body">
                <div className="topic-header-row">
                  <span className="topic-badge">Engenharia & Dados</span>
                  <h2>Arquitetura Técnica & Banco de Dados</h2>
                  <p className="topic-intro">
                    Estrutura Medalhão do PostgreSQL no Supabase, scripts de integração e comandos.
                  </p>
                </div>

                <div className="medallion-row">
                  <div className="medallion-clean-col bronze">
                    <span className="tier-pill">Bronze</span>
                    <h4>🥉 Dados Brutos</h4>
                    <p>Ingestão textual das planilhas sem transformação.</p>
                    <div className="tier-code-list">
                      <code>bronze_vendas</code>
                      <code>bronze_estoque</code>
                      <code>bronze_caminho</code>
                    </div>
                  </div>

                  <div className="medallion-clean-col silver">
                    <span className="tier-pill">Silver</span>
                    <h4>🥈 Normalizados</h4>
                    <p>Tipagem de data e números, índices e marcas.</p>
                    <div className="tier-code-list">
                      <code>silver_vendas</code>
                      <code>silver_estoque</code>
                      <code>silver_mapeamento_sku</code>
                    </div>
                  </div>

                  <div className="medallion-clean-col gold">
                    <span className="tier-pill">Gold</span>
                    <h4>🥇 Analítica</h4>
                    <p>Views consolidadas para alimentar o frontend.</p>
                    <div className="tier-code-list">
                      <code>vw_vendas_consolidadas</code>
                      <code>v_resumo_estoque_diario</code>
                    </div>
                  </div>
                </div>

                <div className="terminal-clean-box">
                  <div className="terminal-clean-header">
                    <span>Terminal / Comandos de Execução</span>
                    <button 
                      className="terminal-copy-btn"
                      onClick={() => copyToClipboard(`npm install\nnpm run dev`, 'cmd')}
                    >
                      {codeCopied === 'cmd' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      <span>{codeCopied === 'cmd' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre>
{`# 1. Instalar dependências da aplicação
npm install

# 2. Iniciar servidor Vite local
npm run dev

# 3. Executar robô de sincronização (opcional)
node backend/sincronizador_supabase.js`}
                  </pre>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
