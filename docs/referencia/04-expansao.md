# Expansão de terreno e layout — nota de referência

Fonte: SFL @ `4e3606f`, arquivos:
- `src/features/game/events/landExpansion/expandLand.ts`, `revealLand.ts`, `speedUpExpansion.ts`
- `src/features/game/events/landExpansion/upgradeFarm.ts` (troca de tipo de ilha), `removeAll.ts`
- `src/features/game/events/landExpansion/place*.ts`, `move*.ts`, `remove*.ts` (posicionar nós,
  prédios e colecionáveis)
- `src/features/game/types/expansions.ts` (layouts por ilha), `expansion/lib/expansionRequirements.ts`,
  `expansion/lib/constants.ts` (origem de cada pedaço de terra), `expansion/lib/expansionNodes.ts`,
  `expansion/lib/island.ts`
- `src/features/game/expansion/placeable/lib/collisionDetection.ts`, `placementEvents.ts`,
  `expansion/placeable/landscapingMachine.ts`, `expansion/placeable/Placeable.tsx`
- `src/features/game/events/landExpansion/buyBiome.ts` (visual da ilha)

> Sala limpa: sem nomes, constantes, layouts ou números do SFL.

## O que o jogador faz
1. Começa numa ilha pequena com alguns pedaços de terra já revelados.
2. Vê, na borda da ilha, o próximo pedaço disponível com seus requisitos (nível, moeda, materiais).
3. Paga e inicia a obra; um timer de construção aparece sobre o terreno.
4. Ao terminar, "revela" o pedaço: a terra aparece com novos nós (canteiros, árvores, rochas…) e
   todos os recursos da ilha ficam prontos de uma vez.
5. Entra no modo de paisagismo para arrastar nós, prédios e decorações para onde quiser.
6. Ao atingir o limite de expansões de uma ilha, paga um "upgrade de ilha" e muda para um tipo de
   ilha maior/temático, recomeçando a montar o layout.

## Regras observadas (em palavras nossas)
- **Terra em blocos quadrados fixos.** Cada expansão é um bloco de mesmo tamanho, colocado numa
  posição pré-definida numa sequência fixa ao redor do bloco inicial (`EXPANSION_ORIGINS`). O
  jogador não escolhe onde expandir; a ilha cresce sempre no mesmo padrão.
- **Cada bloco tem um layout pré-definido de nós** (quantos canteiros, árvores, rochas etc. e em
  que coordenadas), por tipo de ilha e por número da expansão (`types/expansions.ts`). Ao revelar,
  esses nós entram no estado **e** no inventário de nós (o jogador "possui" aquela quantidade).
- **Validações ao expandir:** não atingiu o teto da ilha; ainda há expansões; o layout existe; não
  há outra obra em andamento; nível do avatar suficiente; moeda e cada material suficientes.
  Debita tudo no início e grava início + término da obra.
- **Requisitos crescem** a cada expansão (moeda, materiais, nível e tempo). Bônus de itens
  reduzem custo em percentuais.
- **Revelar** só funciona com obra concluída. Efeitos: adiciona os nós do bloco; **reabastece todos
  os nós da ilha** (o timer é "voltado" para que estejam prontos); concede recompensas; em certa
  expansão concede o primeiro prédio de cozinha. Há uma rotina de "nós esperados vs. possuídos" para
  compensar jogadores com nós faltando (`getMissingResources`).
- **Recompensas de marco** em certas contagens de expansão chegam como "presentes" (airdrops) a
  reivindicar, não direto no inventário (`getRewards` em `revealLand.ts`).
- **Pular a obra** com moeda premium ou moeda soft; em alguns tipos de ilha não é permitido.
- **Desbloqueios por número de expansões:** várias coisas olham para "quantos blocos o jogador tem"
  — vagas de pedidos de NPC, tarefas de NPC, prédios.
- **Layout livre dentro da terra revelada.** Tudo é posicionável e movível em grade; colisão por
  caixas alinhadas (AABB), com bordas da ilha, água e uma lista de objetos que não colidem
  (decoração rasteira). Mover preserva timers; guardar um prédio pausa a produção.
- **Modo paisagismo** (máquina de estados própria): o jogador monta um rascunho do arranjo inteiro
  e confirma de uma vez; a validação checa "dentro dos limites" separadamente de "sobreposição"
  para permitir troca de posição entre dois itens.
- **Upgrade de ilha:** exige um número mínimo de expansões, nível e itens/moeda. Na maioria das
  transições, **tudo volta ao inventário** e o jogador começa num layout inicial da nova ilha (com
  um mínimo garantido de nós); existe opção de reaplicar um layout salvo. Alguns sistemas
  transitórios são zerados.
- **Biomas** (cosméticos) mudam a aparência da ilha sem mudar regras.

## Timers / custos / recompensas (apenas a FORMA)
- Custo e tempo de obra sobem a cada bloco; os primeiros são quase instantâneos, os últimos levam
  dias.
- Materiais exigidos migram dos básicos para os raros conforme a ilha cresce.
- Cada tipo de ilha tem um teto de expansões; o teto sobe a cada upgrade de ilha.
- Recompensa de revelar: novos nós + reabastecimento total + itens.

## Por que funciona (retenção, sink, social)
- **Maior sink do jogo**: expansão consome moeda e grandes quantidades de todos os recursos.
- **Progresso visível**: a ilha crescendo é o marcador de progresso mais claro para o jogador e para
  quem visita.
- **"Momento uau" na revelação**: nós novos + tudo pronto para coletar.
- **Layout pré-definido** garante balanceamento (todos têm os mesmos nós no mesmo estágio) e
  simplifica o servidor.
- **Layout livre** atende ao pilar "sua fazenda é sua cara".

## O que faremos diferente
- **MVP com uma ilha só**, poucos blocos (ex.: 4–6 expansões) e sem upgrade de ilha.
- **Considerar escolha de direção**: oferecer 2 blocos adjacentes possíveis por vez dá sensação de
  posse do formato da ilha, sem perder o balanceamento (o conteúdo do bloco continua fixo por
  número de expansão, não por posição).
- **Manter conteúdo de bloco fixo por número da expansão** e o reabastecimento na revelação.
- **Não resetar layout em upgrades futuros**: se houver troca de ilha, preservar o arranjo ou
  oferecer reaplicação automática; resetar tudo é frustrante.
- **Colisão em grade de 16 px** (consistente com a skill `tilemap-phaser-tiled`), validação de
  arranjo inteiro em `packages/game-core` (mesma regra no cliente e no servidor).
- **Pular obra**: só moeda soft com teto no MVP.
- **Desbloqueios por expansão** documentados numa tabela única (dados), não espalhados por código.
