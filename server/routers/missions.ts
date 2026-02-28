import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  missions,
  missionProgress,
  users,
} from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * Obtém todas as missões ativas com o progresso do usuário
 */
async function getUserMissions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar missões ativas
  const activeMissions = await db
    .select()
    .from(missions)
    .where(eq(missions.active, true))
    .orderBy(missions.missionType, missions.id);

  if (activeMissions.length === 0) return [];

  // Buscar progresso do usuário
  const missionIds = activeMissions.map((m) => m.id);
  const progressList = await db
    .select()
    .from(missionProgress)
    .where(
      and(
        eq(missionProgress.userId, userId),
        inArray(missionProgress.missionId, missionIds)
      )
    );

  // Combinar missões com progresso
  return activeMissions.map((mission) => {
    const progress = progressList.find((p) => p.missionId === mission.id);
    return {
      ...mission,
      userProgress: progress || null,
      progressPercent: progress && mission.targetValue
        ? Math.min(100, Math.floor((progress.progress / mission.targetValue) * 100))
        : 0,
    };
  });
}

/**
 * Inicia uma missão para o usuário
 */
async function startMission(userId: number, missionId: number) {
  const db = await getDb();
  if (!db) return { success: false, error: "Banco de dados indisponível" };

  // Verificar se missão existe e está ativa
  const [mission] = await db
    .select()
    .from(missions)
    .where(and(eq(missions.id, missionId), eq(missions.active, true)))
    .limit(1);

  if (!mission) {
    return { success: false, error: "Missão não encontrada" };
  }

  // Verificar se já tem progresso
  const [existing] = await db
    .select()
    .from(missionProgress)
    .where(
      and(
        eq(missionProgress.userId, userId),
        eq(missionProgress.missionId, missionId)
      )
    )
    .limit(1);

  if (existing) {
    return { success: false, error: "Missão já iniciada" };
  }

  // Criar progresso
  await db.insert(missionProgress).values({
    userId,
    missionId,
    progress: 0,
    status: "in_progress",
    startedAt: new Date(),
  });

  return { success: true };
}

/**
 * Reivindica a recompensa de uma missão completada
 */
async function claimMissionReward(userId: number, missionId: number) {
  const db = await getDb();
  if (!db) return { success: false, error: "Banco de dados indisponível" };

  // Buscar progresso
  const [progress] = await db
    .select()
    .from(missionProgress)
    .where(
      and(
        eq(missionProgress.userId, userId),
        eq(missionProgress.missionId, missionId),
        eq(missionProgress.status, "completed")
      )
    )
    .limit(1);

  if (!progress) {
    return { success: false, error: "Missão não completada ou já reivindicada" };
  }

  // Buscar missão para obter recompensas
  const [mission] = await db
    .select()
    .from(missions)
    .where(eq(missions.id, missionId))
    .limit(1);

  if (!mission) {
    return { success: false, error: "Missão não encontrada" };
  }

  // Marcar como reivindicada
  await db
    .update(missionProgress)
    .set({ status: "claimed", claimedAt: new Date() })
    .where(eq(missionProgress.id, progress.id));

  // Adicionar recompensas ao usuário (tokens HARVEST off-chain)
  if (mission.rewardHarvest) {
    await db
      .update(users)
      .set({
        harvestBalance: db.$count(users) as any, // placeholder - em produção usar SQL aritmético
      })
      .where(eq(users.id, userId));
  }

  return {
    success: true,
    rewards: {
      harvest: mission.rewardHarvest?.toString() || "0",
      farm: mission.rewardFarm?.toString() || "0",
    },
  };
}

export const missionsRouter = router({
  /**
   * Obter todas as missões com progresso do usuário
   */
  getMissions: protectedProcedure.query(async ({ ctx }) => {
    const result = await getUserMissions(ctx.user.id);
    return result;
  }),

  /**
   * Iniciar uma missão
   */
  startMission: protectedProcedure
    .input(z.object({ missionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await startMission(ctx.user.id, input.missionId);
      return result;
    }),

  /**
   * Reivindicar recompensa de missão completada
   */
  claimReward: protectedProcedure
    .input(z.object({ missionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await claimMissionReward(ctx.user.id, input.missionId);
      return result;
    }),

  /**
   * Obter missões diárias
   */
  getDailyMissions: protectedProcedure.query(async ({ ctx }) => {
    const allMissions = await getUserMissions(ctx.user.id);
    return allMissions.filter((m) => m.missionType === "daily");
  }),

  /**
   * Obter missões semanais
   */
  getWeeklyMissions: protectedProcedure.query(async ({ ctx }) => {
    const allMissions = await getUserMissions(ctx.user.id);
    return allMissions.filter((m) => m.missionType === "weekly");
  }),

  /**
   * Obter missões especiais
   */
  getSpecialMissions: protectedProcedure.query(async ({ ctx }) => {
    const allMissions = await getUserMissions(ctx.user.id);
    return allMissions.filter((m) => m.missionType === "special");
  }),
});
