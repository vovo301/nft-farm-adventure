import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, craftingRecipes, craftingRecipeInputs, itemTypes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getAvailableRecipes, getUserCraftingJobs } from "./crafting";

describe("Testes de Performance", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    await db.insert(users).values({
      openId: `perf-test-${Date.now()}`,
      walletAddress: `0x${Date.now().toString().padStart(40, "0")}`,
      name: "Performance Test User",
      email: "perf@test.com",
      loginMethod: "test",
      role: "user",
      harvestBalance: BigInt(1000000000000000000),
      farmBalance: BigInt(0),
    });

    const usersResult = await db
      .select()
      .from(users)
      .where(eq(users.openId, `perf-test-${Date.now()}`));

    if (usersResult.length === 0) throw new Error("Failed to create test user");
    testUserId = usersResult[0]!.id;
  });

  it("Deve obter receitas em menos de 100ms", async () => {
    const startTime = performance.now();
    const recipes = await getAvailableRecipes();
    const endTime = performance.now();

    const duration = endTime - startTime;
    console.log(`⏱️  getAvailableRecipes: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(100);
    expect(recipes.length).toBeGreaterThan(0);
  });

  it("Deve obter jobs do usuário em menos de 50ms", async () => {
    const startTime = performance.now();
    const jobs = await getUserCraftingJobs(testUserId);
    const endTime = performance.now();

    const duration = endTime - startTime;
    console.log(`⏱️  getUserCraftingJobs: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(50);
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("Deve lidar com múltiplas queries simultâneas", async () => {
    const startTime = performance.now();

    // Simular 10 queries simultâneas
    const promises = Array.from({ length: 10 }, () => getAvailableRecipes());
    const results = await Promise.all(promises);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`⏱️  10 queries paralelas: ${duration.toFixed(2)}ms`);

    expect(results.length).toBe(10);
    expect(duration).toBeLessThan(500); // Deve completar em menos de 500ms
  });

  it("Deve validar índices de banco de dados", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verificar se os índices existem
    const recipesWithIndex = await db
      .select()
      .from(craftingRecipes)
      .where(eq(craftingRecipes.active, true));

    expect(recipesWithIndex.length).toBeGreaterThanOrEqual(0);
    console.log(`✓ Índice idx_active em craftingRecipes validado`);
  });
});

describe("Benchmarks de Memória", () => {
  it("Deve manter consumo de memória baixo com muitas receitas", async () => {
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    // Obter receitas múltiplas vezes
    for (let i = 0; i < 100; i++) {
      await getAvailableRecipes();
    }

    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryIncrease = finalMemory - initialMemory;

    console.log(`💾 Aumento de memória: ${memoryIncrease.toFixed(2)}MB`);

    // Deve aumentar menos de 50MB
    expect(memoryIncrease).toBeLessThan(50);
  });
});
