import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { applyAction, createInitialState, economy, GameError, type GameState } from "../src";
import { deepFreeze, firstCrop, T0, withCoins, withInventory } from "./helpers";

const seedId = firstCrop().seedItemId;
const price = () => new Decimal(economy.items[seedId]?.buyPrice ?? "NaN");

function buy(state: GameState, itemId: string, qty: number) {
  return applyAction(state, { type: "seed.bought", payload: { itemId, qty }, createdAt: T0 });
}

describe("seed.bought", () => {
  it("debita o preço da tabela e adiciona sementes", () => {
    const start = deepFreeze(withInventory(withCoins(createInitialState(), "100"), {}));
    const next = buy(start, seedId, 3);
    expect(next.coins).toBe(new Decimal("100").minus(price().times(3)).toString());
    expect(next.inventory[seedId]).toBe(3);
    expect(start.inventory[seedId]).toBeUndefined();
  });

  it("aceita saldo exatamente igual ao custo", () => {
    const cost = price().times(2).toString();
    const next = buy(withInventory(withCoins(createInitialState(), cost), {}), seedId, 2);
    expect(next.coins).toBe("0");
  });

  it("lança INSUFFICIENT_COINS com saldo insuficiente", () => {
    const cost = price().times(2).minus("0.01").toString();
    const state = withCoins(createInitialState(), cost);
    expect(() => buy(state, seedId, 2)).toThrow(GameError);
    expect(() => buy(state, seedId, 2)).toThrow(expect.objectContaining({ code: "INSUFFICIENT_COINS" }));
  });

  it("lança UNKNOWN_ITEM para item inexistente", () => {
    expect(() => buy(createInitialState(), "nope", 1)).toThrow(expect.objectContaining({ code: "UNKNOWN_ITEM" }));
  });

  it("lança NOT_BUYABLE para item que não é semente ou não tem preço", () => {
    expect(() => buy(createInitialState(), "driftwood", 1)).toThrow(
      expect.objectContaining({ code: "NOT_BUYABLE" }),
    );
    expect(() => buy(createInitialState(), firstCrop().harvestItemId, 1)).toThrow(
      expect.objectContaining({ code: "NOT_BUYABLE" }),
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, economy.rules.maxQuantityPerAction + 1])(
    "lança INVALID_QUANTITY para qty=%s",
    (qty) => {
      const state = withCoins(createInitialState(), "1000000");
      expect(() => buy(state, seedId, qty)).toThrow(expect.objectContaining({ code: "INVALID_QUANTITY" }));
    },
  );
});
