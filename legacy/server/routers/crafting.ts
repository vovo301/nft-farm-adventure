import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  startCraftingJob,
  completeCraftingJob,
  cancelCraftingJob,
  getUserCraftingJobs,
  getAvailableRecipes,
  getRecipeDetails,
} from "../crafting";

export const craftingRouter = router({
  /**
   * Obtém todas as receitas disponíveis
   */
  getRecipes: protectedProcedure.query(async () => {
    const recipes = await getAvailableRecipes();
    return recipes;
  }),

  /**
   * Obtém detalhes de uma receita específica
   */
  getRecipeDetails: protectedProcedure
    .input(z.object({ recipeId: z.number() }))
    .query(async ({ input }) => {
      const recipe = await getRecipeDetails(input.recipeId);
      return recipe;
    }),

  /**
   * Obtém jobs de crafting do usuário
   */
  getUserJobs: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await getUserCraftingJobs(ctx.user.id);
    return jobs;
  }),

  /**
   * Inicia um novo job de crafting
   */
  startJob: protectedProcedure
    .input(z.object({ recipeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await startCraftingJob(ctx.user.id, input.recipeId);
      return result;
    }),

  /**
   * Completa um job de crafting
   */
  completeJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await completeCraftingJob(input.jobId, ctx.user.id);
      return result;
    }),

  /**
   * Cancela um job de crafting
   */
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cancelCraftingJob(input.jobId, ctx.user.id);
      return result;
    }),
});
