# Arquitetura Técnica - Harvest Realm (Modelo Híbrido Off-chain/On-chain)

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
trigo para sua carteira Web3.
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
