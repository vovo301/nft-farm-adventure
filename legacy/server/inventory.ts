import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { inventory, itemTypes, users } from "../drizzle/schema";

/**
 * Adiciona item ao inventário do jogador
 */
export async function addItemToInventory(
  userId: number,
  itemTypeId: number,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Verificar se o item já existe no inventário
    const existingItem = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemTypeId, itemTypeId)))
      .limit(1);

    if (existingItem.length > 0) {
      // Atualizar quantidade
      await db
        .update(inventory)
        .set({
          quantity: existingItem[0]!.quantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, existingItem[0]!.id));
    } else {
      // Inserir novo item
      await db.insert(inventory).values({
        userId,
        itemTypeId,
        quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[Inventory] Error adding item:", error);
    return { success: false, error: "Failed to add item" };
  }
}

/**
 * Remove item do inventário
 */
export async function removeItemFromInventory(
  userId: number,
  itemTypeId: number,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    const item = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemTypeId, itemTypeId)))
      .limit(1);

    if (item.length === 0) {
      return { success: false, error: "Item not found in inventory" };
    }

    const currentItem = item[0]!;
    const newQuantity = currentItem.quantity - quantity;

    if (newQuantity < 0) {
      return { success: false, error: "Insufficient quantity" };
    }

    if (newQuantity === 0) {
      // Remover item completamente
      await db.delete(inventory).where(eq(inventory.id, currentItem.id));
    } else {
      // Atualizar quantidade
      await db
        .update(inventory)
        .set({
          quantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, currentItem.id));
    }

    return { success: true };
  } catch (error) {
    console.error("[Inventory] Error removing item:", error);
    return { success: false, error: "Failed to remove item" };
  }
}

/**
 * Obtém inventário completo do jogador
 */
export async function getUserInventory(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const items = await db
      .select({
        id: inventory.id,
        itemTypeId: inventory.itemTypeId,
        quantity: inventory.quantity,
        itemName: itemTypes.name,
        itemCategory: itemTypes.itemCategory,
        rarity: itemTypes.rarity,
        description: itemTypes.description,
        marketPrice: itemTypes.marketPrice,
        durability: inventory.durability,
      })
      .from(inventory)
      .innerJoin(itemTypes, eq(inventory.itemTypeId, itemTypes.id))
      .where(eq(inventory.userId, userId))
      .orderBy(inventory.createdAt);

    return items;
  } catch (error) {
    console.error("[Inventory] Error fetching inventory:", error);
    return [];
  }
}

/**
 * Obtém quantidade de um item específico
 */
export async function getItemQuantity(
  userId: number,
  itemTypeId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const item = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemTypeId, itemTypeId)))
      .limit(1);

    return item.length > 0 ? item[0]!.quantity : 0;
  } catch (error) {
    console.error("[Inventory] Error getting item quantity:", error);
    return 0;
  }
}

/**
 * Obtém espaço total do inventário do jogador
 */
export async function getInventorySpace(userId: number): Promise<{
  used: number;
  total: number;
  available: number;
}> {
  const db = await getDb();
  if (!db) return { used: 0, total: 100, available: 100 };

  try {
    // Limite padrão de slots de inventário
    const maxInventorySlots = 100;

    // Calcular espaço usado (cada item ocupa 1 slot independente da quantidade)
    const inventoryItems = await db
      .select({
        id: inventory.id,
      })
      .from(inventory)
      .where(eq(inventory.userId, userId));

    const usedSlots = inventoryItems.length;

    return {
      used: usedSlots,
      total: maxInventorySlots,
      available: maxInventorySlots - usedSlots,
    };
  } catch (error) {
    console.error("[Inventory] Error getting inventory space:", error);
    return { used: 0, total: 100, available: 100 };
  }
}

/**
 * Verifica se há espaço suficiente para adicionar item
 */
export async function hasInventorySpace(
  userId: number,
  itemTypeId: number,
  quantity: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const space = await getInventorySpace(userId);

    // Verificar se o item já existe
    const existingItem = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemTypeId, itemTypeId)))
      .limit(1);

    // Se item já existe, não precisa de novo slot
    if (existingItem.length > 0) {
      return true;
    }

    // Se não existe, precisa de 1 slot
    return space.available > 0;
  } catch (error) {
    console.error("[Inventory] Error checking inventory space:", error);
    return false;
  }
}

/**
 * Transfere item entre jogadores
 */
export async function transferItem(
  fromUserId: number,
  toUserId: number,
  itemTypeId: number,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Verificar espaço no inventário do destinatário
    const hasSpace = await hasInventorySpace(toUserId, itemTypeId, quantity);
    if (!hasSpace) {
      return { success: false, error: "Insufficient inventory space" };
    }

    // Remover do inventário do remetente
    const removeResult = await removeItemFromInventory(fromUserId, itemTypeId, quantity);
    if (!removeResult.success) {
      return removeResult;
    }

    // Adicionar ao inventário do destinatário
    const addResult = await addItemToInventory(toUserId, itemTypeId, quantity);
    if (!addResult.success) {
      // Reverter remoção
      await addItemToInventory(fromUserId, itemTypeId, quantity);
      return addResult;
    }

    return { success: true };
  } catch (error) {
    console.error("[Inventory] Error transferring item:", error);
    return { success: false, error: "Failed to transfer item" };
  }
}

/**
 * Limpa itens com quantidade 0 (limpeza de banco)
 */
export async function cleanupEmptyInventorySlots(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    await db.delete(inventory).where(eq(inventory.quantity, 0));
    return 1; // Retornar 1 para indicar sucesso
  } catch (error) {
    console.error("[Inventory] Error cleaning up inventory:", error);
    return 0;
  }
}
