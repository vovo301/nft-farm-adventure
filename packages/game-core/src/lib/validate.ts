import { economy } from "../data";
import type { CropDef, ItemDef } from "../data/types";
import { GameError } from "../errors";
import type { GameState } from "../state";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Timestamp em ms desde a época: inteiro seguro >= 0. */
export function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function assertTimestamp(createdAt: unknown): asserts createdAt is number {
  if (!isTimestamp(createdAt)) {
    throw new GameError("INVALID_TIMESTAMP", "createdAt deve ser inteiro >= 0 (ms)", { createdAt });
  }
}

export function assertQuantity(qty: unknown): asserts qty is number {
  const max = economy.rules.maxQuantityPerAction;
  if (typeof qty !== "number" || !Number.isSafeInteger(qty) || qty <= 0 || qty > max) {
    throw new GameError("INVALID_QUANTITY", `quantidade deve ser inteiro em [1, ${String(max)}]`, { qty });
  }
}

export function getItem(itemId: unknown): ItemDef {
  const item = typeof itemId === "string" && Object.hasOwn(economy.items, itemId) ? economy.items[itemId] : undefined;
  if (!item) throw new GameError("UNKNOWN_ITEM", "item inexistente", { itemId });
  return item;
}

export function getCrop(cropId: unknown): CropDef {
  const crop = typeof cropId === "string" && Object.hasOwn(economy.crops, cropId) ? economy.crops[cropId] : undefined;
  if (!crop) throw new GameError("UNKNOWN_CROP", "cultura inexistente", { cropId });
  return crop;
}

export function assertPlotIndex(state: GameState, plotIndex: unknown): asserts plotIndex is number {
  if (typeof plotIndex !== "number" || !Number.isInteger(plotIndex) || plotIndex < 0 || plotIndex >= state.plots.length) {
    throw new GameError("INVALID_PLOT", "plot inexistente", { plotIndex });
  }
}
