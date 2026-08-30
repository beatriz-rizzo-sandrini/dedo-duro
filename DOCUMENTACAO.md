# 📘 Documentação Oficial do Sistema DEDO DURO
### Sistema Fullstack de Gestão de Estoque, Sellout, Ruptura e Reposição Multicanal

---

## 📑 Sumário

1. [Visão Geral e Propósito de Negócio](#1-visão-geral-e-propósito-de-negócio)
2. [Arquitetura Geral do Sistema](#2-arquitetura-geral-do-sistema)
3. [Linguagens e Tecnologias Utilizadas](#3-linguagens-e-tecnologias-utilizadas)
4. [Bancos de Dados e Arquitetura Medalhão](#4-bancos-de-dados-e-arquitetura-medalhão)
5. [Módulos e Telas do Dedo Duro](#5-módulos-e-telas-do-dedo-duro)
6. [Inteligência de SKUs e Motor de Normalização](#6-inteligência-de-skus-e-motor-de-normalização)
7. [Robôs de Integração, APIs e Sincronizadores (ETL)](#7-robôs-de-integração-apis-e-sincronizadores-etl)
8. [Autenticação, Permissões e Multi-Empresa](#8-autenticação-permissões-e-multi-empresa)
9. [Guia de Instalação, Execução e Deploy](#9-guia-de-instalação-execução-e-deploy)
10. [Estrutura de Pastas e Arquivos](#10-estrutura-de-pastas-e-arquivos)

---

## 1. Visão Geral e Propósito de Negócio

O **Dedo Duro** é uma plataforma analítica e operacional fullstack projetada para unificar, auditar e gerenciar todo o ciclo de vida de inventário de e-commerce e atacado. 

### O Problema que o Dedo Duro Resolve:
- **Discrepância Multicanal**: Produtos vendidos no Mercado Livre (Full/Fulfillment e agências), TikTok Shop, canais próprios e B2B frequentemente usam códigos de anúncio e SKUs divergentes do catálogo mestre no ERP (Senior X).
- **Ruptura de Estoque Silenciosa**: Vendas aceleradas em um canal que esgotam o estoque físico sem alerta prévio de recompra ou reposição.
- **Dificuldade no Cálculo de Cobertura**: Falta de visão de dias de cobertura (DDC) baseada no giro real recente e estoque a caminho.
- **Kits e Agrupamentos**: Um produto vendido individualmente versus em kits (ex: Kit com 3 Cuecas Lupo ou Pacote com 10 Meias) requer desmembramento para controle de estoque exato.

### Principais Objetivos do Sistema:
1. **"Dedo Duro" no Estoque**: Apontar imediatamente produtos zerados, em ponto de reposição crítico ou com excesso de cobertura (capital parado).
2. **Conciliação Automatizada de SKUs**: Mapear anúncios e códigos externos para os SKUs oficiais e descrições do ERP Senior.
3. **Visão 360° em Tempo Real**: Vendas diárias, curvas ABC, estoque disponível por armazém/local, mercadoria em trânsito (caminho com rastreio de NF) e avarias (badstock).
4. **Agilidade em Compras e Vendas**: Gerador de pedidos para fornecedores (Planilha de Pedidos) e auxílio de cadastro com Inteligência Artificial (Google Gemini).

---

## 2. Arquitetura Geral do Sistema

A arquitetura do Dedo Duro segue o padrão **Decoupled Fullstack com Camada de Dados Medalhão**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              FONTES DE DADOS                           │
 │  Google Sheets (GViz) │ Mercado Livre API │ ERP Senior X │ TikTok Shop │
 └──────────────┬───────────────────┬───────────────┬───────────────┬─────┘
                │                   │               │               │
                ▼                   ▼               ▼               ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     ROBÔS DE INTEGRAÇÃO & ETL (Node.js)                │
 │  - sincronizador_supabase.js   - sincronizar_meli.js                   │
 │  - sincronizar_senior.js       - consolidar_marketplace.js             │
 │  - tiktokProcessor.js          - productParser.js                      │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      BANCO DE DADOS POSTGRESQL (Supabase)              │
 │  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────────┐  │
 │  │  Camada Bronze  │ ─► │  Camada Silver  │ ─► │ Camada Gold (Views)│  │
 │  │  (Dados Brutos) │    │ (Tipados/Limpos)│    │(Vw_Consolidadas)   │  │
 │  └─────────────────┘    └─────────────────┘    └────────────────────┘  │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │
               ┌────────────────────┴───────────────────┐
               ▼                                        ▼
 ┌───────────────────────────┐            ┌───────────────────────────┐
 │   BACKEND REST (Express)  │            │   FRONTEND SPA (React 19) │
 │  - Porta 3001             │            │  - Vite 8 + Fast Refresh  │
 │  - Espelho MySQL Local    │            │  - Supabase Client Direto │
 │  - Endpoint Gemini IA     │            │  - Chart.js & Framer      │
 └───────────────────────────┘            └───────────────────────────┘
```

---

## 3. Linguagens e Tecnologias Utilizadas

| Camada | Tecnologia / Ferramenta | Versão | Função no Sistema |
| :--- | :--- | :--- | :--- |
| **Linguagem Principal** | **JavaScript (ES6+)** | Modern ES | Utilizado de ponta a ponta (Frontend, Backend e Scripts). |
| **Linguagem de Template** | **JSX (React)** | 19.2 | Renderização declarativa e reativa dos componentes de UI. |
| **Linguagem de Banco** | **SQL (PostgreSQL / MySQL)** | Postgres 15+ | Criação de tabelas, índices, triggers e views analíticas consolidadas. |
| **Linguagens Web** | **HTML5 & CSS3** | Padrão W3C | Semântica da interface e estilização modular com variáveis de tema. |
| **Frontend Framework** | **React** | `^19.2.5` | Criação de SPAs dinâmicas com Hooks personalizados e Context API. |
| **Build & Dev Server** | **Vite** | `^8.0.10` | Bundler ultrarrápido com Hot Module Replacement (HMR). |
| **Roteamento** | **React Router DOM** | `^7.14.2` | Gerenciamento de rotas, navegação protegida e histórico do browser. |
| **Animações** | **Framer Motion** | `^12.38.0` | Transições suaves de páginas, expansão de cards e efeitos interativos. |
| **Gráficos & Charts** | **Chart.js** & **Recharts** | `^4.5.1` / `^3.10.1` | Gráficos de barras, linhas temporais, pizza e dispersão de vendas. |
| **Ícones** | **Lucide React** | `^1.14.0` | Conjunto iconográfico moderno e consistente em todo o painel. |
| **Exportação de Arquivos** | **XLSX (SheetJS)** & **jsPDF** | `^0.18.5` / `^4.2.1` | Exportação de relatórios gerenciais em Excel e PDF estruturado. |
| **Inteligência Artificial** | **Google Generative AI SDK** | `^0.24.1` | Chamadas aos modelos Gemini para geração de SEO e textos comerciais. |
| **Backend & Servidor** | **Node.js + Express** | `^4.18` | Servidor HTTP RESTful para endpoints de fallback e integração com IA. |
| **Banco na Nuvem** | **Supabase (PostgreSQL)** | `^2.105.1` | Banco de dados primário gerenciado na nuvem com alta escalabilidade. |
| **Banco Local** | **MySQL2** | `^3.9` | Driver de conexão para replicação e redundância local. |
| **Agendamento** | **Node-cron** | `^3.0` | Cron jobs para execução periódica de robôs de sincronização. |
| **Comunicação HTTP** | **Axios & Fetch nativo** | Modern | Consumo das APIs do Senior X, Mercado Livre e Google GViz. |

---

## 4. Bancos de Dados e Arquitetura Medalhão

O sistema armazena e processa dados sob o consagrado conceito de **Arquitetura Medalhão**:

### 🥉 Camada Bronze (Dados Brutos / Staging)
Tabelas que recebem os dados brutos exatamente como chegam das fontes, sem transformação:
- `bronze_vendas`: Registros crus de vendas provenientes de planilhas ou APIs externas.
- `bronze_estoque`: Capturas diárias de saldos de estoque por local e anúncio.
- `bronze_caminho`: Remessas em trânsito com previsões e notas fiscais.
- `bronze_badstock`: Lotes com avarias ou produtos danificados.

### 🥈 Camada Silver (Dados Limpos, Tipados e Mapeados)
Tabelas estruturadas com integridade referencial, tipos nativos (`DATE`, `NUMERIC`) e restrições únicas:
- `silver_vendas`: Vendas com data normalizada, quantidade numérica, marca identificada e chaves únicas `(data_venda, local_venda, sku_produto)`.
- `silver_estoque`: Saldos diários por local com valorização de custo e SKU oficial mapeado.
- `silver_reposicao`: Mercadorias a caminho com status da nota fiscal e previsão de recebimento.
- `silver_badstock`: Inventário não comercializável isolado do cálculo de cobertura.
- `silver_mapeamento_sku`: Tabela mestre que relaciona `(sku_plataforma, plataforma)` ao `(sku_senior, descricao_oficial, marca_oficial)`.

### 🥇 Camada Gold (Views e Agrupamentos Analíticos)
Visões SQL otimizadas prontas para alimentar o Frontend com máximo desempenho:
- `vw_vendas_consolidadas`: Consolidação de vendas já traduzidas para os SKUs oficiais do ERP.
- `v_resumo_estoque_diario`: Totais pré-calculados de estoque por data, marca e local, permitindo carregamento instantâneo de dashboards históricos.

---

## 5. Módulos e Telas do Dedo Duro

### 1. 📊 Dashboard (`/`)
Central de comando com cartões animados de alta resposta visual (efeito neon no hover), permitindo saltar para qualquer módulo do ecossistema. Exibe opções administrativas para gestores.

### 2. 📈 Vendas (`/vendas`)
- Análise aprofundada de vendas com seletores de período, marcas e locais de expedição.
- Cálculo de curvas ABC, produtos mais vendidos, média diária de vendas e faturamento consolidado.
- Gráficos temporais de evolução e detalhamento linha a linha por produto.

### 3. 🛡️ Cobertura (`/cobertura`)
- O coração do cálculo de reposição: calcula os **Dias de Cobertura (DDC)** com base no estoque atual dividido pelo giro médio diário.
- Classificação por faixas de risco (Ruptura Iminente, Crítico, Saudável, Excesso).
- Exibição do estoque físico somado ao "estoque a caminho", prevenindo compras duplicadas.

### 4. 📦 Estoque (`/estoque`)
- Consulta da posição de estoque por SKU, armazém, Full e depósitos locais.
- Seletor de datas para viagem no tempo (auditoria do saldo em datas passadas).
- Métricas de valor financeiro total estocado e custo unitário.

### 5. 🏷️ Produto (`/produto`)
- Ficha técnica completa de cada item do catálogo.
- Histórico individualizado de vendas, oscilações de estoque, canais onde o produto está ativo e fornecedores homologados.

### 6. 🚚 Reposição (`/reposicao`)
- Controle de notas fiscais de transferência e pedidos de compra já emitidos e em trânsito.
- Acompanhamento de datas previstas de entrega e status de transporte.

### 7. ⚡ Sellout (`/sellout`)
- Acompanhamento do escoamento de mercadoria na ponta final do cliente.
- Comparativos de desempenho entre marcas parceiras (Lupo, Polo Wear, Trifil, etc.).

### 8. 🚨 Alertas (`/alertas`)
- Monitoramento em tempo real de anomalias:
  - Ruptura de estoque em itens de alto giro (Curva A).
  - Produtos sem venda há mais de 60/90 dias (estoque parado).
  - Divergências de preço de custo ou falta de mapeamento de SKU.

### 9. 🏪 Marketplace (`/marketplace`)
- Módulo focado no ecossistema de vendas por criadores, influenciadores e afiliados (ex: TikTok Shop).
- Importação e processamento de planilhas de comissões, faturamento por criador e correlação com o estoque físico.

### 10. 📝 Pedidos / Planilha (`/planilha`)
- Automação de cálculo de necessidades de compra para fornecedores.
- Sugestão automática de quantidades a comprar considerando prazo de entrega (lead time) e metas de dias de cobertura.
- Exportação direta para planilhas padrão de pedido.

### 11. ✍️ Cadastro com IA (`/cadastro`)
- Padronizador de títulos de produtos, correspondência de siglas de cores e tamanhos.
- Integração nativa com **Google Gemini IA** para geração automática de descrições ricas otimizadas para SEO e conversão em marketplaces.

### 12. 👥 Usuários (`/usuarios`)
- Painel restrito a administradores e gestores para aprovação de cadastros, bloqueio de acessos e concessão de papéis (`admin`, `gestor`, `operador`).

---

## 6. Inteligência de SKUs e Motor de Normalização

O motor de parsing (`src/utils/productParser.js`) é um dos diferenciais técnicos mais importantes do Dedo Duro:

1. **Auto-resolução de SKUs do Mercado Livre (MLB)**:
   - Extrai automaticamente os identificadores de anúncio e variações de atributos.
   - Corrige prefixos e variações de cores e tamanhos específicos de cada marca.
2. **Catálogo Mestre Senior X**:
   - O sistema carrega um catálogo indexado (`seniorCatalog.json` e `eanMapping.json`) com mais de 30.000 referências e códigos EAN/código de barras.
3. **Normalização de Marcas**:
   - Tratamento de sinônimos: `LUPO SPORT`, `LUPO MASCULINO` -> `LUPO`; `POLO WEAR` -> `POLO WEAR`; `TRIFIL`, `SCALA`, `SELENE`, etc.
4. **Desmembramento de Kits**:
   - Identifica se o anúncio representa múltiplos itens (ex: "Kit 10 Pares Meia Cano Curto") para dar baixa e calcular a cobertura com precisão matemática.

---

## 7. Robôs de Integração, APIs e Sincronizadores (ETL)

O backend possui rotinas programadas em segundo plano (via `node-cron` e scripts CLI):

1. **`sincronizador_supabase.js`**:
   - Lê dados de planilhas mestras (Google Sheets) via protocolo GViz.
   - Executa a limpeza, validação de tipos e aplica `upsert` no Supabase nas camadas Bronze e Silver.
2. **`sincronizar_meli.js` & `sincronizar_vendas_meli.js`**:
   - Conecta à API oficial do Mercado Livre utilizando tokens OAuth2.
   - Baixa o estoque do armazém Full (Fulfillment) e as ordens diárias de venda.
3. **`sincronizar_senior.js`**:
   - Integração com a API REST do ERP Senior X.
   - Sincroniza produtos cadastrados, códigos de barras (EAN), descrições oficiais e custos unitários.
4. **`consolidar_marketplace.js` & `tiktokProcessor.js`**:
   - Processamento de arquivos CSV/Excel exportados do TikTok Shop e canais de criadores, gerando a conciliação financeira e de inventário.

---

## 8. Autenticação, Permissões e Multi-Empresa

### Autenticação (`AuthContext.jsx`)
- Autenticação com sessão persistida em `localStorage` e verificação na tabela `usuarios` do Supabase.
- Papéis definidos:
  - **Admin**: Acesso irrestrito a configurações, sincronizações manuais e gestão de usuários.
  - **Gestor**: Acesso completo a relatórios, indicadores financeiros, compras e aprovações.
  - **Operador / Usuário**: Acesso operacional focado em consultas de estoque, vendas e produtos.

### Multi-Empresa (`CompanyContext.jsx`)
- Suporte a filtros isolados por tenant/empresa (ex: **Sandrini**, **Rise Up**, etc.).
- Todo o carregamento do `DataContext` respeita o contexto da empresa selecionada, garantindo que métricas de marcas distintas não sejam misturadas indevidamente.

---

## 9. Guia de Instalação, Execução e Deploy

### Pré-requisitos
- **Node.js** v18.0.0 ou superior.
- Gerenciador de pacotes **npm** ou **yarn**.
- Servidor **MySQL** local (opcional, caso utilize espelho local).
- Acesso à internet para comunicação com o Supabase.

### 1. Clonar e Instalar o Frontend
```bash
git clone <url-do-repositorio>
cd "Sistema de Gestão Estoque DEDO DURO"
npm install
```

### 2. Configurar o Backend
```bash
cd backend
npm install
```

Crie o arquivo `.env` na pasta `backend`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=dedo_duro
PORT=3001
GEMINI_API_KEY=sua_chave_do_google_gemini
```

### 3. Rodar em Ambiente de Desenvolvimento
No terminal raiz:
```bash
npm run dev
```
Acesse a aplicação em: `http://localhost:5173`

Em outro terminal, para rodar o backend auxiliar:
```bash
cd backend
node server.js
```

### 4. Deploy em Produção (Vercel)
O projeto está configurado para deploy imediato no **Vercel**:
- `vercel.json` gerencia reescritas de SPA para que o React Router funcione perfeitamente sem erros 404 em recarregamento de página.
- Funções serverless em `/api` (como `generate-seo.js`) executam chamadas de IA sem expor chaves secretas no navegador.

---

## 10. Estrutura de Pastas e Arquivos

```
dedo-duro/
├── api/                    # Serverless functions Vercel (Gemini AI SEO)
├── backend/                # Servidor Express, robôs ETL e scripts de sincronização
│   ├── server.js           # Servidor RESTful
│   ├── sincronizador_*.js  # Robôs de sincronização (Supabase, Meli, Senior)
│   └── schema_supabase.sql # DDL com a estrutura das tabelas e views
├── public/                 # Favicon e arquivos públicos estáticos
├── src/                    # Código-fonte do Frontend SPA
│   ├── assets/             # Imagens e logotipos
│   ├── components/         # Componentes reutilizáveis (Sidebar, Header, Layout)
│   ├── contexts/           # Provedores de estado (Auth, Company, DataContext)
│   ├── pages/              # Telas e Painéis da Aplicação
│   │   ├── Dashboard.jsx   # Hub central
│   │   ├── Vendas.jsx      # Painel de Vendas
│   │   ├── Cobertura.jsx   # Painel de Cobertura de Estoque
│   │   ├── Estoque.jsx     # Painel de Posição de Estoque
│   │   ├── Documentacao.jsx# Painel Interativo de Documentação (Novo)
│   │   └── ...             # Demais módulos
│   ├── services/           # Clientes de API (Supabase client)
│   ├── utils/              # Parsers de produto, datas, exportação e IA
│   ├── App.jsx             # Definição de rotas e providers
│   ├── index.css           # Design system e variáveis de tema
│   └── main.jsx            # Ponto de entrada do React 19
├── package.json            # Dependências e scripts do projeto
├── vite.config.js          # Configurações do Vite
└── DOCUMENTACAO.md          # Este arquivo de documentação técnica
```

---
*Documentação gerada e mantida pela equipe do Sistema de Gestão de Estoque Dedo Duro.*
