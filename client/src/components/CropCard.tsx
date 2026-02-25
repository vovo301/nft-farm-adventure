import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Droplets, AlertTriangle, Zap, TrendingUp, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CropCardProps {
  id: number;
  cropName: string;
  status: "growing" | "ready" | "harvested" | "failed";
  expectedHarvestAt: Date;
  harvestedAt?: Date | null;
  yield?: number | null;
  luckFactor: number;
  riskEvent: string | null;
  rarity: number;
  growthTimeSeconds: number;
  onHarvest?: () => void;
  onRemove?: () => void;
  isHarvesting?: boolean;
}

/**
 * Calcula o tempo restante até a colheita
 */
function getTimeRemaining(expectedHarvestAt: Date): {
  hours: number;
  minutes: number;
  seconds: number;
  isReady: boolean;
} {
  const now = new Date().getTime();
  const harvestTime = new Date(expectedHarvestAt).getTime();
  const diff = harvestTime - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isReady: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isReady: false };
}

/**
 * Retorna a cor baseada na raridade
 */
function getRarityBadgeVariant(rarity: number): "default" | "secondary" | "destructive" | "outline" {
  switch (rarity) {
    case 1:
      return "secondary"; // Comum
    case 2:
      return "outline"; // Incomum
    case 3:
      return "default"; // Raro
    case 4:
      return "destructive"; // Épico
    case 5:
      return "default"; // Lendário
    default:
      return "secondary";
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
 * Retorna o nome do evento de risco
 */
function getRiskEventName(event: string | null): string {
  if (!event || event === "none") return "Nenhum";
  switch (event.toLowerCase()) {
    case "pest":
      return "Pragas (-30%)";
    case "drought":
      return "Seca (-20%)";
    case "flood":
      return "Enchente (-25%)";
    case "disease":
      return "Doença (-35%)";
    default:
      return event;
  }
}

/**
 * Componente de cartão de cultivo
 */
export function CropCard({
  id,
  cropName,
  status,
  expectedHarvestAt,
  harvestedAt,
  yield: harvestedYield,
  luckFactor,
  riskEvent,
  rarity,
  growthTimeSeconds,
  onHarvest,
  onRemove,
  isHarvesting = false,
}: CropCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(expectedHarvestAt)
  );

  // Atualizar tempo restante a cada segundo
  useEffect(() => {
    if (status === "growing") {
      const interval = setInterval(() => {
        setTimeRemaining(getTimeRemaining(expectedHarvestAt));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, expectedHarvestAt]);

  const progressPercent = Math.min(
    ((new Date().getTime() - (new Date(expectedHarvestAt).getTime() - growthTimeSeconds * 1000)) /
      (growthTimeSeconds * 1000)) *
      100,
    100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 text-lg">{cropName}</h3>
            <div className="flex gap-2 mt-1">
              <Badge variant={getRarityBadgeVariant(rarity)}>
                {getRarityName(rarity)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {status === "growing" && "Crescendo"}
                {status === "ready" && "Pronto"}
                {status === "harvested" && "Colhido"}
                {status === "failed" && "Falhou"}
              </Badge>
            </div>
          </div>
          <div className="text-2xl">
            {status === "ready" ? (
              <Zap className="w-6 h-6 text-yellow-500" />
            ) : (
              <Droplets className="w-6 h-6 text-blue-500" />
            )}
          </div>
        </div>

        {/* Progresso de crescimento */}
        {status === "growing" && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-amber-700 mb-1">
              <span>Progresso</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-green-400 to-green-600"
              />
            </div>
          </div>
        )}

        {/* Tempo restante */}
        {status === "growing" && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Tempo até colheita</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">
              {String(timeRemaining.hours).padStart(2, "0")}:
              {String(timeRemaining.minutes).padStart(2, "0")}:
              {String(timeRemaining.seconds).padStart(2, "0")}
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="p-2 bg-white rounded border border-amber-200">
            <div className="text-xs text-amber-600 font-medium">Sorte</div>
            <div className="text-lg font-bold text-amber-900">
              {(luckFactor * 100).toFixed(0)}%
            </div>
          </div>
          <div className="p-2 bg-white rounded border border-amber-200">
            <div className="text-xs text-amber-600 font-medium">Risco</div>
            <div className="text-sm font-semibold text-amber-900">
              {getRiskEventName(riskEvent)}
            </div>
          </div>
        </div>

        {/* Resultado da colheita */}
        {status === "harvested" && harvestedYield !== null && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Rendimento</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{harvestedYield} unidades</div>
            <div className="text-xs text-green-600 mt-1">
              Colhido em {new Date(harvestedAt || "").toLocaleString("pt-BR")}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2">
          {status === "ready" && (
            <Button
              onClick={onHarvest}
              disabled={isHarvesting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isHarvesting ? "Colhendo..." : "Colher Agora"}
            </Button>
          )}
          {status === "harvested" && (
            <Button
              onClick={onRemove}
              variant="outline"
              className="flex-1"
            >
              Remover
            </Button>
          )}
          {status === "growing" && (
            <Button
              disabled
              variant="outline"
              className="flex-1 opacity-50"
            >
              Crescendo...
            </Button>
          )}
          {status === "failed" && (
            <Button
              onClick={onRemove}
              variant="destructive"
              className="flex-1"
            >
              Remover
            </Button>
          )}
        </div>

        {/* Dica */}
        {riskEvent && riskEvent !== "none" && (
          <div className="mt-3 p-2 bg-red-50 rounded border border-red-200 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              Este cultivo foi afetado por <strong>{getRiskEventName(riskEvent)}</strong>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
