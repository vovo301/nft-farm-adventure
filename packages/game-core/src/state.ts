import { economy } from "./data";
import type { DecimalString } from "./data/types";

/** Versão do formato do save. Campo novo ⇒ default aqui + passo em migrations.ts + teste. */
export const CURRENT_SCHEMA_VERSION = 1;

export type Inventory = Readonly<Record<string, number>>;

export interface EmptyPlot {
  readonly status: "empty";
}

export interface PlantedPlot {
  readonly status: "planted";
  readonly cropId: string;
  /** `createdAt` (ms) do evento `crop.planted`. */
  readonly plantedAt: number;
}

export type Plot = EmptyPlot | PlantedPlot;

export interface GameStateV1 {
  readonly schemaVersion: 1;
  /** Moeda off-chain, string decimal (decimal.js). Nunca float. */
  readonly coins: DecimalString;
  /** item id → quantidade inteira > 0 (chaves com 0 são removidas). */
  readonly inventory: Inventory;
  /** Plots da fazenda; o índice no array é o id do plot. */
  readonly plots: readonly Plot[];
}

export type GameState = GameStateV1;

export function createEmptyPlot(): EmptyPlot {
  return { status: "empty" };
}

export function createInitialState(): GameState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    coins: economy.rules.startingCoins,
    inventory: { ...economy.rules.startingInventory },
    plots: Array.from({ length: economy.rules.startingPlotCount }, createEmptyPlot),
  };
}
