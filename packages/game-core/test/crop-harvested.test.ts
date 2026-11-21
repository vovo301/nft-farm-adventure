import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, cropReadyAt, isCropReady, type GameState } from "../src";
import { deepFreeze, firstCrop, growMs, T0, withInventory } from "./helpers";

const crop = firstCrop();

function planted(): GameState {
  return applyAction(withInventory(createInitialState(), { [crop.seedItemId]: 1 }), {
    type: "crop.planted",
    payload: { plotIndex: 0, cropId: crop.id },
    createdAt: T0,
  });
}

function harvest(state: GameState, plotIndex: number, createdAt: number) {
  return applyAction(state, { type: "crop.harvested", payload: { plotIndex }, createdAt });
}

describe("crop.harvested", () => {
  it("colhe exatamente no tempo de crescimento: adiciona produto e esvazia o plot", () => {
    const start = deepFreeze(planted());
    const next = harvest(start, 0, T0 + growMs(crop.id));
    expect(next.plots[0]).toEqual({ status: "empty" });
    expect(next.inventory[crop.harvestItemId]).toBe(crop.harvestQty);
    expect(start.plots[0]?.status).toBe("planted");
  });

  it("lança CROP_NOT_READY 1 ms antes da hora", () => {
    expect(() => harvest(planted(), 0, T0 + growMs(crop.id) - 1)).toThrow(
      expect.objectContaining({ code: "CROP_NOT_READY" }),
    );
  });

  it("lança CROP_NOT_READY com createdAt anterior ao plantio", () => {
    expect(() => harvest(planted(), 0, T0 - 1000)).toThrow(expect.objectContaining({ code: "CROP_NOT_READY" }));
  });

  it("lança PLOT_EMPTY ao colher plot vazio", () => {
    expect(() => harvest(planted(), 1, T0 + growMs(crop.id))).toThrow(
      expect.objectContaining({ code: "PLOT_EMPTY" }),
    );
  });

  it("lança INVALID_PLOT para índice fora do intervalo", () => {
    expect(() => harvest(planted(), 999, T0 + growMs(crop.id))).toThrow(
      expect.objectContaining({ code: "INVALID_PLOT" }),
    );
  });

  it("seletores cropReadyAt/isCropReady usam o mesmo relógio da regra", () => {
    const plot = planted().plots[0];
    if (!plot) throw new Error("plot ausente");
    expect(cropReadyAt(plot)).toBe(T0 + growMs(crop.id));
    expect(isCropReady(plot, T0 + growMs(crop.id) - 1)).toBe(false);
    expect(isCropReady(plot, T0 + growMs(crop.id))).toBe(true);
    expect(cropReadyAt({ status: "empty" })).toBeNull();
    expect(isCropReady({ status: "empty" }, T0)).toBe(false);
  });
});
