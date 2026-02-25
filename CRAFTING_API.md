# API de Crafting - Documentação Completa

## Visão Geral

A API de Crafting permite que clientes gerenciem receitas, iniciem jobs de crafting, e acompanhem o progresso em tempo real.

## Base URL

```
/api/trpc/game.crafting
```

## Autenticação

Todas as rotas requerem autenticação via `protectedProcedure`. O usuário deve estar logado e ter uma sessão válida.

## Endpoints

### 1. Obter Receitas Disponíveis

**Endpoint:** `game.crafting.getRecipes`

**Tipo:** Query

**Autenticação:** Requerida

**Parâmetros:** Nenhum

**Resposta:**
```typescript
Array<{
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
}>
```

**Exemplo de Uso (TypeScript):**
```typescript
import { trpc } from "@/lib/trpc";

const recipes = await trpc.game.crafting.getRecipes.query();
console.log(recipes); // Array de receitas
```

**Exemplo de Resposta:**
```json
[
  {
    "id": 1,
    "name": "Pão de Trigo",
    "description": "Transforma trigo em um delicioso pão",
    "craftingTimeSeconds": 30,
    "costHarvest": "10000000000000000",
    "outputItemTypeId": 2,
    "outputQuantity": 1,
    "active": true,
    "discoveryRequired": false,
    "ingredients": [
      {
        "itemTypeId": 1,
        "itemName": "Trigo",
        "quantity": 3
      }
    ]
  }
]
```

---

### 2. Obter Detalhes de Receita

**Endpoint:** `game.crafting.getRecipeDetails`

**Tipo:** Query

**Autenticação:** Requerida

**Parâmetros:**
```typescript
{
  recipeId: number;
}
```

**Resposta:**
```typescript
{
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
  outputItem: {
    id: number;
    name: string;
    category: string;
    rarity: number | null;
    description: string | null;
    maxStackSize: number;
    active: boolean;
  };
} | null
```

**Exemplo de Uso:**
```typescript
const recipe = await trpc.game.crafting.getRecipeDetails.query({ 
  recipeId: 1 
});
```

---

### 3. Obter Jobs de Crafting do Usuário

**Endpoint:** `game.crafting.getUserJobs`

**Tipo:** Query

**Autenticação:** Requerida

**Parâmetros:** Nenhum

**Resposta:**
```typescript
Array<{
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
}>
```

**Exemplo de Uso:**
```typescript
const jobs = await trpc.game.crafting.getUserJobs.query();
console.log(jobs); // Array de jobs do usuário
```

---

### 4. Iniciar Job de Crafting

**Endpoint:** `game.crafting.startJob`

**Tipo:** Mutation

**Autenticação:** Requerida

**Parâmetros:**
```typescript
{
  recipeId: number;
}
```

**Resposta:**
```typescript
{
  success: boolean;
  jobId?: number;
  error?: string;
}
```

**Erros Possíveis:**
- `"Database not available"` - Erro de conexão com banco
- `"Recipe not found"` - Receita não existe
- `"Insufficient ingredients"` - Faltam ingredientes
- `"Failed to start crafting job"` - Erro genérico

**Exemplo de Uso:**
```typescript
const mutation = trpc.game.crafting.startJob.useMutation({
  onSuccess: (result) => {
    if (result.success) {
      console.log("Job iniciado:", result.jobId);
    } else {
      console.error("Erro:", result.error);
    }
  },
});

mutation.mutate({ recipeId: 1 });
```

---

### 5. Completar Job de Crafting

**Endpoint:** `game.crafting.completeJob`

**Tipo:** Mutation

**Autenticação:** Requerida

**Parâmetros:**
```typescript
{
  jobId: number;
}
```

**Resposta:**
```typescript
{
  success: boolean;
  itemReceived?: boolean;
  error?: string;
}
```

**Campos:**
- `success` - Se a operação foi bem-sucedida
- `itemReceived` - Se o item foi recebido (true = sucesso, false = falha na chance)
- `error` - Mensagem de erro se falhou

**Erros Possíveis:**
- `"Job not found"` - Job não existe
- `"Not your job"` - Job pertence a outro usuário
- `"Job is not in progress"` - Job já foi completado/cancelado
- `"Job not ready yet"` - Tempo de crafting não passou
- `"Recipe not found"` - Receita foi deletada

**Exemplo de Uso:**
```typescript
const mutation = trpc.game.crafting.completeJob.useMutation({
  onSuccess: (result) => {
    if (result.success && result.itemReceived) {
      console.log("Item recebido com sucesso!");
    } else if (result.success && !result.itemReceived) {
      console.log("Crafting falhou (85% de chance)");
    }
  },
});

mutation.mutate({ jobId: 1 });
```

---

### 6. Cancelar Job de Crafting

**Endpoint:** `game.crafting.cancelJob`

**Tipo:** Mutation

**Autenticação:** Requerida

**Parâmetros:**
```typescript
{
  jobId: number;
}
```

**Resposta:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Erros Possíveis:**
- `"Job not found"` - Job não existe
- `"Not your job"` - Job pertence a outro usuário
- `"Job cannot be cancelled"` - Job já foi completado/cancelado
- `"Recipe not found"` - Receita foi deletada

**Efeitos Colaterais:**
- Ingredientes são devolvidos ao inventário
- Job é marcado como "cancelled"

**Exemplo de Uso:**
```typescript
const mutation = trpc.game.crafting.cancelJob.useMutation({
  onSuccess: () => {
    console.log("Job cancelado e ingredientes devolvidos");
  },
});

mutation.mutate({ jobId: 1 });
```

---

## Fluxo de Integração

### Exemplo Completo: Iniciar e Completar Crafting

```typescript
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";

export function CraftingExample() {
  const [currentJob, setCurrentJob] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Queries
  const recipesQuery = trpc.game.crafting.getRecipes.useQuery();
  const jobsQuery = trpc.game.crafting.getUserJobs.useQuery();

  // Mutations
  const startMutation = trpc.game.crafting.startJob.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        jobsQuery.refetch();
      }
    },
  });

  const completeMutation = trpc.game.crafting.completeJob.useMutation({
    onSuccess: () => {
      jobsQuery.refetch();
      setCurrentJob(null);
    },
  });

  // Timer para atualizar tempo restante
  useEffect(() => {
    if (!currentJob?.completedAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(
        0,
        currentJob.completedAt.getTime() - now.getTime()
      );
      setTimeRemaining(Math.ceil(remaining / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentJob]);

  const handleStartCrafting = (recipeId) => {
    startMutation.mutate({ recipeId });
  };

  const handleCompleteCrafting = (jobId) => {
    completeMutation.mutate({ jobId });
  };

  return (
    <div>
      <h2>Receitas Disponíveis</h2>
      {recipesQuery.data?.map((recipe) => (
        <div key={recipe.id}>
          <h3>{recipe.name}</h3>
          <p>Tempo: {recipe.craftingTimeSeconds}s</p>
          <button onClick={() => handleStartCrafting(recipe.id)}>
            Iniciar
          </button>
        </div>
      ))}

      <h2>Jobs em Progresso</h2>
      {jobsQuery.data?.map((job) => (
        <div key={job.id}>
          <p>{job.recipeName}</p>
          <p>Tempo restante: {timeRemaining}s</p>
          {timeRemaining <= 0 && (
            <button onClick={() => handleCompleteCrafting(job.id)}>
              Coletar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Tratamento de Erros

### Exemplo com Tratamento Completo

```typescript
const mutation = trpc.game.crafting.startJob.useMutation({
  onSuccess: (result) => {
    if (result.success) {
      toast.success("Crafting iniciado!");
    } else {
      // Tratamento específico de erro
      switch (result.error) {
        case "Insufficient ingredients":
          toast.error("Você não tem ingredientes suficientes");
          break;
        case "Recipe not found":
          toast.error("Receita não encontrada");
          break;
        default:
          toast.error(result.error || "Erro desconhecido");
      }
    }
  },
  onError: (error) => {
    console.error("Erro de rede:", error);
    toast.error("Erro ao conectar com o servidor");
  },
});
```

---

## Rate Limiting

Atualmente, não há rate limiting implementado. Recomenda-se adicionar:

```typescript
// Exemplo futuro
const startMutation = trpc.game.crafting.startJob.useMutation({
  onError: (error) => {
    if (error.code === "TOO_MANY_REQUESTS") {
      toast.error("Muitas requisições. Aguarde um momento.");
    }
  },
});
```

---

## Webhooks (Futuro)

Será possível se inscrever em eventos de crafting:

```typescript
// Exemplo futuro
trpc.game.crafting.onJobCompleted.subscribe(
  { jobId: 1 },
  {
    onData: (job) => {
      console.log("Job completado:", job);
    },
  }
);
```

---

## Changelog

### v1.0.0 (2026-02-25)
- ✅ Implementação inicial de todos os endpoints
- ✅ Suporte a múltiplos jobs simultâneos
- ✅ Sistema de chance de sucesso (85%)
- ✅ Devolução de ingredientes em cancelamento
