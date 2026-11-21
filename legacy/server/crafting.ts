import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  craftingRecipes,
  craftingJobs,
  craftingRecipeInputs,
  inventory,
  itemTypes,
} from "../drizzle/schema";
import { removeItemFromInventory, addItemToInventory } from "./inventory";

/**
 * Inicia um job de crafting
 */
export async function startCraftingJob(
  userId: number,
  recipeId: number
): Promise<{ success: boolean; jobId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Buscar receita
    const recipe = await db
      .select()
      .from(craftingRecipes)
      .where(eq(craftingRecipes.id, recipeId))
      .limit(1);

    if (recipe.length === 0) {
      return { success: false, error: "Recipe not found" };
    }

    const recipeData = recipe[0]!;

    // Buscar ingredientes da receita
    const ingredients = await db
      .select({
        itemTypeId: craftingRecipeInputs.itemTypeId,
        quantity: craftingRecipeInputs.quantity,
      })
      .from(craftingRecipeInputs)
      .where(eq(craftingRecipeInputs.recipeId, recipeId));

    // Validar se o jogador tem todos os ingredientes
    for (const ingredient of ingredients) {
      const playerItem = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.userId, userId),
            eq(inventory.itemTypeId, ingredient.itemTypeId)
          )
        )
        .limit(1);

      if (
        playerItem.length === 0 ||
        playerItem[0]!.quantity < ingredient.quantity
      ) {
        return { success: false, error: "Insufficient ingredients" };
      }
    }

    // Remover ingredientes do inventário
    for (const ingredient of ingredients) {
      await removeItemFromInventory(
        userId,
        ingredient.itemTypeId,
        ingredient.quantity
      );
    }

    // Calcular tempo de crafting
    const craftingTimeMs = recipeData.craftingTimeSeconds * 1000;
    const completedAt = new Date(Date.now() + craftingTimeMs);

    // Criar job de crafting
    const result = await db.insert(craftingJobs).values({
      userId,
      recipeId,
      status: "in_progress",
      startedAt: new Date(),
      completedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, jobId: 1 }; // ID será retornado pelo banco
  } catch (error) {
    console.error("[Crafting] Error starting job:", error);
    return { success: false, error: "Failed to start crafting job" };
  }
}

/**
 * Completa um job de crafting
 */
export async function completeCraftingJob(
  jobId: number,
  userId: number
): Promise<{ success: boolean; itemReceived?: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Buscar job
    const job = await db
      .select()
      .from(craftingJobs)
      .where(eq(craftingJobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return { success: false, error: "Job not found" };
    }

    const jobData = job[0]!;

    // Verificar se é do usuário
    if (jobData.userId !== userId) {
      return { success: false, error: "Not your job" };
    }

    // Verificar se já foi completado
    if (jobData.status !== "in_progress") {
      return { success: false, error: "Job is not in progress" };
    }

    // Verificar se o tempo passou
    const now = new Date();
    if (now < jobData.completedAt!) {
      return { success: false, error: "Job not ready yet" };
    }

    // Buscar receita
    const recipe = await db
      .select()
      .from(craftingRecipes)
      .where(eq(craftingRecipes.id, jobData.recipeId))
      .limit(1);

    if (recipe.length === 0) {
      return { success: false, error: "Recipe not found" };
    }

    const recipeData = recipe[0]!;

    // Calcular sucesso (85% de chance por padrão)
    const roll = Math.random() * 100;
    const success = roll < 85;

    // Atualizar status do job
    await db
      .update(craftingJobs)
      .set({
        status: success ? "completed" : "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(craftingJobs.id, jobId));

    if (success) {
      // Adicionar item ao inventário
      const quantity = recipeData.outputQuantity || 1;
      await addItemToInventory(userId, recipeData.outputItemTypeId, quantity);
      return { success: true, itemReceived: true };
    } else {
      return { success: true, itemReceived: false };
    }
  } catch (error) {
    console.error("[Crafting] Error completing job:", error);
    return { success: false, error: "Failed to complete crafting job" };
  }
}

/**
 * Cancela um job de crafting
 */
export async function cancelCraftingJob(
  jobId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Buscar job
    const job = await db
      .select()
      .from(craftingJobs)
      .where(eq(craftingJobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return { success: false, error: "Job not found" };
    }

    const jobData = job[0]!;

    // Verificar se é do usuário
    if (jobData.userId !== userId) {
      return { success: false, error: "Not your job" };
    }

    // Verificar se ainda está em progresso
    if (jobData.status !== "in_progress") {
      return { success: false, error: "Job cannot be cancelled" };
    }

    // Buscar receita para devolver ingredientes
    const recipe = await db
      .select()
      .from(craftingRecipes)
      .where(eq(craftingRecipes.id, jobData.recipeId))
      .limit(1);

    if (recipe.length === 0) {
      return { success: false, error: "Recipe not found" };
    }

    // Buscar ingredientes
    const ingredients = await db
      .select({
        itemTypeId: craftingRecipeInputs.itemTypeId,
        quantity: craftingRecipeInputs.quantity,
      })
      .from(craftingRecipeInputs)
      .where(eq(craftingRecipeInputs.recipeId, jobData.recipeId));

    // Devolver ingredientes
    for (const ingredient of ingredients) {
      await addItemToInventory(
        userId,
        ingredient.itemTypeId,
        ingredient.quantity
      );
    }

    // Atualizar status
    await db
      .update(craftingJobs)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(craftingJobs.id, jobId));

    return { success: true };
  } catch (error) {
    console.error("[Crafting] Error cancelling job:", error);
    return { success: false, error: "Failed to cancel crafting job" };
  }
}

/**
 * Obtém jobs de crafting do usuário
 */
export async function getUserCraftingJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const jobs = await db
      .select({
        id: craftingJobs.id,
        userId: craftingJobs.userId,
        recipeId: craftingJobs.recipeId,
        status: craftingJobs.status,
        startedAt: craftingJobs.startedAt,
        completedAt: craftingJobs.completedAt,
        createdAt: craftingJobs.createdAt,
        updatedAt: craftingJobs.updatedAt,
        recipeName: craftingRecipes.name,
        outputItemTypeId: craftingRecipes.outputItemTypeId,
        outputQuantity: craftingRecipes.outputQuantity,
        craftingTimeSeconds: craftingRecipes.craftingTimeSeconds,
      })
      .from(craftingJobs)
      .innerJoin(craftingRecipes, eq(craftingJobs.recipeId, craftingRecipes.id))
      .where(eq(craftingJobs.userId, userId));

    return jobs;
  } catch (error) {
    console.error("[Crafting] Error fetching user jobs:", error);
    return [];
  }
}

/**
 * Obtém todas as receitas de crafting disponíveis
 */
export async function getAvailableRecipes() {
  const db = await getDb();
  if (!db) return [];

  try {
    const recipes = await db
      .select({
        id: craftingRecipes.id,
        name: craftingRecipes.name,
        description: craftingRecipes.description,
        craftingTimeSeconds: craftingRecipes.craftingTimeSeconds,
        costHarvest: craftingRecipes.costHarvest,
        outputItemTypeId: craftingRecipes.outputItemTypeId,
        outputQuantity: craftingRecipes.outputQuantity,
        active: craftingRecipes.active,
        discoveryRequired: craftingRecipes.discoveryRequired,
      })
      .from(craftingRecipes)
      .where(eq(craftingRecipes.active, true));

    // Buscar ingredientes para cada receita
    const recipesWithIngredients = await Promise.all(
      recipes.map(async (recipe) => {
        const ingredients = await db
          .select({
            itemTypeId: craftingRecipeInputs.itemTypeId,
            itemName: itemTypes.name,
            quantity: craftingRecipeInputs.quantity,
          })
          .from(craftingRecipeInputs)
          .innerJoin(itemTypes, eq(craftingRecipeInputs.itemTypeId, itemTypes.id))
          .where(eq(craftingRecipeInputs.recipeId, recipe.id));

        return {
          ...recipe,
          ingredients,
        };
      })
    );

    return recipesWithIngredients;
  } catch (error) {
    console.error("[Crafting] Error fetching recipes:", error);
    return [];
  }
}

/**
 * Obtém detalhes de uma receita
 */
export async function getRecipeDetails(recipeId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const recipe = await db
      .select()
      .from(craftingRecipes)
      .where(eq(craftingRecipes.id, recipeId))
      .limit(1);

    if (recipe.length === 0) return null;

    const recipeData = recipe[0]!;

    // Buscar ingredientes
    const ingredients = await db
      .select({
        itemTypeId: craftingRecipeInputs.itemTypeId,
        itemName: itemTypes.name,
        quantity: craftingRecipeInputs.quantity,
      })
      .from(craftingRecipeInputs)
      .innerJoin(itemTypes, eq(craftingRecipeInputs.itemTypeId, itemTypes.id))
      .where(eq(craftingRecipeInputs.recipeId, recipeId));

    // Buscar item de saída
    const outputItem = await db
      .select()
      .from(itemTypes)
      .where(eq(itemTypes.id, recipeData.outputItemTypeId))
      .limit(1);

    return {
      ...recipeData,
      ingredients,
      outputItem: outputItem[0],
    };
  } catch (error) {
    console.error("[Crafting] Error fetching recipe details:", error);
    return null;
  }
}
