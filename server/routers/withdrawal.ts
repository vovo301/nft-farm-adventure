import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { inventory, withdrawalRequests, itemTypes } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Router para gerenciar saques de itens off-chain para NFTs on-chain
 * Permite que jogadores transformem itens do inventário em NFTs ERC-1155
 */
export const withdrawalRouter = router({
  /**
   * Obter o histórico de saques do jogador
   */
  getWithdrawalHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const history = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.userId, String(ctx.user.id)))
        .orderBy(desc(withdrawalRequests.createdAt))
        .limit(input.limit || 20)
        .offset(input.offset || 0);
      return history;
    }),

  /**
   * Obter itens disponíveis para saque
   */
  getWithdrawableItems: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const items = await db
      .select({
        id: inventory.id,
        itemTypeId: inventory.itemTypeId,
        quantity: inventory.quantity,
        itemName: itemTypes.name,
        itemCategory: itemTypes.itemCategory,
        rarity: itemTypes.rarity,
      })
      .from(inventory)
      .leftJoin(itemTypes, eq(inventory.itemTypeId, itemTypes.id))
      .where(eq(inventory.userId, ctx.user.id));
    return items.map((item) => ({
      ...item,
      canWithdraw: (item.quantity || 0) > 0,
    }));
  }),

  /**
   * Solicitar saque de itens para on-chain
   */
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        itemTypeId: z.number(),
        quantity: z.number().min(1),
        walletAddress: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Banco de dados indisponível" };

      const [inventoryItem] = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.userId, ctx.user.id),
            eq(inventory.itemTypeId, input.itemTypeId)
          )
        )
        .limit(1);

      if (!inventoryItem || inventoryItem.quantity < input.quantity) {
        return { success: false, error: "Saldo insuficiente no inventário" };
      }

      const feeRate = 0.02;
      const fee = Math.floor(input.quantity * feeRate);
      const quantityAfterFee = input.quantity - fee;

      const { nanoid } = await import("nanoid");
      await db.insert(withdrawalRequests).values({
        id: nanoid(),
        userId: String(ctx.user.id),
        itemId: input.itemTypeId,
        quantity: input.quantity,
        quantityAfterFee,
        withdrawalFee: fee,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db
        .update(inventory)
        .set({ quantity: inventoryItem.quantity - input.quantity })
        .where(eq(inventory.id, inventoryItem.id));

      return {
        success: true,
        message: `Saque de ${quantityAfterFee} itens solicitado (taxa: ${fee})`,
        quantityAfterFee,
        fee,
      };
    }),

  /**
   * Cancelar um saque pendente
   */
  cancelWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Banco de dados indisponível" };

      const [withdrawal] = await db
        .select()
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.id, input.withdrawalId),
            eq(withdrawalRequests.userId, String(ctx.user.id)),
            eq(withdrawalRequests.status, "pending")
          )
        )
        .limit(1);

      if (!withdrawal) {
        return { success: false, error: "Saque não encontrado ou não pode ser cancelado" };
      }

      await db
        .update(withdrawalRequests)
        .set({ status: "cancelled" as any, updatedAt: new Date() })
        .where(eq(withdrawalRequests.id, input.withdrawalId));

      const [inventoryItem] = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.userId, ctx.user.id),
            eq(inventory.itemTypeId, withdrawal.itemId)
          )
        )
        .limit(1);

      if (inventoryItem) {
        await db
          .update(inventory)
          .set({ quantity: inventoryItem.quantity + withdrawal.quantity })
          .where(eq(inventory.id, inventoryItem.id));
      } else {
        await db.insert(inventory).values({
          userId: ctx.user.id,
          itemTypeId: withdrawal.itemId,
          quantity: withdrawal.quantity,
        });
      }

      return { success: true, message: "Saque cancelado e itens devolvidos ao inventário" };
    }),

  /**
   * Obter detalhes de um saque
   */
  getWithdrawalDetails: protectedProcedure
    .input(z.object({ withdrawalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [withdrawal] = await db
        .select()
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.id, input.withdrawalId),
            eq(withdrawalRequests.userId, String(ctx.user.id))
          )
        )
        .limit(1);

      return withdrawal || null;
    }),
});
