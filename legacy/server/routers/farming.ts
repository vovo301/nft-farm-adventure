import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  plantCrop,
  harvestCrop,
  getLandCrops,
  calculateFinalYield,
  RiskEvent,
} from "../farming";
import { getDb } from "../db";
import { lands, crops, cropTypes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const farmingRouter = router({
  /**
   * Obtém todas as terras do jogador
   */
  getLands: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    try {
      return await db
        .select()
        .from(lands)
        .where(eq(lands.userId, ctx.user.id));
    } catch (error) {
      console.error("[Farming] Get lands error:", error);
      return [];
    }
  }),

  /**
   * Obtém os cultivos de uma terra específica
   */
  getLandCrops: protectedProcedure
    .input(z.object({ landId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        // Verificar se a terra pertence ao usuário
        const land = await db
          .select()
          .from(lands)
          .where(and(eq(lands.id, input.landId), eq(lands.userId, ctx.user.id)))
          .limit(1);

        if (land.length === 0) {
          return [];
        }

        // Obter cultivos com informações de tipo
        const cropsList = await db
          .select({
            id: crops.id,
            landId: crops.landId,
            cropTypeId: crops.cropTypeId,
            positionX: crops.positionX,
            positionY: crops.positionY,
            plantedAt: crops.plantedAt,
            expectedHarvestAt: crops.expectedHarvestAt,
            harvestedAt: crops.harvestedAt,
            status: crops.status,
            yield: crops.yield,
            luckFactor: crops.luckFactor,
            riskEvent: crops.riskEvent,
            cropName: cropTypes.name,
            rarity: cropTypes.rarity,
            growthTimeSeconds: cropTypes.growthTimeSeconds,
          })
          .from(crops)
          .innerJoin(cropTypes, eq(crops.cropTypeId, cropTypes.id))
          .where(eq(crops.landId, input.landId));

        return cropsList;
      } catch (error) {
        console.error("[Farming] Get land crops error:", error);
        return [];
      }
    }),

  /**
   * Obtém tipos de cultivos disponíveis
   */
  getCropTypes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      return await db
        .select()
        .from(cropTypes)
        .where(eq(cropTypes.active, true));
    } catch (error) {
      console.error("[Farming] Get crop types error:", error);
      return [];
    }
  }),

  /**
   * Planta um novo cultivo
   */
  plantCrop: protectedProcedure
    .input(
      z.object({
        landId: z.number(),
        cropTypeId: z.number(),
        gridX: z.number().min(0).max(9),
        gridY: z.number().min(0).max(9),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await plantCrop(
        ctx.user.id,
        input.landId,
        input.cropTypeId,
        input.gridX,
        input.gridY
      );
    }),

  /**
   * Colhe um cultivo pronto
   */
  harvestCrop: protectedProcedure
    .input(z.object({ cropId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await harvestCrop(ctx.user.id, input.cropId);
    }),

  /**
   * Obtém estatísticas de farming do jogador
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    try {
      // Contar cultivos por status
      const userLands = await db
        .select()
        .from(lands)
        .where(eq(lands.userId, ctx.user.id));

      if (userLands.length === 0) {
        return {
          totalLands: 0,
          totalCrops: 0,
          growingCrops: 0,
          readyCrops: 0,
          harvestedCrops: 0,
          totalYield: 0,
        };
      }

      const landIds = userLands.map((l) => l.id);

      // Buscar todos os cultivos de todas as terras
      let allCrops: typeof crops.$inferSelect[] = [];
      for (const landId of landIds) {
        const landCrops = await db
          .select()
          .from(crops)
          .where(eq(crops.landId, landId));
        allCrops = allCrops.concat(landCrops);
      }

      const stats = {
        totalLands: userLands.length,
        totalCrops: allCrops.length,
        growingCrops: allCrops.filter((c) => c.status === "growing").length,
        readyCrops: allCrops.filter((c) => c.status === "ready").length,
        harvestedCrops: allCrops.filter((c) => c.status === "harvested").length,
        totalYield: allCrops
          .filter((c) => c.status === "harvested")
          .reduce((sum, c) => sum + (c.yield || 0), 0),
      };

      return stats;
    } catch (error) {
      console.error("[Farming] Get stats error:", error);
      return null;
    }
  }),
});
