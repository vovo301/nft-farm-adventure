import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getUserInventory,
  getInventorySpace,
  addItemToInventory,
  removeItemFromInventory,
  transferItem,
  getItemQuantity,
} from "../inventory";

export const inventoryRouter = router({
  /**
   * Obter inventário completo do jogador
   */
  getInventory: protectedProcedure.query(async ({ ctx }) => {
    const items = await getUserInventory(ctx.user.id);
    return items;
  }),

  /**
   * Obter espaço do inventário
   */
  getSpace: protectedProcedure.query(async ({ ctx }) => {
    const space = await getInventorySpace(ctx.user.id);
    return space;
  }),

  /**
   * Obter quantidade de um item específico
   */
  getItemQuantity: protectedProcedure
    .input(z.object({ itemTypeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const quantity = await getItemQuantity(ctx.user.id, input.itemTypeId);
      return { quantity };
    }),

  /**
   * Adicionar item ao inventário (admin/sistema)
   */
  addItem: protectedProcedure
    .input(
      z.object({
        itemTypeId: z.number(),
        quantity: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await addItemToInventory(
        ctx.user.id,
        input.itemTypeId,
        input.quantity
      );
      return result;
    }),

  /**
   * Remover item do inventário
   */
  removeItem: protectedProcedure
    .input(
      z.object({
        itemTypeId: z.number(),
        quantity: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await removeItemFromInventory(
        ctx.user.id,
        input.itemTypeId,
        input.quantity
      );
      return result;
    }),

  /**
   * Transferir item para outro jogador
   */
  transferItem: protectedProcedure
    .input(
      z.object({
        toUserId: z.number(),
        itemTypeId: z.number(),
        quantity: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await transferItem(
        ctx.user.id,
        input.toUserId,
        input.itemTypeId,
        input.quantity
      );
      return result;
    }),
});
