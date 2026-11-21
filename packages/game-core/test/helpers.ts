import { economy, type GameState } from "../src";

/** Congela recursivamente para provar que os reducers não mutam a entrada. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export const T0 = 1_800_000_000_000;

/** Primeira cultura da tabela e seus ids — os testes não dependem dos números do placeholder. */
export function firstCrop() {
  const crop = Object.values(economy.crops)[0];
  if (!crop) throw new Error("economy sem culturas");
  return crop;
}

export function growMs(cropId: string): number {
  const crop = economy.crops[cropId];
  if (!crop) throw new Error(`cultura ${cropId} ausente`);
  return crop.growSeconds * 1000;
}

export function withInventory(state: GameState, inventory: Record<string, number>): GameState {
  return { ...state, inventory: { ...inventory } };
}

export function withCoins(state: GameState, coins: string): GameState {
  return { ...state, coins };
}

/** Cópia profunda de dados JSON (saves/ações), sem depender de APIs do Node/DOM. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
