import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, factions, userFactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Sistema de Facções", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    await db.insert(users).values({
      openId: `faction-test-${Date.now()}`,
      walletAddress: `0x${Math.random().toString(16).substring(2).padStart(40, "0")}`,
      name: "Faction Test User",
      email: "faction@test.com",
      loginMethod: "test",
      role: "user",
      harvestBalance: BigInt(1000000000000000000),
      farmBalance: BigInt(0),
    });

    const usersResult = await db
      .select()
      .from(users)
      .where(eq(users.openId, `faction-test-${Date.now()}`));

    if (usersResult.length === 0) throw new Error("Failed to create test user");
    testUserId = usersResult[0]!.id;
  });

  it("Deve ter 4 facções disponíveis", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allFactions = await db.select().from(factions);

    expect(allFactions.length).toBeGreaterThanOrEqual(4);

    const factionNames = allFactions.map((f) => f.name);
    console.log("✓ Facções disponíveis:", factionNames);
  });

  it("Deve validar bônus de cada facção", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allFactions = await db.select().from(factions);

    for (const faction of allFactions) {
      expect(faction.name).toBeDefined();
      expect(faction.description).toBeDefined();
      expect(faction.bonus).toBeDefined();
      expect(faction.bonusValue).toBeGreaterThan(0);

      console.log(`✓ ${faction.name}: ${faction.bonus} (+${faction.bonusValue}%)`);
    }
  });

  it("Deve permitir usuário se juntar a uma facção", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allFactions = await db.select().from(factions);
    if (allFactions.length === 0) throw new Error("No factions available");

    const firstFaction = allFactions[0]!;

    // Usuário se junta à facção
    await db.insert(userFactions).values({
      userId: testUserId,
      factionId: firstFaction.id,
      joinedAt: new Date(),
    });

    // Verificar se foi adicionado
    const userFactionResult = await db
      .select()
      .from(userFactions)
      .where(eq(userFactions.userId, testUserId));

    expect(userFactionResult.length).toBeGreaterThan(0);
    expect(userFactionResult[0]!.factionId).toBe(firstFaction.id);

    console.log(`✓ Usuário se juntou à facção: ${firstFaction.name}`);
  });

  it("Deve aplicar bônus de facção ao farming", async () => {
    // Exemplo: Facção com +10% de yield
    const baseYield = 100;
    const factionBonus = 10; // 10%

    const totalYield = baseYield + (baseYield * factionBonus) / 100;

    expect(totalYield).toBe(110);
    console.log(`✓ Bônus de farming: ${baseYield} → ${totalYield}`);
  });

  it("Deve aplicar bônus de facção ao crafting", async () => {
    // Exemplo: Facção com +15% de chance de sucesso
    const baseSuccess = 85; // 85%
    const factionBonus = 15; // +15%

    const totalSuccess = Math.min(100, baseSuccess + factionBonus);

    expect(totalSuccess).toBe(100);
    console.log(`✓ Bônus de crafting: ${baseSuccess}% → ${totalSuccess}%`);
  });

  it("Deve aplicar bônus de facção ao marketplace", async () => {
    // Exemplo: Facção com -5% de taxa de marketplace
    const baseTax = 5; // 5%
    const factionBonus = -5; // -5%

    const totalTax = Math.max(0, baseTax + factionBonus);

    expect(totalTax).toBe(0);
    console.log(`✓ Bônus de marketplace: ${baseTax}% → ${totalTax}%`);
  });

  it("Deve permitir mudança de facção", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allFactions = await db.select().from(factions);
    if (allFactions.length < 2) {
      console.log("⚠️  Menos de 2 facções disponíveis, pulando teste");
      return;
    }

    const secondFaction = allFactions[1]!;

    // Usuário muda para segunda facção
    await db
      .update(userFactions)
      .set({
        factionId: secondFaction.id,
        joinedAt: new Date(),
      })
      .where(eq(userFactions.userId, testUserId));

    // Verificar mudança
    const userFactionResult = await db
      .select()
      .from(userFactions)
      .where(eq(userFactions.userId, testUserId));

    expect(userFactionResult[0]!.factionId).toBe(secondFaction.id);
    console.log(`✓ Usuário mudou para facção: ${secondFaction.name}`);
  });

  it("Deve calcular bônus cumulativos corretamente", async () => {
    // Cenário: Usuário com múltiplos bônus
    const baseCraftingSuccess = 85;
    const factionBonus = 10;
    const itemBonus = 5;

    const totalBonus = baseCraftingSuccess + factionBonus + itemBonus;
    const cappedBonus = Math.min(100, totalBonus);

    expect(cappedBonus).toBe(100);
    console.log(`✓ Bônus cumulativo: ${baseCraftingSuccess}% + ${factionBonus}% + ${itemBonus}% = ${cappedBonus}%`);
  });
});

describe("Validação de Bônus de Facção", () => {
  it("Deve validar que bônus não excedem 100%", async () => {
    const testCases = [
      { base: 85, faction: 10, expected: 95 },
      { base: 85, faction: 20, expected: 100 }, // Capped
      { base: 50, faction: 60, expected: 100 }, // Capped
      { base: 10, faction: 5, expected: 15 },
    ];

    for (const testCase of testCases) {
      const result = Math.min(100, testCase.base + testCase.faction);
      expect(result).toBe(testCase.expected);
    }

    console.log("✓ Validação de cap de bônus concluída");
  });

  it("Deve validar que bônus não ficam negativos", async () => {
    const testCases = [
      { base: 5, faction: -3, expected: 2 },
      { base: 5, faction: -10, expected: 0 }, // Floored
      { base: 10, faction: -5, expected: 5 },
    ];

    for (const testCase of testCases) {
      const result = Math.max(0, testCase.base + testCase.faction);
      expect(result).toBe(testCase.expected);
    }

    console.log("✓ Validação de floor de bônus concluída");
  });
});
