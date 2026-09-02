# 📘 Central de Documentação Oficial — Grupo Sandrini
### Base de Conhecimento: Loja Virtual (Site) & Sistema Dedo Duro

```
                           ┌──────────────────────────────┐
                           │         DOCUMENTAÇÃO         │
                           └──────────────┬───────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
            ┌─────────────┐                               ┌─────────────┐
            │    SITE     │                               │  DEDO DURO  │
            └──────┬──────┘                               └──────┬──────┘
                   │                                             │
      ┌────────────┼────────────┐                   ┌────────────┴────────────┐
      ▼            ▼            ▼                   ▼                         ▼
  [Criação     [Marketing   [Gerenciar        [Cada Página              [Como Preencher
     de            e         Pedidos]             Como                     o Relatório
  Produtos]      Tema]                          Funciona]                    Diário]
```

---

## 📑 Sumário

### 🌐 Pilar 1: Site (E-commerce)
1. [Criação de Produtos](#1-criação-de-produtos-no-site)
   - 1.1 Título e Nomenclatura Comercial
   - 1.2 Grade de Variações (Cor & Tamanho)
   - 1.3 Padrão Fotográfico & Mídia
   - 1.4 Descrição, Ficha Técnica e SEO
   - 1.5 Precificação e Markup
2. [Marketing e Tema](#2-marketing-e-tema-da-loja-virtual)
   - 2.1 Gestão de Banners (Carrossel, Mosaico e Réguas de Vantagens)
   - 2.2 Vitrines e Coleções Inteligentes
   - 2.3 Cupons de Desconto & Ações Promocionais
   - 2.4 Pixels de Conversão & Rastreamento
3. [Gerenciar Pedidos](#3-gerenciamento-de-pedidos-do-site)
   - 3.1 Ciclo de Vida e Status do Pedido
   - 3.2 Separação (Picking), Conferência (Packing) e NF-e
   - 3.3 Comunicação e Rastreio de Entrega
   - 3.4 Pós-Venda, Trocas e Logística Reversa

---

### 🛡️ Pilar 2: Dedo Duro (Gestão & Performance)
4. [Cada Página Como Funciona](#4-cada-página-do-dedo-duro-como-funciona)
   - 4.1 Dashboard
   - 4.2 Vendas & Curvas ABC
   - 4.3 Cobertura de Estoque (DDC)
   - 4.4 Estoque por Centro de Distribuição
   - 4.5 Ficha do Produto
   - 4.6 Reposição em Trânsito (A Caminho)
   - 4.7 Sellout Multicanal
   - 4.8 Alertas de Ruptura e Excesso
   - 4.9 Marketplace (TikTok Shop)
   - 4.10 Planilha de Pedidos para Fornecedores
   - 4.11 Cadastro Inteligente com IA (Google Gemini)
   - 4.12 Usuários, Permissões e Redefinição de Senhas
5. [Como Preencher o Relatório Diário](#5-como-preencher-o-relatório-diário)
   - 5.1 Rotina Matinal e Horários Recomendados
   - 5.2 Fontes Oficiais de Extração
   - 5.3 Padrão das Colunas Obrigatórias
   - 5.4 Tratamento de Novos SKUs e Mapeamento
   - 5.5 Checklist de Validação Diária
6. [Arquitetura Técnica & Banco de Dados](#6-arquitetura-técnica--banco-de-dados)
   - 6.1 Arquitetura Medalhão (Bronze, Silver e Gold)
   - 6.2 Robôs de Sincronização e ETL (Node.js)
   - 6.3 Motor de Normalização de SKUs (productParser.js)
   - 6.4 Stack Tecnológico e Deploy

---

# 🌐 PILAR 1: SITE (E-COMMERCE)

## 1. Criação de Produtos no Site

### 1.1 Título e Nomenclatura Comercial
O título de cada produto deve seguir a fórmula oficial recomendada para garantir clareza e alto ranqueamento no Google:
> **[Tipo do Produto] + [Marca] + [Modelo / Linha] + [Diferencial Técnico ou Quantidade do Kit]**
- *Exemplo correto:* `Kit 3 Cuecas Boxer Lupo Algodão com Elastano Sem Costura Antimicrobial`
- *Exemplo incorreto:* `Cueca Lupo boxer masculina kit top`

### 1.2 Grade de Variações (Cor & Tamanho)
- **Produto Pai:** Cadastro base com as características gerais (tecido, composição, marca).
- **Variações Filhas:** Combinações específicas de Cor x Tamanho (ex: Preto / M, Marinho / G).
- **Tabela de Medidas:** Inserção obrigatória da tabela de equivalência de numeração (cm de tórax, quadril ou calçado) para reduzir devoluções por tamanho incorreto.

### 1.3 Padrão Fotográfico & Mídia
- **Resolução Recomendada:** 1200 x 1200 pixels (1:1) até 1600 x 1600 pixels.
- **1ª Foto (Capa):** Fundo branco (#FFFFFF) limpo, produto centralizado sem sombras duras nem marcas d'água promocionais.
- **Fotos Subsequentes:** Imagem de costas, detalhes de acabamento/elástico, foto em modelo (lifestyle) e embalagem comercial do produto.

### 1.4 Descrição, Ficha Técnica e SEO
- **Parágrafo Comercial:** Texto persuasivo destacando os benefícios do produto no dia a dia, tecnologia empregada e durabilidade.
- **Ficha Técnica Detalhada:** Composição percentual do tecido (ex: 95% Algodão, 5% Elastano), país de fabricação, código de barras EAN-13 oficial e cuidados na lavagem.
- **Meta Tags SEO:** Meta Description concisa de até 155 caracteres contendo as principais palavras-chave buscadas pelo consumidor.

---

## 2. Marketing e Tema da Loja Virtual

### 2.1 Gestão de Banners da Home
- **Hero Banner (Carrossel Principal):**
  - Desktop: `1920 x 600 px` (elementos textuais centralizados para evitar cortes em telas menores).
  - Mobile: `800 x 800 px` ou `750 x 900 px` (verticalizado para visualização em smartphones).
- **Banners Secundários / Mosaicos:** `600 x 400 px` para destacar categorias e coleções.
- **Régua de Vantagens:** Faixa no topo ou logo abaixo do banner com selos informativos: *Frete Grátis*, *Parcelamento sem Juros*, *Primeira Troca Grátis* e *Compra Segura SSL*.

### 2.2 Vitrines e Coleções Inteligentes
- **Mais Vendidos (Top Sellers):** Vitrine dinâmica ordenada pelos produtos com maior saída apurados no Dedo Duro.
- **Lançamentos da Coleção:** Novos modelos recém-cadastrados.
- **Ofertas Relâmpago:** Produtos com preço promocional temporário para girar estoque excedente.

### 2.3 Cupons de Desconto & Ações Promocionais
- **Cupom de Boas-Vindas:** Ex: `SANDRINI10` (10% de desconto na primeira compra mediante cadastro de e-mail).
- **Promoções Progressivas:** Regras automáticas no carrinho (ex: "Leve 3 Pague 2" ou "Compre 4 com 15% OFF").
- **Limitações de Segurança:** Validade temporal estrita, valor mínimo de carrinho e restrição de 1 utilização por CPF.

### 2.4 Pixels de Conversão & Rastreamento
- **Meta Pixel:** Rastreamento dos eventos de funil (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) para alimentar campanhas de tráfego pago no Instagram/Facebook.
- **Google Analytics 4 (GA4):** Análise completa de origens de tráfego, ticket médio e taxa de conversão.
- **TikTok Pixel:** Otimização para tráfego oriundo de vídeos e criadores de conteúdo.

---

## 3. Gerenciamento de Pedidos do Site

### 3.1 Ciclo de Vida do Pedido
```
[ Aguardando Pagamento ] ──► [ Aprovado / Pago ] ──► [ Em Separação (Picking) ]
                                                            │
                                                            ▼
[ Entregue ao Cliente ] ◄─── [ Em Trânsito ] ◄─────── [ Faturado (NF-e & Packing) ]
```

### 3.2 Separação, Conferência e Despacho
1. **Picking (Separação):** Impressão da lista consolidada de separação por lote de pedidos.
2. **Packing (Conferência):** Bipagem dos códigos de barras dos produtos para conferência antes do empacotamento.
3. **Faturamento:** Emissão automática da Nota Fiscal Eletrônica (NF-e) e impressão da DANFE Simplificada colada na embalagem junto com a etiqueta de envio.
4. **Despacho:** Coleta diária pela transportadora ou entrega nas agências credenciadas.

### 3.3 Atendimento e Pós-Venda
- **Prazo Legal de Arrependimento:** 7 dias corridos após o recebimento (Art. 49 do CDC).
- **Logística Reversa:** Emissão de código de postagem pré-pago nos Correios para devolução sem custo ao cliente.
- **Vistoria:** Ao receber o item devolvido, a equipe confere as etiquetas originais. Produto perfeito volta ao estoque; se avariado, registra-se como *badstock*.

---

# 🛡️ PILAR 2: DEDO DURO (ESTOQUE & GESTÃO)

## 4. Cada Página do Dedo Duro: Como Funciona

### 4.1 Dashboard (`/`)
Painel de controle visual com visão macro de KPIs: total de peças vendidas no mês, faturamento estimado, dias médios de cobertura do estoque, gráfico de vendas recentes e cards de acesso rápido a todos os submódulos.

### 4.2 Vendas (`/vendas`)
Relatórios analíticos de sellout com filtros temporais flexíveis (Hoje, Últimos 7 dias, Últimos 30 dias, Mês Atual, Período Customizado). Exibe gráficos de evolução temporal, curva ABC de produtos (classificação 80/20) e participação percentual por marca.

### 4.3 Cobertura (`/cobertura`)
O coração do Dedo Duro. Calcula automaticamente a saúde do inventário aplicando a fórmula:
$$\text{DDC} = \frac{\text{Estoque Disponível} + \text{Estoque a Caminho}}{\text{Giro Médio Diário}}$$
- **Ruptura (0 dias):** Estoque zerado.
- **Crítico (1 a 14 dias):** Risco iminente de ruptura.
- **Saudável (15 a 45 dias):** Operação equilibrada.
- **Excesso (> 60 dias):** Capital parado necessitando de ação comercial.

### 4.4 Estoque (`/estoque`)
Consulta de inventário por centros de distribuição (Sandrini Matriz, Fulfillment Mercado Livre SP/MG, etc.), com valorização ao custo médio unitário e histórico por datas de fechamento.

### 4.5 Produto (`/produto`)
Ficha técnica 360° de qualquer SKU do catálogo: histórico de vendas mês a mês, canais onde está ativo, preço médio de venda e curva de consumo.

### 4.6 Reposição (`/reposicao`)
Acompanhamento das remessas em trânsito (a caminho), com número da Nota Fiscal, transportadora responsável, quantidade enviada e data prevista de entrega no armazém de destino.

### 4.7 Sellout (`/sellout`)
Análise comparativa do escoamento na ponta final do consumidor e participação (market share) entre as marcas parceiras.

### 4.8 Alertas (`/alertas`)
Varredura contínua de anomalias: produtos que entraram em ruptura recente, SKUs com giro acelerado sem pedido de compra colocado e inconsistências cadastrais.

### 4.9 Marketplace / TikTok (`/marketplace`)
Módulo dedicado à performance de vendas no TikTok Shop: vendas geradas em transmissões ao vivo (lives), ranking de criadores parceiros e produtos de maior tração.

### 4.10 Planilha de Pedidos (`/planilha`)
Automação de pedidos de compra para indústrias e fornecedores. O usuário define o lead time de entrega e a meta de cobertura desejada em dias; o sistema calcula a quantidade exata a ser comprada por SKU e gera a planilha em Excel pronta para envio.

### 4.11 Cadastro Inteligente (`/cadastro`)
Ferramenta para decodificação de códigos complexos de fornecedores e geração de títulos e descrições ricas com Inteligência Artificial (Google Gemini).

### 4.12 Usuários & Permissões (`/usuarios`)
Gestão de acessos com controle hierárquico (Administrador, Gestor, Usuário). Conta com ferramenta de **Redefinição de Senhas** em 1 clique, gerando senhas temporárias seguras com opção de exigir que o colaborador escolha sua nova senha pessoal no primeiro acesso.

---

## 5. Como Preencher o Relatório Diário

### 5.1 Rotina Matinal e Horários
- **Janela de Execução:** Diariamente entre **08:30 e 09:30** da manhã.
- **Objetivo:** Ter todos os painéis atualizados com os dados do dia anterior antes das reuniões matinais de alinhamento.

### 5.2 Fontes Oficiais de Extração
1. **Mercado Livre:** Painel de Vendas (Exportar vendas do dia anterior) e Relatório de Inventário do Full (SP e MG).
2. **ERP Senior X:** Relatório de notas fiscais faturadas e inventário do armazém Matriz.
3. **TikTok Shop:** Painel do Seller Center (aba Pedidos Faturados).

### 5.3 Padrão das Colunas Obrigatórias
| Coluna | Formato Obrigatório | Exemplo Válido | O que NÃO fazer |
|---|---|---|---|
| **Data** | `DD/MM/AAAA` | `02/09/2026` | `2026-09-02` ou com horas |
| **Local / Canal** | Texto padronizado | `ML FULL SP`, `MATRIZ` | Variações com siglas aleatórias |
| **SKU Produto** | Código da Plataforma | `LU7890-001-M` | Caracteres especiais invisíveis |
| **Descrição** | Texto comercial | `Cueca Boxer Lupo Algodão M` | Deixar em branco |
| **Qtd. Vendida** | Número inteiro ou decimal | `120` | `120 pçs` ou `120 unidades` |

### 5.4 Tratamento de Novos SKUs
Se um produto novo aparecer na tela com a marca "NÃO MAPEADO" ou com divergência de código:
1. Acesse o módulo de Mapeamento ou cadastre a correspondência na tabela `silver_mapeamento_sku`.
2. Associe o SKU da Plataforma ao SKU Oficial do ERP Senior.
3. O sistema atualizará automaticamente todo o histórico desse produto.

### 5.5 Checklist de Validação Diária
- [ ] O somatório de peças vendidas no **Dashboard** bate com o total dos relatórios de origem?
- [ ] Os produtos com estoque zerado foram devidamente informados às equipes comerciais?
- [ ] As notas fiscais de reposição despachadas no dia anterior foram registradas no módulo **Reposição**?

---

## 6. Arquitetura Técnica & Banco de Dados

### 6.1 Arquitetura Medalhão no Supabase (PostgreSQL)
- **🥉 Bronze (Dados Brutos):** Tabelas `bronze_vendas`, `bronze_estoque`, `bronze_caminho`, `bronze_badstock`. Ingestão textual sem tipagem forçada.
- **🥈 Silver (Dados Normalizados):** Tabelas `silver_vendas`, `silver_estoque`, `silver_reposicao`, `silver_mapeamento_sku`. Tipagem estrita (`DATE`, `NUMERIC`), índices compostos e marcas normalizadas.
- **🥇 Gold (Camada de Consumo):** Views SQL otimizadas (`vw_vendas_consolidadas`, `v_resumo_estoque_diario`) prontas para responder às requisições do frontend com velocidade milimétrica.

### 6.2 Robôs de Sincronização (ETL)
Localizados na pasta `backend/`:
- `sincronizador_supabase.js`: Pipeline principal de carga e transformação.
- `sincronizar_meli.js`: Integração com a API oficial do Mercado Livre.
- `sincronizar_senior.js`: Conexão com o ERP Senior X.
- `consolidar_marketplace.js`: Agregação de métricas de múltiplos marketplaces.

### 6.3 Motor de Normalização de SKUs (`productParser.js`)
Motor com mais de 30.000 regras de códigos de barras EAN, desmembramento de kits de múltiplas peças e tratamento de sinônimos de marcas (ex: unificação de *LUPO SPORT*, *LUPO UNDERWEAR* sob a marca **LUPO**).

### 6.4 Stack Tecnológico e Deploy
- **Frontend:** React 19, Vite 8, Framer Motion, Chart.js, Recharts, Lucide React.
- **Backend / Database:** Node.js, Express, Supabase PostgreSQL, Google Gemini IA.
- **Hospedagem:** Vercel (Frontend e Serverless Functions em `/api`).
