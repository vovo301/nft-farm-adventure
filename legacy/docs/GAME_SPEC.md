# Harvest Realm - Especificação Completa do Jogo

---

## 1. Game Design Document

# NFT Farm Game - Game Design Document

## 1. Visão Geral do Jogo

**Nome do Jogo**: Harvest Realm (ou similar)

**Conceito**: Um jogo de fazenda blockchain onde jogadores cultivam, criam e comercializam ativos digitais em um mundo persistente. Combina mecânicas clássicas de farming games (Stardew Valley, Harvest Moon) com economia Web3 e NFTs, priorizando a experiência de jogo fluida com um modelo híbrido off-chain/on-chain.

**Público-Alvo**: Jogadores casuais interessados em GameFi, colecionadores de NFTs, traders de criptomoedas, fãs de farming games.

**Plataforma**: Web (React), com suporte a múltiplas redes blockchain (Base, Polygon, Ethereum).

## 2. Mecânicas Principais

### 2.1 Sistema de Farming (Idle Game)
Jogadores possuem uma terra (NFT ERC-721) onde podem plantar cultivos que crescem ao longo do tempo. A ação de **Colher (Harvest)** é uma mecânica de jogo que adiciona recursos ao inventário do jogador no banco de dados. Cada cultivo tem:

- **Tempo de Crescimento**: Varia de 5 minutos a 1 dia e meio (máximo)
- **Rendimento**: Quantidade de recursos colhidos (com variação por sorte)
- **Requisitos**: Solo, água, fertilizante (com chance de falha)
- **Rarity**: Comum, Incomum, Raro, Épico, Lendário
- **Elementos de Risco**: Pragas, clima adverso, eventos aleatórios que podem afetar colheita

Cultivos podem ser plantados em grid expansível (começando 10x10), com possibilidade de expandir a terra. Cada jogador joga em seu próprio "mundo" privado, mas todos compartilham um servidor global com mapa de facções.

### 2.2 Inventário (Off-chain)
Jogadores gerenciam recursos em inventário com limite de capacidade. Todos os itens consumíveis e recursos brutos são gerenciados no banco de dados para garantir performance e uma experiência de jogo fluida. Tipos de recursos:

- **Cultivos**: Trigo, Milho, Batata, Cenoura, etc.
- **Recursos Brutos**: Madeira, Pedra, Minério
- **Ferramentas**: Enxada, Machado, Picareta (com durabilidade)
- **Sementes**: Sementes de diferentes cultivos
- **Itens Especiais**: Fertilizantes, Pesticidas, Poções

Um item só se torna um NFT (ERC-1155) quando o jogador decide **Sacá-lo (Withdraw)** para sua carteira Web3.

### 2.3 Crafting
Jogadores combinam recursos do inventário (off-chain) para criar itens novos. Exemplos:

- **Sementes Raras**: Trigo + Pó de Ouro → Sementes de Trigo Dourado
- **Ferramentas Melhoradas**: Enxada + Cristal de Ouro → Enxada Dourada
- **Poções**: Erva + Água → Poção de Crescimento (+50% rendimento)
- **Proteção**: Pesticida → Reduz chance de pragas

Cada receita tem custo em recursos e tempo de crafting. Algumas receitas são descobertas através de exploração ou missões.

### 2.4 Marketplace (Híbrido Off-chain/On-chain)
Jogadores compram e vendem itens, cultivos e ferramentas. 

- **Marketplace Interno (Off-chain):** Para itens consumíveis (cultivos, recursos, sementes, ferramentas não-NFTs). Transações rápidas e sem taxas de gás, usando o **Token de Utilidade** do jogo.
- **Marketplace Web3 (On-chain):** Para NFTs (Wearables, Colecionáveis, Terras, e itens sacados para a carteira). Transações com taxas de gás, usando o **Token de Governança** ou outras criptomoedas.

Características:
- **Listagem de Itens**: Preço em **Token de Utilidade** (para itens off-chain) ou **Token de Governança** (para NFTs).
- **Ofertas**: Sistema de negociação direta entre jogadores.
- **Histórico**: Rastreamento de preços e transações.
- **Taxas**: 5% de taxa em cada venda no marketplace interno (queimada ou para tesouro).

### 2.5 Missões, Objetivos e Facções
Engajamento contínuo através de:

- **Missões Diárias**: "Colha 100 unidades de trigo", "Venda 5 itens"
- **Objetivos Semanais**: Desafios maiores com recompensas melhores
- **Conquistas**: Marcos permanentes (Colecionador, Agricultor, Trader)
- **Recompensas**: **Token de Utilidade**, **Token de Governança**, NFTs especiais
- **Sistema de Facções**: Jogadores escolhem uma facção (ex: Cultivadores, Comerciantes, Alquimistas) que oferece bônus e competição no mapa global

### 2.6 Mapa Interativo
Visualização em tempo real da fazenda com:

- **Grid 10x10**: Posicionamento de cultivos
- **Estruturas**: Casa, Armazém, Mercado (futuros)
- **Decorações**: Árvores, flores, cercas
- **Zoom/Pan**: Navegação fluida
- **Drag-and-Drop**: Reposicionamento de itens

## 3. Economia de Tokens e Monetização

### 3.1 Token de Utilidade: [Nome do Token de Utilidade]
- **Símbolo**: [Ex: SEED, TOOL, RESOURCE]
- **Uso**: Compra de itens consumíveis (sementes, ferramentas não-NFTs, recursos) no marketplace interno, pagamento de custos de crafting, expansão de terra off-chain.
- **Obtenção**: Colheita de cultivos, conclusão de missões, vendas no marketplace interno.
- **Supply**: Gerenciado pelo jogo (off-chain), com mecanismos de queima e cunhagem para balanceamento.
- **Modelo**: Free-to-play - jogadores podem ganhar este token jogando.

### 3.2 Token de Governança: FARM
- **Símbolo**: FARM
- **Uso**: Votação em propostas, staking para recompensas, acesso a conteúdo exclusivo, compra de NFTs (Terras, Wearables, Colecionáveis).
- **Obtenção**: Staking do Token de Utilidade, recompensas de ranking, eventos especiais, vendas de NFTs.
- **Supply**: Inicial 100k, distribuição limitada.
- **Mecanismo**: Não inflacionário, apenas distribuição. Este é o token que pode ser sacado para a carteira Web3 do jogador.

### 3.3 Monetização (Não Pay-to-Win)
- **NFT de Terra (LAND)**: Taxa de Mint para criar nova terra (10-50 FARM).
- **NFTs de Cosmética**: Skins, decorações, temas (5-50 FARM ou Token de Utilidade).
- **NFTs de Utilidade**: Buffs temporários, ferramentas especiais (10-100 FARM).
- **Battle Pass**: Acesso a missões premium e recompensas exclusivas (10 Token de Utilidade/mês).
- **Modelo**: Quem investe mais terá mais vantagens (como em qualquer mercado), mas não é impossível progredir sem gastar.

### 3.3 Balanceamento Econômico

| Aspecto | Mecanismo |
|---------|----------|
| Inflação de Token de Utilidade | Queima em transações, crafting consome recursos, expansão de terra. |
| Valor de FARM | Staking de Token de Utilidade, votação em governança, mint de terras, compra de NFTs. |
| Sustentabilidade | Novo conteúdo regularmente, expansão de ecossistema, facções. |
| Sink de Tokens | Marketplace taxes, crafting costs, expansão, NFTs de utilidade. |
| Elementos de Risco | Pragas, clima, eventos aleatórios afetam colheita. |

## 4. Estrutura de NFTs

### 4.1 Terras (ERC-721)
- **Atributos**: Tamanho (10x10), Fertilidade, Clima
- **Rarity**: Comum (70%), Incomum (20%), Raro (7%), Épico (2%), Lendário (1%)
- **Preço Inicial**: 10 FARM
- **Limite**: Cada jogador começa com 1 terra gratuita

### 4.2 Itens (ERC-1155 - Mint-on-Demand)
- **Tipos**: Cultivos, Ferramentas, Recursos Brutos, Itens Especiais.
- **Mecanismo**: Itens são gerenciados off-chain no banco de dados. Tornam-se NFTs ERC-1155 apenas quando o jogador decide **Sacá-los (Withdraw)** para sua carteira Web3.
- **Atributos**: Tempo de crescimento (para cultivos), rendimento, requisitos, durabilidade (para ferramentas).
- **Dinâmica**: Metadata muda conforme o item (ex: cultivo cresce).

### 4.3 Wearables e Colecionáveis (ERC-1155 ou ERC-721)
- **Tipos**: Skins de personagem, decorações de fazenda, itens cosméticos raros.
- **Mecanismo**: São NFTs desde o momento da aquisição e podem ser negociados diretamente no Marketplace Web3.

### 4.4 Personagens (ERC-721) - Futuro
- **Função**: Bônus de produção, habilidades especiais
- **Atributos**: Força, Inteligência, Sorte
- **Evolução**: Ganham experiência com uso

## 5. Progressão do Jogador

### 5.1 Níveis e Escalabilidade
- **Nível 1-10**: Tutorial, aprendizado de mecânicas
- **Nível 11-50**: Desbloqueio de cultivos raros e crafting
- **Nível 50-100**: Especialização por facção
- **Nível 100+**: Conteúdo avançado e endgame
- **Escalabilidade**: Sistema preparado para crescimento indefinido de níveis
- **Modelo Idle**: Cada jogador joga em seu próprio mundo privado
- **Servidor Global**: Todos os jogadores compartilham um mapa de facções
- **Não há PvP/PvE direto**: Competição ocorre através de ranking e eventos de facção

### 5.2 Conquistas e Facções
- **Colecionador**: Possuir 1 de cada cultivo
- **Agricultor**: Colher 10.000 unidades totais
- **Trader**: Realizar 100 transações
- **Milionário**: Acumular 1M do Token de Utilidade
- **Lendário**: Possuir NFT Lendário

### 5.3 Sistema de Facções
**Facções Disponíveis**:
- **Cultivadores**: Bônus de +10% rendimento de cultivos, desafios de colheita
- **Comerciantes**: Bônus de -5% taxa de marketplace, desafios de venda
- **Alquimistas**: Bônus de +20% velocidade de crafting, desafios de criação
- **Exploradores**: Bônus de +15% chance de itens raros, desafios de descoberta

**Mapa Global**:
- Cada facção tem uma região no mapa
- Ranking de facções baseado em contribuição de membros
- Eventos sazonais com competição entre facções
- Recompensas coletivas para facções vencedoras

## 6. Fluxo de Jogo - Primeiro Dia

1. **Onboarding**: Jogador conecta carteira (MetaMask/WalletConnect via Base)
2. **Escolha de Facção**: Seleciona uma facção que melhor se alinha com seu estilo
3. **Tutorial**: Recebe terra gratuita (NFT ERC-721), sementes iniciais (off-chain)
4. **Primeira Ação**: Planta trigo na terra em grid 10x10
5. **Espera**: Timer de 5-30 minutos para colheita (varia por tipo de cultivo)
6. **Elemento de Sorte**: Chance de praga ou clima adverso afeta rendimento (5-15% de variação)
7. **Colheita (Harvest)**: Recebe 8-12 unidades de trigo (off-chain, variável por sorte) no inventário.
8. **Marketplace Interno**: Vê preço de trigo e ofertas de outros jogadores.
9. **Venda**: Vende trigo por **Token de Utilidade**.
10. **Missão Diária**: Completa "Colha seu primeiro cultivo"
11. **Recompensa**: Recebe 5 **Token de Utilidade** + 1 semente rara (off-chain).
12. **Mapa Global**: Vê posição de sua facção no mapa e ranking.

## 7. Modelo Econômico Sustentável

### 7.1 Receitas
- **Mint de Terra (LAND)**: Taxa de 10-50 FARM por nova terra.
- **NFTs de Cosmética**: Skins, decorações (5-50 FARM ou Token de Utilidade).
- **NFTs de Utilidade**: Buffs, ferramentas especiais (10-100 FARM).
- **Battle Pass**: Acesso a missões premium (10 Token de Utilidade/mês).
- **Marketplace Fees**: 5% de cada transação no marketplace interno (burning + tesouro).

### 7.2 Distribuição de Receitas
- 40%: Desenvolvimento e operação
- 30%: Tesouro do jogo (buyback, burning, estabilidade)
- 20%: Comunidade (eventos, recompensas, facções)
- 10%: Equipe

### 7.3 Vantagens de Investimento (Não Pay-to-Win)
- Quem investe mais FARM/Token de Utilidade terá mais terras e itens.
- Mas progressão é possível sem investimento (free-to-play).
- Economia de mercado real: quem investe cedo pode lucrar com apreciação.

## 8. Roadmap

### Fase 1 (Mês 1-2): MVP
- Sistema de farming com timers curtos (5 min - 1.5 dias)
- Inventário com limite de capacidade (off-chain)
- Marketplace interno com Token de Utilidade
- Autenticação Web3 (Base network)
- Sistema de facções básico

### Fase 2 (Mês 3-4): Expansão
- Crafting com descoberta de receitas
- Missões diárias e semanais
- Mapa global interativo com facções
- Elementos de sorte e risco (pragas, clima)
- Leaderboards por facção
- Sistema de Saque (Withdrawal) para transformar itens off-chain em NFTs

### Fase 3 (Mês 5-6): Conteúdo
- NFTs de cosmética e utilidade (Wearables/Colecionáveis)
- Novos cultivos e ferramentas
- Eventos sazonais
- Sistema de guildas (comunidades)
- Expansão de terra

### Fase 4 (Mês 7+): Ecossistema
- Suporte a múltiplas redes (Polygon + Base)
- Novos tipos de conteúdo (animais, pesca, mineração)
- Integração com outras aplicações
- Economia de longo prazo estabilizada

## 9. Considerações de Design

### 9.1 Balanceamento
- Nenhum jogador deve poder "vencer" rapidamente
- Progressão consistente mesmo sem investimento (free-to-play)
- Recompensas justas para tempo investido
- Quem investe mais tem vantagens, mas não impossibilita outros

### 9.2 Retenção (Idle Game)
- Missões diárias para login
- Timers curtos (5 min - 1.5 dias) que encorajam check-ins frequentes
- Elementos de sorte/risco que mantêm interesse
- Competição de facções no mapa global
- Comunidade ativa por facção

### 9.3 Sustentabilidade Econômica
- Economia monitorada constantemente
- Ajustes de inflação quando necessário
- Novos sinks de tokens regularmente
- Feedback da comunidade
- Ecossistema preparado para crescimento de longo prazo
- Cada jogador em seu próprio mundo, mas conectado ao servidor global

## 10. Especificações Técnicas

### 10.1 Rede Blockchain
- **Rede Primária**: Base (começar aqui)
- **Rede Secundária**: Polygon (adicionar na Fase 4)
- **Carteiras Suportadas**: MetaMask, WalletConnect
- **Padrão de NFTs**: ERC-721 (terras), ERC-1155 (itens sacados, wearables, colecionáveis)
- **Padrão de Tokens**: ERC-20 (Token de Utilidade, Token de Governança)

### 10.2 Público-Alvo
- **Fase 1**: Brasil (MVP)
- **Fase 2**: Brasil + América Latina
- **Fase 3+**: Global
- **Foco**: Jogadores casuais, colecionadores de NFT, traders, fãs de idle games

## 11. Próximas Etapas

1. Criar design visual (paleta de cores, tipografia, conceito art)
2. Criar wireframes de UI/UX
3. Estruturar banco de dados
4. Implementar autenticação Web3 (Base)
5. Iniciar desenvolvimento de frontend

---

## 2. Arquitetura Técnica - Harvest Realm (Modelo Híbrido Off-chain/On-chain)

**Projeto:** Harvest Realm (NFT Farm Adventure)
**Data:** 25 de Fevereiro de 2026
**Versão:** 1.0

---

## 📋 Resumo Executivo

A arquitetura do Harvest Realm adota um modelo híbrido que combina a performance e a fluidez de uma experiência de jogo tradicional (off-chain, gerenciada por banco de dados) com a segurança e a propriedade descentralizada da tecnologia blockchain (on-chain). Esta abordagem otimiza a experiência do usuário, minimizando custos de transação e latência, enquanto ainda oferece a verdadeira propriedade de ativos digitais.

---

## 🛠️ Componentes da Arquitetura

### 1. Camada Off-chain (Servidor e Banco de Dados)

Esta camada é responsável pela maior parte da lógica de jogo e gerenciamento de dados para garantir uma experiência de usuário responsiva e sem atritos. Todas as interações frequentes e de baixo valor são processadas aqui.

#### 1.1 Servidor de Aplicação (Node.js com tRPC)
- **Função:** Gerencia a lógica de jogo, validações, cálculos e interações com o banco de dados.
- **Módulos Principais:**
    - **Farming:** Lógica de plantio, crescimento, colheita (Harvest como ação).
    - **Inventário:** Gerenciamento de todos os itens consumíveis (sementes, cultivos, recursos, ferramentas não-NFTs).
    - **Crafting:** Processamento de receitas, consumo de ingredientes e produção de novos itens (off-chain).
    - **Marketplace Interno:** Permite a compra e venda de itens off-chain entre jogadores, utilizando o Token de Utilidade.
    - **Missões e Facções:** Gerenciamento de progresso, recompensas e bônus.
    - **Sistema de Saque (Withdrawal):** Interface para jogadores solicitarem a conversão de itens off-chain em NFTs on-chain.

#### 1.2 Banco de Dados (MySQL com Drizzle ORM)
- **Função:** Armazena o estado do jogo para todos os jogadores e itens off-chain.
- **Tabelas Principais:**
    - `users`: Dados do jogador, saldos de tokens (Utility e Governance), facção, nível, etc.
    - `inventory`: Todos os itens que o jogador possui, incluindo cultivos, sementes, recursos e ferramentas (off-chain).
    - `lands`: Propriedades de terra (referência aos NFTs ERC-721).
    - `crops`: Cultivos plantados, status de crescimento, rendimento.
    - `crafting_jobs`: Jobs de crafting em andamento.
    - `marketplace_listings_offchain`: Listagens do marketplace interno.
    - `factions`: Dados das facções e seus bônus.

### 2. Camada On-chain (Blockchain - Base Network)

Esta camada é utilizada para garantir a verdadeira propriedade de ativos digitais (NFTs) e a governança do jogo. As interações aqui são menos frequentes e geralmente iniciadas pelo jogador para transações de alto valor ou para retirar ativos do jogo.

#### 2.1 Smart Contracts (Solidity)
- **Função:** Define as regras para tokens, NFTs e interações econômicas descentralizadas.
- **Contratos Principais:**
    - **UtilityToken (ERC-20):** Token de utilidade do jogo. Embora a maior parte de seu uso seja off-chain, este contrato existe para permitir staking, pontes e interações com outros contratos on-chain. Seu supply é controlado pelo `GameEconomyManager`.
    - **FarmToken (ERC-20):** Token de governança do jogo. É o token que pode ser sacado e negociado livremente na blockchain.
    - **FarmLand (ERC-721):** Representa as propriedades de terra únicas como NFTs.
    - **FarmItems (ERC-1155):** Contrato para itens que podem ser sacados do jogo. Funciona com um modelo de **Mint-on-Demand**, onde o servidor solicita a cunhagem de um NFT quando um jogador decide sacar um item off-chain.
    - **FarmMarketplace (On-chain):** Permite a compra e venda de NFTs (FarmLand, FarmItems sacados, Wearables/Colecionáveis) usando o FarmToken.
    - **GameEconomyManager:** Contrato central que atua como um oráculo/admin para cunhagem/queima de tokens e NFTs, garantindo a integridade da economia entre as camadas off-chain e on-chain.

#### 2.2 Provedor Web3 (Wagmi/RainbowKit)
- **Função:** Facilita a conexão da carteira do usuário (MetaMask, WalletConnect) e a interação com os smart contracts na blockchain.
- **Redes Suportadas:** Base Sepolia (testnet) para desenvolvimento e testes, Base Mainnet para produção.

### 3. Camada de Interface (Frontend - React)

O frontend é a camada de apresentação que interage com o servidor de aplicação (via tRPC) para a lógica de jogo off-chain e com a blockchain (via Wagmi/RainbowKit) para transações on-chain.

- **Componentes:** `FarmGrid`, `InventoryPanel`, `CraftingPanel`, `MarketplaceListings` (para ambos os marketplaces), `Web3Provider`.
- **Interação:** Exibe o estado do jogo (do banco de dados) e permite que o jogador inicie ações que podem ser off-chain (colher) ou on-chain (sacar um NFT).

---

## 🔄 Fluxo de Interação (Off-chain para On-chain)

1.  **Ação do Jogador (Off-chain):** O jogador colhe um cultivo. O servidor atualiza o inventário do jogador no banco de dados.
2.  **Decisão do Jogador (Off-chain):** O jogador decide que quer sacar 100 unidades de 
3.  **Solicitação de Saque (Off-chain para Servidor):** O jogador inicia o processo de saque na UI. O servidor valida se o jogador possui os itens no inventário off-chain e se há alguma taxa de saque.
4.  **Interação com Smart Contract (Servidor para On-chain):** Se a validação for bem-sucedida, o servidor (via `GameEconomyManager`) chama a função `mint` no contrato `FarmItems (ERC-1155)` para cunhar 100 unidades de trigo como NFTs para a carteira do jogador.
5.  **Atualização do Banco de Dados (Servidor):** Após a confirmação da transação on-chain, o servidor deduz as 100 unidades de trigo do inventário off-chain do jogador.
6.  **Propriedade On-chain:** O jogador agora possui 100 unidades de trigo como NFTs em sua carteira, podendo negociá-las em qualquer marketplace compatível com ERC-1155.

---

## 📈 Vantagens do Modelo Híbrido

| Característica | Modelo Híbrido | Modelo Pure On-chain | Modelo Pure Off-chain |
| :------------- | :------------- | :------------------- | :-------------------- |
| **Performance** | Alta (maioria das ações off-chain) | Baixa (latência da blockchain) | Alta (tudo centralizado) |
| **Custos** | Baixos (apenas para saques/NFTs) | Altos (gás para cada ação) | Nulos (sem blockchain) |
| **Propriedade** | Real (NFTs para ativos sacados) | Real (todos os ativos) | Nula (ativos no servidor) |
| **Imersão** | Alta (fluidez de jogo) | Baixa (espera por transações) | Alta (fluidez de jogo) |
| **Segurança** | Moderada (servidor centralizado, NFTs seguros) | Alta (tudo na blockchain) | Baixa (depende da segurança do servidor) |
| **Escalabilidade** | Alta (servidor gerencia volume) | Baixa (limites da blockchain) | Alta (servidor gerencia volume) |

---

## 🔗 Próximos Passos

1.  **Revisão e Ajuste dos Smart Contracts:** Garantir que os contratos reflitam o modelo de Mint-on-Demand para `FarmItems` e a separação clara entre UtilityToken e FarmToken.
2.  **Implementação do Sistema de Saque (Withdrawal):** Desenvolver a lógica no backend e a interface no frontend para permitir que os jogadores saquem seus itens off-chain como NFTs.
3.  **Deploy na Testnet:** Publicar os contratos atualizados na Base Sepolia para testes reais.

---

**Autor:** Manus AI
**Última Atualização:** 25 de Fevereiro de 2026

---

## 3. Smart Contracts Specification - NFT Farm Game

## 1. Visão Geral da Arquitetura

A arquitetura de smart contracts segue um padrão modular onde cada contrato tem responsabilidade específica. Todos os contratos são desenvolvidos em Solidity 0.8.20+ e deployados na rede Base Sepolia (testnet) para testes iniciais, com planos para Base Mainnet e Polygon em produção.

```
┌─────────────────────────────────────────────────────────────┐
│                    NFT Farm Game Contracts                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   UtilityToken   │  │    FarmToken     │                 │
│  │    (ERC-20)      │  │    (ERC-20)      │                 │
│  │  Utilitário      │  │  Governança      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│  ┌────────▼─────────────────────▼──────┐                    │
│  │      GameEconomyManager             │                    │
│  │  (Gerencia taxas, burning, etc)     │                    │
│  └────────┬──────────────────────────┬─┘                    │
│           │                          │                       │
│  ┌────────▼─────────────┐  ┌────────▼──────────────┐        │
│  │   FarmLand (ERC-721) │  │  FarmItems (ERC-1155)│        │
│  │  Propriedades de     │  │  Cultivos, Ferramentas│       │
│  │  terra únicas        │  │  Itens (Mint-on-Demand)│        │
│  └────────┬─────────────┘  └────────┬──────────────┘        │
│           │                         │                        │
│  ┌────────▼─────────────────────────▼──────┐                │
│  │         FarmMarketplace                 │                │
│  │  Compra/venda de NFTs e recursos        │                │
│  └────────┬──────────────────────────────┬─┘                │
│           │                              │                   │
│  ┌────────▼──────────────┐  ┌───────────▼────────────┐      │
│  │   CraftingSystem      │  │   MissionSystem        │      │
│  │  Receitas de crafting │  │  Missões e recompensas │      │
│  └───────────────────────┘  └────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Contratos Detalhados

### 2.1 UtilityToken (ERC-20)

**Propósito**: Token utilitário do jogo, usado para transações internas off-chain. Este token é gerenciado principalmente pelo servidor do jogo e só interage com a blockchain para funcionalidades específicas de 
ponte com o mundo on-chain (ex: staking, conversão para FARM). A maior parte de seu uso é off-chain, no banco de dados do jogo.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager, para recompensas)
- `burn(uint256 amount)`: Queimar tokens (deflação, via GameEconomyManager)
- `transfer(address to, uint256 amount)`: Transferência padrão ERC-20 (para interações on-chain)
- `approve(address spender, uint256 amount)`: Aprovação para gasto

**Parâmetros**:
- Supply Inicial: Gerenciado off-chain, com um supply on-chain limitado para interações.
- Decimais: 18
- Burnable: Sim
- Pausable: Sim (para emergências)

**Eventos**:
```solidity
event TokensMinted(address indexed to, uint256 amount);
event TokensBurned(address indexed from, uint256 amount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.2 FarmToken (ERC-20)

**Propósito**: Token de governança do jogo, para votação, staking e compra de NFTs on-chain. Este é o token que os jogadores podem sacar para suas carteiras Web3.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager, para recompensas de staking/governança)
- `stake(uint256 amount)`: Fazer staking de FARM
- `unstake(uint256 amount)`: Retirar staking
- `claimRewards()`: Reclamar recompensas de staking

**Parâmetros**:
- Supply Inicial: 100.000 FARM
- Decimais: 18
- Staking APY: 10-20% (ajustável via governança)
- Vesting: Sim (liberação gradual para recompensas)

**Eventos**:
```solidity
event Staked(address indexed user, uint256 amount);
event Unstaked(address indexed user, uint256 amount);
event RewardsClaimed(address indexed user, uint256 amount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.3 FarmLand (ERC-721)

**Propósito**: Representar propriedades de terra únicas onde jogadores cultivam. São NFTs reais.

**Estrutura de Dados**:
```solidity
struct Land {
    uint256 tokenId;
    address owner;
    uint256 fertilityLevel;      // 1-100
    uint256 size;                // 10x10 = 100 slots
    uint256 plantedCrops;        // Número de cultivos plantados (apenas para referência on-chain)
    uint256 lastHarvestedAt;     // Timestamp (apenas para referência on-chain)
    string metadata;             // URI para metadata
}
```

**Funções Principais**:
- `mint(address to, uint256 fertilityLevel)`: Cunhar nova terra (apenas GameEconomyManager)
- `updateFertility(uint256 tokenId, int256 delta)`: Atualizar fertilidade (apenas GameEconomyManager)
- `plantCrop(uint256 tokenId, uint256 cropId, uint256 x, uint256 y)`: Plantar cultivo (interação off-chain, mas pode ter gatilho on-chain para eventos)
- `harvestCrop(uint256 tokenId, uint256 x, uint256 y)`: Colher cultivo (interação off-chain)
- `tokenURI(uint256 tokenId)`: Retornar metadata dinâmica

**Parâmetros**:
- Max Supply: 10.000 terras
- Tamanho: 10x10 grid (100 slots)
- Preço Inicial: 10 FARM
- Royalties: 5% em revenda

**Eventos**:
```solidity
event LandMinted(address indexed owner, uint256 indexed tokenId);
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

### 2.4 FarmItems (ERC-1155) - Mint-on-Demand

**Propósito**: Gerenciar cultivos, ferramentas, recursos e itens comuns. Estes itens são gerenciados off-chain no banco de dados e só se tornam NFTs ERC-1155 quando o jogador decide **Sacá-los (Withdraw)** para sua carteira Web3.

**Tipos de Itens**:
- IDs 1-1000: Cultivos (trigo, milho, etc)
- IDs 1001-2000: Ferramentas (enxada, machado, etc)
- IDs 2001-3000: Recursos (madeira, pedra, etc)
- IDs 3001+: Itens especiais (poções, sementes raras, etc)

**Estrutura de Dados**:
```solidity
struct Item {
    uint256 itemId;
    string name;
    uint256 rarity;              // 1: Comum, 2: Incomum, 3: Raro, 4: Épico, 5: Lendário
    uint256 growthTime;          // Para cultivos (em segundos)
    uint256 yield;               // Quantidade colhida
    uint256 maxSupply;           // 0 = ilimitado
    bool burnable;
}
```

**Funções Principais**:
- `mint(address to, uint256 id, uint256 amount)`: Cunhar itens (apenas GameEconomyManager, para saque)
- `burn(uint256 id, uint256 amount)`: Queimar itens (apenas GameEconomyManager, para reverter saque ou crafting on-chain)
- `batchMint(address to, uint256[] ids, uint256[] amounts)`: Cunhar múltiplos (apenas GameEconomyManager)
- `setItemMetadata(uint256 id, string memory metadata)`: Atualizar metadata

**Parâmetros**:
- Max Item Types: 5000
- Burnable: Sim (para crafting on-chain ou reversão de saque)
- Transferable: Sim

**Eventos**:
```solidity
event ItemMinted(address indexed to, uint256 indexed itemId, uint256 amount);
event ItemBurned(address indexed from, uint256 indexed itemId, uint256 amount);
event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
```

### 2.5 FarmMarketplace

**Propósito**: Permitir compra, venda e negociação de NFTs e itens. Este contrato gerencia apenas as transações on-chain de NFTs (FarmLand, FarmItems sacados, Wearables/Colecionáveis).

**Estrutura de Dados**:
```solidity
struct Listing {
    uint256 listingId;
    address seller;
    address nftContract;         // Endereço do contrato NFT (FarmLand ou FarmItems)
    uint256 tokenId;
    uint256 amount;              // Para ERC-1155
    uint256 price;               // Em FARM
    uint256 listedAt;
    bool active;
}

struct Offer {
    uint256 offerId;
    address buyer;
    address seller;
    uint256 listingId;
    uint256 offerPrice;
    uint256 createdAt;
    bool accepted;
}
```

**Funções Principais**:
- `listItem(address nftContract, uint256 tokenId, uint256 price)`: Listar item NFT
- `cancelListing(uint256 listingId)`: Cancelar listagem
- `buyItem(uint256 listingId)`: Comprar item NFT listado
- `makeOffer(uint256 listingId, uint256 offerPrice)`: Fazer oferta por NFT
- `acceptOffer(uint256 offerId)`: Aceitar oferta por NFT

**Parâmetros**:
- Taxa de Venda: 5% (em FARM, para tesouro)
- Tempo Mínimo de Listagem: 1 minuto
- Tempo Máximo de Oferta: 7 dias

**Eventos**:
```solidity
event ItemListed(uint256 indexed listingId, address indexed seller, uint256 price);
event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 price);
event OfferMade(uint256 indexed offerId, address indexed buyer, uint256 offerPrice);
event OfferAccepted(uint256 indexed offerId);
```

### 2.6 CraftingSystem

**Propósito**: Permitir jogadores combinar itens para criar novos. Este contrato gerencia apenas receitas de crafting que envolvem NFTs (FarmItems sacados, Wearables, etc.). O crafting de itens off-chain é gerenciado pelo servidor.

**Estrutura de Dados**:
```solidity
struct Recipe {
    uint256 recipeId;
    uint256[] inputItems;        // IDs dos itens de entrada (ERC-1155)
    uint256[] inputAmounts;      // Quantidades necessárias
    uint256 outputItem;          // ID do item de saída (ERC-1155)
    uint256 outputAmount;        // Quantidade produzida
    uint256 craftingTime;        // Tempo em segundos
    uint256 farmCost;            // Custo em FARM
    bool active;
}

struct CraftingJob {
    uint256 jobId;
    address crafter;
    uint256 recipeId;
    uint256 startedAt;
    uint256 completedAt;
}
```

**Funções Principais**:
- `addRecipe(uint256[] inputs, uint256[] amounts, uint256 output, uint256 time, uint256 cost)`: Adicionar receita (apenas GameEconomyManager)
- `startCrafting(uint256 recipeId)`: Iniciar crafting (consome NFTs de entrada)
- `completeCrafting(uint256 jobId)`: Completar crafting (minta NFT de saída)
- `cancelCrafting(uint256 jobId)`: Cancelar crafting (reembolsa 50% dos NFTs de entrada)

**Parâmetros**:
- Max Recipes: 1000
- Crafting Time Range: 5 minutos a 24 horas
- Cost Range: 0 a 1000 FARM

**Eventos**:
```solidity
event RecipeAdded(uint256 indexed recipeId);
event CraftingStarted(uint256 indexed jobId, address indexed crafter);
event CraftingCompleted(uint256 indexed jobId, uint256 outputAmount);
```

### 2.7 MissionSystem

**Propósito**: Fornecer missões e objetivos para engajamento contínuo. Este contrato gerencia recompensas on-chain (FARM, NFTs).

**Estrutura de Dados**:
```solidity
struct Mission {
    uint256 missionId;
    string title;
    string description;
    uint256 targetValue;         // Ex: 100 unidades de trigo (verificado off-chain)
    uint256 rewardFarm;
    uint256 rewardNFT;           // 0 se nenhum NFT
    uint256 duration;            // Duração em segundos
    bool active;
}

struct MissionProgress {
    uint256 missionId;
    uint256 progress;
    uint256 startedAt;
    bool completed;
}
```

**Funções Principais**:
- `addMission(string memory title, uint256 target, uint256 rewardFarm, uint256 rewardNFT)`: Adicionar missão (apenas GameEconomyManager)
- `completeMission(uint256 missionId)`: Completar missão (gatilho off-chain, recompensa on-chain)
- `claimReward(uint256 missionId)`: Reclamar recompensa (minta FARM ou NFT)

**Parâmetros**:
- Missões Diárias: 5 por dia
- Missões Semanais: 3 por semana
- Recompensa Média: 10-100 FARM

**Eventos**:
```solidity
event MissionAdded(uint256 indexed missionId);
event MissionCompleted(uint256 indexed missionId, address indexed player);
event RewardClaimed(uint256 indexed missionId, address indexed player, uint256 rewardFarm, uint256 rewardNFT);
```

### 2.8 GameEconomyManager

**Propósito**: Contrato central que gerencia a lógica econômica e as interações entre os outros contratos. Atua como um "admin" para cunhagem, queima e distribuição de tokens/NFTs.

**Funções Principais**:
- `setUtilityToken(address _utilityToken)`: Definir endereço do UtilityToken
- `setFarmToken(address _farmToken)`: Definir endereço do FarmToken
- `setFarmLand(address _farmLand)`: Definir endereço do FarmLand
- `setFarmItems(address _farmItems)`: Definir endereço do FarmItems
- `mintUtilityToken(address to, uint256 amount)`: Cunhar UtilityToken
- `burnUtilityToken(uint256 amount)`: Queimar UtilityToken
- `mintFarmToken(address to, uint256 amount)`: Cunhar FarmToken
- `mintFarmLand(address to, uint256 fertilityLevel)`: Cunhar FarmLand NFT
- `mintFarmItems(address to, uint256 id, uint256 amount)`: Cunhar FarmItems NFT (para saque)
- `transferFarmItems(address from, address to, uint256 id, uint256 amount)`: Transferir FarmItems (para marketplace on-chain)
- `applyMarketplaceFee(uint256 amount)`: Aplicar taxa de marketplace (queima e tesouro)

**Parâmetros**:
- Owner: Endereço do deployer (ou DAO)
- Pausable: Sim

**Eventos**:
```solidity
event UtilityTokenSet(address indexed utilityToken);
event FarmTokenSet(address indexed farmToken);
event FarmLandSet(address indexed farmLand);
event FarmItemsSet(address indexed farmItems);
```

## 3. Considerações de Segurança

- **Controle de Acesso:** Funções sensíveis (`mint`, `burn`, `addRecipe`) são protegidas com `onlyOwner` ou `onlyGameEconomyManager`.
- **Reentrancy Guard:** Prevenção de ataques de reentrância em todas as funções que envolvem transferências de tokens.
- **Pausable:** Capacidade de pausar contratos em caso de vulnerabilidades críticas.
- **Testes:** Cobertura extensiva de testes unitários e de integração para todos os contratos.
- **Auditoria:** Recomenda-se auditoria externa de segurança antes do deploy em mainnet.

## 4. Roadmap de Deploy (Fase 16)

1. **Deploy de UtilityToken:** Contrato ERC-20 para o token de utilidade.
2. **Deploy de FarmToken:** Contrato ERC-20 para o token de governança.
3. **Deploy de FarmLand:** Contrato ERC-721 para as terras.
4. **Deploy de FarmItems:** Contrato ERC-1155 para os itens (mint-on-demand).
5. **Deploy de GameEconomyManager:** Contrato central que gerencia a economia.
6. **Deploy de FarmMarketplace:** Contrato para o marketplace on-chain.
7. **Deploy de CraftingSystem:** Contrato para crafting on-chain.
8. **Deploy de MissionSystem:** Contrato para missões on-chain.
9. **Configuração:** Definir os endereços dos contratos uns nos outros via GameEconomyManager.
10. **Verificação:** Publicar o código fonte no Basescan (ou explorador equivalente).

---

**Autor:** Manus AI
**Última Atualização:** 25 de Fevereiro de 2026


---

## 3. Smart Contracts Specification - NFT Farm Game

## 1. Visão Geral da Arquitetura

A arquitetura de smart contracts segue um padrão modular onde cada contrato tem responsabilidade específica. Todos os contratos são desenvolvidos em Solidity 0.8.20+ e deployados na rede Base Sepolia (testnet) para testes iniciais, com planos para Base Mainnet e Polygon em produção.

```
┌─────────────────────────────────────────────────────────────┐
│                    NFT Farm Game Contracts                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   UtilityToken   │  │    FarmToken     │                 │
│  │    (ERC-20)      │  │    (ERC-20)      │                 │
│  │  Utilitário      │  │  Governança      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│  ┌────────▼─────────────────────▼──────┐                    │
│  │      GameEconomyManager             │                    │
│  │  (Gerencia taxas, burning, etc)     │                    │
│  └────────┬──────────────────────────┬─┘                    │
│           │                          │                       │
│  ┌────────▼─────────────┐  ┌────────▼──────────────┐        │
│  │   FarmLand (ERC-721) │  │  FarmItems (ERC-1155)│        │
│  │  Propriedades de     │  │  Cultivos, Ferramentas│       │
│  │  terra únicas        │  │  Itens (Mint-on-Demand)│        │
│  └────────┬─────────────┘  └────────┬──────────────┘        │
│           │                         │                        │
│  ┌────────▼─────────────────────────▼──────┐                │
│  │         FarmMarketplace                 │                │
│  │  Compra/venda de NFTs e recursos        │                │
│  └────────┬──────────────────────────────┬─┘                │
│           │                              │                   │
│  ┌────────▼──────────────┐  ┌───────────▼────────────┐      │
│  │   CraftingSystem      │  │   MissionSystem        │      │
│  │  Receitas de crafting │  │  Missões e recompensas │      │
│  └───────────────────────┘  └────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Contratos Detalhados

### 2.1 UtilityToken (ERC-20)

**Propósito**: Token utilitário do jogo, usado para transações internas off-chain. Este token é gerenciado principalmente pelo servidor do jogo e só interage com a blockchain para funcionalidades específicas de 
ponte com o mundo on-chain (ex: staking, conversão para FARM). A maior parte de seu uso é off-chain, no banco de dados do jogo.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager, para recompensas)
- `burn(uint256 amount)`: Queimar tokens (deflação, via GameEconomyManager)
- `transfer(address to, uint256 amount)`: Transferência padrão ERC-20 (para interações on-chain)
- `approve(address spender, uint256 amount)`: Aprovação para gasto

**Parâmetros**:
- Supply Inicial: Gerenciado off-chain, com um supply on-chain limitado para interações.
- Decimais: 18
- Burnable: Sim
- Pausable: Sim (para emergências)

**Eventos**:
```solidity
event TokensMinted(address indexed to, uint256 amount);
event TokensBurned(address indexed from, uint256 amount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.2 FarmToken (ERC-20)

**Propósito**: Token de governança do jogo, para votação, staking e compra de NFTs on-chain. Este é o token que os jogadores podem sacar para suas carteiras Web3.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager, para recompensas de staking/governança)
- `stake(uint256 amount)`: Fazer staking de FARM
- `unstake(uint256 amount)`: Retirar staking
- `claimRewards()`: Reclamar recompensas de staking

**Parâmetros**:
- Supply Inicial: 100.000 FARM
- Decimais: 18
- Staking APY: 10-20% (ajustável via governança)
- Vesting: Sim (liberação gradual para recompensas)

**Eventos**:
```solidity
event Staked(address indexed user, uint256 amount);
event Unstaked(address indexed user, uint256 amount);
event RewardsClaimed(address indexed user, uint256 amount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.3 FarmLand (ERC-721)

**Propósito**: Representar propriedades de terra únicas onde jogadores cultivam. São NFTs reais.

**Estrutura de Dados**:
```solidity
struct Land {
    uint256 tokenId;
    address owner;
    uint256 fertilityLevel;      // 1-100
    uint256 size;                // 10x10 = 100 slots
    uint256 plantedCrops;        // Número de cultivos plantados (apenas para referência on-chain)
    uint256 lastHarvestedAt;     // Timestamp (apenas para referência on-chain)
    string metadata;             // URI para metadata
}
```

**Funções Principais**:
- `mint(address to, uint256 fertilityLevel)`: Cunhar nova terra (apenas GameEconomyManager)
- `updateFertility(uint256 tokenId, int256 delta)`: Atualizar fertilidade (apenas GameEconomyManager)
- `plantCrop(uint256 tokenId, uint256 cropId, uint256 x, uint256 y)`: Plantar cultivo (interação off-chain, mas pode ter gatilho on-chain para eventos)
- `harvestCrop(uint256 tokenId, uint256 x, uint256 y)`: Colher cultivo (interação off-chain)
- `tokenURI(uint256 tokenId)`: Retornar metadata dinâmica

**Parâmetros**:
- Max Supply: 10.000 terras
- Tamanho: 10x10 grid (100 slots)
- Preço Inicial: 10 FARM
- Royalties: 5% em revenda

**Eventos**:
```solidity
event LandMinted(address indexed owner, uint256 indexed tokenId);
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

### 2.4 FarmItems (ERC-1155) - Mint-on-Demand

**Propósito**: Gerenciar cultivos, ferramentas, recursos e itens comuns. Estes itens são gerenciados off-chain no banco de dados e só se tornam NFTs ERC-1155 quando o jogador decide **Sacá-los (Withdraw)** para sua carteira Web3.

**Tipos de Itens**:
- IDs 1-1000: Cultivos (trigo, milho, etc)
- IDs 1001-2000: Ferramentas (enxada, machado, etc)
- IDs 2001-3000: Recursos (madeira, pedra, etc)
- IDs 3001+: Itens especiais (poções, sementes raras, etc)

**Estrutura de Dados**:
```solidity
struct Item {
    uint256 itemId;
    string name;
    uint256 rarity;              // 1: Comum, 2: Incomum, 3: Raro, 4: Épico, 5: Lendário
    uint256 growthTime;          // Para cultivos (em segundos)
    uint256 yield;               // Quantidade colhida
    uint256 maxSupply;           // 0 = ilimitado
    bool burnable;
}
```

**Funções Principais**:
- `mint(address to, uint256 id, uint256 amount)`: Cunhar itens (apenas GameEconomyManager, para saque)
- `burn(uint256 id, uint256 amount)`: Queimar itens (apenas GameEconomyManager, para reverter saque ou crafting on-chain)
- `batchMint(address to, uint256[] ids, uint256[] amounts)`: Cunhar múltiplos (apenas GameEconomyManager)
- `setItemMetadata(uint256 id, string memory metadata)`: Atualizar metadata

**Parâmetros**:
- Max Item Types: 5000
- Burnable: Sim (para crafting on-chain ou reversão de saque)
- Transferable: Sim

**Eventos**:
```solidity
event ItemMinted(address indexed to, uint256 indexed itemId, uint256 amount);
event ItemBurned(address indexed from, uint256 indexed itemId, uint256 amount);
event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
```

### 2.5 FarmMarketplace

**Propósito**: Permitir compra, venda e negociação de NFTs e itens. Este contrato gerencia apenas as transações on-chain de NFTs (FarmLand, FarmItems sacados, Wearables/Colecionáveis).

**Estrutura de Dados**:
```solidity
struct Listing {
    uint256 listingId;
    address seller;
    address nftContract;         // Endereço do contrato NFT (FarmLand ou FarmItems)
    uint256 tokenId;
    uint256 amount;              // Para ERC-1155
    uint256 price;               // Em FARM
    uint256 listedAt;
    bool active;
}

struct Offer {
    uint256 offerId;
    address buyer;
    address seller;
    uint256 listingId;
    uint256 offerPrice;
    uint256 createdAt;
    bool accepted;
}
```

**Funções Principais**:
- `listItem(address nftContract, uint256 tokenId, uint256 price)`: Listar item NFT
- `cancelListing(uint256 listingId)`: Cancelar listagem
- `buyItem(uint256 listingId)`: Comprar item NFT listado
- `makeOffer(uint256 listingId, uint256 offerPrice)`: Fazer oferta por NFT
- `acceptOffer(uint256 offerId)`: Aceitar oferta por NFT

**Parâmetros**:
- Taxa de Venda: 5% (em FARM, para tesouro)
- Tempo Mínimo de Listagem: 1 minuto
- Tempo Máximo de Oferta: 7 dias

**Eventos**:
```solidity
event ItemListed(uint256 indexed listingId, address indexed seller, uint256 price);
event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 price);
event OfferMade(uint256 indexed offerId, address indexed buyer, uint256 offerPrice);
event OfferAccepted(uint256 indexed offerId);
```

### 2.6 CraftingSystem

**Propósito**: Permitir jogadores combinar itens para criar novos. Este contrato gerencia apenas receitas de crafting que envolvem NFTs (FarmItems sacados, Wearables, etc.). O crafting de itens off-chain é gerenciado pelo servidor.

**Estrutura de Dados**:
```solidity
struct Recipe {
    uint256 recipeId;
    uint256[] inputItems;        // IDs dos itens de entrada (ERC-1155)
    uint256[] inputAmounts;      // Quantidades necessárias
    uint256 outputItem;          // ID do item de saída (ERC-1155)
    uint256 outputAmount;        // Quantidade produzida
    uint256 craftingTime;        // Tempo em segundos
    uint256 farmCost;            // Custo em FARM
    bool active;
}

struct CraftingJob {
    uint256 jobId;
    address crafter;
    uint256 recipeId;
    uint256 startedAt;
    uint256 completedAt;
}
```

**Funções Principais**:
- `addRecipe(uint256[] inputs, uint256[] amounts, uint256 output, uint256 time, uint256 cost)`: Adicionar receita (apenas GameEconomyManager)
- `startCrafting(uint256 recipeId)`: Iniciar crafting (consome NFTs de entrada)
- `completeCrafting(uint256 jobId)`: Completar crafting (minta NFT de saída)
- `cancelCrafting(uint256 jobId)`: Cancelar crafting (reembolsa 50% dos NFTs de entrada)

**Parâmetros**:
- Max Recipes: 1000
- Crafting Time Range: 5 minutos a 24 horas
- Cost Range: 0 a 1000 FARM

**Eventos**:
```solidity
event RecipeAdded(uint256 indexed recipeId);
event CraftingStarted(uint256 indexed jobId, address indexed crafter);
event CraftingCompleted(uint256 indexed jobId, uint256 outputAmount);
```

### 2.7 MissionSystem

**Propósito**: Fornecer missões e objetivos para engajamento contínuo. Este contrato gerencia recompensas on-chain (FARM, NFTs).

**Estrutura de Dados**:
```solidity
struct Mission {
    uint256 missionId;
    string title;
    string description;
    uint256 targetValue;         // Ex: 100 unidades de trigo (verificado off-chain)
    uint256 rewardFarm;
    uint256 rewardNFT;           // 0 se nenhum NFT
    uint256 duration;            // Duração em segundos
    bool active;
}

struct MissionProgress {
    uint256 missionId;
    uint256 progress;
    uint256 startedAt;
    bool completed;
}
```

**Funções Principais**:
- `addMission(string memory title, uint256 target, uint256 rewardFarm, uint256 rewardNFT)`: Adicionar missão (apenas GameEconomyManager)
- `completeMission(uint256 missionId)`: Completar missão (gatilho off-chain, recompensa on-chain)
- `claimReward(uint256 missionId)`: Reclamar recompensa (minta FARM ou NFT)

**Parâmetros**:
- Missões Diárias: 5 por dia
- Missões Semanais: 3 por semana
- Recompensa Média: 10-100 FARM

**Eventos**:
```solidity
event MissionAdded(uint256 indexed missionId);
event MissionCompleted(uint256 indexed missionId, address indexed player);
event RewardClaimed(uint256 indexed missionId, address indexed player, uint256 rewardFarm, uint256 rewardNFT);
```

### 2.8 GameEconomyManager

**Propósito**: Contrato central que gerencia a lógica econômica e as interações entre os outros contratos. Atua como um "admin" para cunhagem, queima e distribuição de tokens/NFTs.

**Funções Principais**:
- `setUtilityToken(address _utilityToken)`: Definir endereço do UtilityToken
- `setFarmToken(address _farmToken)`: Definir endereço do FarmToken
- `setFarmLand(address _farmLand)`: Definir endereço do FarmLand
- `setFarmItems(address _farmItems)`: Definir endereço do FarmItems
- `mintUtilityToken(address to, uint256 amount)`: Cunhar UtilityToken
- `burnUtilityToken(uint256 amount)`: Queimar UtilityToken
- `mintFarmToken(address to, uint256 amount)`: Cunhar FarmToken
- `mintFarmLand(address to, uint256 fertilityLevel)`: Cunhar FarmLand NFT
- `mintFarmItems(address to, uint256 id, uint256 amount)`: Cunhar FarmItems NFT (para saque)
- `transferFarmItems(address from, address to, uint256 id, uint256 amount)`: Transferir FarmItems (para marketplace on-chain)
- `applyMarketplaceFee(uint256 amount)`: Aplicar taxa de marketplace (queima e tesouro)

**Parâmetros**:
- Owner: Endereço do deployer (ou DAO)
- Pausable: Sim

**Eventos**:
```solidity
event UtilityTokenSet(address indexed utilityToken);
event FarmTokenSet(address indexed farmToken);
event FarmLandSet(address indexed farmLand);
event FarmItemsSet(address indexed farmItems);
```

## 3. Considerações de Segurança

- **Controle de Acesso:** Funções sensíveis (`mint`, `burn`, `addRecipe`) são protegidas com `onlyOwner` ou `onlyGameEconomyManager`.
- **Reentrancy Guard:** Prevenção de ataques de reentrância em todas as funções que envolvem transferências de tokens.
- **Pausable:** Capacidade de pausar contratos em caso de vulnerabilidades críticas.
- **Testes:** Cobertura extensiva de testes unitários e de integração para todos os contratos.
- **Auditoria:** Recomenda-se auditoria externa de segurança antes do deploy em mainnet.

## 4. Roadmap de Deploy (Fase 16)

1. **Deploy de UtilityToken:** Contrato ERC-20 para o token de utilidade.
2. **Deploy de FarmToken:** Contrato ERC-20 para o token de governança.
3. **Deploy de FarmLand:** Contrato ERC-721 para as terras.
4. **Deploy de FarmItems:** Contrato ERC-1155 para os itens (mint-on-demand).
5. **Deploy de GameEconomyManager:** Contrato central que gerencia a economia.
6. **Deploy de FarmMarketplace:** Contrato para o marketplace on-chain.
7. **Deploy de CraftingSystem:** Contrato para crafting on-chain.
8. **Deploy de MissionSystem:** Contrato para missões on-chain.
9. **Configuração:** Definir os endereços dos contratos uns nos outros via GameEconomyManager.
10. **Verificação:** Publicar o código fonte no Basescan (ou explorador equivalente).

---

**Autor:** Manus AI
**Última Atualização:** 25 de Fevereiro de 2026


---

## 3. Smart Contracts Specification - NFT Farm Game

## 1. Visão Geral da Arquitetura

A arquitetura de smart contracts segue um padrão modular onde cada contrato tem responsabilidade específica. Todos os contratos são desenvolvidos em Solidity 0.8.20+ e deployados na rede Base Sepolia (testnet) para testes iniciais, com planos para Base Mainnet e Polygon em produção.

```
┌─────────────────────────────────────────────────────────────┐
│                    NFT Farm Game Contracts                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   UtilityToken   │  │    FarmToken     │                 │
│  │    (ERC-20)      │  │    (ERC-20)      │                 │
│  │  Utilitário      │  │  Governança      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│  ┌────────▼─────────────────────▼──────┐                    │
│  │      GameEconomyManager             │                    │
│  │  (Gerencia taxas, burning, etc)     │                    │
│  └────────┬──────────────────────────┬─┘                    │
│           │                          │                       │
│  ┌────────▼─────────────┐  ┌────────▼──────────────┐        │
│  │   FarmLand (ERC-721) │  │  FarmItems (ERC-1155)│        │
│  │  Propriedades de     │  │  Cultivos, Ferramentas│       │
│  │  terra únicas        │  │  Itens (Mint-on-Demand)│        │
│  └────────┬─────────────┘  └────────┬──────────────┘        │
│           │                         │                        │
│  ┌────────▼─────────────────────────▼──────┐                │
│  │         FarmMarketplace                 │                │
│  │  Compra/venda de NFTs e recursos        │                │
│  └────────┬──────────────────────────────┬─┘                │
│           │                              │                   │
│  ┌────────▼──────────────┐  ┌───────────▼────────────┐      │
│  │   CraftingSystem      │  │   MissionSystem        │      │
│  │  Receitas de crafting │  │  Missões e recompensas │      │
│  └───────────────────────┘  └────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Contratos Detalhados

### 2.1 UtilityToken (ERC-20)

**Propósito**: Token utilitário do jogo, usado para transações internas off-chain. Este token é gerenciado principalmente pelo servidor do jogo e só interage com a blockchain para funcionalidades específicas de 
ponte com o mundo on-chain (ex: staking, conversão para FARM). A maior parte de seu uso é off-chain, no banco de dados do jogo.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager, para recompensas)
- `burn(uint256 amount)`: Queimar tokens (deflação, via GameEconomyManager)
- `transfer(address to, uint256 amount)`: Transferência padrão ERC-20 (para interações on-chain)
- `approve(address spender, uint256 amount)`: Aprovação para gasto

**Parâmetros**:
- Supply Inicial: Gerenciado off-chain, com um supply on-chain limitado para interações.
- Decimais: 18
- Burnable: Sim
- Pausable: Sim (para emergências)

**Eventos**:
```solidity
event TokensMinted(address indexed to, uint256 amount);
event TokensBurned(address indexed from, uint256 amount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.2 FarmToken (ERC-20)

**Propósito**: Token de governança do jogo, para votação, staking e compra de NFTs on-chain. Este é o token que os jogadores podem sacar para suas carteiras Web3.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager, para recompensas de staking/governança)
- `stake(uint256 amount)`: Fazer staking de FARM
- `unstake(uint256 amount)`: Retirar staking
- `claimRewards()`: Reclamar recompensas de staking

**Parâmetros**:
- Supply Inicial: 100.000 FARM
- Decimais: 18
- Staking APY: 10-20% (ajustável via governança)
- Vesting: Sim (liberação gradual para recompensas)

**Eventos**:
```solidity
event Staked(address indexed user, uint256 amount);
event Unstaked(address indexed user, uint256 amount);
event RewardsClaimed(address indexed user, uint256 amount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.3 FarmLand (ERC-721)

**Propósito**: Representar propriedades de terra únicas onde jogadores cultivam. São NFTs reais.

**Estrutura de Dados**:
```solidity
struct Land {
    uint256 tokenId;
    address owner;
    uint256 fertilityLevel;      // 1-100
    uint256 size;                // 10x10 = 100 slots
    uint256 plantedCrops;        // Número de cultivos plantados (apenas para referência on-chain)
    uint256 lastHarvestedAt;     // Timestamp (apenas para referência on-chain)
    string metadata;             // URI para metadata
}
```

**Funções Principais**:
- `mint(address to, uint256 fertilityLevel)`: Cunhar nova terra (apenas GameEconomyManager)
- `updateFertility(uint256 tokenId, int256 delta)`: Atualizar fertilidade (apenas GameEconomyManager)
- `plantCrop(uint256 tokenId, uint256 cropId, uint256 x, uint256 y)`: Plantar cultivo (interação off-chain, mas pode ter gatilho on-chain para eventos)
- `harvestCrop(uint256 tokenId, uint256 x, uint256 y)`: Colher cultivo (interação off-chain)
- `tokenURI(uint256 tokenId)`: Retornar metadata dinâmica

**Parâmetros**:
- Max Supply: 10.000 terras
- Tamanho: 10x10 grid (100 slots)
- Preço Inicial: 10 FARM
- Royalties: 5% em revenda

**Eventos**:
```solidity
event LandMinted(address indexed owner, uint256 indexed tokenId);
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

### 2.4 FarmItems (ERC-1155) - Mint-on-Demand

**Propósito**: Gerenciar cultivos, ferramentas, recursos e itens comuns. Estes itens são gerenciados off-chain no banco de dados e só se tornam NFTs ERC-1155 quando o jogador decide **Sacá-los (Withdraw)** para sua carteira Web3.

**Tipos de Itens**:
- IDs 1-1000: Cultivos (trigo, milho, etc)
- IDs 1001-2000: Ferramentas (enxada, machado, etc)
- IDs 2001-3000: Recursos (madeira, pedra, etc)
- IDs 3001+: Itens especiais (poções, sementes raras, etc)

**Estrutura de Dados**:
```solidity
struct Item {
    uint256 itemId;
    string name;
    uint256 rarity;              // 1: Comum, 2: Incomum, 3: Raro, 4: Épico, 5: Lendário
    uint256 growthTime;          // Para cultivos (em segundos)
    uint256 yield;               // Quantidade colhida
    uint256 maxSupply;           // 0 = ilimitado
    bool burnable;
}
```

**Funções Principais**:
- `mint(address to, uint256 id, uint256 amount)`: Cunhar itens (apenas GameEconomyManager, para saque)
- `burn(uint256 id, uint256 amount)`: Queimar itens (apenas GameEconomyManager, para reverter saque ou crafting on-chain)
- `batchMint(address to, uint256[] ids, uint256[] amounts)`: Cunhar múltiplos (apenas GameEconomyManager)
- `setItemMetadata(uint256 id, string memory metadata)`: Atualizar metadata

**Parâmetros**:
- Max Item Types: 5000
- Burnable: Sim (para crafting on-chain ou reversão de saque)
- Transferable: Sim

**Eventos**:
```solidity
event ItemMinted(address indexed to, uint256 indexed itemId, uint256 amount);
event ItemBurned(address indexed from, uint256 indexed itemId, uint256 amount);
event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
```

### 2.5 FarmMarketplace

**Propósito**: Permitir compra, venda e negociação de NFTs e itens. Este contrato gerencia apenas as transações on-chain de NFTs (FarmLand, FarmItems sacados, Wearables/Colecionáveis).

**Estrutura de Dados**:
```solidity
struct Listing {
    uint256 listingId;
    address seller;
    address nftContract;         // Endereço do contrato NFT (FarmLand ou FarmItems)
    uint256 tokenId;
    uint256 amount;              // Para ERC-1155
    uint256 price;               // Em FARM
    uint256 listedAt;
    bool active;
}

struct Offer {
    uint256 offerId;
    address buyer;
    address seller;
    uint256 listingId;
    uint256 offerPrice;
    uint256 createdAt;
    bool accepted;
}
```

**Funções Principais**:
- `listItem(address nftContract, uint256 tokenId, uint256 price)`: Listar item NFT
- `cancelListing(uint256 listingId)`: Cancelar listagem
- `buyItem(uint256 listingId)`: Comprar item NFT listado
- `makeOffer(uint256 listingId, uint256 offerPrice)`: Fazer oferta por NFT
- `acceptOffer(uint256 offerId)`: Aceitar oferta por NFT

**Parâmetros**:
- Taxa de Venda: 5% (em FARM, para tesouro)
- Tempo Mínimo de Listagem: 1 minuto
- Tempo Máximo de Oferta: 7 dias

**Eventos**:
```solidity
event ItemListed(uint256 indexed listingId, address indexed seller, uint256 price);
event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 price);
event OfferMade(uint256 indexed offerId, address indexed buyer, uint256 offerPrice);
event OfferAccepted(uint256 indexed offerId);
```

### 2.6 CraftingSystem

**Propósito**: Permitir jogadores combinar itens para criar novos. Este contrato gerencia apenas receitas de crafting que envolvem NFTs (FarmItems sacados, Wearables, etc.). O crafting de itens off-chain é gerenciado pelo servidor.

**Estrutura de Dados**:
```solidity
struct Recipe {
    uint256 recipeId;
    uint256[] inputItems;        // IDs dos itens de entrada (ERC-1155)
    uint256[] inputAmounts;      // Quantidades necessárias
    uint256 outputItem;          // ID do item de saída (ERC-1155)
    uint256 outputAmount;        // Quantidade produzida
    uint256 craftingTime;        // Tempo em segundos
    uint256 farmCost;            // Custo em FARM
    bool active;
}

struct CraftingJob {
    uint256 jobId;
    address crafter;
    uint256 recipeId;
    uint256 startedAt;
    uint256 completedAt;
}
```

**Funções Principais**:
- `addRecipe(uint256[] inputs, uint256[] amounts, uint256 output, uint256 time, uint256 cost)`: Adicionar receita (apenas GameEconomyManager)
- `startCrafting(uint256 recipeId)`: Iniciar crafting (consome NFTs de entrada)
- `completeCrafting(uint256 jobId)`: Completar crafting (minta NFT de saída)
- `cancelCrafting(uint256 jobId)`: Cancelar crafting (reembolsa 50% dos NFTs de entrada)

**Parâmetros**:
- Max Recipes: 1000
- Crafting Time Range: 5 minutos a 24 horas
- Cost Range: 0 a 1000 FARM

**Eventos**:
```solidity
event RecipeAdded(uint256 indexed recipeId);
event CraftingStarted(uint256 indexed jobId, address indexed crafter);
event CraftingCompleted(uint256 indexed jobId, uint256 outputAmount);
event Transfer(address indexed from, address indexed to, uint256 value);
```

### 2.7 MissionSystem

**Propósito**: Fornecer missões e objetivos para engajamento contínuo. Este contrato gerencia recompensas on-chain (FARM, NFTs).

**Estrutura de Dados**:
```solidity
struct Mission {
    uint256 missionId;
    string title;
    string description;
    uint256 targetValue;         // Ex: 100 unidades de trigo (verificado off-chain)
    uint256 rewardFarm;
    uint256 rewardNFT;           // 0 se nenhum NFT
    uint256 duration;            // Duração em segundos
    bool active;
}

struct MissionProgress {
    uint256 missionId;
    uint256 progress;
    uint256 startedAt;
    bool completed;
}
```

**Funções Principais**:
- `addMission(string memory title, uint256 target, uint256 rewardFarm, uint256 rewardNFT)`: Adicionar missão (apenas GameEconomyManager)
- `completeMission(uint256 missionId)`: Completar missão (gatilho off-chain, recompensa on-chain)
- `claimReward(uint256 missionId)`: Reclamar recompensa (minta FARM ou NFT)

**Parâmetros**:
- Missões Diárias: 5 por dia
- Missões Semanais: 3 por semana
- Recompensa Média: 10-100 FARM

**Eventos**:
```solidity
event MissionAdded(uint256 indexed missionId);
event MissionCompleted(uint256 indexed missionId, address indexed player);
event RewardClaimed(uint256 indexed missionId, address indexed player, uint256 rewardFarm, uint256 rewardNFT);
```

### 2.8 GameEconomyManager

**Propósito**: Contrato central que gerencia a lógica econômica e as interações entre os outros contratos. Atua como um "admin" para cunhagem, queima e distribuição de tokens/NFTs.

**Funções Principais**:
- `setUtilityToken(address _utilityToken)`: Definir endereço do UtilityToken
- `setFarmToken(address _farmToken)`: Definir endereço do FarmToken
- `setFarmLand(address _farmLand)`: Definir endereço do FarmLand
- `setFarmItems(address _farmItems)`: Definir endereço do FarmItems
- `mintUtilityToken(address to, uint256 amount)`: Cunhar UtilityToken
- `burnUtilityToken(uint256 amount)`: Queimar UtilityToken
- `mintFarmToken(address to, uint256 amount)`: Cunhar FarmToken
- `mintFarmLand(address to, uint256 fertilityLevel)`: Cunhar FarmLand NFT
- `mintFarmItems(address to, uint256 id, uint256 amount)`: Cunhar FarmItems NFT (para saque)
- `transferFarmItems(address from, address to, uint256 id, uint256 amount)`: Transferir FarmItems (para marketplace on-chain)
- `applyMarketplaceFee(uint256 amount)`: Aplicar taxa de marketplace (queima e tesouro)

**Parâmetros**:
- Owner: Endereço do deployer (ou DAO)
- Pausable: Sim

**Eventos**:
```solidity
event UtilityTokenSet(address indexed utilityToken);
event FarmTokenSet(address indexed farmToken);
event FarmLandSet(address indexed farmLand);
event FarmItemsSet(address indexed farmItems);
```

## 3. Considerações de Segurança

- **Controle de Acesso:** Funções sensíveis (`mint`, `burn`, `addRecipe`) são protegidas com `onlyOwner` ou `onlyGameEconomyManager`.
- **Reentrancy Guard:** Prevenção de ataques de reentrância em todas as funções que envolvem transferências de tokens.
- **Pausable:** Capacidade de pausar contratos em caso de vulnerabilidades críticas.
- **Testes:** Cobertura extensiva de testes unitários e de integração para todos os contratos.
- **Auditoria:** Recomenda-se auditoria externa de segurança antes do deploy em mainnet.

## 4. Roadmap de Deploy (Fase 16)

1. **Deploy de UtilityToken:** Contrato ERC-20 para o token de utilidade.
2. **Deploy de FarmToken:** Contrato ERC-20 para o token de governança.
3. **Deploy de FarmLand:** Contrato ERC-721 para as terras.
4. **Deploy de FarmItems:** Contrato ERC-1155 para os itens (mint-on-demand).
5. **Deploy de GameEconomyManager:** Contrato central que gerencia a economia.
6. **Deploy de FarmMarketplace:** Contrato para o marketplace on-chain.
7. **Deploy de CraftingSystem:** Contrato para crafting on-chain.
8. **Deploy de MissionSystem:** Contrato para missões on-chain.
9. **Configuração:** Definir os endereços dos contratos uns nos outros via GameEconomyManager.
10. **Verificação:** Publicar o código fonte no Basescan (ou explorador equivalente).

---

**Autor:** Manus AI
**Última Atualização:** 25 de Fevereiro de 2026
