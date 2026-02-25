# Pesquisa de Referências - NFT Farm Game

## Objetivo
Documentar análises de projetos de sucesso, tokenomics, e arquitetura técnica para o desenvolvimento do NFT Farm Game.

## Projetos de Referência Analisados

### 1. Sunflower Land
- **Status**: Ativo, 1.6k stars no GitHub
- **Arquitetura**: React + TypeScript + Vite
- **Blockchain**: Polygon Network
- **Características Principais**:
  - State Machine (xstate) para gerenciamento de estado
  - Sistema de autenticação com MetaMask
  - Mecânicas de farming com timers
  - Economia de tokens e NFTs
  - Metadata ERC1155 gerada de Markdown
  - Tailwind CSS para styling

### 2. Axie Infinity
- **Modelo Econômico**: Dual-token (AXS governance, SLP utility)
- **Lições Aprendidas**:
  - Importância de balanceamento econômico
  - Necessidade de sinks de tokens para evitar inflação
  - Engagement através de missões e objetivos diários

### 3. Tokenomics Sustentáveis (2026)
- **Tendências**:
  - Gameplay-first approach (economia serve o jogo, não o contrário)
  - Dual-token systems para separar governança de utilidade
  - Dynamic adjustment mechanisms para manter equilíbrio
  - NFT utility profundamente integrada ao gameplay
  - Tournament gaming com crypto rails

## Arquitetura Técnica Planejada

### Stack Frontend
- React 19 + TypeScript
- Vite para bundling
- Tailwind CSS 4 para styling
- Web3.js/Ethers.js para integração blockchain
- Wouter para roteamento

### Stack Backend
- Express.js
- tRPC para type-safe APIs
- Drizzle ORM para persistência
- MySQL/TiDB para banco de dados

### Integração Blockchain
- MetaMask + WalletConnect
- Smart Contracts em Solidity
- Polygon Network (escalabilidade)
- ERC721 para NFTs únicos
- ERC20 para tokens

## Próximos Passos
1. Definir design visual e conceito do jogo
2. Especificar economia de tokens
3. Arquitetar smart contracts
4. Implementar autenticação Web3
5. Desenvolver mecânicas de farming


## Análise de Tokenomics Sustentáveis

### Problemas Comuns em Dual-Token Models (Histórico)
- **StepN**: Modelo altamente dependente de novos investimentos; token de jogo com aplicação única deprecia após hype
- **Axie Infinity**: Inflação de SLP causou depreciação; pets se tornaram sem valor
- **Raiz do Problema**: Ciclo de vida limitado dos jogos + tokens com aplicação única

### Modelo Econômico Recomendado (Space Alpaca)

#### Dois Tokens com Propósitos Distintos
1. **Token de Governança (SPAL)**
   - Obtido via pre-sales, airdrops, staking de guilds
   - Usos: Saques de NFT blind boxes, compra de NFTs, participação em guilds
   - Fornece especulação e participação comunitária

2. **Token Utilitário (Space Shard - SS)**
   - Usado para expansão de terra, upgrades, rebates de computação
   - Pode ser trocado por USDT em DEXs
   - Aplicação ampla em múltiplos jogos do ecossistema

#### Mecanismos de Estabilidade
- **Burning Mechanism**: 80% do valor de saques de blind boxes vai para LP pool do SS
- **Deflationary State**: Mantém token em estado deflacionário
- **Interoperabilidade**: SS pode ser usado em múltiplos jogos, criando valor duradouro

#### Solução para Ciclo de Vida Limitado
- **Ecossistema Multi-Jogo**: Lançamento contínuo de novos jogos
- **Portabilidade de Ativos**: Jogadores transferem ativos entre jogos
- **Valor Perpétuo**: Mesmo que um jogo termine, SS mantém valor no ecossistema

### Lições para NFT Farm Game

1. **Criar Token Utilitário com Aplicação Ampla**: Não limitar a um único jogo
2. **Implementar Burning Mechanisms**: Garantir estado deflacionário
3. **Planejamento de Ecossistema**: Considerar expansão futura
4. **Balanceamento Rigoroso**: Monitorar inflação e deflação constantemente
5. **Gameplay-First**: A economia deve servir o jogo, não o contrário

## Arquitetura de Smart Contracts

### Padrões ERC Recomendados

#### ERC-721 (NFTs Únicos)
- **Uso**: Terras, personagens especiais, itens raros únicos
- **Vantagem**: Cada token é único e indivisível
- **Exemplo**: Propriedade de terra com características únicas

#### ERC-1155 (Multi-Token)
- **Uso**: Cultivos, ferramentas, itens comuns (múltiplas cópias)
- **Vantagem**: Um contrato gerencia fungíveis e não-fungíveis
- **Exemplo**: 100 sementes de trigo, 50 machados de ouro

#### ERC-20 (Tokens Fungíveis)
- **Uso**: Tokens de governança e utilitários
- **Exemplo**: FARM (governança), HARVEST (utilidade)

### Estrutura de Contratos Proposta
1. **FarmLand.sol** (ERC-721): Propriedades de terra
2. **FarmItems.sol** (ERC-1155): Cultivos, ferramentas, itens
3. **FarmToken.sol** (ERC-20): Token utilitário
4. **GovernanceToken.sol** (ERC-20): Token de governança
5. **Marketplace.sol**: Compra/venda de NFTs e itens
6. **Crafting.sol**: Sistema de crafting com burning

## Próximas Etapas de Desenvolvimento

1. **Fase 2**: Definir design visual e conceito narrativo
2. **Fase 3**: Especificar economia de tokens em detalhe
3. **Fase 4**: Implementar autenticação Web3
4. **Fase 5**: Desenvolver mecânicas de farming
5. **Fase 6**: Criar marketplace e crafting
