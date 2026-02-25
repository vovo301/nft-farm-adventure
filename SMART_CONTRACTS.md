# Smart Contracts Specification - NFT Farm Game

## 1. Visão Geral da Arquitetura

A arquitetura de smart contracts segue um padrão modular onde cada contrato tem responsabilidade específica. Todos os contratos são desenvolvidos em Solidity 0.8.20+ e deployados na rede Polygon para escalabilidade.

```
┌─────────────────────────────────────────────────────────────┐
│                    NFT Farm Game Contracts                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   HarvestToken   │  │    FarmToken     │                 │
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
│  │  terra únicas        │  │  Itens comuns         │        │
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

### 2.1 HarvestToken (ERC-20)

**Propósito**: Token utilitário do jogo, usado para transações internas.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager)
- `burn(uint256 amount)`: Queimar tokens (deflação)
- `transfer(address to, uint256 amount)`: Transferência padrão ERC-20
- `approve(address spender, uint256 amount)`: Aprovação para gasto

**Parâmetros**:
- Supply Inicial: 1.000.000 HARVEST
- Decimais: 18
- Burnable: Sim
- Pausable: Sim (para emergências)

**Eventos**:
```solidity
event TokensMinted(address indexed to, uint256 amount);
event TokensBurned(address indexed from, uint256 amount);
event TaxApplied(address indexed from, address indexed to, uint256 amount, uint256 tax);
```

### 2.2 FarmToken (ERC-20)

**Propósito**: Token de governança, para votação e staking.

**Funções Principais**:
- `mint(address to, uint256 amount)`: Cunhar novos tokens (apenas GameEconomyManager)
- `stake(uint256 amount)`: Fazer staking de FARM
- `unstake(uint256 amount)`: Retirar staking
- `claimRewards()`: Reclamar recompensas de staking

**Parâmetros**:
- Supply Inicial: 100.000 FARM
- Decimais: 18
- Staking APY: 10-20% (ajustável)
- Vesting: Sim (liberação gradual)

**Eventos**:
```solidity
event Staked(address indexed user, uint256 amount);
event Unstaked(address indexed user, uint256 amount);
event RewardsClaimed(address indexed user, uint256 amount);
```

### 2.3 FarmLand (ERC-721)

**Propósito**: Representar propriedades de terra únicas onde jogadores cultivam.

**Estrutura de Dados**:
```solidity
struct Land {
    uint256 tokenId;
    address owner;
    uint256 fertilityLevel;      // 1-100
    uint256 size;                // 10x10 = 100 slots
    uint256 plantedCrops;        // Número de cultivos plantados
    uint256 lastHarvestedAt;     // Timestamp
    string metadata;             // URI para metadata
}
```

**Funções Principais**:
- `mint(address to, uint256 fertilityLevel)`: Cunhar nova terra
- `updateFertility(uint256 tokenId, int256 delta)`: Atualizar fertilidade
- `plantCrop(uint256 tokenId, uint256 cropId, uint256 x, uint256 y)`: Plantar cultivo
- `harvestCrop(uint256 tokenId, uint256 x, uint256 y)`: Colher cultivo
- `tokenURI(uint256 tokenId)`: Retornar metadata dinâmica

**Parâmetros**:
- Max Supply: 10.000 terras
- Tamanho: 10x10 grid (100 slots)
- Preço Inicial: 10 FARM
- Royalties: 5% em revenda

**Eventos**:
```solidity
event LandMinted(address indexed owner, uint256 indexed tokenId);
event CropPlanted(address indexed owner, uint256 indexed landId, uint256 cropId);
event CropHarvested(address indexed owner, uint256 indexed landId, uint256 cropId, uint256 yield);
```

### 2.4 FarmItems (ERC-1155)

**Propósito**: Gerenciar cultivos, ferramentas e itens comuns com múltiplas cópias.

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
- `mint(address to, uint256 id, uint256 amount)`: Cunhar itens
- `burn(uint256 id, uint256 amount)`: Queimar itens
- `batchMint(address to, uint256[] ids, uint256[] amounts)`: Cunhar múltiplos
- `setItemMetadata(uint256 id, string memory metadata)`: Atualizar metadata

**Parâmetros**:
- Max Item Types: 5000
- Burnable: Sim (para crafting)
- Transferable: Sim

**Eventos**:
```solidity
event ItemMinted(address indexed to, uint256 indexed itemId, uint256 amount);
event ItemBurned(address indexed from, uint256 indexed itemId, uint256 amount);
event ItemCrafted(address indexed crafter, uint256[] inputs, uint256 output);
```

### 2.5 FarmMarketplace

**Propósito**: Permitir compra, venda e negociação de NFTs e itens.

**Estrutura de Dados**:
```solidity
struct Listing {
    uint256 listingId;
    address seller;
    address nftContract;         // FarmLand ou FarmItems
    uint256 tokenId;
    uint256 amount;              // Para ERC-1155
    uint256 price;               // Em HARVEST
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
- `listItem(address nftContract, uint256 tokenId, uint256 price)`: Listar item
- `cancelListing(uint256 listingId)`: Cancelar listagem
- `buyItem(uint256 listingId)`: Comprar item listado
- `makeOffer(uint256 listingId, uint256 offerPrice)`: Fazer oferta
- `acceptOffer(uint256 offerId)`: Aceitar oferta

**Parâmetros**:
- Taxa de Venda: 5%
- Distribuição de Taxa: 3% queimado, 2% para tesouro
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

**Propósito**: Permitir jogadores combinar itens para criar novos.

**Estrutura de Dados**:
```solidity
struct Recipe {
    uint256 recipeId;
    uint256[] inputItems;        // IDs dos itens de entrada
    uint256[] inputAmounts;      // Quantidades necessárias
    uint256 outputItem;          // ID do item de saída
    uint256 outputAmount;        // Quantidade produzida
    uint256 craftingTime;        // Tempo em segundos
    uint256 harvestCost;         // Custo em HARVEST
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
- `addRecipe(uint256[] inputs, uint256[] amounts, uint256 output, uint256 time, uint256 cost)`: Adicionar receita
- `startCrafting(uint256 recipeId)`: Iniciar crafting
- `completeCrafting(uint256 jobId)`: Completar crafting
- `cancelCrafting(uint256 jobId)`: Cancelar crafting (reembolsa 50%)

**Parâmetros**:
- Max Recipes: 1000
- Crafting Time Range: 5 minutos a 24 horas
- Cost Range: 0 a 1000 HARVEST

**Eventos**:
```solidity
event RecipeAdded(uint256 indexed recipeId);
event CraftingStarted(uint256 indexed jobId, address indexed crafter);
event CraftingCompleted(uint256 indexed jobId, uint256 outputAmount);
```

### 2.7 MissionSystem

**Propósito**: Fornecer missões e objetivos para engajamento contínuo.

**Estrutura de Dados**:
```solidity
struct Mission {
    uint256 missionId;
    string title;
    string description;
    uint256 targetValue;         // Ex: 100 unidades de trigo
    uint256 rewardHarvest;
    uint256 rewardFarm;
    uint256 rewardNFT;           // 0 se nenhum NFT
    uint256 duration;            // Duração em segundos
    bool active;
}

struct MissionProgress {
    uint256 missionId;
    address player;
    uint256 progress;
    uint256 startedAt;
    bool completed;
}
```

**Funções Principais**:
- `addMission(string memory title, uint256 target, uint256 reward)`: Adicionar missão
- `updateProgress(address player, uint256 missionId, uint256 delta)`: Atualizar progresso
- `completeMission(uint256 missionId)`: Completar missão
- `claimReward(uint256 missionId)`: Reclamar recompensa

**Parâmetros**:
- Missões Diárias: 5 por dia
- Missões Semanais: 3 por semana
- Recompensa Média: 10-100 HARVEST

**Eventos**:
```solidity
event MissionStarted(address indexed player, uint256 indexed missionId);
event MissionCompleted(address indexed player, uint256 indexed missionId);
event RewardClaimed(address indexed player, uint256 harvestAmount, uint256 farmAmount);
```

### 2.8 FactionSystem

**Propósito**: Gerenciar facções, ranking e eventos de competição entre facções.

**Estrutura de Dados**:
```solidity
struct Faction {
    uint256 factionId;
    string name;                // "Cultivadores", "Comerciantes", etc
    string description;
    uint256 bonus;               // Tipo de bônus (1-4)
    uint256 totalContribution;   // Contribuição total de membros
    uint256 memberCount;         // Número de membros
    bool active;
}

struct FactionMember {
    address player;
    uint256 factionId;
    uint256 contribution;        // Pontos de contribuição
    uint256 joinedAt;
}
```

**Funções Principais**:
- `joinFaction(uint256 factionId)`: Entrar em uma facção
- `leaveFaction()`: Sair de uma facção
- `addContribution(address player, uint256 amount)`: Adicionar contribuição
- `getFactionRanking()`: Obter ranking de facções
- `distributeFactionRewards()`: Distribuir recompensas para facção vencedora

**Parâmetros**:
- Facções Iniciais: 4
- Bônus por Facção: +10% a +20% em atributo específico
- Evento de Ranking: Semanal
- Recompensa Semanal: 1000 HARVEST para facção vencedora

**Eventos**:
```solidity
event FactionJoined(address indexed player, uint256 indexed factionId);
event FactionLeft(address indexed player, uint256 indexed factionId);
event ContributionAdded(address indexed player, uint256 amount);
event FactionRankingUpdated(uint256[] rankings);
event FactionRewardsDistributed(uint256 indexed factionId, uint256 amount);
```

### 2.9 GameEconomyManager

**Propósito**: Gerenciar economia geral, taxas, burning e distribuição de recompensas.

**Funções Principais**:
- `setTaxRate(uint256 newRate)`: Ajustar taxa (apenas admin)
- `setBurningRate(uint256 newRate)`: Ajustar taxa de burning
- `distributeDailyRewards()`: Distribuir recompensas diárias
- `adjustInflation()`: Ajustar inflação baseado em métricas
- `emergencyPause()`: Pausar sistema em emergência

**Parâmetros**:
- Taxa de Transação: 5%
- Taxa de Burning: 3% (do total de transações)
- Taxa de Tesouro: 2%
- Recompensa Diária Total: 1000 HARVEST

**Eventos**:
```solidity
event TaxRateUpdated(uint256 newRate);
event DailyRewardsDistributed(uint256 totalAmount);
event InflationAdjusted(uint256 newInflationRate);
```

### 2.10 Integração com Facções
O GameEconomyManager trabalha com FactionSystem para:
- Rastrear contribuição de cada jogador na facção
- Distribuir bônus econômicos baseado na facção
- Calcular ranking semanal
- Distribuir recompensas coletivas

## 3. Fluxos de Interação

### 3.1 Fluxo de Plantio
```
1. Jogador chama FarmLand.plantCrop(landId, cropId, x, y)
2. Contrato valida:
   - Jogador é proprietário da terra
   - Posição (x, y) está vazia
   - Jogador tem sementes
3. Queima sementes do jogador (FarmItems.burn)
4. Registra cultivo com timestamp
5. Emite evento CropPlanted
6. Metadata dinâmica muda conforme tempo passa
```

### 3.2 Fluxo de Colheita
```
1. Jogador chama FarmLand.harvestCrop(landId, x, y)
2. Contrato valida:
   - Cultivo completou tempo de crescimento
   - Jogador é proprietário da terra
3. Calcula rendimento baseado em:
   - Tipo de cultivo
   - Nível de fertilidade
   - Bônus de ferramentas/personagens
4. Minta FarmItems para jogador
5. Atualiza fertilidade da terra
6. Emite evento CropHarvested
```

### 3.3 Fluxo de Marketplace
```
1. Vendedor chama FarmMarketplace.listItem(nftContract, tokenId, price)
2. Contrato transfere NFT para escrow
3. Comprador chama FarmMarketplace.buyItem(listingId)
4. Contrato:
   - Transfere HARVEST do comprador
   - Aplica taxa (5%)
   - Queima 3% (burning)
   - Envia 2% para tesouro
   - Envia 95% para vendedor
   - Transfere NFT para comprador
5. Emite eventos ItemSold
```

### 3.4 Fluxo de Crafting
```
1. Jogador chama CraftingSystem.startCrafting(recipeId)
2. Contrato valida:
   - Jogador tem todos os itens necessários
   - Jogador tem HARVEST suficiente
3. Queima itens de entrada (FarmItems.burn)
4. Transfere HARVEST (CraftingSystem.burn)
5. Cria CraftingJob com timestamp
6. Emite evento CraftingStarted
7. Após completar tempo:
   - Jogador chama CraftingSystem.completeCrafting(jobId)
   - Minta item de saída
   - Adiciona contribuição para facção (se Alquimista)
   - Emite evento CraftingCompleted
```

### 3.5 Fluxo de Facções
```
1. Novo jogador chama FactionSystem.joinFaction(factionId)
2. Contrato registra membro
3. Jogador recebe bônus da facção
4. Cada ação do jogador adiciona contribuição:
   - Colheita: +1 ponto (Cultivadores)
   - Venda: +1 ponto (Comerciantes)
   - Crafting: +1 ponto (Alquimistas)
   - Descoberta: +1 ponto (Exploradores)
5. Semanalmente:
   - GameEconomyManager calcula ranking
   - FactionSystem distribui recompensas
   - Emite evento FactionRankingUpdated
6. Jogador pode sair e entrar em outra facção
```

## 4. Segurança e Auditoria

### 4.1 Considerações de Segurança
- Todos os contratos usam OpenZeppelin (ReentrancyGuard, AccessControl)
- Funções críticas requerem múltiplas assinaturas (2-of-3 multisig)
- Pausable em todos os contratos para emergências
- Rate limiting em funções sensíveis
- Whitelist de endereços para operações iniciais

### 4.2 Testes
- Testes unitários para cada função
- Testes de integração para fluxos completos
- Testes de segurança (reentrancy, overflow, etc)
- Testes de gas optimization
- Simulação de cenários econômicos

### 4.3 Auditoria
- Auditoria externa antes de mainnet
- Monitoramento contínuo em produção
- Relatório de vulnerabilidades
- Bounty program para descoberta de bugs

## 5. Deployment

### 5.1 Redes Suportadas
- **Base Mainnet** (produção - Fase 1)
- **Base Sepolia** (testnet)
- **Polygon Mainnet** (produção - Fase 4)
- **Polygon Mumbai** (testnet)

### 5.2 Ordem de Deployment (Base Mainnet)
1. Deploy HarvestToken (HARVEST ERC-20)
2. Deploy FarmToken (FARM ERC-20)
3. Deploy FactionSystem (facções - criar antes de GameEconomyManager)
4. Deploy GameEconomyManager (gerencia economia + facções)
5. Deploy FarmLand (terras ERC-721)
6. Deploy FarmItems (itens ERC-1155)
7. Deploy FarmMarketplace (marketplace)
8. Deploy CraftingSystem (crafting)
9. Deploy MissionSystem (missões)
10. Configurar permissões e inicializar

**Nota**: Deploy em Base Sepolia antes de mainnet para testes completos

### 5.3 Inicialização
- Cunhar supply inicial de tokens (1M HARVEST, 100k FARM)
- Criar 4 facções com bônus e descrições
- Adicionar receitas de crafting (50+ receitas iniciais)
- Adicionar missões iniciais (5 missões diárias, 3 semanais)
- Configurar taxas e parâmetros (5% marketplace, 3% burning, 2% tesouro)
- Configurar recompensas de facção (1000 HARVEST/semana para vencedora)
- Ativar sistema e abrir para beta testers

## 6. Monitoramento e Manutenção

### 6.1 Métricas Importantes
- Total de HARVEST em circulação
- Taxa de burning vs minting
- Preço médio de itens no marketplace
- Número de missões completadas
- Engajamento diário de jogadores
- Distribuição de jogadores por facção
- Ranking de facções (contribuição total)

### 6.2 Ajustes Dinâmicos
- Se HARVEST inflaciona: aumentar burning
- Se HARVEST deflaciona: aumentar minting
- Se marketplace está inativo: reduzir taxas
- Se muitos abandos: aumentar recompensas
- Se facção desbalanceada: ajustar bônus
- Se engajamento cai: aumentar recompensas de facção

### 6.3 Upgrades
- Usar proxy pattern (UUPS) para upgradabilidade
- Testar upgrades em Base Sepolia antes
- Comunicar mudanças à comunidade
- Permitir opt-out se possível
- Versionar contratos para rastreabilidade
