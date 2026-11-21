/**
 * Script para popular tipos de cultivos no banco de dados
 * Uso: node seed-crops.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const CROPS = [
  {
    name: "Trigo",
    description: "Cultivo básico, fácil de crescer",
    growthTimeSeconds: 300, // 5 minutos
    baseYield: 10,
    rarity: 1,
    marketPrice: BigInt(1e18), // 1 HARVEST
  },
  {
    name: "Milho",
    description: "Cultivo comum com bom rendimento",
    growthTimeSeconds: 600, // 10 minutos
    baseYield: 15,
    rarity: 1,
    marketPrice: BigInt(2e18), // 2 HARVEST
  },
  {
    name: "Cenoura",
    description: "Cultivo nutritivo",
    growthTimeSeconds: 900, // 15 minutos
    baseYield: 12,
    rarity: 1,
    marketPrice: BigInt(1.5e18), // 1.5 HARVEST
  },
  {
    name: "Batata",
    description: "Cultivo resistente",
    growthTimeSeconds: 1200, // 20 minutos
    baseYield: 18,
    rarity: 2,
    marketPrice: BigInt(3e18), // 3 HARVEST
  },
  {
    name: "Tomate",
    description: "Cultivo delicioso",
    growthTimeSeconds: 1800, // 30 minutos
    baseYield: 20,
    rarity: 2,
    marketPrice: BigInt(4e18), // 4 HARVEST
  },
  {
    name: "Abóbora",
    description: "Cultivo grande e saudável",
    growthTimeSeconds: 3600, // 1 hora
    baseYield: 25,
    rarity: 2,
    marketPrice: BigInt(5e18), // 5 HARVEST
  },
  {
    name: "Melancia",
    description: "Cultivo refrescante",
    growthTimeSeconds: 7200, // 2 horas
    baseYield: 30,
    rarity: 3,
    marketPrice: BigInt(8e18), // 8 HARVEST
  },
  {
    name: "Morango",
    description: "Cultivo doce e raro",
    growthTimeSeconds: 10800, // 3 horas
    baseYield: 35,
    rarity: 3,
    marketPrice: BigInt(12e18), // 12 HARVEST
 },
  {
    name: "Maçã Dourada",
    description: "Cultivo lendário",
    growthTimeSeconds: 21600, // 6 horas
    baseYield: 50,
    rarity: 4,
    marketPrice: BigInt(25e18), // 25 HARVEST
  },
  {
    name: "Flor Mágica",
    description: "Cultivo épico com propriedades especiais",
    growthTimeSeconds: 43200, // 12 horas
    baseYield: 75,
    rarity: 5,
    marketPrice: BigInt(50e18), // 50 HARVEST
  },
];

async function seedCrops() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "nft_farm_game",
    });

    console.log("✓ Conectado ao banco de dados");

    // Limpar tipos de cultivos existentes
    await connection.execute("DELETE FROM crop_types");
    console.log("✓ Tabela crop_types limpa");

    // Inserir novos tipos de cultivos
    for (const crop of CROPS) {
      await connection.execute(
        `INSERT INTO crop_types 
         (name, description, growthTimeSeconds, baseYield, rarity, marketPrice, active, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        [
          crop.name,
          crop.description,
          crop.growthTimeSeconds,
          crop.baseYield,
          crop.rarity,
          crop.marketPrice.toString(),
        ]
      );
      console.log(`✓ Inserido: ${crop.name}`);
    }

    console.log(`\n✅ ${CROPS.length} tipos de cultivos inseridos com sucesso!`);

    await connection.end();
  } catch (error) {
    console.error("❌ Erro ao popular tipos de cultivos:", error);
    process.exit(1);
  }
}

seedCrops();
