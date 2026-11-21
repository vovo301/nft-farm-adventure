import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, type GameState } from "../src";
import { deepFreeze, firstCrop, T0, withInventory } from "./helpers";

const crop = firstCrop();

function plant(state: GameState, plotIndex: number, cropId = crop.id, createdAt = T0) {
  return applyAction(state, { type: "crop.planted", payload: { plotIndex, cropId }, createdAt });
}

describe("crop.planted", () => {
  it("consome 1 semente e marca o plot com cultura e plantedAt = createdAt", () => {
    const start = deepFreeze(withInventory(createInitialState(), { [crop.seedItemId]: 2 }));
    const next = plant(start, 0);
    expect(next.plots[0]).toEqual({ status: "planted", cropId: crop.id, plantedAt: T0 });
    expect(next.inventory[crop.seedItemId]).toBe(1);
    expect(start.plots[0]).toEqual({ status: "empty" });
  });

  it("remove a chave do inventário quando a quantidade chega a 0", () => {
    const next = plant(withInventory(createInitialState(), { [crop.seedItemId]: 1 }), 0);
    expect(next.inventory).not.toHaveProperty(crop.seedItemId);
  });

  it("lança PLOT_OCCUPIED ao plantar em plot ocupado", () => {
    const state = plant(withInventory(createInitialState(), { [crop.seedItemId]: 2 }), 0);
    expect(() => plant(state, 0)).toThrow(expect.objectContaining({ code: "PLOT_OCCUPIED" }));
  });

  it("lança MISSING_SEED sem semente no inventário", () => {
    expect(() => plant(withInventory(createInitialState(), {}), 0)).toThrow(
      expect.objectContaining({ code: "MISSING_SEED" }),
    );
  });

  it("lança UNKNOWN_CROP para cultura inexistente", () => {
    expect(() => plant(createInitialState(), 0, "nope")).toThrow(expect.objectContaining({ code: "UNKNOWN_CROP" }));
  });

  it.each([-1, 1.5, Number.NaN, 9999])("lança INVALID_PLOT para plotIndex=%s", (plotIndex) => {
    const state = withInventory(createInitialState(), { [crop.seedItemId]: 1 });
    expect(() => plant(state, plotIndex)).toThrow(expect.objectContaining({ code: "INVALID_PLOT" }));
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("lança INVALID_TIMESTAMP para createdAt=%s", (ts) => {
    const state = withInventory(createInitialState(), { [crop.seedItemId]: 1 });
    expect(() => plant(state, 0, crop.id, ts)).toThrow(expect.objectContaining({ code: "INVALID_TIMESTAMP" }));
  });
});
