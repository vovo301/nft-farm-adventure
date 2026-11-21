import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, createInitialState, economy } from "../src";

describe("createInitialState", () => {
  it("cria estado v1 a partir das regras da economia", () => {
    const state = createInitialState();
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.schemaVersion).toBe(1);
    expect(state.coins).toBe(economy.rules.startingCoins);
    expect(state.inventory).toEqual(economy.rules.startingInventory);
    expect(state.plots).toHaveLength(economy.rules.startingPlotCount);
    expect(state.plots.every((p) => p.status === "empty")).toBe(true);
  });

  it("é serializável em JSON sem perda", () => {
    const state = createInitialState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("devolve objetos independentes", () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).toEqual(b);
    expect(a.inventory).not.toBe(b.inventory);
    expect(a.plots).not.toBe(b.plots);
  });
});
