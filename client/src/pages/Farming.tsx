import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { FarmGrid } from "@/components/FarmGrid";
import { CropCard } from "@/components/CropCard";
import { PlantModal } from "@/components/PlantModal";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Página principal de Farming
 */
export default function Farming() {
  const { user } = useAuth();
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null);
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [selectedPlantCell, setSelectedPlantCell] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selectedCrop, setSelectedCrop] = useState<any | null>(null);

  // Buscar terras do jogador
  const { data: lands = [], isLoading: isLoadingLands, refetch: refetchLands } =
    trpc.game.farming.getLands.useQuery();

  // Buscar cultivos da terra selecionada
  const { data: crops = [], isLoading: isLoadingCrops, refetch: refetchCrops } =
    trpc.game.farming.getLandCrops.useQuery(
      { landId: selectedLandId || 0 },
      { enabled: !!selectedLandId }
    );

  // Buscar estatísticas
  const { data: stats } = trpc.game.farming.getStats.useQuery();

  // Mutation para colher
  const harvestMutation = trpc.game.farming.harvestCrop.useMutation({
    onSuccess: (result) => {
      if (result.success && result.yield) {
        toast.success(`Colhido com sucesso! +${result.yield} unidades`);
        refetchCrops();
        setSelectedCrop(null);
      } else {
        toast.error(result.error || "Erro ao colher");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao colher cultivo");
    },
  });

  const handlePlantClick = (x: number, y: number) => {
    if (!selectedLandId) {
      toast.error("Selecione uma terra primeiro");
      return;
    }
    setSelectedPlantCell({ x, y });
    setPlantModalOpen(true);
  };

  const handleCropClick = (crop: any) => {
    setSelectedCrop(crop);
  };

  const handleHarvest = () => {
    if (!selectedCrop) return;
    harvestMutation.mutate({ cropId: selectedCrop.id });
  };

  const handlePlantSuccess = () => {
    refetchCrops();
  };

  // Se não tem terras
  if (!isLoadingLands && lands.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-amber-900 mb-2">Nenhuma Terra Disponível</h1>
            <p className="text-amber-700 mb-6">
              Você precisa comprar uma terra NFT para começar a cultivar
            </p>
            <Button className="bg-amber-600 hover:bg-amber-700">
              Comprar Terra no Marketplace
            </Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-amber-900 mb-1">🌱 Sua Fazenda</h1>
          <p className="text-amber-700 text-sm">Cultive, colha e prospere no Harvest Realm</p>
        </motion.div>

        {/* Estatísticas */}
        {stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
          >
            <Card className="p-3 bg-white border-amber-200">
              <div className="text-xs text-amber-600 font-medium">Terras</div>
              <div className="text-2xl font-bold text-amber-900">{stats.totalLands}</div>
            </Card>
            <Card className="p-3 bg-white border-amber-200">
              <div className="text-xs text-amber-600 font-medium">Total de Cultivos</div>
              <div className="text-2xl font-bold text-amber-900">{stats.totalCrops}</div>
            </Card>
            <Card className="p-3 bg-white border-amber-200">
              <div className="text-xs text-amber-600 font-medium">Crescendo</div>
              <div className="text-2xl font-bold text-blue-600">{stats.growingCrops}</div>
            </Card>
            <Card className="p-3 bg-white border-amber-200">
              <div className="text-xs text-amber-600 font-medium">Prontos</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.readyCrops}</div>
            </Card>
            <Card className="p-3 bg-white border-amber-200">
              <div className="text-xs text-amber-600 font-medium">Total Colhido</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalYield}</div>
            </Card>
          </motion.div>
        )}

        {/* Seletor de Terra */}
        {lands.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold text-amber-900 mb-3">Selecione uma Terra</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {lands.map((land) => (
                <Button
                  key={land.id}
                  onClick={() => setSelectedLandId(land.id)}
                  variant={selectedLandId === land.id ? "default" : "outline"}
                  className={
                    selectedLandId === land.id
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "border-amber-300 hover:border-amber-500"
                  }
                >
                  Terra #{land.id}
                  <span className="ml-2 text-xs opacity-75">
                    ({land.usedSlots}/{land.gridSize})
                  </span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Conteúdo Principal */}
        {selectedLandId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Grade de Fazenda */}
            <div className="lg:col-span-2">
              {isLoadingCrops ? (
                <Card className="p-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                </Card>
              ) : (
                <FarmGrid
                  landId={selectedLandId}
                  crops={crops}
                  isLoading={isLoadingCrops}
                  onPlantClick={handlePlantClick}
                  onCropClick={handleCropClick}
                />
              )}
            </div>

            {/* Painel Lateral */}
            <div className="space-y-4">
              {/* Informações da Terra */}
              <Card className="p-4 bg-white border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-3">Terra #{selectedLandId}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Fertilidade:</span>
                    <span className="font-semibold text-amber-900">
                      {lands.find((l) => l.id === selectedLandId)?.fertilityLevel || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Espaços Usados:</span>
                    <span className="font-semibold text-amber-900">
                      {lands.find((l) => l.id === selectedLandId)?.usedSlots || 0}/
                      {lands.find((l) => l.id === selectedLandId)?.gridSize || 100}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Cultivo Selecionado */}
              {selectedCrop ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CropCard
                    id={selectedCrop.id}
                    cropName={selectedCrop.cropName}
                    status={selectedCrop.status}
                    expectedHarvestAt={new Date(selectedCrop.expectedHarvestAt)}
                    harvestedAt={selectedCrop.harvestedAt}
                    yield={selectedCrop.yield}
                    luckFactor={selectedCrop.luckFactor}
                    riskEvent={selectedCrop.riskEvent}
                    rarity={selectedCrop.rarity}
                    growthTimeSeconds={selectedCrop.growthTimeSeconds}
                    onHarvest={handleHarvest}
                    isHarvesting={harvestMutation.isPending}
                  />
                </motion.div>
              ) : (
                <Card className="p-4 bg-amber-50 border-amber-200 text-center">
                  <BarChart3 className="w-8 h-8 text-amber-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-amber-700">Clique em um cultivo para ver detalhes</p>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* Modal de Plantio */}
        {selectedPlantCell && (
          <PlantModal
            open={plantModalOpen}
            onOpenChange={setPlantModalOpen}
            landId={selectedLandId || 0}
            gridX={selectedPlantCell.x}
            gridY={selectedPlantCell.y}
            onSuccess={handlePlantSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
