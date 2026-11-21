import { getDb } from "./db.js";
import { factions } from "../drizzle/schema.js";

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  console.log("🌱 Seeding factions...");

  const factionData = [
    {
      name: "Cultivadores",
      description: "Mestres da terra. Focados em maximizar a produção e o rendimento das colheitas.",
      bonusType: 1, // Rendimento
      bonusValue: 10, // +10% rendimento
      totalContribution: 0n,
      memberCount: 0,
      weeklyReward: 1000000000000000000000n, // 1000 HARVEST
      active: true,
    },
    {
      name: "Comerciantes",
      description: "Dominam o mercado. Especialistas em negociação e redução de taxas de marketplace.",
      bonusType: 2, // Taxa
      bonusValue: 5, // -5% taxa (armazenado como valor positivo para redução)
      totalContribution: 0n,
      memberCount: 0,
      weeklyReward: 1000000000000000000000n,
      active: true,
    },
    {
      name: "Alquimistas",
      description: "Mestres do crafting. Reduzem o tempo de criação e aumentam a eficiência das receitas.",
      bonusType: 3, // Crafting
      bonusValue: 20, // +20% velocidade
      totalContribution: 0n,
      memberCount: 0,
      weeklyReward: 1000000000000000000000n,
      active: true,
    },
    {
      name: "Exploradores",
      description: "Buscadores de raridades. Aumentam as chances de encontrar itens raros e sementes especiais.",
      bonusType: 4, // Raro
      bonusValue: 15, // +15% chance
      totalContribution: 0n,
      memberCount: 0,
      weeklyReward: 1000000000000000000000n,
      active: true,
    },
  ];

  for (const faction of factionData) {
    try {
      await db.insert(factions).values(faction);
      console.log(`✅ Faction added: ${faction.name}`);
    } catch (e) {
      console.log(`⚠️ Faction ${faction.name} already exists or error occurred.`);
    }
  }

  console.log("✨ Faction seeding completed!");
}

seed().catch(console.error);
