import type { Inventory } from "../state";

export function itemCount(inventory: Inventory, itemId: string): number {
  return Object.hasOwn(inventory, itemId) ? (inventory[itemId] ?? 0) : 0;
}

/** Nova cópia do inventário com `delta` aplicado; remove a chave quando chega a 0. */
export function addItem(inventory: Inventory, itemId: string, delta: number): Inventory {
  const qty = itemCount(inventory, itemId) + delta;
  if (!Number.isSafeInteger(qty) || qty < 0) throw new RangeError(`inventário inválido para ${itemId}`);
  const rest = Object.fromEntries(Object.entries(inventory).filter(([id]) => id !== itemId));
  return qty === 0 ? rest : { ...rest, [itemId]: qty };
}
