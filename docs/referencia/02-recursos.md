# Recursos (árvores, pedras/minérios, ferramentas, regeneração) — nota de referência

Fonte: SFL @ `4e3606f`, arquivos:
- `src/features/game/events/landExpansion/chop.ts`, `stoneMine.ts`, `ironMine.ts`, `mineGold.ts`,
  `mineCrimstone.ts`, `mineSunstone.ts`
- `src/features/game/events/landExpansion/craftTool.ts`
- `src/features/game/events/landExpansion/upgradeTree.ts`, `upgradeRock.ts`
- `src/features/game/events/landExpansion/placeTree.ts`, `moveTree.ts`, `removeTree.ts`
  (e os equivalentes `place*/move*/remove*` de cada rocha)
- `src/features/game/types/resources.ts`, `types/tools.ts`
- `src/features/game/lib/constants.ts` (tempos de recarga), `lib/boostWindows.ts`, `lib/prng.ts`
- `src/features/game/expansion/lib/expansionNodes.ts`

> Sala limpa: nada de nomes de itens, constantes ou números do SFL. Só a forma.

## O que o jogador faz
1. Fabrica ferramentas na bancada do ferreiro (machado, picaretas de vários níveis), pagando moeda
   soft e, para as melhores, materiais.
2. Toca numa árvore com machado → recebe madeira; toca numa rocha com picareta → recebe pedra ou
   minério.
3. O nó entra em recarga com um contador visível; volta a ficar disponível sozinho.
4. Usa os materiais para fabricar ferramentas melhores, pagar expansões, construir prédios e
   fabricar itens.
5. Mais tarde: funde vários nós básicos posicionados num nó de nível superior que rende mais.

## Regras observadas (em palavras nossas)
- **Ferramenta é consumível.** Cada ação de coleta gasta uma ferramenta (algumas habilidades ou
  itens reduzem o gasto pela metade, ou tornam uma coleta gratuita). Sem ferramenta, a ação é
  rejeitada.
- **Cadeia de ferramentas por material.** A ferramenta do nível básico custa só moeda; a do nível
  seguinte exige também o material do nível anterior (ex.: a picareta para minério médio pede o
  material do nó mais simples). Isso amarra todos os recursos numa cadeia de dependência.
- **Bancada com estoque diário.** Ferramentas têm estoque limitado que reabastece; há bloqueios por
  nível do avatar e por tipo de ilha. No tutorial existe uma cota de ferramentas gratuitas que não
  consome o estoque (`craftTool.ts`, comentários sobre o "loop moeda → ferramenta → material").
- **Nó posicionável.** Árvores e rochas são itens de inventário que o jogador posiciona no mapa; a
  quantidade possuída vem principalmente das expansões. Nó guardado não pode ser coletado. Mover um
  nó mantém seu timer.
- **Validação de coleta:** nó existe, está posicionado, não está em recarga, há ferramenta
  suficiente.
- **Recarga:** grava-se o momento da coleta (da ação) + duração-base com bônus permanentes; bônus
  temporários entram como janelas de velocidade. "Pronto" é derivado, não guardado. Há chance
  (via PRNG determinístico) de recarga instantânea.
- **Rendimento:** base de uma unidade por coleta, multiplicada pelo multiplicador do nó (nós
  fundidos rendem mais) e somada a bônus de habilidades/colecionáveis; críticos por chance com
  PRNG semeado por fazenda + item + contador de coletas.
- **Recompensa extra ocasional:** além do material, cortar uma árvore pode, por chance, dar moeda
  ou itens.
- **Minérios especiais** têm regras próprias:
  - um tipo exige minerações **seguidas**: o nó tem uma contagem de "golpes restantes" que só se
    mantém se o jogador voltar dentro de uma janela após a recarga; se demorar, a sequência reinicia;
  - outro tipo tem **número limitado de minerações** e o nó desaparece ao esgotar (é consumível).
- **Fusão/upgrade de nós:** pagando moeda + materiais, o jogo remove N nós posicionados do nível
  anterior e cria um nó do nível seguinte na posição do primeiro removido, com multiplicador de
  rendimento maior (`upgradeTree.ts`, `upgradeRock.ts`). Há três níveis.
- **Revelar uma expansão reabastece tudo**: todos os nós da ilha voltam prontos (ver
  `04-expansao.md`).

## Timers / custos / recompensas (apenas a FORMA)
- Recarga cresce com o "valor" do recurso: material comum recarrega em horas, minérios médios em
  mais horas, minérios raros em dias.
- Ferramentas mais avançadas custam mais moeda e exigem materiais de nível inferior.
- Fundir nós troca quantidade por qualidade: menos nós ocupando espaço, mais rendimento por toque.
- Rendimento por coleta é baixo e estável; a variância vem de críticos raros.

## Por que funciona (retenção, sink, social)
- **Motivo para voltar** em vários horizontes de tempo diferentes (o loop médio do GDD).
- **Sink duplo**: ferramentas consomem moeda soft a cada coleta, e os materiais são consumidos por
  ferramentas melhores, expansões e construções → a economia drena bem.
- **Cadeia de dependência** faz cada recurso novo valorizar o anterior.
- **Fusão de nós** resolve o problema de "fazenda lotada" e vira objetivo de longo prazo.
- **Regras especiais** (sequência, esgotável) criam variedade sem UI nova.

## O que faremos diferente
- **MVP com 3 nós** (árvore, pedra, um minério) e **2–3 ferramentas**; minérios especiais e fusão
  de nós ficam para depois do MVP.
- **Avaliar ferramenta durável em vez de consumível**: gastar uma ferramenta a cada toque é um sink
  forte, mas parece punitivo para jogador casual. Alternativa: ferramenta com durabilidade
  (vários usos) ou energia/estamina diária. O `economista-tokenomics` deve simular as duas.
- **Sem bancada com estoque diário** no MVP — limite anti-bot vem do timer do nó, que já é
  autoritativo no servidor.
- **Manter**: timer derivado (momento da coleta + duração), nó posicionável que preserva timer ao
  mover, PRNG determinístico para críticos.
- **Recompensa por expansão** (reabastecer nós) é ótima para o "momento uau" — copiar a ideia, com
  apresentação nossa.
- **Feedback de toque**: no celular, mostrar o rendimento flutuando e o timer ao segurar o dedo; não
  exigir vários toques para uma coleta.
