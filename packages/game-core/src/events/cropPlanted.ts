import type { CropPlantedAction } from "../actions";
import { GameError } from "../errors";
import { addItem, itemCount } from "../lib/inventory";
import { assertPlotIndex, getCrop } from "../lib/validate";
import type { GameState, Plot } from "../state";

export function plantCrop(state: GameState, action: CropPlantedAction): GameState {
  const { plotIndex, cropId } = action.payload;
  const crop = getCrop(cropId);
  assertPlotIndex(state, plotIndex);

  if (state.plots[plotIndex]?.status !== "empty") {
    throw new GameError("PLOT_OCCUPIED", "plot já está plantado", { plotIndex });
  }
  if (itemCount(state.inventory, crop.seedItemId) < 1) {
    throw new GameError("MISSING_SEED", "sem semente no inventário", { seedItemId: crop.seedItemId });
  }

  const plot: Plot = { status: "planted", cropId: crop.id, plantedAt: action.createdAt };
  return {
    ...state,
    inventory: addItem(state.inventory, crop.seedItemId, -1),
    plots: state.plots.map((p, i) => (i === plotIndex ? plot : p)),
  };
}
