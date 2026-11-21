# Sistema de Crafting - Guia de Início Rápido

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Uso Básico](#uso-básico)
4. [Exemplos Práticos](#exemplos-práticos)
5. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O sistema de crafting permite que jogadores transformem itens do inventário em novos itens através de receitas. Cada receita tem:

- **Ingredientes** - Itens necessários do inventário
- **Tempo de Crafting** - Quanto tempo leva para completar
- **Custo** - HARVEST tokens necessários (opcional)
- **Chance de Sucesso** - 85% por padrão
- **Output** - Item produzido

---

## Instalação

### 1. Clonar/Atualizar Código

```bash
# Se ainda não tem o projeto
git clone <repo-url>
cd nft-farm-game

# Se já tem, atualizar
git pull origin main
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Banco de Dados

```bash
# Executar migrações
pnpm run db:migrate

# Popular com receitas de teste (opcional)
node server/seed-recipes.mjs
```

### 4. Iniciar Servidor

```bash
# Desenvolvimento
pnpm run dev

# Produção
pnpm run build && pnpm run start
```

### 5. Acessar Interface

```
http://localhost:5173/crafting
```

---

## Uso Básico

### Passo 1: Visualizar Receitas

Acesse a página de Crafting e clique na aba "Receitas". Você verá:

- Nome da receita
- Descrição
- Ingredientes necessários
- Tempo de crafting
- Botão "Iniciar Crafting"

### Passo 2: Verificar Ingredientes

Antes de iniciar, verifique se tem os ingredientes no inventário:

```
Receita: Pão de Trigo
Ingredientes:
  - Trigo x3 (você tem x5) ✅
```

### Passo 3: Iniciar Crafting

Clique em "Iniciar Crafting". O sistema irá:

1. Validar ingredientes
2. Remover ingredientes do inventário
3. Criar um job de crafting
4. Mostrar barra de progresso

### Passo 4: Acompanhar Progresso

Na aba "Em Progresso", você verá:

- Nome do item sendo criado
- Barra de progresso
- Tempo restante
- Botão "Coletar" (quando pronto)

### Passo 5: Coletar Item

Quando o timer chegar a 0, clique "Coletar":

- 85% de chance: Item adicionado ao inventário
- 15% de chance: Crafting falha, job cancelado

---

## Exemplos Práticos

### Exemplo 1: Fazer Pão

```
1. Vá para Crafting
2. Procure por "Pão de Trigo"
3. Verifique se tem 3x Trigo
4. Clique "Iniciar Crafting"
5. Aguarde 30 segundos
6. Clique "Coletar"
7. Verifique inventário (novo Pão)
```

### Exemplo 2: Múltiplos Crafts Simultâneos

```
1. Inicie "Pão de Trigo" (30s)
2. Inicie "Suco de Laranja" (15s)
3. Inicie "Farinha" (20s)
4. Acompanhe todos na aba "Em Progresso"
5. Colete quando cada um ficar pronto
```

### Exemplo 3: Cancelar Crafting

```
1. Clique em "Em Progresso"
2. Selecione um job em andamento
3. Clique "Cancelar"
4. Ingredientes retornam ao inventário
```

---

## Exemplos de Código

### React Component

```typescript
import { CraftingPanel } from "@/components/CraftingPanel";

export function MyGame() {
  return (
    <div>
      <h1>Meu Jogo</h1>
      <CraftingPanel />
    </div>
  );
}
```

### Usar API Diretamente

```typescript
import { trpc } from "@/lib/trpc";

// Obter receitas
const recipes = await trpc.game.crafting.getRecipes.query();

// Iniciar crafting
const result = await trpc.game.crafting.startJob.mutate({ 
  recipeId: 1 
});

if (result.success) {
  console.log("Job iniciado:", result.jobId);
}

// Completar crafting
const completed = await trpc.game.crafting.completeJob.mutate({ 
  jobId: result.jobId 
});

if (completed.itemReceived) {
  console.log("Item recebido!");
} else {
  console.log("Crafting falhou (15% de chance)");
}
```

### Hook Personalizado

```typescript
import { trpc } from "@/lib/trpc";

export function useCrafting() {
  const recipes = trpc.game.crafting.getRecipes.useQuery();
  const jobs = trpc.game.crafting.getUserJobs.useQuery();
  
  const startJob = trpc.game.crafting.startJob.useMutation({
    onSuccess: () => jobs.refetch(),
  });
  
  const completeJob = trpc.game.crafting.completeJob.useMutation({
    onSuccess: () => jobs.refetch(),
  });
  
  return {
    recipes: recipes.data,
    jobs: jobs.data,
    startJob: startJob.mutate,
    completeJob: completeJob.mutate,
    isLoading: recipes.isLoading || jobs.isLoading,
  };
}

// Usar
const { recipes, jobs, startJob } = useCrafting();
```

---

## Estrutura de Dados

### Recipe

```typescript
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
```

### CraftingJob

```typescript
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
```

---

## Troubleshooting

### ❌ "Ingredientes insuficientes"

**Problema:** Não consigo iniciar crafting

**Solução:**
1. Verifique o inventário
2. Certifique-se de ter os itens necessários
3. Verifique a quantidade exata

**Código para Debug:**
```typescript
const recipes = await trpc.game.crafting.getRecipes.query();
const recipe = recipes.find(r => r.id === 1);
console.log("Ingredientes necessários:", recipe.ingredients);

// Comparar com inventário
const inventory = await trpc.game.inventory.getInventory.query();
```

---

### ❌ "Job não aparece"

**Problema:** Iniciei crafting mas não vejo na aba "Em Progresso"

**Solução:**
1. Recarregue a página
2. Verifique se há erros no console (F12)
3. Verifique conexão com servidor

**Código para Debug:**
```typescript
const jobs = await trpc.game.crafting.getUserJobs.query();
console.log("Meus jobs:", jobs);
```

---

### ❌ "Timer não atualiza"

**Problema:** O contador de tempo não está diminuindo

**Solução:**
1. Verifique se o navegador está aberto
2. Verifique se há abas abertas em background
3. Recarregue a página

**Nota:** O timer só atualiza enquanto a aba está ativa.

---

### ❌ "Crafting falhou"

**Problema:** Cliquei em "Coletar" mas não recebi o item

**Solução:**
- Isso é normal! Há 15% de chance de falha
- Verifique o histórico de jobs
- Tente novamente com outra receita

---

### ❌ Erro de Conexão

**Problema:** "Database not available" ou erro de rede

**Solução:**
1. Verifique se o servidor está rodando
2. Verifique conexão com internet
3. Verifique se o banco de dados está online

**Comando para Verificar:**
```bash
# Verificar se servidor está rodando
curl http://localhost:3000/api/health

# Verificar logs
tail -f logs/server.log
```

---

## Performance

### Otimizações Implementadas

- ✅ Queries cacheadas (React Query)
- ✅ Índices de banco de dados
- ✅ Lazy loading de receitas
- ✅ Animações otimizadas

### Dicas para Melhor Performance

1. **Não abra muitas abas** - Cada aba consome recursos
2. **Feche o DevTools** - Reduz overhead
3. **Use navegador moderno** - Chrome, Firefox, Safari
4. **Limpe cache** - Se tiver problemas: Ctrl+Shift+Delete

---

## Próximos Passos

### Para Jogadores
- [ ] Completar todas as receitas
- [ ] Descobrir receitas secretas
- [ ] Alcançar 100% de sucesso em crafting

### Para Desenvolvedores
- [ ] Adicionar mais receitas
- [ ] Implementar bônus de facção
- [ ] Criar sistema de descoberta
- [ ] Adicionar animações de crafting

---

## Recursos Adicionais

- [API Completa](./CRAFTING_API.md)
- [Otimizações](./CRAFTING_OPTIMIZATION.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Game Design](./GAME_DESIGN.md)

---

## Suporte

Encontrou um bug? Abra uma issue no GitHub:

```
https://github.com/seu-repo/issues/new
```

Título: `[Crafting] Descrição do problema`

---

**Última Atualização:** 25 de Fevereiro de 2026

**Versão:** 1.0.0
