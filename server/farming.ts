import { eq, and, gte, gt } from "drizzle-orm";
import { getDb } from "./db";
import { crops, cropTypes, lands, users } from "../drizzle/schema";
import { addItemToInventory } from "./inventory";

/**
 * Tipos de eventos de risco que podem afetar cultivos
 */
export enum RiskEvent {
  PEST = "pest", // Pragas reduzem rendimento em 30%
  DROUGHT = "drought", // Seca reduz rendimento em 20%
  FLOOD = "flood", // Enchente reduz rendimento em 25%
  DISEASE = "disease", // Doença reduz rendimento em 35%
  NONE = "none", // Sem evento
}

/**
 * Calcula o modificador de sorte/risco para um cultivo
 * Retorna valor entre 0.85 e 1.15 (variação de ±15%)
 */
export function calculateLuckModifier(): number {
  return 0.85 + Math.random() * 0.3;
}

/**
 * Seleciona um evento de risco aleatório
 * 70% de chance de nenhum evento
 * 30% de chance de algum evento
 */
export function selectRiskEvent(): RiskEvent {
  const rand = Math.random();
  if (rand < 0.7) return RiskEvent.NONE;
  if (rand < 0.8) return RiskEvent.PEST;
  if (rand < 0.9) return RiskEvent.DROUGHT;
  if (rand < 0.95) return RiskEvent.FLOOD;
  return RiskEvent.DISEASE;
}

/**
 * Calcula o impacto de um evento de risco no rendimento
 */
export function getRiskEventImpact(event: RiskEvent): number {
  switch (event) {
    case RiskEvent.PEST:
      return 0.7; // 70% do rendimento
    case RiskEvent.DROUGHT:
      return 0.8; // 80% do rendimento
    case RiskEvent.FLOOD:
      return 0.75; // 75% do rendimento
    case RiskEvent.DISEASE:
      return 0.65; // 65% do rendimento
    case RiskEvent.NONE:
      return 1.0; // 100% do rendimento
  }
}

/**
 * Calcula o rendimento final de um cultivo ao colher
 */
export function calculateFinalYield(
  baseYield: number,
  luckModifier: number,
  riskEvent: RiskEvent
): number {
  const riskImpact = getRiskEventImpact(riskEvent);
  const finalYield = Math.floor(baseYield * luckModifier * riskImpact);
  return Math.max(finalYield, 1); // Mínimo de 1 unidade
}

/**
 * Planta um novo cultivo na terra
 */
export async function plantCrop(
  userId: number,
  landId: number,
  cropTypeId: number,
  gridX: number,
  gridY: number
): Promise<{ success: boolean; cropId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Verificar se a terra pertence ao usuário
    const land = await db
      .select()
      .from(lands)
      .where(and(eq(lands.id, landId), eq(lands.userId, userId)))
      .limit(1);

    if (land.length === 0) {
      return { success: false, error: "Land not found or not owned by user" };
    }

    // Verificar se o tipo de cultivo existe
    const cropType = await db
      .select()
      .from(cropTypes)
      .where(eq(cropTypes.id, cropTypeId))
      .limit(1);

    if (cropType.length === 0) {
      return { success: false, error: "Crop type not found" };
    }

    // Verificar se a posição está disponível
    const existingCrop = await db
      .select()
      .from(crops)
      .where(
        and(
          eq(crops.landId, landId),
          eq(crops.positionX, gridX),
          eq(crops.positionY, gridY),
          gt(crops.expectedHarvestAt, new Date())
        )
      )
      .limit(1);

    if (existingCrop.length > 0) {
      return { success: false, error: "Position already occupied" };
    }

    // Calcular tempo de colheita
    const growthTimeMs = cropType[0].growthTimeSeconds * 1000;
    const expectedHarvestAt = new Date(Date.now() + growthTimeMs);

    // Gerar modificador de sorte e evento de risco
    const luckModifier = calculateLuckModifier();
    const riskEvent = selectRiskEvent();

    // Criar o cultivo
    await db.insert(crops).values({
      landId,
      cropTypeId,
      positionX: gridX,
      positionY: gridY,
      status: "growing",
      plantedAt: new Date(),
      expectedHarvestAt,
      luckFactor: luckModifier,
      riskEvent,
    });

    // Obter o cultivo criado
    const newCrop = await db
      .select()
      .from(crops)
      .where(and(eq(crops.landId, landId), eq(crops.positionX, gridX), eq(crops.positionY, gridY)))
      .orderBy(crops.id)
      .limit(1);

    return { success: true, cropId: newCrop[0]?.id };
  } catch (error) {
    console.error("[Farming] Plant crop error:", error);
    return { success: false, error: "Failed to plant crop" };
  }
}

/**
 * Colhe um cultivo pronto
 */
export async function harvestCrop(
  userId: number,
  cropId: number
): Promise<{ success: boolean; yield?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Obter o cultivo
    const cropResult = await db
      .select()
      .from(crops)
      .where(eq(crops.id, cropId))
      .limit(1);

    if (cropResult.length === 0) {
      return { success: false, error: "Crop not found" };
    }

    const crop = cropResult[0];

    // Verificar se a terra pertence ao usuário
    const land = await db
      .select()
      .from(lands)
      .where(and(eq(lands.id, crop.landId), eq(lands.userId, userId)))
      .limit(1);

    if (land.length === 0) {
      return { success: false, error: "Land not owned by user" };
    }

    // Verificar se o cultivo está pronto
    if (crop.status !== "ready" && new Date() < crop.expectedHarvestAt) {
      return { success: false, error: "Crop not ready for harvest" };
    }

    // Obter tipo de cultivo para rendimento base
    const cropType = await db
      .select()
      .from(cropTypes)
      .where(eq(cropTypes.id, crop.cropTypeId))
      .limit(1);

    if (cropType.length === 0) {
      return { success: false, error: "Crop type not found" };
    }

    // Calcular rendimento final
    const finalYield = calculateFinalYield(
      cropType[0].baseYield,
      crop.luckFactor,
      crop.riskEvent as RiskEvent
    );

    // Atualizar status do cultivo
    await db
      .update(crops)
      .set({
        status: "harvested",
        harvestedAt: new Date(),
        yield: finalYield,
      })
      .where(eq(crops.id, cropId));

    // Adicionar itens ao inventário
    const addResult = await addItemToInventory(userId, cropType[0].itemTypeId, finalYield);
    if (!addResult.success) {
      console.error("[Farming] Failed to add harvested item to inventory:", addResult.error);
      return { success: false, error: "Failed to add harvested item to inventory" };
    }

    return { success: true, yield: finalYield };
  } catch (error) {
    console.error("[Farming] Harvest crop error:", error);
    return { success: false, error: "Failed to harvest crop" };
  }
}

/**
 * Obtém todos os cultivos de uma terra
 */
export async function getLandCrops(landId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(crops)
      .where(eq(crops.landId, landId));
  } catch (error) {
    console.error("[Farming] Get land crops error:", error);
    return [];
  }
}

/**
 * Atualiza status de cultivos que ficaram prontos
 */
export async function updateReadyCrops() {
  const db = await getDb();
  if (!db) return;

  try {
    const now = new Date();
    // Nota: Drizzle ORM não suporta comparações diretas com Date
    // Isso será implementado como um job/cron job no servidor
    console.log("[Farming] Ready crops update scheduled");
  } catch (error) {
    console.error("[Farming] Update ready crops error:", error);
  }
}
