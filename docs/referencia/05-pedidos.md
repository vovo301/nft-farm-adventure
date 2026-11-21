# Pedidos de NPC, entregas e tarefas — nota de referência

Fonte: SFL @ `4e3606f`, arquivos:
- `src/features/game/events/landExpansion/deliver.ts`, `skipOrder.ts`
- `src/features/game/events/landExpansion/completeNPCChore.ts`, `types/choreBoard.ts`, `types/chores.ts`
- `src/features/game/events/landExpansion/completeKingdomChore.ts`, `skipKingdomChore.ts`,
  `refreshKingdomChores.ts`
- `src/features/game/events/landExpansion/sellBounty.ts`, `bulkSellBounty.ts`, `claimBountyBonus.ts`
- `src/features/game/events/landExpansion/claimBumpkinGift.ts` (amizade com NPC)
- `src/features/game/types/game.ts` (tipos `Order`, `Quest`, `Delivery`, `NPCData`, `ChoreBoard`)
- `src/features/island/delivery/components/Orders.tsx`, `OrderCard.tsx`, `LockedOrderCard.tsx`
- `src/features/game/types/farmActivity.ts` (contadores usados no progresso das tarefas)

> Sala limpa: sem nomes de NPCs, itens, moedas de evento, constantes ou números do SFL.

O SFL tem **três** sistemas parecidos que convivem:

| Sistema | O que é | Onde |
|---|---|---|
| Pedidos de entrega | NPC pede itens específicos; você entrega e recebe moeda/itens/tickets | `deliver.ts` |
| Tarefas de NPC (quadro) | "faça X vezes a atividade Y"; progresso conta sozinho | `completeNPCChore.ts`, `types/choreBoard.ts` |
| Recompensas por item (bounties) | quadro de compra pontual de itens/animais por moeda ou tickets | `sellBounty.ts` |

## O que o jogador faz
1. Abre o painel de pedidos: vê cartões de NPCs, cada um pedindo uma lista de itens (culturas,
   comidas, materiais, às vezes moeda) e mostrando a recompensa.
2. Junta os itens e, conforme o NPC, entrega pelo painel ou indo até o NPC na praça
   multiplayer.
3. Recebe a recompensa; o cartão daquele NPC ganha um novo pedido depois de um tempo.
4. Se não quiser um pedido, pode **pular** (limitado no tempo).
5. No quadro de tarefas, aceita metas de atividade ("colha N vezes", "corte N árvores"); quando a
   barra enche, reivindica.
6. No quadro de bounties, vende itens que estiverem sendo procurados naquele período.

## Regras observadas (em palavras nossas)
### Pedidos de entrega
- **Pedido** = NPC de origem + itens exigidos + recompensa (moeda soft, token ou itens) + momento
  de criação + momento em que fica disponível + momento de conclusão.
- **Pedidos são gerados no servidor**; o cliente só mostra e prevê quando o próximo aparece
  (`populateOrders`). Isso impede o cliente de "escolher" pedidos bons.
- **Vagas de pedidos** aumentam com o número de expansões de terreno; há vagas extras de "missão"
  para um grupo de NPCs que pagam em tickets de temporada.
- **NPCs desbloqueiam por nível do avatar**; NPC bloqueado aparece com cadeado e o nível exigido.
  Alguns NPCs ainda exigem "reputação" (verificação anti-bot).
- **Validação ao entregar:** pedido existe, já ficou disponível, ainda não foi concluído, o jogador
  tem cada item/moeda; regras especiais bloqueiam pedidos que pagam token para contas sob
  investigação e pedidos de tickets durante feriados.
- **Recompensa** recebe bônus de habilidades e itens por tipo de NPC; tickets de temporada têm bônus
  de assinatura premium e de itens da temporada; certos eventos do calendário dobram a recompensa
  na primeira entrega do dia por NPC.
- **Efeitos colaterais:** incrementa o total de pedidos concluídos (que alimenta um **marco** com
  recompensa), o contador de entregas por NPC e, opcionalmente, pontos de **amizade** com o NPC
  (que liberam presentes ao atingir patamares — `claimBumpkinGift.ts`); soma pontos de temporada.
- **Pular pedido:** pedido disponível e não concluído; não pode pular de novo no mesmo dia; ao
  pular, o servidor repõe outro pedido. O jogo conta quantas vezes o jogador pulou.

### Tarefas de NPC (quadro)
- Cada tarefa referencia um **contador de atividade** já existente (plantios, colheitas, cortes…).
- Ao receber a tarefa, grava-se o valor atual do contador; o progresso é "contador agora − valor
  inicial". Assim, qualquer ação do jogo avança tarefas **sem código extra por tarefa**.
- Reivindicar exige progresso ≥ meta e tarefa não concluída; paga moeda e/ou itens (e tickets de
  temporada).
- NPCs do quadro desbloqueiam por número de expansões.

### Bounties
- Lista periódica de pedidos pontuais (um item ou animal específico, às vezes em quantidade).
- Cada um pode ser vendido uma vez; paga moeda soft ou tickets de temporada, com bônus.
- Elegibilidade numa única função (`canSellBounty`): existe, não foi concluído, jogador tem o item.

## Timers / custos / recompensas (apenas a FORMA)
- Pedidos novos aparecem depois de um intervalo após a entrega (não instantâneo).
- Pular: no máximo uma vez por dia (calendário, não janela móvel).
- Itens pedidos e recompensa escalam com o nível do NPC: NPCs iniciais pedem culturas básicas,
  NPCs avançados pedem comidas e materiais raros e pagam mais.
- Marco de entregas: meta cumulativa que, ao ser batida, paga um bônus e define a próxima meta.
- Tarefas: metas de contagem de atividade com recompensa fixa.

## Por que funciona (retenção, sink, social)
- **Dá direção ao jogador**: "o que plantar hoje?" é respondido pelos pedidos.
- **Sink de itens com preço melhor que a loja** — valoriza produção variada (cozinha, recursos).
- **Contadores de atividade** tornam tarefas baratas de criar (só dados).
- **Geração no servidor** é a principal defesa anti-bot/anti-exploit desse sistema.
- **Social**: entregas na praça levam o jogador a ver outros jogadores; amizade com NPC cria vínculo.
- **Tickets de temporada** ligam o loop diário ao conteúdo da temporada.

## O que faremos diferente
- **Um sistema só no MVP**: pedidos de entrega com poucas vagas (ex.: 2) e 2–3 NPCs. Tarefas de atividade entram
  como "tarefas diárias" (que o GDD já prevê) reaproveitando o mesmo mecanismo de contador; bounties
  ficam para depois.
- **Geração determinística no servidor** com seed (fazenda + dia + contador), regras em
  `packages/game-core` para o cliente poder pré-visualizar sem decidir.
- **Pular pedido sem punição dura**: permitir 1 troca grátis por janela de tempo e mais trocas com
  moeda soft; mostrar o tempo até a próxima troca.
- **Sem token na recompensa** no MVP — só moeda soft, itens e XP. Recompensa em token só depois do
  lançamento do token e com limites anti-bot.
- **Entregas pelo painel** (sem obrigar ir à praça) no MVP, já que não teremos praça multiplayer
  ainda; a ida ao NPC vira bônus quando a praça existir.
- **Contador de atividade como infraestrutura**: implementar cedo, porque alimenta tarefas,
  conquistas e analytics de uma vez.
- **Amizade com NPC**: ideia boa de médio prazo; registrar como feature futura no GDD.
