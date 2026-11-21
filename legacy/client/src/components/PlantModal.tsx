import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CropType {
  id: number;
  name: string;
  description?: string;
  growthTimeSeconds: number;
  baseYield: number;
  rarity: number;
  marketPrice: bigint;
  active: boolean;
}

interface PlantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landId: number;
  gridX: number;
  gridY: number;
  onSuccess?: () => void;
}

/**
 * Formata tempo em segundos para formato legível
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Retorna a cor baseada na raridade
 */
function getRarityColor(rarity: number): string {
  switch (rarity) {
    case 1:
      return "bg-gray-100 text-gray-800";
    case 2:
      return "bg-green-100 text-green-800";
    case 3:
      return "bg-blue-100 text-blue-800";
    case 4:
      return "bg-purple-100 text-purple-800";
    case 5:
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Retorna o nome da raridade
 */
function getRarityName(rarity: number): string {
  switch (rarity) {
    case 1:
      return "Comum";
    case 2:
      return "Incomum";
    case 3:
      return "Raro";
    case 4:
      return "Épico";
    case 5:
      return "Lendário";
    default:
      return "Desconhecido";
  }
}

/**
 * Cartão de tipo de cultivo
 */
function CropTypeCard({
  cropType,
  isSelected,
  isPlanting,
  onSelect,
}: {
  cropType: CropType;
  isSelected: boolean;
  isPlanting: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left
        ${
          isSelected
            ? "border-green-500 bg-green-50"
            : "border-amber-200 bg-amber-50 hover:border-amber-400"
        }
      `}
      disabled={isPlanting}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900">{cropType.name}</h4>
          {cropType.description && (
            <p className="text-xs text-amber-700 mt-1">{cropType.description}</p>
          )}
        </div>
        <Badge className={getRarityColor(cropType.rarity)}>
          {getRarityName(cropType.rarity)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-white rounded border border-amber-200">
          <div className="text-amber-600 font-medium">Crescimento</div>
          <div className="font-bold text-amber-900">{formatTime(cropType.growthTimeSeconds)}</div>
        </div>
        <div className="p-2 bg-white rounded border border-amber-200">
          <div className="text-amber-600 font-medium">Rendimento</div>
          <div className="font-bold text-amber-900">{cropType.baseYield} un</div>
        </div>
        <div className="p-2 bg-white rounded border border-amber-200">
          <div className="text-amber-600 font-medium">Preço</div>
          <div className="font-bold text-amber-900">
            {(Number(cropType.marketPrice) / 1e18).toFixed(2)} HARVEST
          </div>
        </div>
      </div>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 p-2 bg-green-100 rounded border border-green-300 text-xs text-green-800 font-medium"
        >
          ✓ Selecionado
        </motion.div>
      )}
    </motion.button>
  );
}

/**
 * Modal de plantio
 */
export function PlantModal({
  open,
  onOpenChange,
  landId,
  gridX,
  gridY,
  onSuccess,
}: PlantModalProps) {
  const [selectedCropTypeId, setSelectedCropTypeId] = useState<number | null>(null);

  // Buscar tipos de cultivos
  const { data: cropTypes = [], isLoading: isLoadingCropTypes } =
    trpc.game.farming.getCropTypes.useQuery(undefined, {
      enabled: open,
    });

  // Mutation para plantar
  const plantMutation = trpc.game.farming.plantCrop.useMutation({
    onSuccess: () => {
      toast.success("Cultivo plantado com sucesso!");
      setSelectedCropTypeId(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao plantar cultivo");
    },
  });

  const handlePlant = () => {
    if (!selectedCropTypeId) {
      toast.error("Selecione um tipo de cultivo");
      return;
    }

    plantMutation.mutate({
      landId,
      cropTypeId: selectedCropTypeId,
      gridX,
      gridY,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Plantar Cultivo</DialogTitle>
          <DialogDescription>
            Posição: ({gridX}, {gridY}) | Selecione o tipo de cultivo que deseja plantar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingCropTypes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : cropTypes.length === 0 ? (
            <div className="text-center py-8 text-amber-700">
              Nenhum tipo de cultivo disponível
            </div>
          ) : (
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-2">
                <AnimatePresence>
                  {cropTypes.map((cropType) => (
                    <CropTypeCard
                      key={cropType.id}
                      cropType={cropType as CropType}
                      isSelected={selectedCropTypeId === cropType.id}
                      isPlanting={plantMutation.isPending}
                      onSelect={() => setSelectedCropTypeId(cropType.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={plantMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePlant}
              disabled={!selectedCropTypeId || plantMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {plantMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Plantando...
                </>
              ) : (
                "Plantar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
