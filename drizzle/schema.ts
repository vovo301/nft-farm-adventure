import {
  int,
  bigint,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  mysqlTable,
  json,
  float,
  boolean,
  decimal,
  index,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * HARVEST REALM - Database Schema
 * Banco de dados para jogo NFT de farming com economia Web3
 */

// ============================================================================
// TABELAS CORE
// ============================================================================

/**
 * Tabela de Usuários (estendida com campos de jogo)
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    walletAddress: varchar("walletAddress", { length: 42 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

    // Game fields
    factionId: int("factionId"),
    level: int("level").default(1).notNull(),
    experience: bigint("experience", { mode: 'bigint' }),
    harvestBalance: bigint("harvestBalance", { mode: 'bigint' }), // Wei
    farmBalance: bigint("farmBalance", { mode: 'bigint' }), // Wei
    totalPlayTime: int("totalPlayTime").default(0).notNull(), // Minutos
    lastLoginAt: timestamp("lastLoginAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    factionIdx: index("idx_factionId").on(table.factionId),
    walletIdx: index("idx_walletAddress").on(table.walletAddress),
    levelIdx: index("idx_level").on(table.level),
    createdIdx: index("idx_createdAt").on(table.createdAt),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// FACÇÕES
// ============================================================================

/**
 * Tabela de Facções
 */
export const factions = mysqlTable(
  "factions",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    bonusType: int("bonusType").notNull(), // 1: Rendimento, 2: Taxa, 3: Crafting, 4: Raro
    bonusValue: int("bonusValue").notNull(), // Percentual (ex: 10 = +10%)
    totalContribution: bigint("totalContribution", { mode: 'bigint' }).notNull(),
    memberCount: int("memberCount").default(0).notNull(),
    weeklyReward: bigint("weeklyReward", { mode: 'bigint' }).notNull(), // 1000 HARVEST em wei
    lastRewardDistribution: timestamp("lastRewardDistribution"),
    active: boolean("active").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    activeIdx: index("idx_active").on(table.active),
    contributionIdx: index("idx_totalContribution").on(table.totalContribution),
  })
);

export type Faction = typeof factions.$inferSelect;
export type InsertFaction = typeof factions.$inferInsert;

// ============================================================================
// TERRAS (NFTs)
// ============================================================================

/**
 * Tabela de Terras (ERC-721 NFTs)
 */
export const lands = mysqlTable(
  "lands",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenId: bigint("tokenId", { mode: 'bigint' }).notNull().unique(),
    userId: int("userId").notNull(),
    fertilityLevel: int("fertilityLevel").default(50).notNull(), // 1-100
    gridSize: int("gridSize").default(100).notNull(), // 10x10 = 100 slots
    usedSlots: int("usedSlots").default(0).notNull(),
    lastHarvestedAt: timestamp("lastHarvestedAt"),
    totalHarvests: int("totalHarvests").default(0).notNull(),
    metadata: json("metadata"), // JSON dinâmico

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    fertilityIdx: index("idx_fertilityLevel").on(table.fertilityLevel),
    slotsIdx: index("idx_usedSlots").on(table.usedSlots),
    userTokenUnique: unique("unique_user_token").on(table.userId, table.tokenId),
  })
);

export type Land = typeof lands.$inferSelect;
export type InsertLand = typeof lands.$inferInsert;

// ============================================================================
// TIPOS DE CULTIVOS
// ============================================================================

/**
 * Tabela de Tipos de Cultivos
 */
export const cropTypes = mysqlTable(
  "crop_types",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    growthTimeSeconds: int("growthTimeSeconds").notNull(), // Tempo de crescimento
    baseYield: int("baseYield").notNull(), // Rendimento base
    rarity: int("rarity").notNull(), // 1: Comum, 2: Incomum, 3: Raro, 4: Épico, 5: Lendário
    marketPrice: bigint("marketPrice", { mode: 'bigint' }).notNull(), // Preço base em wei
    active: boolean("active").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_name").on(table.name),
    rarityIdx: index("idx_rarity").on(table.rarity),
    activeIdx: index("idx_active").on(table.active),
  })
);

export type CropType = typeof cropTypes.$inferSelect;
export type InsertCropType = typeof cropTypes.$inferInsert;

// ============================================================================
// CULTIVOS PLANTADOS
// ============================================================================

/**
 * Tabela de Cultivos Plantados
 */
export const crops = mysqlTable(
  "crops",
  {
    id: int("id").autoincrement().primaryKey(),
    landId: int("landId").notNull(),
    cropTypeId: int("cropTypeId").notNull(),
    positionX: int("positionX"),
    positionY: int("positionY"),
    plantedAt: timestamp("plantedAt").notNull(),
    expectedHarvestAt: timestamp("expectedHarvestAt").notNull(),
    harvestedAt: timestamp("harvestedAt"),
    status: mysqlEnum("status", ["growing", "ready", "harvested", "failed"]).default("growing").notNull(),
    yield: int("yield"), // Quantidade colhida
    luckFactor: float("luckFactor").default(1.0).notNull(), // Modificador de sorte (0.85-1.15)
    riskEvent: varchar("riskEvent", { length: 50}), // 'plague', 'drought', 'pest', null

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    landIdx: index("idx_landId").on(table.landId),
    statusIdx: index("idx_status").on(table.status),
    harvestIdx: index("idx_expectedHarvestAt").on(table.expectedHarvestAt),
    plantedIdx: index("idx_plantedAt").on(table.plantedAt),
  })
);

export type Crop = typeof crops.$inferSelect;
export type InsertCrop = typeof crops.$inferInsert;

// ============================================================================
// TIPOS DE ITENS
// ============================================================================

/**
 * Tabela de Tipos de Itens
 */
export const itemTypes = mysqlTable(
  "item_types",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    itemCategory: mysqlEnum("itemCategory", ["crop", "tool", "resource", "special"]).notNull(),
    rarity: int("rarity"), // 1-5
    maxDurability: int("maxDurability"), // NULL se não tem durabilidade
    marketPrice: bigint("marketPrice", { mode: 'bigint' }), // Preço base em wei
    active: boolean("active").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_name").on(table.name),
    categoryIdx: index("idx_itemCategory").on(table.itemCategory),
    rarityIdx: index("idx_rarity").on(table.rarity),
    activeIdx: index("idx_active").on(table.active),
  })
);

export type ItemType = typeof itemTypes.$inferSelect;
export type InsertItemType = typeof itemTypes.$inferInsert;

// ============================================================================
// INVENTÁRIO
// ============================================================================

/**
 * Tabela de Inventário
 */
export const inventory = mysqlTable(
  "inventory",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    itemTypeId: int("itemTypeId").notNull(),
    quantity: int("quantity").default(1).notNull(),
    slotIndex: int("slotIndex"),
    durability: int("durability"), // Para ferramentas (0-100)
    metadata: json("metadata"), // Dados customizados

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    itemIdx: index("idx_itemTypeId").on(table.itemTypeId),
    quantityIdx: index("idx_quantity").on(table.quantity),
    userItemUnique: unique("unique_user_item").on(table.userId, table.itemTypeId, table.slotIndex),
  })
);

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = typeof inventory.$inferInsert;

// ============================================================================
// MARKETPLACE
// ============================================================================

/**
 * Tabela de Listagens do Marketplace
 */
export const marketplaceListings = mysqlTable(
  "marketplace_listings",
  {
    id: int("id").autoincrement().primaryKey(),
    sellerId: int("sellerId").notNull(),
    itemTypeId: int("itemTypeId").notNull(),
    quantity: int("quantity").notNull(),
    pricePerUnit: bigint("pricePerUnit", { mode: 'bigint' }).notNull(), // Em wei (HARVEST)
    totalPrice: bigint("totalPrice", { mode: 'bigint' }).notNull(),
    status: mysqlEnum("status", ["active", "sold", "cancelled"]).default("active").notNull(),
    expiresAt: timestamp("expiresAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    sellerIdx: index("idx_sellerId").on(table.sellerId),
    statusIdx: index("idx_status").on(table.status),
    itemIdx: index("idx_itemTypeId").on(table.itemTypeId),
    expiresIdx: index("idx_expiresAt").on(table.expiresAt),
    createdIdx: index("idx_createdAt").on(table.createdAt),
  })
);

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

// ============================================================================
// TRANSAÇÕES DO MARKETPLACE
// ============================================================================

/**
 * Tabela de Histórico de Transações
 */
export const marketplaceTransactions = mysqlTable(
  "marketplace_transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    buyerId: int("buyerId").notNull(),
    sellerId: int("sellerId").notNull(),
    itemTypeId: int("itemTypeId").notNull(),
    quantity: int("quantity").notNull(),
    pricePerUnit: bigint("pricePerUnit", { mode: 'bigint' }).notNull(),
    totalPrice: bigint("totalPrice", { mode: 'bigint' }).notNull(),
    taxAmount: bigint("taxAmount", { mode: 'bigint' }).notNull(), // 5% de taxa
    burnAmount: bigint("burnAmount", { mode: 'bigint' }).notNull(), // 3% queimado
    treasuryAmount: bigint("treasuryAmount", { mode: 'bigint' }).notNull(), // 2% para tesouro
    transactionHash: varchar("transactionHash", { length: 66 }),
    status: mysqlEnum("status", ["pending", "confirmed", "failed"]).default("pending").notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    buyerIdx: index("idx_buyerId").on(table.buyerId),
    sellerIdx: index("idx_sellerId").on(table.sellerId),
    statusIdx: index("idx_status").on(table.status),
    hashIdx: index("idx_transactionHash").on(table.transactionHash),
    createdIdx: index("idx_createdAt").on(table.createdAt),
  })
);

export type MarketplaceTransaction = typeof marketplaceTransactions.$inferSelect;
export type InsertMarketplaceTransaction = typeof marketplaceTransactions.$inferInsert;

// ============================================================================
// CRAFTING
// ============================================================================

/**
 * Tabela de Receitas de Crafting
 */
export const craftingRecipes = mysqlTable(
  "crafting_recipes",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    craftingTimeSeconds: int("craftingTimeSeconds").notNull(),
    costHarvest: bigint("costHarvest", { mode: 'bigint' }), // Custo em HARVEST
    outputItemTypeId: int("outputItemTypeId").notNull(),
    outputQuantity: int("outputQuantity").default(1).notNull(),
    active: boolean("active").default(true).notNull(),
    discoveryRequired: boolean("discoveryRequired").default(false).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_name").on(table.name),
    activeIdx: index("idx_active").on(table.active),
    discoveryIdx: index("idx_discoveryRequired").on(table.discoveryRequired),
  })
);

export type CraftingRecipe = typeof craftingRecipes.$inferSelect;
export type InsertCraftingRecipe = typeof craftingRecipes.$inferInsert;

/**
 * Tabela de Ingredientes de Receitas (M:N)
 */
export const craftingRecipeInputs = mysqlTable(
  "crafting_recipe_inputs",
  {
    id: int("id").autoincrement().primaryKey(),
    recipeId: int("recipeId").notNull(),
    itemTypeId: int("itemTypeId").notNull(),
    quantity: int("quantity").notNull(),
  },
  (table) => ({
    recipeIdx: index("idx_recipeId").on(table.recipeId),
    itemIdx: index("idx_itemTypeId").on(table.itemTypeId),
    recipeItemUnique: unique("unique_recipe_item").on(table.recipeId, table.itemTypeId),
  })
);

export type CraftingRecipeInput = typeof craftingRecipeInputs.$inferSelect;
export type InsertCraftingRecipeInput = typeof craftingRecipeInputs.$inferInsert;

/**
 * Tabela de Jobs de Crafting em Progresso
 */
export const craftingJobs = mysqlTable(
  "crafting_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    recipeId: int("recipeId").notNull(),
    status: mysqlEnum("status", ["in_progress", "completed", "cancelled"]).default("in_progress").notNull(),
    startedAt: timestamp("startedAt").notNull(),
    completedAt: timestamp("completedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    statusIdx: index("idx_status").on(table.status),
    completedIdx: index("idx_completedAt").on(table.completedAt),
  })
);

export type CraftingJob = typeof craftingJobs.$inferSelect;
export type InsertCraftingJob = typeof craftingJobs.$inferInsert;

// ============================================================================
// MISSÕES
// ============================================================================

/**
 * Tabela de Missões
 */
export const missions = mysqlTable(
  "missions",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 100 }).notNull(),
    description: text("description"),
    missionType: mysqlEnum("missionType", ["daily", "weekly", "special"]).default("daily").notNull(),
    targetType: varchar("targetType", { length: 50 }),
    targetValue: int("targetValue"),
    rewardHarvest: bigint("rewardHarvest", { mode: 'bigint' }),
    rewardFarm: bigint("rewardFarm", { mode: 'bigint' }),
    rewardNFTId: int("rewardNFTId"),
    durationSeconds: int("durationSeconds"),
    active: boolean("active").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    typeIdx: index("idx_missionType").on(table.missionType),
    activeIdx: index("idx_active").on(table.active),
  })
);

export type Mission = typeof missions.$inferSelect;
export type InsertMission = typeof missions.$inferInsert;

/**
 * Tabela de Progresso em Missões
 */
export const missionProgress = mysqlTable(
  "mission_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    missionId: int("missionId").notNull(),
    progress: int("progress").default(0).notNull(),
    status: mysqlEnum("status", ["in_progress", "completed", "claimed"]).default("in_progress").notNull(),
    startedAt: timestamp("startedAt").notNull(),
    completedAt: timestamp("completedAt"),
    claimedAt: timestamp("claimedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    statusIdx: index("idx_status").on(table.status),
    completedIdx: index("idx_completedAt").on(table.completedAt),
    userMissionUnique: unique("unique_user_mission").on(table.userId, table.missionId),
  })
);

export type MissionProgress = typeof missionProgress.$inferSelect;
export type InsertMissionProgress = typeof missionProgress.$inferInsert;

// ============================================================================
// CONQUISTAS
// ============================================================================

/**
 * Tabela de Conquistas
 */
export const achievements = mysqlTable(
  "achievements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    achievementType: varchar("achievementType", { length: 50 }),
    achievementName: varchar("achievementName", { length: 100 }),
    unlockedAt: timestamp("unlockedAt").notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    typeIdx: index("idx_achievementType").on(table.achievementType),
    userAchievementUnique: unique("unique_user_achievement").on(table.userId, table.achievementType),
  })
);

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

// ============================================================================
// FACÇÕES - CONTRIBUIÇÕES E RANKINGS
// ============================================================================

/**
 * Tabela de Contribuições para Facções
 */
export const factionContributions = mysqlTable(
  "faction_contributions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    factionId: int("factionId").notNull(),
    contributionPoints: int("contributionPoints").default(0).notNull(),
    contributionType: varchar("contributionType", { length: 50 }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    factionIdx: index("idx_factionId").on(table.factionId),
    pointsIdx: index("idx_contributionPoints").on(table.contributionPoints),
    createdIdx: index("idx_createdAt").on(table.createdAt),
  })
);

export type FactionContribution = typeof factionContributions.$inferSelect;
export type InsertFactionContribution = typeof factionContributions.$inferInsert;

/**
 * Tabela de Rankings de Facções
 */
export const factionRankings = mysqlTable(
  "faction_rankings",
  {
    id: int("id").autoincrement().primaryKey(),
    factionId: int("factionId").notNull(),
    ranking: int("ranking"), // 1, 2, 3, 4
    totalContribution: bigint("totalContribution", { mode: 'bigint' }).notNull(),
    memberCount: int("memberCount").notNull(),
    weekNumber: int("weekNumber").notNull(),
    year: int("year").notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    factionIdx: index("idx_factionId").on(table.factionId),
    rankingIdx: index("idx_ranking").on(table.ranking),
    weekIdx: index("idx_weekNumber").on(table.weekNumber),
    factionWeekUnique: unique("unique_faction_week").on(table.factionId, table.weekNumber, table.year),
  })
);

export type FactionRanking = typeof factionRankings.$inferSelect;
export type InsertFactionRanking = typeof factionRankings.$inferInsert;

// ============================================================================
// EVENTOS DO JOGO
// ============================================================================

/**
 * Tabela de Eventos (para análise e auditoria)
 */
export const gameEvents = mysqlTable(
  "game_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    eventType: varchar("eventType", { length: 50 }),
    eventData: json("eventData"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_userId").on(table.userId),
    typeIdx: index("idx_eventType").on(table.eventType),
    createdIdx: index("idx_createdAt").on(table.createdAt),
  })
);

export type GameEvent = typeof gameEvents.$inferSelect;
export type InsertGameEvent = typeof gameEvents.$inferInsert;
