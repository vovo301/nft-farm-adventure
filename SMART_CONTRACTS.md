# Smart Contracts Specification - NFT Farm Game

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
    address player;
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
