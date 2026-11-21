import type { GameAction, GameActionType } from "../actions";
import { GameError } from "../errors";
import { assertTimestamp, isRecord } from "../lib/validate";
import type { GameState } from "../state";
import { harvestCrop } from "./cropHarvested";
import { plantCrop } from "./cropPlanted";
import { sellItem } from "./itemSold";
import { buySeed } from "./seedBought";

type Reducer<A extends GameAction> = (state: GameState, action: A) => GameState;

/** Mapa tipo de evento → reducer. Cliente e servidor usam o mesmo. */
export const reducers: { readonly [K in GameActionType]: Reducer<Extract<GameAction, { type: K }>> } = {
  "seed.bought": buySeed,
  "crop.planted": plantCrop,
  "crop.harvested": harvestCrop,
  "item.sold": sellItem,
};

function isKnownType(type: unknown): type is GameActionType {
  return typeof type === "string" && Object.hasOwn(reducers, type);
}

/**
 * Aplica uma ação. Lança `GameError` se inválida; nunca devolve estado parcial nem muta `state`.
 * Ações vindas da rede são `unknown` na prática: a forma é checada aqui.
 */
export function applyAction(state: GameState, action: GameAction): GameState {
  const raw: unknown = action;
  if (!isRecord(raw)) throw new GameError("INVALID_ACTION", "ação deve ser um objeto");
  if (!isKnownType(raw["type"])) {
    throw new GameError("UNKNOWN_EVENT", "tipo de evento desconhecido", { type: raw["type"] });
  }
  if (!isRecord(raw["payload"])) {
    throw new GameError("INVALID_ACTION", "payload deve ser um objeto", { type: raw["type"] });
  }
  assertTimestamp(raw["createdAt"]);

  const reducer = reducers[action.type] as Reducer<GameAction>;
  return reducer(state, action);
}

/** Aplica um lote em ordem. Na primeira falha lança — o chamador mantém o estado anterior. */
export function applyActions(state: GameState, actions: readonly GameAction[]): GameState {
  return actions.reduce(applyAction, state);
}

export { buySeed } from "./seedBought";
export { plantCrop } from "./cropPlanted";
export { harvestCrop, cropReadyAt, isCropReady } from "./cropHarvested";
export { sellItem } from "./itemSold";
