# Cozinha (crafting de comida e XP do avatar) — nota de referência

Fonte: SFL @ `4e3606f`, arquivos:
- `src/features/game/events/landExpansion/cook.ts`, `collectRecipe.ts`, `cancelQueuedRecipe.ts`,
  `speedUpRecipe.ts`, `supplyCookingOil.ts`
- `src/features/game/events/landExpansion/feedBumpkin.ts` (comer = ganhar XP)
- `src/features/game/events/landExpansion/placeBuilding.ts`, `upgradeBuilding.ts`, `speedUpBuilding.ts`
- `src/features/game/events/landExpansion/upgradeSkill.ts`
- `src/features/game/types/consumables.ts`, `types/buildings.ts`, `types/bumpkinSkills.ts`
- `src/features/game/lib/level.ts` (curva de XP), `lib/getInstantGems.ts` (custo de pular tempo)
- `src/features/game/expansion/lib/boosts.ts` (`getCookingTime`), `lib/boostWindows.ts`

> Sala limpa: sem nomes de receitas/prédios, constantes ou números do SFL.

## O que o jogador faz
1. Constrói (ou recebe) um prédio de cozinha e o posiciona na fazenda.
2. Abre o prédio, escolhe uma receita cujos ingredientes tem (culturas, produtos animais, outras
   comidas) e inicia o preparo.
3. Pode enfileirar mais receitas no mesmo prédio até o limite de vagas.
4. Espera o timer; coleta a comida pronta para o inventário.
5. Dá a comida ao avatar para ganhar XP → sobe de nível → desbloqueia sementes, prédios, receitas,
   expansões e pontos de habilidade.
6. Opcionalmente: paga moeda premium (ou moeda soft, com limite diário) para terminar na hora,
   cancela uma receita ainda não pronta (recebe ingredientes de volta) ou abastece o prédio com
   combustível para acelerar.

## Regras observadas (em palavras nossas)
- **Vários prédios de cozinha**, cada um com seu cardápio. Prédios melhores liberam por nível do
  avatar e têm custo de construção (moeda + materiais) e tempo de obra. Um prédio básico é dado de
  graça numa expansão inicial.
- **Receita** = lista de ingredientes + tempo de preparo + XP concedido + prédio exigido. Tudo
  definido como dado (`types/consumables.ts`), não em código de regra.
- **Validação ao cozinhar:** receita disponível (algumas são de evento/temporada), prédio existe e
  está posicionado, há vaga livre na fila, há todos os ingredientes. Ingredientes são debitados no
  início.
- **Fila por prédio:** há um número fixo de vagas; assinantes premium ganham mais vagas. As receitas
  da fila são sequenciais — a próxima começa quando a anterior termina. O momento de prontidão de
  cada item é **derivado da cadeia inteira** (não lido de um campo gravado), porque acelerações
  temporárias e combustível mudam a cadeia toda (`getCookingQueueReadyAts`).
- **Combustível opcional:** alguns prédios aceitam um combustível que acelera o preparo e é
  queimado continuamente enquanto há algo cozinhando ("dreno por relógio"), em vez de ser cobrado
  por receita.
- **Coleta:** pega todas as receitas cujo momento de prontidão já passou; se nada estiver pronto,
  rejeita. Algumas receitas podem render mais de uma unidade por bônus.
- **Cancelar:** só receitas que ainda não terminaram; devolve os ingredientes. Receita pronta só
  pode ser coletada (há um comentário longo explicando um bug real de "cozinha travada" causado por
  cancelar item já pronto — vale como lição).
- **Pular tempo:** custo em moeda premium por faixas de tempo restante (degraus, não linear);
  existe alternativa em moeda soft com teto diário.
- **Prédio guardado pausa a produção** e, ao recolocar, os timers são deslocados pelo tempo parado
  (`placeBuilding.ts`).
- **XP vem de comer.** `feedBumpkin.ts`: escolhe comida e quantidade, debita do inventário e soma
  XP (com bônus de habilidades/itens). Não há XP do avatar por plantar, colher ou coletar recursos;
  fora a comida, só algumas recompensas diárias dão XP (`claimDailyReward.ts`). A cozinha é o funil
  principal de progressão. (Animais têm XP próprio, separado do avatar.)
- **Curva de nível** definida por tabela de XP acumulado por nível (`lib/level.ts`), com níveis
  muito altos e um sistema de "ascensão" que reinicia faixas de nível no fim de jogo.
- **Pontos de habilidade** por nível, gastos numa árvore com tiers (é preciso desbloquear o tier
  anterior) e nível máximo por habilidade (`upgradeSkill.ts`).

## Timers / custos / recompensas (apenas a FORMA)
- Receitas simples (um ou dois ingredientes básicos) levam segundos/minutos e dão pouco XP;
  receitas complexas levam horas e dão muito XP. XP cresce mais rápido que o custo dos
  ingredientes, recompensando receitas avançadas.
- XP necessário por nível sobe a cada nível (curva crescente).
- Custo para pular tempo sobe em degraus conforme o tempo restante.
- Prédios de cozinha melhores: custo e tempo de obra crescem com o nível de desbloqueio.

## Por que funciona (retenção, sink, social)
- **Sink de culturas e produtos**: cozinha transforma o excedente da fazenda em progressão, evitando
  que o jogador só venda tudo.
- **Fila = "deixar tudo cozinhando antes de sair"**: reforça o pilar "sempre há algo pronto".
- **XP só por comida** cria um único funil fácil de balancear e dá sentido a cada cultura.
- **Pular tempo** é a principal fonte de receita premium sem pay-to-win direto.
- **Árvore de habilidades** dá identidade de build (foco em plantio, recursos, cozinha…).

## O que faremos diferente
- **MVP com 1 prédio de cozinha e ~6–10 receitas**, fila curta e sem combustível.
- **XP misto (proposta):** manter a cozinha como principal fonte, mas dar um pouco de XP por ações
  básicas (colher, coletar recurso) nas primeiras horas, para o jogador subir de nível no tutorial
  antes de entender a cozinha. O `game-designer` decide; o `economista-tokenomics` simula.
- **Comida também como consumível útil**, não só XP (ex.: buff curto de velocidade ou de
  rendimento) — dá motivo para guardar comida.
- **Fila derivada e não gravada**: adotar a lição — o reducer guarda só início + durações; o
  "pronto em" de cada item é calculado. Testes para cancelar/coletar no meio da fila.
- **Pular tempo**: no MVP, só com moeda soft e teto diário; moeda premium/token só após validar a
  economia.
- **Pausar ao guardar prédio**: adotar (evita exploit de mover prédio para "resetar" algo), com
  teste de regressão.
- **Árvore de habilidades** fica para depois do MVP; nível do avatar no MVP só desbloqueia conteúdo.
