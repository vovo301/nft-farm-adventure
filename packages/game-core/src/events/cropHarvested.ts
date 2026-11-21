import type { CropHarvestedAction } from "../actions";
import { economy } from "../data";
import { GameError } from "../errors";
import { addItem } from "../lib/inventory";
import { assertPlotIndex, getCrop } from "../lib/validate";
import { createEmptyPlot, type GameState, type Plot } from "../state";

/** Momento (ms) em que a cultura do plot fica pronta; `null` se o plot está vazio. */
export function cropReadyAt(plot: Plot): number | null {
  if (plot.status !== "planted") return null;
  const crop = Object.hasOwn(economy.crops, plot.cropId) ? economy.crops[plot.cropId] : undefined;
  if (!crop) return null;
  return plot.plantedAt + crop.growSeconds * 1000;
}

/** Seletor para o cliente (HUD/timers) — usa a mesma regra do reducer. */
export function isCropReady(plot: Plot, now: number): boolean {
  const readyAt = cropReadyAt(plot);
  return readyAt !== null && now >= readyAt;
}

export function harvestCrop(state: GameState, action: CropHarvestedAction): GameState {
  const { plotIndex } = action.payload;
  assertPlotIndex(state, plotIndex);
  const plot = state.plots[plotIndex];
  if (plot?.status !== "planted") {
    throw new GameError("PLOT_EMPTY", "não há cultura neste plot", { plotIndex });
  }

  const crop = getCrop(plot.cropId);
  const readyAt = plot.plantedAt + crop.growSeconds * 1000;
  if (action.createdAt < readyAt) {
    throw new GameError("CROP_NOT_READY", "cultura ainda não está pronta", {
      plotIndex,
      readyAt,
      createdAt: action.createdAt,
    });
  }

  return {
    ...state,
    inventory: addItem(state.inventory, crop.harvestItemId, crop.harvestQty),
    plots: state.plots.map((p, i) => (i === plotIndex ? createEmptyPlot() : p)),
  };
}
