import { eq, and, desc, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  marketplaceListings,
  marketplaceTransactions,
  inventory,
  users,
  itemTypes,
} from "../drizzle/schema";
import { removeItemFromInventory, addItemToInventory } from "./inventory";

/**
 * Cria uma listagem no marketplace
 */
export async function createListing(
  sellerId: number,
  itemTypeId: number,
  quantity: number,
  pricePerUnit: bigint
): Promise<{ success: boolean; listingId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Verificar se o vendedor tem o item
    const inventoryItem = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.userId, sellerId),
          eq(inventory.itemTypeId, itemTypeId)
        )
      )
      .limit(1);

    if (inventoryItem.length === 0 || inventoryItem[0]!.quantity < quantity) {
      return { success: false, error: "Insufficient item quantity" };
    }

    // Calcular preço total
    const totalPrice = pricePerUnit * BigInt(quantity);

    // Criar listagem
    await db.insert(marketplaceListings).values({
      sellerId,
      itemTypeId,
      quantity,
      pricePerUnit,
      totalPrice,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Remover itens do inventário (bloqueados para venda)
    await removeItemFromInventory(sellerId, itemTypeId, quantity);

    return { success: true, listingId: 1 }; // ID será retornado pelo banco
  } catch (error) {
    console.error("[Marketplace] Error creating listing:", error);
    return { success: false, error: "Failed to create listing" };
  }
}

/**
 * Cancela uma listagem
 */
export async function cancelListing(
  listingId: number,
  sellerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Buscar listagem
    const listing = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, listingId))
      .limit(1);

    if (listing.length === 0) {
      return { success: false, error: "Listing not found" };
    }

    const item = listing[0]!;

    // Verificar se é o vendedor
    if (item.sellerId !== sellerId) {
      return { success: false, error: "Not the seller of this listing" };
    }

    // Verificar se já foi vendida
    if (item.status !== "active") {
      return { success: false, error: "Listing is not active" };
    }

    // Atualizar status
    await db
      .update(marketplaceListings)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(marketplaceListings.id, listingId));

    // Devolver itens ao inventário
    await addItemToInventory(sellerId, item.itemTypeId, item.quantity);

    return { success: true };
  } catch (error) {
    console.error("[Marketplace] Error cancelling listing:", error);
    return { success: false, error: "Failed to cancel listing" };
  }
}

/**
 * Compra um item do marketplace
 */
export async function buyListing(
  listingId: number,
  buyerId: number,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Buscar listagem
    const listing = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, listingId))
      .limit(1);

    if (listing.length === 0) {
      return { success: false, error: "Listing not found" };
    }

    const item = listing[0]!;

    // Verificar se está ativa
    if (item.status !== "active") {
      return { success: false, error: "Listing is not active" };
    }

    // Verificar quantidade
    if (item.quantity < quantity) {
      return { success: false, error: "Insufficient quantity available" };
    }

    // Calcular preço total
    const totalPrice = item.pricePerUnit * BigInt(quantity);

    // Verificar saldo do comprador
    const buyer = await db
      .select()
      .from(users)
      .where(eq(users.id, buyerId))
      .limit(1);

    if (buyer.length === 0) {
      return { success: false, error: "Buyer not found" };
    }

    const buyerBalance = buyer[0]!.harvestBalance || BigInt(0);
    if (buyerBalance < totalPrice) {
      return { success: false, error: "Insufficient HARVEST balance" };
    }

    // Calcular taxas (5% para marketplace, 3% para burning, 2% para tesouro)
    const marketplaceFee = (totalPrice * BigInt(5)) / BigInt(100);
    const burnAmount = (totalPrice * BigInt(3)) / BigInt(100);
    const treasuryAmount = (totalPrice * BigInt(2)) / BigInt(100);
    const sellerAmount = totalPrice - marketplaceFee - burnAmount - treasuryAmount;

    // Transferir tokens
    // Comprador perde HARVEST
    await db
      .update(users)
      .set({
        harvestBalance: buyerBalance - totalPrice,
        updatedAt: new Date(),
      })
      .where(eq(users.id, buyerId));

    // Vendedor recebe HARVEST (após taxas)
    const seller = await db
      .select()
      .from(users)
      .where(eq(users.id, item.sellerId))
      .limit(1);

    if (seller.length > 0) {
      const sellerBalance = seller[0]!.harvestBalance || BigInt(0);
      await db
        .update(users)
        .set({
          harvestBalance: sellerBalance + sellerAmount,
          updatedAt: new Date(),
        })
        .where(eq(users.id, item.sellerId));
    }

    // Adicionar item ao inventário do comprador
    await addItemToInventory(buyerId, item.itemTypeId, quantity);

    // Atualizar quantidade da listagem
    const remainingQuantity = item.quantity - quantity;
    if (remainingQuantity === 0) {
      // Vender completamente
      await db
        .update(marketplaceListings)
        .set({
          status: "sold",
          updatedAt: new Date(),
        })
        .where(eq(marketplaceListings.id, listingId));
    } else {
      // Atualizar quantidade
      await db
        .update(marketplaceListings)
        .set({
          quantity: remainingQuantity,
          totalPrice: item.pricePerUnit * BigInt(remainingQuantity),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceListings.id, listingId));
    }

    // Registrar transação
    await db.insert(marketplaceTransactions).values({
      buyerId,
      sellerId: item.sellerId,
      itemTypeId: item.itemTypeId,
      quantity,
      pricePerUnit: item.pricePerUnit,
      totalPrice,
      taxAmount: marketplaceFee,
      burnAmount,
      treasuryAmount,
      status: "confirmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("[Marketplace] Error buying listing:", error);
    return { success: false, error: "Failed to buy listing" };
  }
}

/**
 * Obtém listagens ativas do marketplace
 */
export async function getActiveListings(
  itemTypeId?: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const listings = await db
      .select({
        id: marketplaceListings.id,
        sellerId: marketplaceListings.sellerId,
        sellerName: users.name,
        itemTypeId: marketplaceListings.itemTypeId,
        itemName: itemTypes.name,
        itemCategory: itemTypes.itemCategory,
        rarity: itemTypes.rarity,
        quantity: marketplaceListings.quantity,
        pricePerUnit: marketplaceListings.pricePerUnit,
        totalPrice: marketplaceListings.totalPrice,
        createdAt: marketplaceListings.createdAt,
      })
      .from(marketplaceListings)
      .innerJoin(users, eq(marketplaceListings.sellerId, users.id))
      .innerJoin(itemTypes, eq(marketplaceListings.itemTypeId, itemTypes.id))
      .where(
        itemTypeId
          ? and(
              eq(marketplaceListings.status, "active"),
              eq(marketplaceListings.itemTypeId, itemTypeId)
            )
          : eq(marketplaceListings.status, "active")
      )
      .orderBy(desc(marketplaceListings.createdAt))
      .limit(limit)
      .offset(offset);

    return listings;
  } catch (error) {
    console.error("[Marketplace] Error fetching listings:", error);
    return [];
  }
}

/**
 * Obtém listagens do vendedor
 */
export async function getSellerListings(sellerId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const listings = await db
      .select({
        id: marketplaceListings.id,
        itemTypeId: marketplaceListings.itemTypeId,
        itemName: itemTypes.name,
        itemCategory: itemTypes.itemCategory,
        rarity: itemTypes.rarity,
        quantity: marketplaceListings.quantity,
        pricePerUnit: marketplaceListings.pricePerUnit,
        totalPrice: marketplaceListings.totalPrice,
        status: marketplaceListings.status,
        createdAt: marketplaceListings.createdAt,
      })
      .from(marketplaceListings)
      .innerJoin(itemTypes, eq(marketplaceListings.itemTypeId, itemTypes.id))
      .where(eq(marketplaceListings.sellerId, sellerId))
      .orderBy(desc(marketplaceListings.createdAt));

    return listings;
  } catch (error) {
    console.error("[Marketplace] Error fetching seller listings:", error);
    return [];
  }
}

/**
 * Obtém histórico de transações
 */
export async function getTransactionHistory(
  userId?: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const transactions = await db
      .select({
        id: marketplaceTransactions.id,
        buyerId: marketplaceTransactions.buyerId,
        buyerName: users.name,
        sellerId: marketplaceTransactions.sellerId,
        itemTypeId: marketplaceTransactions.itemTypeId,
        itemName: itemTypes.name,
        quantity: marketplaceTransactions.quantity,
        pricePerUnit: marketplaceTransactions.pricePerUnit,
        totalPrice: marketplaceTransactions.totalPrice,
        taxAmount: marketplaceTransactions.taxAmount,
        burnAmount: marketplaceTransactions.burnAmount,
        createdAt: marketplaceTransactions.createdAt,
      })
      .from(marketplaceTransactions)
      .innerJoin(users, eq(marketplaceTransactions.buyerId, users.id))
      .innerJoin(itemTypes, eq(marketplaceTransactions.itemTypeId, itemTypes.id))
      .where(
        userId
          ? or(
              eq(marketplaceTransactions.buyerId, userId),
              eq(marketplaceTransactions.sellerId, userId)
            )
          : undefined
      )
      .orderBy(desc(marketplaceTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return transactions;
  } catch (error) {
    console.error("[Marketplace] Error fetching transactions:", error);
    return [];
  }
}


