import { describe, expect, it } from "vitest";
import { createInitialState, CURRENT_SCHEMA_VERSION, migrate } from "../src";
import { clone } from "./helpers";

/** Save "v0" fixo: formato sem schemaVersion (pré-scaffold), moedas como número. */
const SAVE_V0 = {
  coins: 42.5,
  inventory: { crop_a: 3, crop_b_seed: 1, bogus: -2 },
  plots: [{ status: "planted", cropId: "crop_a", plantedAt: 1_700_000_000_000 }, { status: "empty" }, { foo: 1 }],
};

describe("migrate", () => {
  it("estado ausente (null/undefined) ⇒ estado inicial v1", () => {
    expect(migrate(undefined)).toEqual(createInitialState());
    expect(migrate(null)).toEqual(createInitialState());
  });

  it("v0 (sem schemaVersion) ⇒ v1, preservando dados válidos e descartando inválidos", () => {
    const migrated = migrate(clone(SAVE_V0));
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.coins).toBe("42.5");
    expect(migrated.inventory).toEqual({ crop_a: 3, crop_b_seed: 1 });
    expect(migrated.plots[0]).toEqual({ status: "planted", cropId: "crop_a", plantedAt: 1_700_000_000_000 });
    expect(migrated.plots[1]).toEqual({ status: "empty" });
    expect(migrated.plots[2]).toEqual({ status: "empty" });
    expect(migrated.plots.length).toBe(createInitialState().plots.length);
  });

  it("v0 explícito (schemaVersion: 0) também migra", () => {
    expect(migrate({ ...clone(SAVE_V0), schemaVersion: 0 }).schemaVersion).toBe(1);
  });

  it("v0 vazio ({}) ⇒ defaults", () => {
    expect(migrate({})).toEqual(createInitialState());
  });

  it("v1 atual passa sem mudanças (idempotente)", () => {
    const state = createInitialState();
    expect(migrate(clone(state))).toEqual(state);
    expect(migrate(migrate(clone(SAVE_V0)))).toEqual(migrate(clone(SAVE_V0)));
  });

  it("não muta a entrada", () => {
    const input = clone(SAVE_V0);
    migrate(input);
    expect(input).toEqual(SAVE_V0);
  });

  it("versão futura ou inválida ⇒ UNSUPPORTED_SCHEMA_VERSION", () => {
    expect(() => migrate({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow(
      expect.objectContaining({ code: "UNSUPPORTED_SCHEMA_VERSION" }),
    );
    expect(() => migrate({ schemaVersion: "1" })).toThrow(
      expect.objectContaining({ code: "UNSUPPORTED_SCHEMA_VERSION" }),
    );
  });

  it("entrada que não é objeto ⇒ INVALID_SAVE", () => {
    expect(() => migrate(42)).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
    expect(() => migrate([])).toThrow(expect.objectContaining({ code: "INVALID_SAVE" }));
  });

  it("v1 corrompido ⇒ INVALID_SAVE", () => {
    expect(() => migrate({ ...createInitialState(), coins: 5 })).toThrow(
      expect.objectContaining({ code: "INVALID_SAVE" }),
    );
  });
});
