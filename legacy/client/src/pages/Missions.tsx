import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Star, Clock, CheckCircle, Gift, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

type MissionStatus = "not_started" | "in_progress" | "completed" | "claimed";

interface MissionWithProgress {
  id: number;
  title: string;
  description: string | null;
  missionType: "daily" | "weekly" | "special";
  targetType: string | null;
  targetValue: number | null;
  rewardHarvest: bigint | null;
  rewardFarm: bigint | null;
  durationSeconds: number | null;
  active: boolean;
  userProgress: {
    id: number;
    progress: number;
    status: "in_progress" | "completed" | "claimed";
    startedAt: Date;
    completedAt: Date | null;
    claimedAt: Date | null;
  } | null;
  progressPercent: number;
}

function getMissionTypeColor(type: string): string {
  switch (type) {
    case "daily": return "bg-blue-100 text-blue-800";
    case "weekly": return "bg-purple-100 text-purple-800";
    case "special": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getMissionTypeLabel(type: string): string {
  switch (type) {
    case "daily": return "Diária";
    case "weekly": return "Semanal";
    case "special": return "Especial";
    default: return type;
  }
}

function getMissionIcon(targetType: string | null): string {
  switch (targetType) {
    case "harvest": return "🌾";
    case "plant": return "🌱";
    case "craft": return "⚒️";
    case "trade": return "🏪";
    case "login": return "📅";
    case "level": return "⭐";
    default: return "🎯";
  }
}

function getStatusInfo(mission: MissionWithProgress): {
  label: string;
  color: string;
  canStart: boolean;
  canClaim: boolean;
} {
  if (!mission.userProgress) {
    return { label: "Não iniciada", color: "text-gray-500", canStart: true, canClaim: false };
  }
  switch (mission.userProgress.status) {
    case "in_progress":
      return { label: "Em progresso", color: "text-blue-600", canStart: false, canClaim: false };
    case "completed":
      return { label: "Completada!", color: "text-green-600", canStart: false, canClaim: true };
    case "claimed":
      return { label: "Recompensa coletada", color: "text-gray-400", canStart: false, canClaim: false };
    default:
      return { label: "Desconhecido", color: "text-gray-500", canStart: false, canClaim: false };
  }
}

/**
 * Card de missão individual
 */
function MissionCard({ mission }: { mission: MissionWithProgress }) {
  const utils = trpc.useUtils();
  const statusInfo = getStatusInfo(mission);

  const startMutation = trpc.game.missions.startMission.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Missão iniciada!");
        utils.game.missions.getMissions.invalidate();
      } else {
        toast.error(result.error || "Erro ao iniciar missão");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar missão");
    },
  });

  const claimMutation = trpc.game.missions.claimReward.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        const harvestReward = result.rewards?.harvest
          ? (Number(result.rewards.harvest) / 1e18).toFixed(2)
          : "0";
        toast.success(`Recompensa coletada! +${harvestReward} HARVEST`);
        utils.game.missions.getMissions.invalidate();
      } else {
        toast.error(result.error || "Erro ao coletar recompensa");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao coletar recompensa");
    },
  });

  const isClaimed = mission.userProgress?.status === "claimed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={isClaimed ? "opacity-60" : ""}
    >
      <Card className={`p-4 border-2 transition-all ${
        mission.userProgress?.status === "completed"
          ? "border-green-300 bg-green-50"
          : isClaimed
          ? "border-gray-200 bg-gray-50"
          : "border-amber-200 hover:border-amber-400"
      }`}>
        <div className="flex items-start gap-3">
          {/* Ícone */}
          <div className="text-3xl mt-1 shrink-0">
            {getMissionIcon(mission.targetType)}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-amber-900 text-sm leading-tight">
                {mission.title}
              </h3>
              <Badge className={`text-xs shrink-0 ${getMissionTypeColor(mission.missionType)}`}>
                {getMissionTypeLabel(mission.missionType)}
              </Badge>
            </div>

            {mission.description && (
              <p className="text-xs text-amber-700 mb-2">{mission.description}</p>
            )}

            {/* Progresso */}
            {mission.userProgress && mission.targetValue && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-amber-700 mb-1">
                  <span>Progresso</span>
                  <span>{mission.userProgress.progress}/{mission.targetValue}</span>
                </div>
                <Progress
                  value={mission.progressPercent}
                  className="h-2"
                />
              </div>
            )}

            {/* Recompensas */}
            <div className="flex items-center gap-3 mb-3">
              {mission.rewardHarvest && Number(mission.rewardHarvest) > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <span>🌾</span>
                  <span className="font-semibold">
                    +{(Number(mission.rewardHarvest) / 1e18).toFixed(2)} HARVEST
                  </span>
                </div>
              )}
              {mission.rewardFarm && Number(mission.rewardFarm) > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-700">
                  <span>🏛️</span>
                  <span className="font-semibold">
                    +{(Number(mission.rewardFarm) / 1e18).toFixed(2)} FARM
                  </span>
                </div>
              )}
            </div>

            {/* Status e ações */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${statusInfo.color}`}>
                {isClaimed ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {statusInfo.label}
                  </span>
                ) : (
                  statusInfo.label
                )}
              </span>

              {statusInfo.canStart && (
                <Button
                  size="sm"
                  onClick={() => startMutation.mutate({ missionId: mission.id })}
                  disabled={startMutation.isPending}
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                >
                  {startMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Iniciar"
                  )}
                </Button>
              )}

              {statusInfo.canClaim && (
                <Button
                  size="sm"
                  onClick={() => claimMutation.mutate({ missionId: mission.id })}
                  disabled={claimMutation.isPending}
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                >
                  {claimMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Gift className="h-3 w-3 mr-1" />
                      Coletar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Lista de missões por tipo
 */
function MissionList({ missions, emptyMessage }: { missions: MissionWithProgress[]; emptyMessage: string }) {
  if (missions.length === 0) {
    return (
      <Card className="p-8 text-center border-amber-200 bg-amber-50">
        <Target className="h-10 w-10 text-amber-400 mx-auto mb-2" />
        <p className="text-amber-700 font-medium">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Página de Missões
 */
export default function Missions() {
  const { data: allMissions = [], isLoading } = trpc.game.missions.getMissions.useQuery();

  const dailyMissions = allMissions.filter((m) => m.missionType === "daily");
  const weeklyMissions = allMissions.filter((m) => m.missionType === "weekly");
  const specialMissions = allMissions.filter((m) => m.missionType === "special");

  // Estatísticas
  const completedCount = allMissions.filter(
    (m) => m.userProgress?.status === "completed" || m.userProgress?.status === "claimed"
  ).length;
  const inProgressCount = allMissions.filter(
    (m) => m.userProgress?.status === "in_progress"
  ).length;
  const claimableCount = allMissions.filter(
    (m) => m.userProgress?.status === "completed"
  ).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-amber-900 mb-1">🎯 Missões</h1>
          <p className="text-amber-700 text-sm">
            Complete objetivos para ganhar tokens HARVEST e FARM
          </p>
        </motion.div>

        {/* Estatísticas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Card className="p-3 border-amber-200 text-center">
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            <p className="text-xs text-amber-700">Em Progresso</p>
          </Card>
          <Card className="p-3 border-amber-200 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-amber-700">Completadas</p>
          </Card>
          <Card className="p-3 border-amber-200 text-center bg-green-50">
            <p className="text-2xl font-bold text-amber-600">{claimableCount}</p>
            <p className="text-xs text-amber-700">Para Coletar</p>
          </Card>
        </motion.div>

        {/* Alerta de recompensas disponíveis */}
        {claimableCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-3 mb-4 bg-green-50 border-green-300">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Você tem {claimableCount} recompensa(s) para coletar!
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Abas de missões */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="all">
                  Todas ({allMissions.length})
                </TabsTrigger>
                <TabsTrigger value="daily">
                  Diárias ({dailyMissions.length})
                </TabsTrigger>
                <TabsTrigger value="weekly">
                  Semanais ({weeklyMissions.length})
                </TabsTrigger>
                <TabsTrigger value="special">
                  Especiais ({specialMissions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <MissionList
                  missions={allMissions}
                  emptyMessage="Nenhuma missão disponível no momento"
                />
              </TabsContent>

              <TabsContent value="daily">
                <MissionList
                  missions={dailyMissions}
                  emptyMessage="Nenhuma missão diária disponível"
                />
              </TabsContent>

              <TabsContent value="weekly">
                <MissionList
                  missions={weeklyMissions}
                  emptyMessage="Nenhuma missão semanal disponível"
                />
              </TabsContent>

              <TabsContent value="special">
                <MissionList
                  missions={specialMissions}
                  emptyMessage="Nenhuma missão especial disponível"
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
