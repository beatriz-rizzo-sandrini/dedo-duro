import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Search, Copy, Check, Printer, Layers, Cpu, Database, 
  Boxes, GitBranch, ArrowRight, ShieldCheck, Terminal, Sparkles, 
  TrendingUp, Box, Tags, Truck, Activity, Bell, Store, FileSpreadsheet, 
  FileEdit, Users, Server, ExternalLink, Code2
} from 'lucide-react';
import './Documentacao.css';

const TECH_STACK = [
  { name: "JavaScript (ES6+)", category: "Linguagem", version: "Modern ES", desc: "Linguagem principal utilizada em todo o ecossistema (Frontend, Backend, scripts ETL e parsers).", badge: "Linguagem" },
  { name: "React 19", category: "Frontend", version: "19.2.5", desc: "Biblioteca reativa moderna para construção da SPA, utilizando Context API e Hooks customizados.", badge: "Framework" },
  { name: "Vite 8", category: "Ferramenta", version: "8.0.10", desc: "Bundler ultrarrápido com Hot Module Replacement (HMR) e compilação otimizada de assets.", badge: "Build Tool" },
  { name: "SQL (PostgreSQL)", category: "Banco de Dados", version: "Postgres 15+", desc: "Linguagem de banco para queries analíticas, índices de alta performance e views consolidadas no Supabase.", badge: "Database" },
  { name: "Supabase SDK", category: "Backend / DB", version: "2.105.1", desc: "Cliente oficial para conexão direta, queries paralelas, upserts e autenticação no PostgreSQL em nuvem.", badge: "Backend as a Service" },
  { name: "Node.js & Express", category: "Backend", version: "4.18+", desc: "Servidor RESTful e ambiente de execução para os robôs de sincronização em segundo plano.", badge: "API Server" },
  { name: "Google Gemini IA", category: "Inteligência Artificial", version: "1.5 / 3.6 Flash", desc: "API generativa do Google para criação automática de títulos padronizados e descrições SEO no módulo de cadastro.", badge: "GenAI" },
  { name: "Framer Motion", category: "Frontend", version: "12.38.0", desc: "Motor de animações fluidas para transições de páginas, interações de cards e feedbacks visuais.", badge: "UI / Animações" },
  { name: "Chart.js & Recharts", category: "Visualização", version: "4.5 / 3.10", desc: "Renderização de gráficos de evolução temporal de vendas, curvas ABC e distribuição por canais.", badge: "Data Viz" },
  { name: "XLSX & jsPDF", category: "Exportação", version: "0.18 / 4.2", desc: "Geração de planilhas Excel estruturadas para fornecedores e exportação de relatórios em PDF.", badge: "Export Utilities" },
  { name: "HTML5 & Vanilla CSS", category: "Linguagem", version: "W3C Padrão", desc: "Estrutura semântica e estilização customizada com suporte a temas Claro e Escuro dinâmicos.", badge: "Design System" },
  { name: "MySQL2", category: "Banco de Dados", version: "3.9+", desc: "Driver de replicação e contingência para espelhamento local das tabelas analíticas.", badge: "Local DB" }
];

const MODULES_LIST = [
  { id: 'dashboard', name: 'Dashboard', route: '/', icon: Layers, desc: 'Hub visual central com atalhos animados, visão macro e navegação para todos os subsistemas.' },
  { id: 'vendas', name: 'Vendas', route: '/vendas', icon: TrendingUp, desc: 'Relatórios detalhados com filtros temporais, curvas ABC, comparativo entre marcas e faturamento.' },
  { id: 'cobertura', name: 'Cobertura', route: '/cobertura', icon: Boxes, desc: 'Cálculo de Dias de Cobertura (DDC), giro médio diário, estoque físico + a caminho e faixas de risco.' },
  { id: 'estoque', name: 'Estoque', route: '/estoque', icon: Box, desc: 'Consulta de saldos de estoque por data histórica, múltiplos centros de distribuição e valorização de custo.' },
  { id: 'produto', name: 'Produto', route: '/produto', icon: Tags, desc: 'Ficha técnica individual por SKU com histórico de consumo, canais de venda e fornecedores homologados.' },
  { id: 'reposicao', name: 'Reposição', route: '/reposicao', icon: Truck, desc: 'Acompanhamento de mercadorias em trânsito (a caminho), notas fiscais de envio e previsões de entrega.' },
  { id: 'sellout', name: 'Sellout', route: '/sellout', icon: Activity, desc: 'Análise do escoamento na ponta final do cliente e comparativos de performance entre marcas parceiras.' },
  { id: 'alertas', name: 'Alertas', route: '/alertas', icon: Bell, desc: 'Varredura automática de rupturas iminentes de estoque, produtos estagnados e divergências cadastrais.' },
  { id: 'marketplace', name: 'Marketplace', route: '/marketplace', icon: Store, desc: 'Conciliação e análise de vendas por criadores, afiliados e campanhas especiais (TikTok Shop).' },
  { id: 'planilha', name: 'Pedidos / Fornecedores', route: '/planilha', icon: FileSpreadsheet, desc: 'Automação de pedidos de compras baseados em lead time de fornecedor e metas de cobertura em dias.' },
  { id: 'cadastro', name: 'Cadastro Inteligente', route: '/cadastro', icon: FileEdit, desc: 'Padronização de códigos de cor, tamanhos e geração de descrições ricas para e-commerce via Google Gemini IA.' },
  { id: 'usuarios', name: 'Usuários & Permissões', route: '/usuarios', icon: Users, desc: 'Gestão de acessos com níveis de privilégio (Admin, Gestor, Operador) e controle de status de conta.' }
];

export default function Documentacao() {
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState('');

  const copyToClipboard = (text, type = 'all') => {
    navigator.clipboard.writeText(text);
    if (type === 'all') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCodeCopied(type);
      setTimeout(() => setCodeCopied(''), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredTech = useMemo(() => {
    if (!searchTerm) return TECH_STACK;
    const term = searchTerm.toLowerCase();
    return TECH_STACK.filter(t => 
      t.name.toLowerCase().includes(term) || 
      t.category.toLowerCase().includes(term) || 
      t.desc.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const filteredModules = useMemo(() => {
    if (!searchTerm) return MODULES_LIST;
    const term = searchTerm.toLowerCase();
    return MODULES_LIST.filter(m => 
      m.name.toLowerCase().includes(term) || 
      m.desc.toLowerCase().includes(term) ||
      m.route.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const showSection = (tabKey) => {
    if (activeTab === 'todos') return true;
    return activeTab === tabKey;
  };

  return (
    <div className="doc-container">
      {/* Cabeçalho da Documentação */}
      <header className="doc-header">
        <div className="doc-header-info">
          <div className="doc-title-row">
            <h1 className="doc-title">Documentação do Sistema Dedo Duro</h1>
            <span className="doc-badge">v2.0 Fullstack</span>
          </div>
          <p className="doc-subtitle">
            Dossiê técnico e operacional completo sobre a arquitetura, linguagens utilizadas, 
            pipeline de dados, inteligência de SKUs e funcionamento de todos os módulos.
          </p>
        </div>

        <div className="doc-header-actions">
          <button 
            className="doc-action-btn"
            onClick={() => copyToClipboard(`https://github.com/beatriz-rizzo-sandrini/dedo-duro`, 'link')}
            title="Copiar referência do repositório"
          >
            {codeCopied === 'link' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{codeCopied === 'link' ? 'Copiado!' : 'Copiar Link'}</span>
          </button>

          <button 
            className="doc-action-btn primary"
            onClick={handlePrint}
            title="Imprimir ou gerar PDF desta documentação"
          >
            <Printer size={16} />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </header>

      {/* Controles: Busca e Abas */}
      <div className="doc-controls">
        <div className="doc-search-wrapper">
          <Search size={20} className="doc-search-icon" />
          <input 
            type="text"
            className="doc-search-input"
            placeholder="Pesquisar linguagens, módulos, tabelas ou conceitos (ex: Gemini, Supabase, Cobertura, Lupo, Cron)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="doc-tabs-bar">
          <button 
            className={`doc-tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            <BookOpen size={16} />
            <span>Visão Geral</span>
          </button>
          <button 
            className={`doc-tab-btn ${activeTab === 'arquitetura' ? 'active' : ''}`}
            onClick={() => setActiveTab('arquitetura')}
          >
            <GitBranch size={16} />
            <span>Arquitetura & ETL</span>
          </button>
          <button 
            className={`doc-tab-btn ${activeTab === 'tecnologias' ? 'active' : ''}`}
            onClick={() => setActiveTab('tecnologias')}
          >
            <Cpu size={16} />
            <span>Linguagens & Tecnologias</span>
          </button>
          <button 
            className={`doc-tab-btn ${activeTab === 'modulos' ? 'active' : ''}`}
            onClick={() => setActiveTab('modulos')}
          >
            <Boxes size={16} />
            <span>Módulos & Telas</span>
          </button>
          <button 
            className={`doc-tab-btn ${activeTab === 'banco' ? 'active' : ''}`}
            onClick={() => setActiveTab('banco')}
          >
            <Database size={16} />
            <span>Banco de Dados</span>
          </button>
          <button 
            className={`doc-tab-btn ${activeTab === 'skus' ? 'active' : ''}`}
            onClick={() => setActiveTab('skus')}
          >
            <Tags size={16} />
            <span>Parser de SKUs</span>
          </button>
          <button 
            className={`doc-tab-btn ${activeTab === 'deploy' ? 'active' : ''}`}
            onClick={() => setActiveTab('deploy')}
          >
            <Terminal size={16} />
            <span>Instalação & Deploy</span>
          </button>
        </div>
      </div>

      {/* 1. VISÃO GERAL E PROPÓSITO */}
      {showSection('todos') && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <ShieldCheck size={24} className="doc-section-title-icon" />
            1. Visão Geral e Propósito de Negócio
          </h2>
          <p className="doc-lead-text">
            O <strong>Dedo Duro</strong> foi desenvolvido para solucionar um dos maiores gargalos operacionais 
            do comércio eletrônico multicanal: a falta de visibilidade em tempo real sobre ruptura de estoque, 
            cobertura real em dias, discrepâncias entre códigos de marketplace e o catálogo mestre do ERP, 
            e a morosidade no cálculo manual de pedidos de compra.
          </p>

          <div className="doc-callout">
            <Sparkles size={24} className="doc-callout-icon" />
            <div className="doc-callout-content">
              <div className="doc-callout-title">Por que o nome "Dedo Duro"?</div>
              O sistema atua como um auditor incansável: ele aponta instantaneamente onde o estoque zerou, 
              quais canais estão vendendo produtos sem estoque correspondente no armazém, quais pedidos de reposição 
              estão atrasados e quais SKUs estão com excesso de estoque imobilizando capital de giro.
            </div>
          </div>
        </section>
      )}

      {/* 2. ARQUITETURA GERAL E PIPELINE */}
      {(showSection('todos') || showSection('arquitetura')) && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <GitBranch size={24} className="doc-section-title-icon" />
            2. Arquitetura do Sistema e Fluxo de Dados (ETL)
          </h2>
          <p className="doc-lead-text">
            A solução adota uma arquitetura híbrida de alta performance: o Frontend React 19 se comunica de 
            forma otimizada e paralela com o banco PostgreSQL no Supabase (com cache em memória local de 10 minutos), 
            enquanto robôs agendados em Node.js (via cron) orquestram a extração e carga de dados de múltiplos canais.
          </p>

          <div className="pipeline-container">
            <div className="pipeline-step">
              <div className="pipeline-step-number">1</div>
              <h3 className="pipeline-step-title">Fontes de Dados</h3>
              <p className="pipeline-step-desc">
                Google Sheets (GViz), Mercado Livre Fulfillment API, ERP Senior X e TikTok Shop.
              </p>
            </div>

            <div className="pipeline-step">
              <div className="pipeline-step-number">2</div>
              <h3 className="pipeline-step-title">Robôs de Sincronização</h3>
              <p className="pipeline-step-desc">
                Scripts em Node.js aplicam parsers inteligentes de SKU e realizam upsert nas tabelas Bronze e Silver.
              </p>
            </div>

            <div className="pipeline-step">
              <div className="pipeline-step-number">3</div>
              <h3 className="pipeline-step-title">Supabase (PostgreSQL)</h3>
              <p className="pipeline-step-desc">
                Armazenamento relacional com Arquitetura Medalhão (Bronze, Silver e Views Gold consolidadas).
              </p>
            </div>

            <div className="pipeline-step">
              <div className="pipeline-step-number">4</div>
              <h3 className="pipeline-step-title">Frontend Reativo</h3>
              <p className="pipeline-step-desc">
                React 19 SPA com Vite, renderização instantânea, consultas paralelas paginadas e filtros por empresa.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. LINGUAGENS E TECNOLOGIAS */}
      {(showSection('todos') || showSection('tecnologias')) && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <Cpu size={24} className="doc-section-title-icon" />
            3. Linguagens e Tecnologias Utilizadas
          </h2>
          <p className="doc-lead-text">
            Todas as ferramentas do stack foram selecionadas para garantir velocidade de resposta, integridade 
            relacional e excelente experiência de uso para a equipe de gestão e compras.
          </p>

          <div className="tech-grid">
            {filteredTech.map((tech, idx) => (
              <div key={idx} className="tech-card">
                <div className="tech-card-header">
                  <h3 className="tech-name">{tech.name}</h3>
                  <span className="tech-badge">{tech.badge}</span>
                </div>
                <p className="tech-desc">{tech.desc}</p>
                <div className="tech-meta">Versão / Padrão: {tech.version}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. BANCO DE DADOS E ARQUITETURA MEDALHÃO */}
      {(showSection('todos') || showSection('banco')) && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <Database size={24} className="doc-section-title-icon" />
            4. Banco de Dados e Arquitetura Medalhão
          </h2>
          <p className="doc-lead-text">
            O Dedo Duro estrutura seus dados no Supabase PostgreSQL separando claramente a ingestão 
            bruta da camada de consumo analítico de alta performance:
          </p>

          <div className="medallion-container">
            <div className="medallion-tier bronze">
              <h3 className="medallion-title">🥉 Camada Bronze</h3>
              <p className="medallion-desc">Dados brutos em formato texto, sem transformação, preservando o estado original da importação.</p>
              <div className="medallion-tables">
                <span className="table-tag">bronze_vendas</span>
                <span className="table-tag">bronze_estoque</span>
                <span className="table-tag">bronze_caminho</span>
                <span className="table-tag">bronze_badstock</span>
              </div>
            </div>

            <div className="medallion-tier silver">
              <h3 className="medallion-title">🥈 Camada Silver</h3>
              <p className="medallion-desc">Dados tipados (DATE, NUMERIC), índices únicos compostos, marcas normalizadas e chaves mapeadas.</p>
              <div className="medallion-tables">
                <span className="table-tag">silver_vendas</span>
                <span className="table-tag">silver_estoque</span>
                <span className="table-tag">silver_reposicao</span>
                <span className="table-tag">silver_mapeamento_sku</span>
              </div>
            </div>

            <div className="medallion-tier gold">
              <h3 className="medallion-title">🥇 Camada Gold</h3>
              <p className="medallion-desc">Views e agrupamentos prontos para alimentar as telas do sistema com velocidade máxima.</p>
              <div className="medallion-tables">
                <span className="table-tag">vw_vendas_consolidadas</span>
                <span className="table-tag">v_resumo_estoque_diario</span>
              </div>
            </div>
          </div>

          <div className="code-box">
            <div className="code-box-header">
              <span className="code-box-lang">Exemplo SQL DDL (Silver & Views)</span>
              <button 
                className="code-box-copy"
                onClick={() => copyToClipboard(`CREATE TABLE IF NOT EXISTS silver_estoque (
    id SERIAL PRIMARY KEY,
    data_atualizacao VARCHAR(50),
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    marca VARCHAR(255),
    local_estoque VARCHAR(255) NOT NULL,
    quantidade_disponivel NUMERIC(10, 2) DEFAULT 0,
    valor_unitario NUMERIC(10, 2) DEFAULT 0,
    UNIQUE (data_atualizacao, sku_produto, local_estoque)
);`, 'sql')}
              >
                {codeCopied === 'sql' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{codeCopied === 'sql' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre>
{`CREATE TABLE IF NOT EXISTS silver_estoque (
    id SERIAL PRIMARY KEY,
    data_atualizacao VARCHAR(50),
    sku_produto VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    marca VARCHAR(255),
    local_estoque VARCHAR(255) NOT NULL,
    quantidade_disponivel NUMERIC(10, 2) DEFAULT 0,
    valor_unitario NUMERIC(10, 2) DEFAULT 0,
    UNIQUE (data_atualizacao, sku_produto, local_estoque)
);`}
            </pre>
          </div>
        </section>
      )}

      {/* 5. MÓDULOS E TELAS DO SISTEMA */}
      {(showSection('todos') || showSection('modulos')) && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <Boxes size={24} className="doc-section-title-icon" />
            5. Módulos e Funcionalidades do Sistema
          </h2>
          <p className="doc-lead-text">
            O Dedo Duro é composto por 12 módulos especializados que cobrem desde a gestão diária de vendas até a 
            concessão de papéis de usuários e geração de descrições com Inteligência Artificial:
          </p>

          <div className="modules-grid">
            {filteredModules.map((mod) => {
              const IconComponent = mod.icon;
              return (
                <div key={mod.id} className="module-card">
                  <div className="module-card-top">
                    <div className="module-icon-wrap">
                      <IconComponent size={22} color="#3b82f6" />
                    </div>
                    <span className="module-route-badge">{mod.route}</span>
                  </div>
                  <h3 className="module-name">{mod.name}</h3>
                  <p className="module-desc">{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. NORMALIZAÇÃO E PARSER DE SKUS */}
      {(showSection('todos') || showSection('skus')) && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <Tags size={24} className="doc-section-title-icon" />
            6. Inteligência de SKUs e Motor de Normalização
          </h2>
          <p className="doc-lead-text">
            Um dos grandes diferenciais do Dedo Duro é o módulo <code>productParser.js</code>. 
            Ele resolve automaticamente divergências clássicas do e-commerce:
          </p>

          <ul className="module-features-list" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
            <li><strong>Auto-resolução de SKUs Mercado Livre (MLB):</strong> Mapeia códigos de variações e anúncios externos diretamente para o SKU raiz do ERP Senior.</li>
            <li><strong>Catálogo Mestre Indexado:</strong> Integração com arquivos de referência de mais de 30.000 códigos de barras EAN e SKUs oficiais.</li>
            <li><strong>Normalização de Marcas:</strong> Trata sinônimos de marcas líderes (ex: <em>LUPO SPORT</em>, <em>LUPO MASCULINO</em> → <strong>LUPO</strong>; <em>POLO WEAR</em>, <em>TRIFIL</em>, <em>SELENE</em>).</li>
            <li><strong>Desmembramento de Kits:</strong> Converte kits de múltiplos produtos (ex: Kit com 3 cuecas ou pacote de 10 meias) para cálculo unitário do estoque físico consumido.</li>
          </ul>
        </section>
      )}

      {/* 7. INSTALAÇÃO E DEPLOY */}
      {(showSection('todos') || showSection('deploy')) && (
        <section className="doc-section-card">
          <h2 className="doc-section-title">
            <Terminal size={24} className="doc-section-title-icon" />
            7. Guia de Instalação, Execução e Deploy
          </h2>
          <p className="doc-lead-text">
            O projeto pode ser executado localmente para desenvolvimento ou implantado na nuvem (Vercel):
          </p>

          <div className="code-box">
            <div className="code-box-header">
              <span className="code-box-lang">Comandos de Instalação e Execução</span>
              <button 
                className="code-box-copy"
                onClick={() => copyToClipboard(`npm install\nnpm run dev`, 'cli')}
              >
                {codeCopied === 'cli' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{codeCopied === 'cli' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre>
{`# 1. Instalar dependências da aplicação
npm install

# 2. Iniciar servidor Vite local
npm run dev
# Frontend acessível em: http://localhost:5173

# 3. Iniciar servidor Backend auxiliar (se necessário)
cd backend
npm install
node server.js
# API acessível em: http://localhost:3001`}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
