import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { applyAction, applyActions, createInitialState, economy, GameError, type GameAction } from "../src";
import { clone, deepFreeze, firstCrop, growMs, T0, withCoins, withInventory } from "./helpers";

const crop = firstCrop();

function coreLoop(): GameAction[] {
  return [
    { type: "seed.bought", payload: { itemId: crop.seedItemId, qty: 2 }, createdAt: T0 },
    { type: "crop.planted", payload: { plotIndex: 0, cropId: crop.id }, createdAt: T0 + 1 },
    { type: "crop.planted", payload: { plotIndex: 1, cropId: crop.id }, createdAt: T0 + 2 },
    { type: "crop.harvested", payload: { plotIndex: 0 }, createdAt: T0 + 1 + growMs(crop.id) },
    { type: "crop.harvested", payload: { plotIndex: 1 }, createdAt: T0 + 2 + growMs(crop.id) },
    { type: "item.sold", payload: { itemId: crop.harvestItemId, qty: 2 * crop.harvestQty }, createdAt: T0 + 3 + growMs(crop.id) },
  ];
}

describe("applyActions — núcleo plantar → esperar → colher → vender", () => {
  it("roda o loop completo e fecha a conta de moedas", () => {
    const start = deepFreeze(withInventory(withCoins(createInitialState(), "100"), {}));
    const end = applyActions(start, coreLoop());
    const buy = new Decimal(economy.items[crop.seedItemId]?.buyPrice ?? "NaN").times(2);
    const sell = new Decimal(economy.items[crop.harvestItemId]?.sellPrice ?? "NaN").times(2 * crop.harvestQty);
    expect(end.coins).toBe(new Decimal("100").minus(buy).plus(sell).toString());
    expect(end.inventory).toEqual({});
    expect(end.plots.every((p) => p.status === "empty")).toBe(true);
  });

  it("é determinístico: mesma entrada ⇒ mesmo estado (byte a byte)", () => {
    const start = withCoins(createInitialState(), "100");
    const a = JSON.stringify(applyActions(start, coreLoop()));
    const b = JSON.stringify(applyActions(clone(start), clone(coreLoop())));
    expect(a).toBe(b);
  });

  it("não depende do relógio real", () => {
    const start = withCoins(createInitialState(), "100");
    const realNow = Date.now;
    try {
      Date.now = () => {
        throw new Error("Date.now chamado em reducer");
      };
      expect(() => applyActions(start, coreLoop())).not.toThrow();
    } finally {
      Date.now = realNow;
    }
  });

  it("falha atômica: um erro no meio não devolve estado parcial", () => {
    const start = deepFreeze(withCoins(createInitialState(), "100"));
    const bad = [...coreLoop()];
    bad.splice(3, 0, { type: "crop.harvested", payload: { plotIndex: 0 }, createdAt: T0 + 3 }); // cedo demais
    expect(() => applyActions(start, bad)).toThrow(expect.objectContaining({ code: "CROP_NOT_READY" }));
    expect(start.coins).toBe("100");
  });

  it("lança UNKNOWN_EVENT para tipo desconhecido", () => {
    const action = { type: "crop.teleported", payload: {}, createdAt: T0 } as unknown as GameAction;
    expect(() => applyAction(createInitialState(), action)).toThrow(GameError);
    expect(() => applyAction(createInitialState(), action)).toThrow(expect.objectContaining({ code: "UNKNOWN_EVENT" }));
  });

  it("lança INVALID_ACTION para payload malformado", () => {
    const action = { type: "seed.bought", payload: null, createdAt: T0 } as unknown as GameAction;
    expect(() => applyAction(createInitialState(), action)).toThrow(expect.objectContaining({ code: "INVALID_ACTION" }));
  });
});
