import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const recipes = [
  {
    name: "Pão de Trigo",
    description: "Transforma trigo em um delicioso pão",
    craftingTimeSeconds: 30,
    costHarvest: BigInt(10000000000000000), // 0.01 HARVEST
    outputItemTypeId: 2, // Será ajustado após criar item types
    outputQuantity: 1,
    ingredients: [
      { itemTypeId: 1, quantity: 3 }, // Trigo
    ],
  },
  {
    name: "Farinha",
    description: "Moer trigo para fazer farinha",
    craftingTimeSeconds: 20,
    costHarvest: BigInt(5000000000000000), // 0.005 HARVEST
    outputItemTypeId: 3,
    outputQuantity: 2,
    ingredients: [
      { itemTypeId: 1, quantity: 2 }, // Trigo
    ],
  },
  {
    name: "Bolo de Cenoura",
    description: "Um bolo delicioso feito com cenoura",
    craftingTimeSeconds: 60,
    costHarvest: BigInt(20000000000000000), // 0.02 HARVEST
    outputItemTypeId: 4,
    outputQuantity: 1,
    ingredients: [
      { itemTypeId: 5, quantity: 2 }, // Cenoura
      { itemTypeId: 3, quantity: 1 }, // Farinha
    ],
  },
  {
    name: "Suco de Laranja",
    description: "Suco fresco de laranja",
    craftingTimeSeconds: 15,
    costHarvest: BigInt(8000000000000000), // 0.008 HARVEST
    outputItemTypeId: 6,
    outputQuantity: 3,
    ingredients: [
      { itemTypeId: 7, quantity: 3 }, // Laranja
    ],
  },
  {
    name: "Compota de Morango",
    description: "Conserva doce de morango",
    craftingTimeSeconds: 45,
    costHarvest: BigInt(15000000000000000), // 0.015 HARVEST
    outputItemTypeId: 8,
    outputQuantity: 2,
    ingredients: [
      { itemTypeId: 9, quantity: 4 }, // Morango
      { itemTypeId: 3, quantity: 1 }, // Farinha (açúcar)
    ],
  },
];

async function seedRecipes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "harvest_realm",
  });

  const db = drizzle(connection, { schema });

  try {
    console.log("🌱 Iniciando seed de receitas de crafting...");

    for (const recipe of recipes) {
      const { ingredients, ...recipeData } = recipe;

      // Inserir receita
      const result = await db
        .insert(schema.craftingRecipes)
        .values({
          ...recipeData,
          active: true,
          discoveryRequired: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      console.log(`✅ Receita criada: ${recipe.name}`);

      // Obter ID da receita inserida
      const createdRecipes = await db
        .select()
        .from(schema.craftingRecipes)
        .where(schema.eq(schema.craftingRecipes.name, recipe.name));

      if (createdRecipes.length > 0) {
        const recipeId = createdRecipes[0].id;

        // Inserir ingredientes
        for (const ingredient of ingredients) {
          await db.insert(schema.craftingRecipeInputs).values({
            recipeId,
            itemTypeId: ingredient.itemTypeId,
            quantity: ingredient.quantity,
          });
        }

        console.log(`   └─ ${ingredients.length} ingrediente(s) adicionado(s)`);
      }
    }

    console.log("\n✨ Seed de receitas concluído!");
  } catch (error) {
    console.error("❌ Erro ao fazer seed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedRecipes();
