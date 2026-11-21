import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { applyAction, createInitialState, economy, type GameState } from "../src";
import { deepFreeze, firstCrop, T0, withCoins, withInventory } from "./helpers";

const itemId = firstCrop().harvestItemId;
const price = () => new Decimal(economy.items[itemId]?.sellPrice ?? "NaN");

function sell(state: GameState, id: string, qty: number) {
  return applyAction(state, { type: "item.sold", payload: { itemId: id, qty }, createdAt: T0 });
}

describe("item.sold", () => {
  it("credita o preço da tabela e remove do estoque", () => {
    const start = deepFreeze(withCoins(withInventory(createInitialState(), { [itemId]: 5 }), "0"));
    const next = sell(start, itemId, 2);
    expect(next.coins).toBe(price().times(2).toString());
    expect(next.inventory[itemId]).toBe(3);
  });

  it("vender tudo remove a chave do inventário", () => {
    const next = sell(withInventory(createInitialState(), { [itemId]: 2 }), itemId, 2);
    expect(next.inventory).not.toHaveProperty(itemId);
  });

  it("vende recursos", () => {
    const next = sell(withCoins(withInventory(createInitialState(), { resource_b: 1 }), "0"), "resource_b", 1);
    expect(next.coins).toBe(economy.items["resource_b"]?.sellPrice);
  });

  it("soma decimais sem erro de float (0.1 + 0.2 estilo)", () => {
    let state = withCoins(withInventory(createInitialState(), { resource_a: 10 }), "0.1");
    for (let i = 0; i < 10; i++) state = sell(state, "resource_a", 1);
    const expected = new Decimal("0.1").plus(new Decimal(economy.items["resource_a"]?.sellPrice ?? "NaN").times(10));
    expect(state.coins).toBe(expected.toString());
  });

  it("lança INSUFFICIENT_ITEMS ao vender sem estoque", () => {
    expect(() => sell(withInventory(createInitialState(), {}), itemId, 1)).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_ITEMS" }),
    );
    expect(() => sell(withInventory(createInitialState(), { [itemId]: 1 }), itemId, 2)).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_ITEMS" }),
    );
  });

  it("lança NOT_SELLABLE para item sem preço de venda", () => {
    const seedId = firstCrop().seedItemId;
    expect(() => sell(withInventory(createInitialState(), { [seedId]: 1 }), seedId, 1)).toThrow(
      expect.objectContaining({ code: "NOT_SELLABLE" }),
    );
  });

  it("lança UNKNOWN_ITEM e INVALID_QUANTITY", () => {
    expect(() => sell(createInitialState(), "nope", 1)).toThrow(expect.objectContaining({ code: "UNKNOWN_ITEM" }));
    expect(() => sell(withInventory(createInitialState(), { [itemId]: 1 }), itemId, 0)).toThrow(
      expect.objectContaining({ code: "INVALID_QUANTITY" }),
    );
  });
});
