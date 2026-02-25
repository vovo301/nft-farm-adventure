import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface Crop {
  id: number;
  positionX: number | null;
  positionY: number | null;
  status: "growing" | "ready" | "harvested" | "failed";
  expectedHarvestAt: Date;
  harvestedAt: Date | null;
  yield: number | null;
  luckFactor: number;
  riskEvent: string | null;
  cropName: string;
  rarity: number;
  growthTimeSeconds: number;
}

interface FarmGridProps {
  landId: number;
  crops: Crop[];
  isLoading?: boolean;
  onPlantClick?: (x: number, y: number) => void;
  onCropClick?: (crop: Crop) => void;
}

const GRID_SIZE = 10;
const CELL_SIZE = 60; // pixels

/**
 * Calcula o progresso de crescimento de um cultivo (0-100%)
 */
function getGrowthProgress(crop: Crop): number {
  if (crop.status === "harvested" || crop.status === "failed") return 100;
  if (crop.status === "ready") return 100;

  const now = new Date().getTime();
  const expectedHarvestTime = new Date(crop.expectedHarvestAt).getTime();
  const plantedTime = expectedHarvestTime - crop.growthTimeSeconds * 1000;

  const progress = ((now - plantedTime) / (expectedHarvestTime - plantedTime)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

/**
 * Retorna a cor baseada na raridade
 */
function getRarityColor(rarity: number): string {
  switch (rarity) {
    case 1:
      return "bg-gray-400"; // Comum
    case 2:
      return "bg-green-400"; // Incomum
    case 3:
      return "bg-blue-400"; // Raro
    case 4:
      return "bg-purple-400"; // Épico
    case 5:
      return "bg-yellow-400"; // Lendário
    default:
      return "bg-gray-300";
  }
}

/**
 * Retorna o ícone de status
 */
function getStatusIcon(crop: Crop) {
  if (crop.status === "ready") {
    return <Zap className="w-4 h-4 text-yellow-500" />;
  }
  if (crop.riskEvent && crop.riskEvent !== "none") {
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  }
  return <Droplets className="w-4 h-4 text-blue-500" />;
}

/**
 * Célula individual da grade
 */
function GridCell({
  x,
  y,
  crop,
  onPlantClick,
  onCropClick,
}: {
  x: number;
  y: number;
  crop?: Crop | undefined;
  onPlantClick?: (x: number, y: number) => void;
  onCropClick?: (crop: Crop) => void;
}) {
  const progress = crop ? getGrowthProgress(crop) : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
      }}
    >
      <button
        onClick={() => {
          if (crop) {
            onCropClick?.(crop);
          } else {
            onPlantClick?.(x, y);
          }
        }}
        className={`
          w-full h-full rounded-lg border-2 transition-all
          ${
            crop
              ? `${getRarityColor(crop.rarity)} border-yellow-600 shadow-md`
              : "bg-amber-100 border-amber-300 hover:border-amber-500 hover:bg-amber-200"
          }
        `}
      >
        {crop ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-1 relative">
            {/* Barra de progresso */}
            <div className="absolute inset-0 rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-green-500 opacity-30"
              />
            </div>

            {/* Conteúdo */}
            <div className="relative z-10 flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold text-gray-800 truncate max-w-full">
                {crop.cropName.slice(0, 8)}
              </span>
              <div className="text-xs text-gray-700">
                {Math.round(progress)}%
              </div>
              {getStatusIcon(crop)}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xl">+</span>
          </div>
        )}
      </button>
    </motion.div>
  );
}

/**
 * Componente principal da grade de fazenda
 */
export function FarmGrid({
  landId,
  crops,
  isLoading = false,
  onPlantClick,
  onCropClick,
}: FarmGridProps) {
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);

  // Criar mapa de cultivos por posição
  const cropMap = new Map<string, Crop>();
  crops.forEach((crop) => {
    if (crop.positionX !== null && crop.positionY !== null) {
      cropMap.set(`${crop.positionX},${crop.positionY}`, crop);
    }
  });

  const handlePlantClick = useCallback(
    (x: number, y: number) => {
      setSelectedCell({ x, y });
      onPlantClick?.(x, y);
    },
    [onPlantClick]
  );

  const handleCropClick = useCallback(
    (crop: Crop) => {
      if (crop.positionX !== null && crop.positionY !== null) {
        setSelectedCell({ x: crop.positionX, y: crop.positionY });
      }
      onCropClick?.(crop);
    },
    [onCropClick]
  );

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-amber-900">Sua Fazenda</h3>
        <p className="text-sm text-amber-700">
          {crops.length} cultivos | {GRID_SIZE * GRID_SIZE - crops.length} espaços livres
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin">
            <Droplets className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      ) : (
        <div
          className="inline-grid gap-1 p-4 bg-white rounded-lg border-2 border-amber-300"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          }}
        >
          <AnimatePresence>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const x = idx % GRID_SIZE;
              const y = Math.floor(idx / GRID_SIZE);
              const crop = cropMap.get(`${x},${y}`) || undefined;

              return (
                <motion.div
                  key={`${x}-${y}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: (idx % GRID_SIZE) * 0.02 }}
                >
                  <GridCell
                    x={x}
                    y={y}
                    crop={crop}
                    onPlantClick={handlePlantClick}
                    onCropClick={handleCropClick}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded" />
          <span>Comum</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded" />
          <span>Incomum</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded" />
          <span>Raro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-400 rounded" />
          <span>Épico</span>
        </div>
      </div>
    </Card>
  );
}
