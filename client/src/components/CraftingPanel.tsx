import { motion, AnimatePresence } from "framer-motion";
import { Hammer, Clock, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";

interface Recipe {
  id: number;
  name: string;
  description: string | null;
  craftingTimeSeconds: number;
  costHarvest: bigint | null;
  outputItemTypeId: number;
  outputQuantity: number;
  active: boolean;
  discoveryRequired: boolean;
  ingredients: Array<{
    itemTypeId: number;
    itemName: string;
    quantity: number;
  }>;
}

interface CraftingJob {
  id: number;
  userId: number;
  recipeId: number;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  recipeName: string;
  outputItemTypeId: number;
  outputQuantity: number;
  craftingTimeSeconds: number;
}

/**
 * Formata tempo em segundos para formato legível
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

/**
 * Calcula o tempo restante de um job
 */
function getTimeRemaining(completedAt: Date | null): number {
  if (!completedAt) return 0;
  const now = new Date();
  const remaining = Math.max(0, completedAt.getTime() - now.getTime());
  return Math.ceil(remaining / 1000);
}

/**
 * Cartão de receita de crafting
 */
function RecipeCard({
  recipe,
  onStart,
  isLoading,
}: {
  recipe: Recipe;
  onStart: (recipeId: number) => void;
  isLoading: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
          {recipe.description && (
            <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
          )}
        </div>
        <Hammer className="w-5 h-5 text-amber-600 flex-shrink-0 ml-2" />
      </div>

      {/* Ingredientes */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Ingredientes:</p>
        <div className="space-y-1">
          {recipe.ingredients.map((ingredient) => (
            <div
              key={ingredient.itemTypeId}
              className="text-xs text-gray-600 flex justify-between"
            >
              <span>{ingredient.itemName}</span>
              <span className="font-medium">x{ingredient.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tempo e Custo */}
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
        <Clock className="w-4 h-4" />
        <span>{formatTime(recipe.craftingTimeSeconds)}</span>
        {recipe.costHarvest && (
          <>
            <span className="text-gray-400">•</span>
            <Zap className="w-4 h-4" />
            <span>{recipe.costHarvest.toString()} HARVEST</span>
          </>
        )}
      </div>

      {/* Botão de Iniciar */}
      <Button
        onClick={() => onStart(recipe.id)}
        disabled={isLoading}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
      >
        {isLoading ? "Iniciando..." : "Iniciar Crafting"}
      </Button>
    </motion.div>
  );
}

/**
 * Cartão de job de crafting em progresso
 */
function CraftingJobCard({
  job,
  onComplete,
  onCancel,
  isLoading,
}: {
  job: CraftingJob;
  onComplete: (jobId: number) => void;
  onCancel: (jobId: number) => void;
  isLoading: boolean;
}) {
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(job.completedAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(job.completedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [job.completedAt]);

  const isReady = timeRemaining <= 0;
  const progress = Math.max(
    0,
    100 - (timeRemaining / job.craftingTimeSeconds) * 100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{job.recipeName}</h3>
          <p className="text-sm text-gray-600">
            Produz: {job.outputQuantity}x item
          </p>
        </div>
        {isReady ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <Clock className="w-5 h-5 text-amber-600 animate-spin" />
        )}
      </div>

      {/* Barra de Progresso */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full"
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {isReady ? (
            <span className="text-green-600 font-medium">Pronto para colher!</span>
          ) : (
            `${formatTime(timeRemaining)} restante`
          )}
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        {isReady ? (
          <Button
            onClick={() => onComplete(job.id)}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? "Coletando..." : "Coletar"}
          </Button>
        ) : (
          <Button
            onClick={() => onCancel(job.id)}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? "Cancelando..." : "Cancelar"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Painel principal de crafting
 */
export function CraftingPanel() {
  const [activeTab, setActiveTab] = useState<"recipes" | "jobs">("recipes");
  const [loadingRecipeId, setLoadingRecipeId] = useState<number | null>(null);
  const [loadingJobId, setLoadingJobId] = useState<number | null>(null);

  // Queries
  const recipesQuery = trpc.game.crafting.getRecipes.useQuery();
  const jobsQuery = trpc.game.crafting.getUserJobs.useQuery();

  // Mutations
  const startJobMutation = trpc.game.crafting.startJob.useMutation({
    onSuccess: () => {
      toast.success("Crafting iniciado!");
      jobsQuery.refetch();
      setLoadingRecipeId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar crafting");
      setLoadingRecipeId(null);
    },
  });

  const completeJobMutation = trpc.game.crafting.completeJob.useMutation({
    onSuccess: () => {
      toast.success("Item coletado com sucesso!");
      jobsQuery.refetch();
      setLoadingJobId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao coletar item");
      setLoadingJobId(null);
    },
  });

  const cancelJobMutation = trpc.game.crafting.cancelJob.useMutation({
    onSuccess: () => {
      toast.success("Crafting cancelado!");
      jobsQuery.refetch();
      setLoadingJobId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cancelar crafting");
      setLoadingJobId(null);
    },
  });

  const handleStartJob = (recipeId: number) => {
    setLoadingRecipeId(recipeId);
    startJobMutation.mutate({ recipeId });
  };

  const handleCompleteJob = (jobId: number) => {
    setLoadingJobId(jobId);
    completeJobMutation.mutate({ jobId });
  };

  const handleCancelJob = (jobId: number) => {
    setLoadingJobId(jobId);
    cancelJobMutation.mutate({ jobId });
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Hammer className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Crafting</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("recipes")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "recipes"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Receitas ({recipesQuery.data?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "jobs"
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Em Progresso ({jobsQuery.data?.length || 0})
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === "recipes" && (
              <motion.div
                key="recipes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {recipesQuery.isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Carregando receitas...</p>
                  </div>
                ) : recipesQuery.data && recipesQuery.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipesQuery.data.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe as Recipe}
                        onStart={handleStartJob}
                        isLoading={loadingRecipeId === recipe.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Nenhuma receita disponível</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "jobs" && (
              <motion.div
                key="jobs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {jobsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Carregando jobs...</p>
                  </div>
                ) : jobsQuery.data && jobsQuery.data.length > 0 ? (
                  <div className="space-y-4">
                    {jobsQuery.data.map((job) => (
                      <CraftingJobCard
                        key={job.id}
                        job={job as CraftingJob}
                        onComplete={handleCompleteJob}
                        onCancel={handleCancelJob}
                        isLoading={loadingJobId === job.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Nenhum crafting em progresso</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

export default CraftingPanel;
