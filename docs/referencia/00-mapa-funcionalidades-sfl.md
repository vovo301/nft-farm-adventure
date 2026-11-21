# Mapa de funcionalidades do Sunflower Land (nota de referência)

Fonte: `sunflower-land/sunflower-land` @ `4e3606f` (19/11/2026). Resumo em palavras próprias do
que o jogo tem, para orientar o escopo. **Não é especificação** — nosso jogo escolhe o que fazer e
como, com nomes e números próprios.

## Stack observada
React 19 + TypeScript + Phaser 3.8x + Tailwind + xstate 4 (sessão/jogo) + viem/wagmi.
Redes: Polygon (mainnet / testnet Amoy) e Base para parte do fluxo de token. Moeda soft (moedas),
premium (gemas) e um token ERC-20 sacável. Cerca de **500 ações de jogador** (reducers) em
`src/features/game/events/landExpansion/`, revalidadas por um backend privado.

## Sistemas por camada

| Camada | Sistemas | Onde olhar (`src/features/game/…`) |
|---|---|---|
| Núcleo de fazenda | ~20 culturas com timers longos, estufa, frutas em canteiros, flores, colheita/plantio em massa, fertilizantes, compostores, máquina de plantio automático | `types/crops.ts`, `types/fruits.ts`, `types/flowers.ts`, `events/landExpansion/plant.ts`, `harvest.ts` |
| Recursos | árvores, pedra, ferro, ouro e minérios raros com recarga; ferramentas consumíveis; mover/posicionar nós | `types/resources.ts`, `types/tools.ts`, `events/…/chop.ts`, `stoneMine.ts` |
| Animais | galinhas, vacas, ovelhas, porcos: comprar, alimentar, carinho, produção, doença/sono | `types/animals.ts`, `lib/animals.ts`, `feedAnimal.ts` |
| Produção | cozinha (vários prédios), crafting, fermentação, defumação/envelhecimento, apicultura, pesca, sal, poço de petróleo | `cook.ts`, `types/craftables.ts`, `types/fishing.ts`, `fermentation*.ts` |
| Progressão | XP e nível do avatar, árvore de habilidades, expansões de terreno com construção, upgrade de ilha, conquistas, marcos | `types/bumpkinSkills.ts`, `expandLand.ts`, `upgradeFarm.ts`, `types/achievements.ts` |
| Boosts | colecionáveis e wearables que dão bônus de tempo/rendimento, com área de efeito; ordem multiplicador→aditivo | `types/boosts.ts`, `lib/boostWindows.ts`, `lib/aoe.ts` |
| Missões e retenção | pedidos/entregas de NPC, tarefas diárias, quadro de tarefas, recompensas diárias, baús, caixas de recompensa | `deliver.ts`, `types/chores.ts`, `types/dailyRewards.ts`, `types/rewardBoxes.ts` |
| Temporadas | capítulos/estações com loja temporária, itens que expiram, eventos de calendário (clima, pragas), lojas de feriados | `types/chapters.ts`, `types/calendar.ts`, `types/weather.ts` |
| Social | visitar fazendas, facções com ranking e loja, competições, presentes de flores, mensagens, indicação de amigos | `types/factionShop.ts`, `types/competitions.ts`, `features/social/` |
| Avatar | personagem modular com wearables (NFT), estilista, pets | `types/bumpkin.ts`, `types/stylist.ts`, `types/pets.ts` |
| Mundo | ilha do jogador + praça/plaza multiplayer, minigames, portais para jogos de parceiros, caverna | `features/world/`, `features/portal/`, `features/cave/` |
| Economia/Web3 | marketplace (ofertas, leilões), troca de recursos, saque/depósito de itens e token, restrições de saque, painéis de economia | `features/marketplace/`, `types/withdrawables.ts`, `types/withdrawRestrictions.ts`, `src/lib/blockchain/` |

## Lições do próprio repositório
- A duplicação de regras front/back exige editar dois repositórios a cada mudança → usamos
  `packages/game-core` compartilhado.
- Tempo em reducers precisa vir da ação (`createdAt`), nunca do relógio local.
- Itens só ficam negociáveis após uma data de liberação explícita por item.
- Feature flags por rede e por janela de tempo, idênticas no cliente e no servidor.
- Design system rígido (sem cores/ícones novos sem aprovação) mantém a UI coesa.

## O que faremos diferente
- MVP com ~10% disso (veja `docs/ROADMAP.md`); profundidade antes de largura.
- Timers de sessão curta no início (minutos), longos só depois do nível 5.
- Token fungível só depois que o loop for divertido sem ele.
