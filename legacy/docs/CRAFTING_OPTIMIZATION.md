# Sistema de Crafting - Otimizações e Boas Práticas

## 1. Visão Geral

O sistema de crafting permite que jogadores transformem itens do inventário em novos itens através de receitas. Este documento detalha as otimizações implementadas e as melhores práticas para manutenção.

## 2. Arquitetura

### Backend (Node.js + tRPC)
- **crafting.ts** - Lógica de negócio
- **routers/crafting.ts** - Endpoints tRPC
- **Banco de Dados** - MySQL/TiDB com Drizzle ORM

### Frontend (React + TypeScript)
- **CraftingPanel.tsx** - Componente principal
- **Crafting.tsx** - Página
- **Integração tRPC** - Comunicação com backend

## 3. Otimizações Implementadas

### 3.1 Banco de Dados

#### Índices
```sql
-- Índices em craftingRecipes
INDEX idx_name (name)
INDEX idx_active (active)
INDEX idx_discoveryRequired (discoveryRequired)

-- Índices em craftingJobs
INDEX idx_userId (userId)
INDEX idx_status (status)
INDEX idx_completedAt (completedAt)

-- Índices em craftingRecipeInputs
INDEX idx_recipeId (recipeId)
INDEX idx_itemTypeId (itemTypeId)
```

#### Queries Otimizadas
- **getAvailableRecipes()** - Usa INNER JOIN para buscar ingredientes em uma única query
- **getUserCraftingJobs()** - Índice em userId e status para buscas rápidas
- **getRecipeDetails()** - Busca com JOIN para obter item de saída

### 3.2 Frontend

#### Caching
- Queries tRPC com cache automático
- Refetch apenas quando necessário (após mutações)

#### Performance
- Lazy loading de receitas
- Componentes memoizados com Framer Motion
- ScrollArea para listas longas
- Animações otimizadas com GPU

#### Atualizações em Tempo Real
- Timer de contagem regressiva usando `setInterval`
- Atualização de progresso a cada segundo
- Cleanup automático de timers

### 3.3 Lógica de Negócio

#### Validações
- Verificação de ingredientes antes de iniciar
- Validação de propriedade do job
- Verificação de status do job

#### Transações
- Remoção de ingredientes e criação de job são atômicas
- Devolução de ingredientes em caso de cancelamento

#### Chance de Sucesso
- 85% de chance padrão de sucesso
- Pode ser customizado por receita (campo futuro)
- Falha retorna job como "cancelled" sem item

## 4. Fluxo de Crafting

```
1. Jogador visualiza receitas
   └─ getRecipes() retorna lista com ingredientes

2. Jogador seleciona receita
   └─ getRecipeDetails() carrega detalhes completos

3. Jogador inicia crafting
   └─ startCraftingJob()
      ├─ Valida ingredientes
      ├─ Remove ingredientes do inventário
      ├─ Cria job com tempo de conclusão
      └─ Retorna jobId

4. Job em progresso
   └─ getUserJobs() mostra status com timer
      └─ Atualiza a cada segundo no frontend

5. Quando pronto
   └─ completeCraftingJob()
      ├─ Valida tempo decorrido
      ├─ Calcula sucesso (85%)
      ├─ Adiciona item ao inventário se sucesso
      └─ Marca job como completed/cancelled

6. Alternativa: Cancelar job
   └─ cancelCraftingJob()
      ├─ Devolve ingredientes
      └─ Marca job como cancelled
```

## 5. Testes

### Testes Unitários (crafting.test.ts)
- ✅ Obter receitas disponíveis
- ✅ Obter detalhes de receita
- ✅ Falhar ao iniciar sem ingredientes
- ✅ Obter jobs do usuário
- ✅ Falhar ao completar job inexistente
- ✅ Falhar ao cancelar job inexistente

### Testes de Integração (Recomendados)
- [ ] Fluxo completo: iniciar → completar → coletar
- [ ] Cancelamento e devolução de ingredientes
- [ ] Múltiplos jobs simultâneos
- [ ] Chance de falha (85%)
- [ ] Validação de propriedade do job

### Testes de Performance
- [ ] Tempo de resposta com 100+ receitas
- [ ] Tempo de resposta com 1000+ jobs
- [ ] Carga com múltiplos usuários

## 6. Segurança

### Validações Implementadas
- ✅ Verificação de autenticação (protectedProcedure)
- ✅ Validação de propriedade do job (userId)
- ✅ Validação de ingredientes
- ✅ Validação de status do job

### Recomendações Futuras
- [ ] Rate limiting em startJob
- [ ] Validação de receita ativa
- [ ] Logging de todas as transações
- [ ] Auditoria de crafting

## 7. Escalabilidade

### Banco de Dados
- Índices em campos frequentemente consultados
- Queries otimizadas com JOINs
- Limite de resultados em queries

### Frontend
- Paginação de receitas (recomendado para 100+ receitas)
- Virtual scrolling para listas longas
- Lazy loading de detalhes

### Backend
- Caching de receitas (Redis - futuro)
- Queue de jobs de crafting (Bull - futuro)
- Webhook para notificações (futuro)

## 8. Monitoramento

### Métricas Recomendadas
- Tempo médio de crafting
- Taxa de sucesso/falha
- Receitas mais usadas
- Usuários ativos em crafting

### Logs
```typescript
console.log("[Crafting] Starting job:", { userId, recipeId });
console.log("[Crafting] Job completed:", { jobId, success });
console.error("[Crafting] Error:", error);
```

## 9. Próximos Passos

### Curto Prazo
- [ ] Testes de integração completos
- [ ] Testes de carga
- [ ] Documentação de API

### Médio Prazo
- [ ] Receitas com múltiplos outputs
- [ ] Bônus de facção para crafting
- [ ] Sistema de descoberta de receitas
- [ ] Animações de crafting

### Longo Prazo
- [ ] Smart contracts para crafting em blockchain
- [ ] NFTs dinâmicos com atributos de crafting
- [ ] Economia de crafting com taxas
- [ ] Ranking de crafters

## 10. Troubleshooting

### Problema: Job não aparece na lista
**Solução:** Verificar se o job foi criado com sucesso (verificar logs)

### Problema: Ingredientes não foram removidos
**Solução:** Verificar se a função `removeItemFromInventory` foi chamada

### Problema: Timer não atualiza
**Solução:** Verificar se o `setInterval` está sendo executado (abrir DevTools)

### Problema: Crafting falha com erro de banco
**Solução:** Verificar conexão com banco de dados e índices

## 11. Referências

- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC](https://trpc.io/)
- [React Query](https://tanstack.com/query/latest)
- [Framer Motion](https://www.framer.com/motion/)
