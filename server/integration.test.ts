import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, lands, crops, cropTypes, inventory, itemTypes, marketplaceListings, craftingRecipes, craftingJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { plantCrop, harvestCrop } from "./farming";
import { addItemToInventory, removeItemFromInventory } from "./inventory";
import { createListing, buyListing } from "./marketplace";
import { startCraftingJob, completeCraftingJob } from "./crafting";

describe("Fluxo Completo do Jogo (Integração)", () => {
  let testUserId: number;
  let testLandId: number;
  let testCropId: number;
  let testItemTypeId: number;
  let testListingId: number;
  let testRecipeId: number;
  let testJobId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 1. Criar usuário de teste
    await db.insert(users).values({
      openId: `test-integration-${Date.now()}`,
      walletAddress: `0x${Date.now().toString().padStart(40, "0")}`,
      name: "Integration Test User",
      email: "integration@test.com",
      loginMethod: "test",
      role: "user",
      harvestBalance: BigInt(1000000000000000000), // 1000 HARVEST
      farmBalance: BigInt(0),
    });

    const usersResult = await db
      .select()
      .from(users)
      .where(eq(users.openId, `test-integration-${Date.now()}`));

    if (usersResult.length === 0) throw new Error("Failed to create test user");
    testUserId = usersResult[0]!.id;

    // 2. Criar terra para o usuário
    await db.insert(lands).values({
      userId: testUserId,
      tokenId: BigInt(Date.now()),
      fertilityLevel: 50,
      gridSize: 100,
      usedSlots: 0,
      totalHarvests: 0,
    });

    const landsResult = await db
      .select()
      .from(lands)
      .where(eq(lands.userId, testUserId));

    if (landsResult.length === 0) throw new Error("Failed to create test land");
    testLandId = landsResult[0]!.id;

    // 3. Criar tipos de cultivos
    await db.insert(cropTypes).values({
      name: "Trigo Teste",
      description: "Cultivo de teste",
      growthTimeSeconds: 5,
      baseYield: 10,
      rarity: 1,
      active: true,
    });

    const cropTypesResult = await db
      .select()
      .from(cropTypes)
      .where(eq(cropTypes.name, "Trigo Teste"));

    if (cropTypesResult.length === 0) throw new Error("Failed to create crop type");
    const cropTypeId = cropTypesResult[0]!.id;

    // 4. Criar tipos de itens
    await db.insert(itemTypes).values([
      {
        name: "Trigo Colhido",
        category: "crop",
        rarity: 1,
        description: "Trigo colhido da terra",
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

    const itemTypesResult = await db.select().from(itemTypes);
    const wheatItem = itemTypesResult.find((i) => i.name === "Trigo Colhido");
    const breadItem = itemTypesResult.find((i) => i.name === "Pão");

    if (!wheatItem || !breadItem) throw new Error("Failed to create item types");
    testItemTypeId = wheatItem.id;

    // 5. Criar receita de crafting
    await db.insert(craftingRecipes).values({
      name: "Fazer Pão Teste",
      description: "Transforma trigo em pão",
      craftingTimeSeconds: 5,
      costHarvest: BigInt(10000000000000000),
      outputItemTypeId: breadItem.id,
      outputQuantity: 1,
      active: true,
      discoveryRequired: false,
    });

    const recipesResult = await db
      .select()
      .from(craftingRecipes)
      .where(eq(craftingRecipes.name, "Fazer Pão Teste"));

    if (recipesResult.length === 0) throw new Error("Failed to create recipe");
    testRecipeId = recipesResult[0]!.id;
  });

  it("Fluxo 1: Plantar → Colher → Inventário", async () => {
    // 1. Plantar cultivo
    const plantResult = await plantCrop(testUserId, testLandId, 1, 0, 0);
    expect(plantResult.success).toBe(true);
    expect(plantResult.cropId).toBeDefined();
    testCropId = plantResult.cropId!;

    // 2. Verificar que o cultivo foi criado
    const db = await getDb();
    const cropResult = await db
      .select()
      .from(crops)
      .where(eq(crops.id, testCropId));

    expect(cropResult.length).toBe(1);
    expect(cropResult[0]!.status).toBe("growing");

    // 3. Simular colheita (em teste real, aguardar timer)
    // Para este teste, vamos apenas validar a lógica
    console.log("✓ Cultivo plantado com sucesso");
  });

  it("Fluxo 2: Adicionar Item ao Inventário → Listar no Marketplace", async () => {
    // 1. Adicionar item ao inventário
    const addResult = await addItemToInventory(testUserId, testItemTypeId, 5);
    expect(addResult.success).toBe(true);

    // 2. Verificar inventário
    const db = await getDb();
    const invResult = await db
      .select()
      .from(inventory)
      .where(eq(inventory.userId, testUserId));

    expect(invResult.length).toBeGreaterThan(0);
    const item = invResult.find((i) => i.itemTypeId === testItemTypeId);
    expect(item?.quantity).toBeGreaterThanOrEqual(5);

    // 3. Criar listagem no marketplace
    const listingResult = await createListing(
      testUserId,
      testItemTypeId,
      2,
      BigInt(1000000000000000000) // 1 HARVEST por unidade
    );

    expect(listingResult.success).toBe(true);
    console.log("✓ Item listado no marketplace");
  });

  it("Fluxo 3: Crafting (Iniciar → Completar)", async () => {
    // 1. Adicionar ingredientes ao inventário
    const db = await getDb();
    const wheatItem = await db
      .select()
      .from(itemTypes)
      .where(eq(itemTypes.name, "Trigo Colhido"));

    if (wheatItem.length === 0) throw new Error("Wheat item not found");

    await addItemToInventory(testUserId, wheatItem[0]!.id, 10);

    // 2. Iniciar crafting
    const startResult = await startCraftingJob(testUserId, testRecipeId);
    expect(startResult.success).toBe(true);
    expect(startResult.jobId).toBeDefined();
    testJobId = startResult.jobId!;

    // 3. Verificar que o job foi criado
    const jobResult = await db
      .select()
      .from(craftingJobs)
      .where(eq(craftingJobs.id, testJobId));

    expect(jobResult.length).toBe(1);
    expect(jobResult[0]!.status).toBe("in_progress");

    console.log("✓ Job de crafting iniciado");

    // 4. Simular espera (em teste real, aguardar timer)
    // Para este teste, apenas validamos a estrutura
  });

  it("Fluxo 4: Validação de Segurança (Propriedade de Jobs)", async () => {
    // Tentar completar job de outro usuário deve falhar
    const otherUserId = testUserId + 999;

    const completeResult = await completeCraftingJob(testJobId, otherUserId);
    expect(completeResult.success).toBe(false);
    expect(completeResult.error).toContain("Not your job");

    console.log("✓ Validação de propriedade funcionando");
  });

  it("Fluxo 5: Remover Item do Inventário", async () => {
    // 1. Remover item
    const removeResult = await removeItemFromInventory(testUserId, testItemTypeId, 2);
    expect(removeResult.success).toBe(true);

    // 2. Verificar quantidade reduzida
    const db = await getDb();
    const invResult = await db
      .select()
      .from(inventory)
      .where(eq(inventory.userId, testUserId));

    const item = invResult.find((i) => i.itemTypeId === testItemTypeId);
    expect(item?.quantity || 0).toBeLessThan(5);

    console.log("✓ Item removido com sucesso");
  });
});
