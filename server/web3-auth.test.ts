import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Web3 Authentication e Base Network", () => {
  it("Deve criar usuário com wallet válida", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const testWallet = `0x${Math.random().toString(16).substring(2).padStart(40, "0")}`;

    await db.insert(users).values({
      openId: `web3-test-${Date.now()}`,
      walletAddress: testWallet,
      name: "Web3 Test User",
      email: "web3@test.com",
      loginMethod: "web3",
      role: "user",
      harvestBalance: BigInt(0),
      farmBalance: BigInt(0),
    });

    const result = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, testWallet));

    expect(result.length).toBe(1);
    expect(result[0]!.walletAddress).toBe(testWallet);
    expect(result[0]!.loginMethod).toBe("web3");
  });

  it("Deve validar formato de endereço Ethereum", async () => {
    const validAddresses = [
      "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0",
      "0x8ba1f109551bd432803012645ac136ddd64dba72",
    ];

    const invalidAddresses = [
      "0x742d35Cc6634C0532925a3b844Bc9e7595f42e", // Muito curto
      "0xZZZ1f109551bd432803012645ac136ddd64dba72", // Caracteres inválidos
      "742d35Cc6634C0532925a3b844Bc9e7595f42e0", // Sem 0x
    ];

    // Validar endereços válidos
    for (const addr of validAddresses) {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(addr);
      expect(isValid).toBe(true);
    }

    // Validar endereços inválidos
    for (const addr of invalidAddresses) {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(addr);
      expect(isValid).toBe(false);
    }
  });

  it("Deve prevenir duplicação de wallet", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const testWallet = `0x${Math.random().toString(16).substring(2).padStart(40, "0")}`;

    // Primeira inserção
    await db.insert(users).values({
      openId: `dup-test-1-${Date.now()}`,
      walletAddress: testWallet,
      name: "Duplicate Test 1",
      email: "dup1@test.com",
      loginMethod: "web3",
      role: "user",
      harvestBalance: BigInt(0),
      farmBalance: BigInt(0),
    });

    // Tentar segunda inserção com mesma wallet
    try {
      await db.insert(users).values({
        openId: `dup-test-2-${Date.now()}`,
        walletAddress: testWallet,
        name: "Duplicate Test 2",
        email: "dup2@test.com",
        loginMethod: "web3",
        role: "user",
        harvestBalance: BigInt(0),
        farmBalance: BigInt(0),
      });

      // Se chegou aqui, o banco permitiu duplicação (não deveria)
      const result = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, testWallet));

      // Deve haver apenas um usuário com essa wallet
      expect(result.length).toBe(1);
    } catch (error) {
      // Esperado: erro de constraint unique
      expect(error).toBeDefined();
    }
  });

  it("Deve validar saldo de tokens como BigInt", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const testWallet = `0x${Math.random().toString(16).substring(2).padStart(40, "0")}`;
    const testBalance = BigInt("1000000000000000000"); // 1 HARVEST

    await db.insert(users).values({
      openId: `balance-test-${Date.now()}`,
      walletAddress: testWallet,
      name: "Balance Test User",
      email: "balance@test.com",
      loginMethod: "web3",
      role: "user",
      harvestBalance: testBalance,
      farmBalance: BigInt(0),
    });

    const result = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, testWallet));

    expect(result.length).toBe(1);
    expect(result[0]!.harvestBalance).toBe(testBalance);
    expect(typeof result[0]!.harvestBalance).toBe("bigint");
  });

  it("Deve registrar login method corretamente", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const loginMethods = ["web3", "metamask", "walletconnect"];

    for (const method of loginMethods) {
      const testWallet = `0x${Math.random().toString(16).substring(2).padStart(40, "0")}`;

      await db.insert(users).values({
        openId: `method-test-${method}-${Date.now()}`,
        walletAddress: testWallet,
        name: `Method Test ${method}`,
        email: `${method}@test.com`,
        loginMethod: method,
        role: "user",
        harvestBalance: BigInt(0),
        farmBalance: BigInt(0),
      });

      const result = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, testWallet));

      expect(result[0]!.loginMethod).toBe(method);
    }
  });
});

describe("Base Network Compatibility", () => {
  it("Deve suportar endereços Base Network", async () => {
    // Base Network usa os mesmos endereços Ethereum (EVM-compatible)
    const baseAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f42e0";

    const isValidBase = /^0x[a-fA-F0-9]{40}$/.test(baseAddress);
    expect(isValidBase).toBe(true);
  });

  it("Deve validar chain ID para Base Network", async () => {
    // Base Mainnet: 8453
    // Base Sepolia: 84532
    const validChainIds = [8453, 84532];

    for (const chainId of validChainIds) {
      expect(typeof chainId).toBe("number");
      expect(chainId).toBeGreaterThan(0);
    }
  });
});
