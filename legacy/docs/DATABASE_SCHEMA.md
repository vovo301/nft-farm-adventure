# Database Schema - Harvest Realm

## 1. Visão Geral

O banco de dados utiliza **MySQL/TiDB** com **Drizzle ORM** para persistência de dados. A estrutura é otimizada para:

- Rastreamento de estado do jogo (cultivos, inventário, etc)
- Histórico de transações e marketplace
- Dados de jogadores e facções
- Missões e conquistas
- Análise e monitoramento

## 2. Tabelas Principais

### 2.1 Tabela: `users`

Estende a tabela padrão do template com campos específicos do jogo.

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  
  -- Campos do Jogo
  walletAddress VARCHAR(42) NOT NULL UNIQUE,  -- Endereço Ethereum
  factionId INT,                               -- FK para factions
  level INT DEFAULT 1,
  experience BIGINT DEFAULT 0,
  harvestBalance BIGINT DEFAULT 0,             -- Em wei (18 decimals)
  farmBalance BIGINT DEFAULT 0,                -- Em wei (18 decimals)
  lastLoginAt TIMESTAMP,
  totalPlayTime INT DEFAULT 0,                 -- Em minutos
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (factionId) REFERENCES factions(id),
  INDEX idx_walletAddress (walletAddress),
  INDEX idx_factionId (factionId),
  INDEX idx_level (level),
  INDEX idx_createdAt (createdAt)
);
```

### 2.2 Tabela: `factions`

Armazena dados das facções.

```sql
CREATE TABLE factions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,           -- "Cultivadores", "Comerciantes", etc
  description TEXT,
  bonusType INT,                               -- 1: Rendimento, 2: Taxa, 3: Crafting, 4: Raro
  bonusValue INT,                              -- Percentual do bônus (ex: 10 = +10%)
  totalContribution BIGINT DEFAULT 0,          -- Pontos totais acumulados
  memberCount INT DEFAULT 0,                   -- Número de membros
  weeklyReward BIGINT DEFAULT 1000000000000000000,  -- 1000 HARVEST em wei
  lastRewardDistribution TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_active (active),
  INDEX idx_totalContribution (totalContribution)
);
```

### 2.3 Tabela: `lands`

Armazena dados das terras (NFTs ERC-721).

```sql
CREATE TABLE lands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tokenId BIGINT NOT NULL UNIQUE,              -- ID do NFT
  userId INT NOT NULL,                         -- Proprietário
  fertilityLevel INT DEFAULT 50,               -- 1-100
  gridSize INT DEFAULT 100,                    -- 10x10 = 100 slots
  usedSlots INT DEFAULT 0,                     -- Slots ocupados
  lastHarvestedAt TIMESTAMP,
  totalHarvests INT DEFAULT 0,
  metadata JSON,                               -- Metadata dinâmica
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_token (userId, tokenId),
  INDEX idx_userId (userId),
  INDEX idx_fertilityLevel (fertilityLevel),
  INDEX idx_usedSlots (usedSlots)
);
```

### 2.4 Tabela: `crops`

Armazena dados de cultivos plantados.

```sql
CREATE TABLE crops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landId INT NOT NULL,                         -- Terra onde está plantado
  cropTypeId INT NOT NULL,                     -- Tipo de cultivo (FK)
  positionX INT,                               -- Posição no grid
  positionY INT,
  plantedAt TIMESTAMP,
  expectedHarvestAt TIMESTAMP,
  harvestedAt TIMESTAMP,
  status ENUM('growing', 'ready', 'harvested', 'failed') DEFAULT 'growing',
  yield INT,                                   -- Quantidade colhida
  luckFactor FLOAT DEFAULT 1.0,                -- Modificador de sorte (0.85-1.15)
  riskEvent VARCHAR(50),                       -- 'plague', 'drought', 'pest', null
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (landId) REFERENCES lands(id) ON DELETE CASCADE,
  FOREIGN KEY (cropTypeId) REFERENCES crop_types(id),
  INDEX idx_landId (landId),
  INDEX idx_status (status),
  INDEX idx_expectedHarvestAt (expectedHarvestAt),
  INDEX idx_plantedAt (plantedAt)
);
```

### 2.5 Tabela: `crop_types`

Armazena tipos de cultivos disponíveis.

```sql
CREATE TABLE crop_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,           -- "Trigo", "Milho", etc
  description TEXT,
  growthTimeSeconds INT,                       -- Tempo de crescimento
  baseYield INT,                               -- Rendimento base
  rarity INT,                                  -- 1: Comum, 2: Incomum, 3: Raro, 4: Épico, 5: Lendário
  marketPrice BIGINT,                          -- Preço base em wei
  active BOOLEAN DEFAULT TRUE,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_rarity (rarity),
  INDEX idx_active (active)
);
```

### 2.6 Tabela: `inventory`

Armazena itens do inventário do jogador.

```sql
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  itemTypeId INT NOT NULL,                     -- FK para item_types
  quantity INT DEFAULT 1,
  slotIndex INT,                               -- Posição no inventário
  durability INT,                              -- Para ferramentas (0-100)
  metadata JSON,                               -- Dados customizados do item
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itemTypeId) REFERENCES item_types(id),
  UNIQUE KEY unique_user_item (userId, itemTypeId, slotIndex),
  INDEX idx_userId (userId),
  INDEX idx_itemTypeId (itemTypeId),
  INDEX idx_quantity (quantity)
);
```

### 2.7 Tabela: `item_types`

Armazena tipos de itens disponíveis.

```sql
CREATE TABLE item_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  itemCategory ENUM('crop', 'tool', 'resource', 'special') NOT NULL,
  rarity INT,                                  -- 1-5
  maxDurability INT,                           -- NULL se não tem durabilidade
  marketPrice BIGINT,                          -- Preço base em wei
  active BOOLEAN DEFAULT TRUE,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_itemCategory (itemCategory),
  INDEX idx_rarity (rarity),
  INDEX idx_active (active)
);
```

### 2.8 Tabela: `marketplace_listings`

Armazena listagens do marketplace.

```sql
CREATE TABLE marketplace_listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sellerId INT NOT NULL,
  itemTypeId INT NOT NULL,
  quantity INT,
  pricePerUnit BIGINT,                         -- Em wei (HARVEST)
  totalPrice BIGINT,                           -- quantity * pricePerUnit
  status ENUM('active', 'sold', 'cancelled') DEFAULT 'active',
  expiresAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itemTypeId) REFERENCES item_types(id),
  INDEX idx_sellerId (sellerId),
  INDEX idx_status (status),
  INDEX idx_itemTypeId (itemTypeId),
  INDEX idx_expiresAt (expiresAt),
  INDEX idx_createdAt (createdAt)
);
```

### 2.9 Tabela: `marketplace_transactions`

Armazena histórico de transações do marketplace.

```sql
CREATE TABLE marketplace_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyerId INT NOT NULL,
  sellerId INT NOT NULL,
  itemTypeId INT NOT NULL,
  quantity INT,
  pricePerUnit BIGINT,
  totalPrice BIGINT,
  taxAmount BIGINT,                            -- 5% de taxa
  burnAmount BIGINT,                           -- 3% queimado
  treasuryAmount BIGINT,                       -- 2% para tesouro
  transactionHash VARCHAR(66),                 -- Hash da transação blockchain
  status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itemTypeId) REFERENCES item_types(id),
  INDEX idx_buyerId (buyerId),
  INDEX idx_sellerId (sellerId),
  INDEX idx_status (status),
  INDEX idx_transactionHash (transactionHash),
  INDEX idx_createdAt (createdAt)
);
```

### 2.10 Tabela: `crafting_recipes`

Armazena receitas de crafting.

```sql
CREATE TABLE crafting_recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  craftingTimeSeconds INT,
  costHarvest BIGINT,                          -- Custo em HARVEST
  outputItemTypeId INT NOT NULL,
  outputQuantity INT DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  discoveryRequired BOOLEAN DEFAULT FALSE,    -- Precisa ser descoberto
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (outputItemTypeId) REFERENCES item_types(id),
  INDEX idx_name (name),
  INDEX idx_active (active),
  INDEX idx_discoveryRequired (discoveryRequired)
);
```

### 2.11 Tabela: `crafting_recipe_inputs`

Armazena ingredientes de receitas (relação muitos-para-muitos).

```sql
CREATE TABLE crafting_recipe_inputs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipeId INT NOT NULL,
  itemTypeId INT NOT NULL,
  quantity INT NOT NULL,
  
  FOREIGN KEY (recipeId) REFERENCES crafting_recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (itemTypeId) REFERENCES item_types(id),
  UNIQUE KEY unique_recipe_item (recipeId, itemTypeId),
  INDEX idx_recipeId (recipeId),
  INDEX idx_itemTypeId (itemTypeId)
);
```

### 2.12 Tabela: `crafting_jobs`

Armazena crafting jobs em progresso.

```sql
CREATE TABLE crafting_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  recipeId INT NOT NULL,
  status ENUM('in_progress', 'completed', 'cancelled') DEFAULT 'in_progress',
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipeId) REFERENCES crafting_recipes(id),
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_completedAt (completedAt)
);
```

### 2.13 Tabela: `missions`

Armazena missões disponíveis.

```sql
CREATE TABLE missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  missionType ENUM('daily', 'weekly', 'special') DEFAULT 'daily',
  targetType VARCHAR(50),                      -- 'harvest', 'sell', 'craft', etc
  targetValue INT,
  rewardHarvest BIGINT,
  rewardFarm BIGINT,
  rewardNFTId INT,                             -- NULL se sem NFT
  durationSeconds INT,
  active BOOLEAN DEFAULT TRUE,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_missionType (missionType),
  INDEX idx_active (active)
);
```

### 2.14 Tabela: `mission_progress`

Armazena progresso do jogador em missões.

```sql
CREATE TABLE mission_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  missionId INT NOT NULL,
  progress INT DEFAULT 0,
  status ENUM('in_progress', 'completed', 'claimed') DEFAULT 'in_progress',
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  claimedAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (missionId) REFERENCES missions(id),
  UNIQUE KEY unique_user_mission (userId, missionId),
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_completedAt (completedAt)
);
```

### 2.15 Tabela: `achievements`

Armazena conquistas do jogador.

```sql
CREATE TABLE achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  achievementType VARCHAR(50),                 -- 'collector', 'farmer', 'trader', etc
  achievementName VARCHAR(100),
  unlockedAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_achievement (userId, achievementType),
  INDEX idx_userId (userId),
  INDEX idx_achievementType (achievementType)
);
```

### 2.16 Tabela: `faction_contributions`

Armazena contribuições de jogadores para facções.

```sql
CREATE TABLE faction_contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  factionId INT NOT NULL,
  contributionPoints INT DEFAULT 0,
  contributionType VARCHAR(50),                -- 'harvest', 'sell', 'craft', 'discover'
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (factionId) REFERENCES factions(id),
  INDEX idx_userId (userId),
  INDEX idx_factionId (factionId),
  INDEX idx_contributionPoints (contributionPoints),
  INDEX idx_createdAt (createdAt)
);
```

### 2.17 Tabela: `faction_rankings`

Armazena histórico de rankings de facções.

```sql
CREATE TABLE faction_rankings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  factionId INT NOT NULL,
  ranking INT,                                 -- 1, 2, 3, 4
  totalContribution BIGINT,
  memberCount INT,
  weekNumber INT,
  year INT,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (factionId) REFERENCES factions(id),
  UNIQUE KEY unique_faction_week (factionId, weekNumber, year),
  INDEX idx_factionId (factionId),
  INDEX idx_ranking (ranking),
  INDEX idx_weekNumber (weekNumber)
);
```

### 2.18 Tabela: `game_events`

Armazena eventos do jogo para análise.

```sql
CREATE TABLE game_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  eventType VARCHAR(50),                       -- 'harvest', 'sell', 'craft', 'mission', etc
  eventData JSON,                              -- Dados customizados do evento
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_userId (userId),
  INDEX idx_eventType (eventType),
  INDEX idx_createdAt (createdAt)
);
```

## 3. Índices e Otimizações

### 3.1 Índices Principais

```sql
-- Queries frequentes
CREATE INDEX idx_user_faction ON users(factionId);
CREATE INDEX idx_land_user ON lands(userId);
CREATE INDEX idx_crop_land_status ON crops(landId, status);
CREATE INDEX idx_inventory_user_item ON inventory(userId, itemTypeId);
CREATE INDEX idx_mission_user_status ON mission_progress(userId, status);
```

### 3.2 Particionamento (Futuro)

Para grandes volumes de dados, particionar por data:

```sql
-- Particionar game_events por mês
ALTER TABLE game_events PARTITION BY RANGE (YEAR(createdAt) * 100 + MONTH(createdAt)) (
  PARTITION p202601 VALUES LESS THAN (202602),
  PARTITION p202602 VALUES LESS THAN (202603),
  -- ... mais partições
);
```

## 4. Relacionamentos

```
users (1) ─── (M) lands
users (1) ─── (M) inventory
users (1) ─── (M) crops
users (1) ─── (M) marketplace_listings
users (1) ─── (M) marketplace_transactions
users (1) ─── (M) crafting_jobs
users (1) ─── (M) mission_progress
users (1) ─── (M) achievements
users (1) ─── (M) faction_contributions

factions (1) ─── (M) users
factions (1) ─── (M) faction_contributions
factions (1) ─── (M) faction_rankings

lands (1) ─── (M) crops

crop_types (1) ─── (M) crops
crop_types (1) ─── (M) inventory

item_types (1) ─── (M) inventory
item_types (1) ─── (M) marketplace_listings
item_types (1) ─── (M) marketplace_transactions
item_types (1) ─── (M) crafting_recipe_inputs
item_types (1) ─── (M) crafting_recipes (output)

crafting_recipes (1) ─── (M) crafting_recipe_inputs
crafting_recipes (1) ─── (M) crafting_jobs

missions (1) ─── (M) mission_progress
```

## 5. Queries Comuns

### 5.1 Obter Inventário do Jogador

```sql
SELECT 
  it.name,
  it.itemCategory,
  it.rarity,
  inv.quantity,
  inv.durability,
  it.marketPrice
FROM inventory inv
JOIN item_types it ON inv.itemTypeId = it.id
WHERE inv.userId = ?
ORDER BY inv.slotIndex;
```

### 5.2 Obter Cultivos em Crescimento

```sql
SELECT 
  c.id,
  ct.name,
  c.plantedAt,
  c.expectedHarvestAt,
  c.status,
  c.luckFactor,
  c.riskEvent
FROM crops c
JOIN crop_types ct ON c.cropTypeId = ct.id
WHERE c.landId = ? AND c.status = 'growing'
ORDER BY c.expectedHarvestAt;
```

### 5.3 Obter Ranking de Facções

```sql
SELECT 
  f.id,
  f.name,
  COUNT(DISTINCT u.id) as memberCount,
  SUM(fc.contributionPoints) as totalContribution
FROM factions f
LEFT JOIN users u ON f.id = u.factionId
LEFT JOIN faction_contributions fc ON f.id = fc.factionId
WHERE f.active = TRUE
GROUP BY f.id
ORDER BY totalContribution DESC
LIMIT 4;
```

### 5.4 Obter Histórico de Transações

```sql
SELECT 
  mt.id,
  u1.name as buyerName,
  u2.name as sellerName,
  it.name as itemName,
  mt.quantity,
  mt.pricePerUnit,
  mt.totalPrice,
  mt.status,
  mt.createdAt
FROM marketplace_transactions mt
JOIN users u1 ON mt.buyerId = u1.id
JOIN users u2 ON mt.sellerId = u2.id
JOIN item_types it ON mt.itemTypeId = it.id
WHERE mt.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY mt.createdAt DESC
LIMIT 100;
```

## 6. Próximas Etapas

1. Implementar schema em Drizzle ORM
2. Criar migrations
3. Adicionar seeds de dados iniciais
4. Testar queries de performance
5. Implementar caching (Redis)
