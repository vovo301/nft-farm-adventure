import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createListing,
  cancelListing,
  buyListing,
  getActiveListings,
  getSellerListings,
  getTransactionHistory,
} from "../marketplace";

export const marketplaceRouter = router({
  /**
   * Criar nova listagem
   */
  createListing: protectedProcedure
    .input(
      z.object({
        itemTypeId: z.number(),
        quantity: z.number().min(1),
        pricePerUnit: z.bigint(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createListing(
        ctx.user.id,
        input.itemTypeId,
        input.quantity,
        input.pricePerUnit
      );
      return result;
    }),

  /**
   * Cancelar listagem
   */
  cancelListing: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cancelListing(input.listingId, ctx.user.id);
      return result;
    }),

  /**
   * Comprar item do marketplace
   */
  buyListing: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        quantity: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await buyListing(input.listingId, ctx.user.id, input.quantity);
      return result;
    }),

  /**
   * Obter listagens ativas
   */
  getActiveListings: protectedProcedure
    .input(
      z.object({
        itemTypeId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const listings = await getActiveListings(
        input.itemTypeId,
        input.limit,
        input.offset
      );
      return listings;
    }),

  /**
   * Obter listagens do vendedor
   */
  getSellerListings: protectedProcedure.query(async ({ ctx }) => {
    const listings = await getSellerListings(ctx.user.id);
    return listings;
  }),

  /**
   * Obter histórico de transações
   */
  getTransactionHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await getTransactionHistory(
        ctx.user.id,
        input.limit,
        input.offset
      );
      return transactions;
    }),
});
