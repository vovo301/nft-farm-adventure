import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { economy } from "../src";

describe("economy data (contrato do gerador)", () => {
  it("tem 4 culturas e 2 recursos", () => {
    expect(Object.keys(economy.crops)).toHaveLength(4);
    expect(Object.values(economy.items).filter((i) => i.kind === "resource")).toHaveLength(2);
  });

  it("ids das chaves batem com o campo id", () => {
    for (const [key, item] of Object.entries(economy.items)) expect(item.id).toBe(key);
    for (const [key, crop] of Object.entries(economy.crops)) expect(crop.id).toBe(key);
  });

  it("cada cultura referencia semente e produto existentes, com tempos/quantidades inteiros > 0", () => {
    for (const crop of Object.values(economy.crops)) {
      expect(economy.items[crop.seedItemId]?.kind).toBe("seed");
      expect(economy.items[crop.harvestItemId]?.kind).toBe("crop");
      expect(Number.isInteger(crop.growSeconds) && crop.growSeconds > 0).toBe(true);
      expect(Number.isInteger(crop.harvestQty) && crop.harvestQty > 0).toBe(true);
    }
  });

  it("preços são strings decimais não negativas", () => {
    for (const item of Object.values(economy.items)) {
      for (const price of [item.buyPrice, item.sellPrice]) {
        if (price === null) continue;
        expect(typeof price).toBe("string");
        expect(new Decimal(price).isNegative()).toBe(false);
      }
    }
  });

  it("regras iniciais são válidas", () => {
    const { rules } = economy;
    expect(new Decimal(rules.startingCoins).isNegative()).toBe(false);
    expect(Number.isInteger(rules.startingPlotCount) && rules.startingPlotCount > 0).toBe(true);
    expect(Number.isInteger(rules.maxQuantityPerAction) && rules.maxQuantityPerAction > 0).toBe(true);
    for (const [id, qty] of Object.entries(rules.startingInventory)) {
      expect(economy.items[id]).toBeDefined();
      expect(Number.isInteger(qty) && qty > 0).toBe(true);
    }
  });
});
