import type { SeedBoughtAction } from "../actions";
import { GameError } from "../errors";
import { addItem } from "../lib/inventory";
import { money, toDecimalString } from "../lib/money";
import { assertQuantity, getItem } from "../lib/validate";
import type { GameState } from "../state";

export function buySeed(state: GameState, action: SeedBoughtAction): GameState {
  const { itemId, qty } = action.payload;
  const item = getItem(itemId);
  if (item.kind !== "seed" || item.buyPrice === null) {
    throw new GameError("NOT_BUYABLE", "item não está à venda na loja", { itemId });
  }
  assertQuantity(qty);

  const cost = money(item.buyPrice).times(qty);
  const balance = money(state.coins);
  if (balance.lessThan(cost)) {
    throw new GameError("INSUFFICIENT_COINS", "saldo insuficiente", {
      balance: state.coins,
      cost: toDecimalString(cost),
    });
  }

  return {
    ...state,
    coins: toDecimalString(balance.minus(cost)),
    inventory: addItem(state.inventory, item.id, qty),
  };
}
