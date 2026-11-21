# Plantio (canteiros, plantar, crescer, colher) — nota de referência

Fonte: SFL @ `4e3606f`, arquivos:
- `src/features/game/events/landExpansion/plant.ts`, `bulkPlant.ts`
- `src/features/game/events/landExpansion/harvest.ts`, `bulkHarvest.ts`
- `src/features/game/events/landExpansion/removeCrop.ts`, `fertilisePlot.ts`, `placePlot.ts`, `removePlot.ts`, `moveCrop.ts`
- `src/features/game/events/landExpansion/seedBought.ts`, `sellCrop.ts`, `restock.ts`, `shipmentRestocked.ts`
- `src/features/game/types/crops.ts`, `types/seeds.ts`
- `src/features/island/plots/components/FertilePlot.tsx`, `Soil.tsx`, `NonFertilePlot.tsx`, `SeedSelection.tsx`
- `src/features/game/lib/boostWindows.ts` (cálculo de "fica pronto em")

> Sala limpa: esta nota descreve formas e fluxos. Nenhum nome de item, constante ou número do SFL
> foi transcrito. Nossos valores saem de `economy/economy.csv`.

## O que o jogador faz
1. Compra sementes numa loja de sementes, pagando com a moeda soft.
2. Seleciona uma semente no seletor e toca num canteiro vazio da fazenda para plantar.
3. Espera; o canteiro mostra a planta mudando de aparência e uma barra de progresso.
4. Quando está pronta, toca de novo para colher; o produto vai para o inventário.
5. Vende o produto na loja, usa em receitas (cozinha), em pedidos de NPC ou guarda.
6. Opcionalmente: aduba o canteiro (acelera ou aumenta o rendimento), planta/colhe em massa,
   remove uma planta ainda crescendo com uma ferramenta de pá, ou reposiciona canteiros.

## Regras observadas (em palavras nossas)
- **Canteiro é um "nó" posicionável.** O jogador possui um número de canteiros no inventário e os
  coloca no mapa (`placePlot.ts`). Canteiro guardado no inventário não aceita plantio nem colheita.
  Os canteiros chegam principalmente pelas expansões de terreno (ver `04-expansao.md`).
- **Fertilidade depende de irrigação.** Existe um limite de canteiros "férteis" derivado do tipo de
  ilha mais o nível de uma construção de água (poço). Canteiros além do limite ficam inférteis e
  não aceitam plantio; a ordem de quem é fértil segue a data de criação (mais antigos primeiro)
  — ver `getSupportedPlots`/`isPlotFertile` em `plant.ts`. Isso força o jogador a evoluir a
  construção de água para usar mais terra.
- **Validações ao plantar:** item precisa ser semente; semente precisa estar disponível na
  estação do ano atual (o jogo tem estações rotativas com lista própria de sementes); canteiro
  precisa existir, estar posicionado, fértil, vazio e não afetado por evento climático; o jogador
  precisa ter ao menos uma semente. Consome uma semente por canteiro.
- **O que se grava ao plantar:** id da planta, momento do plantio (vindo da ação, não do relógio
  local), duração-base já com bônus permanentes aplicados e o tipo de cultura. Bônus temporários
  (itens com janela de efeito) são aplicados "ao vivo" como janelas de velocidade, em vez de
  "falsificar" a data de plantio — `getCropReadyAt` em `harvest.ts` + `boostWindows.ts`.
- **Pronto para colher** = agora ≥ momento calculado de prontidão. Colher antes disso é rejeitado.
- **Rendimento da colheita:** começa em uma unidade e passa por uma pilha de modificadores
  (multiplicadores primeiro, depois somas), vindos de habilidades do avatar, colecionáveis
  posicionados (alguns com área de efeito sobre canteiros próximos), wearables e adubo.
  Há "golpes críticos" por chance; a chance é resolvida com um **PRNG determinístico** semeado
  pelo id da fazenda + contador de colheitas daquele tipo (`prngChance` em `lib/prng`), para que
  cliente e servidor cheguem ao mesmo resultado. Em alguns casos o rendimento já fica pré-calculado
  no canteiro no momento do plantio.
- **Contadores de atividade:** cada plantio/colheita incrementa um contador por tipo de cultura
  (`farmActivity`). Esses contadores alimentam conquistas, tarefas de NPC e o PRNG.
- **Estágios visuais:** a UI deriva o estágio a partir da porcentagem de progresso — há quatro
  aparências (recém-plantado → meio → quase → pronto), cada cultura com seu próprio conjunto de
  sprites (`Soil.tsx`, `FertilePlot.tsx`). O estágio não é guardado no estado; é só apresentação.
- **Remover planta:** exige uma pá consumível e só vale para planta que ainda **não** está pronta
  (evita "desperdiçar" colheita pronta por engano).
- **Adubo:** aplicado a um canteiro posicionado e não pronto; um adubo por plantio; alguns aceleram,
  outros aumentam rendimento. Existe versão em massa.
- **Clima/eventos:** eventos de calendário (tempestades, enchentes, geada, pragas) podem destruir ou
  bloquear canteiros não protegidos; o canteiro afetado mostra um visual próprio e não aceita ações
  até ser tratado.
- **Loja de sementes:** compra exige nível mínimo do avatar por semente, quantidade válida,
  estoque suficiente, moeda suficiente e respeita um limite máximo de sementes no inventário.
  O estoque é limitado e reabastece por tempo; o jogador pode reabastecer na hora pagando moeda
  premium, ou usar um reabastecimento gratuito diário.
- **Venda:** produto vendido à loja por preço fixo × quantidade; alguns produtos deixam de ser
  vendáveis com o tempo.

## Timers / custos / recompensas (apenas a FORMA)
- Cada cultura tem um tempo de crescimento próprio; as básicas crescem em minutos, as avançadas em
  horas e as raras em dias. Preço de semente e de venda sobem juntos com o tempo de crescimento.
- Culturas mais caras exigem nível maior do avatar.
- Bônus somam-se numa ordem fixa: multiplicadores → aditivos; acelerações temporárias entram como
  janelas sobre a linha do tempo.
- Colheita sempre devolve ao menos uma unidade; críticos raros dão saltos grandes.

## Por que funciona (retenção, sink, social)
- **"Sempre há algo pronto quando você volta"**: a variedade de timers deixa o jogador escolher entre
  sessões curtas (culturas rápidas) e "deixar plantado para dormir" (culturas longas).
- **Sink de moeda soft**: sementes, pás, adubos, reabastecimento.
- **Gargalo saudável**: estoque limitado + limite de canteiros férteis criam objetivos de
  progressão (evoluir água, expandir terreno).
- **Determinismo**: PRNG por contador elimina disputa cliente/servidor sobre críticos.
- **Estações** renovam a lista de sementes e dão variedade sem criar conteúdo novo toda semana.

## O que faremos diferente
- **Começar simples:** no MVP, sem irrigação, sem estações e sem clima destrutivo. Todo canteiro
  posicionado é fértil. Clima e estações entram depois como conteúdo de temporada.
- **Timers curtos no início** (minutos) para o tutorial e primeiras sessões, como já prevê o mapa
  geral; culturas longas só após o nível 5.
- **Estágio visual derivado do progresso** (manter a ideia, que é boa): 3–4 estágios por cultura,
  arte nossa, cálculo só no cliente; o reducer guarda apenas `plantedAt` + duração.
- **Pilha de bônus pequena e explícita** em `packages/game-core`: um único ponto que lista e ordena
  os modificadores, com log de "boosts usados" para a UI mostrar ao jogador por que rendeu mais.
- **PRNG determinístico** semeado por (fazenda, contador), igual em cliente e servidor — adotar
  desde o primeiro reducer de colheita (regra 2 do `CLAUDE.md`).
- **Não permitir perder colheita pronta**: manter a regra "não remove planta pronta"; considerar
  colheita automática ao tocar num canteiro pronto com outra semente selecionada (colhe e replanta).
- **Estoque de loja**: avaliar se precisamos de estoque limitado no MVP; se sim, reabastecimento
  só por tempo (sem pagar premium para pular) até a economia estar validada.
- **Plantio/colheita em massa** como recompensa de progressão (não paga), para reduzir toques
  repetitivos no celular.
