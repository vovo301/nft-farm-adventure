import type { ItemSoldAction } from "../actions";
import { GameError } from "../errors";
import { addItem, itemCount } from "../lib/inventory";
import { money, toDecimalString } from "../lib/money";
import { assertQuantity, getItem } from "../lib/validate";
import type { GameState } from "../state";

export function sellItem(state: GameState, action: ItemSoldAction): GameState {
  const { itemId, qty } = action.payload;
  const item = getItem(itemId);
  if (item.sellPrice === null) {
    throw new GameError("NOT_SELLABLE", "item não pode ser vendido", { itemId });
  }
  assertQuantity(qty);

  const owned = itemCount(state.inventory, item.id);
  if (owned < qty) {
    throw new GameError("INSUFFICIENT_ITEMS", "estoque insuficiente", { itemId, owned, qty });
  }

  const revenue = money(item.sellPrice).times(qty);
  return {
    ...state,
    coins: toDecimalString(money(state.coins).plus(revenue)),
    inventory: addItem(state.inventory, item.id, -qty),
  };
}
