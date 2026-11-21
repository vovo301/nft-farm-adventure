import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  startCraftingJob,
  completeCraftingJob,
  cancelCraftingJob,
  getUserCraftingJobs,
  getAvailableRecipes,
  getRecipeDetails,
} from "../crafting";
import { getDb } from "../db";
import { users, craftingRecipes, craftingRecipeInputs, itemTypes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Crafting System", () => {
  let testUserId: number;
  let testRecipeId: number;
  let testJobId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    const userResult = await db.insert(users).values({
      openId: `test-user-${Date.now()}`,
      walletAddress: `0x${Date.now().toString().padStart(40, "0")}`,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role: "user",
      harvestBalance: BigInt(1000000000000000000), // 1000 HARVEST
      farmBalance: BigInt(0),
    });

    // Obter ID do usuário
    const users_result = await db
      .select()
      .from(users)
      .where(eq(users.openId, `test-user-${Date.now()}`));

    if (users_result.length === 0) {
      throw new Error("Failed to create test user");
    }

    testUserId = users_result[0]!.id;

    // Criar tipos de itens de teste
    const itemTypesResult = await db.insert(itemTypes).values([
      {
        name: "Trigo",
        category: "crop",
        rarity: 1,
        description: "Trigo colhido",
        maxStackSize: 100,
        active: true,
      },
      {
        name: "Pão",
        category: "resource",
        rarity: 2,
        description: "Pão feito",
        maxStackSize: 50,
        active: true,
      },
    ]);

    // Obter IDs dos tipos de itens
    const itemTypes_result = await db.select().from(itemTypes);
    const wheatItem = itemTypes_result.find((i) => i.name === "Trigo");
    const breadItem = itemTypes_result.find((i) => i.name === "Pão");

    if (!wheatItem || !breadItem) {
      throw new Error("Failed to create item types");
    }

    // Criar receita de teste
    const recipeResult = await db.insert(craftingRecipes).values({
      name: "Fazer Pão",
      description: "Transforma trigo em pão",
      craftingTimeSeconds: 5, // 5 segundos para teste
      costHarvest: BigInt(10000000000000000), // 0.01 HARVEST
      outputItemTypeId: breadItem.id,
      outputQuantity: 1,
      active: true,
      discoveryRequired: false,
    });

    // Obter ID da receita
    const recipes_result = await db.select().from(craftingRecipes);
    const testRecipe = recipes_result.find((r) => r.name === "Fazer Pão");

    if (!testRecipe) {
      throw new Error("Failed to create test recipe");
    }

    testRecipeId = testRecipe.id;

    // Adicionar ingrediente à receita
    await db.insert(craftingRecipeInputs).values({
      recipeId: testRecipeId,
      itemTypeId: wheatItem.id,
      quantity: 2,
    });
  });

  it("should get available recipes", async () => {
    const recipes = await getAvailableRecipes();
    expect(recipes.length).toBeGreaterThan(0);

    const testRecipe = recipes.find((r) => r.id === testRecipeId);
    expect(testRecipe).toBeDefined();
    expect(testRecipe?.name).toBe("Fazer Pão");
    expect(testRecipe?.ingredients.length).toBeGreaterThan(0);
  });

  it("should get recipe details", async () => {
    const recipe = await getRecipeDetails(testRecipeId);
    expect(recipe).toBeDefined();
    expect(recipe?.name).toBe("Fazer Pão");
    expect(recipe?.ingredients.length).toBeGreaterThan(0);
    expect(recipe?.outputItem).toBeDefined();
  });

  it("should fail to start crafting without ingredients", async () => {
    const result = await startCraftingJob(testUserId, testRecipeId);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient");
  });

  it("should get user crafting jobs", async () => {
    const jobs = await getUserCraftingJobs(testUserId);
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("should fail to complete non-existent job", async () => {
    const result = await completeCraftingJob(99999, testUserId);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should fail to cancel non-existent job", async () => {
    const result = await cancelCraftingJob(99999, testUserId);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
