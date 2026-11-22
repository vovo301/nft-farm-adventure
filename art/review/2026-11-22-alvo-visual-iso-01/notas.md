# Lote 2026-11-22-alvo-visual-iso-01: alvo visual isométrico cartoon (status: in_review)

Primeiro alvo visual da direção v2 (guia `art/style-guide/README.md`, v2.1). Trecho de fazenda
de 10×8 tiles. Tudo é vetor gerado por script, sem IA, sem referência externa e sem nada
derivado de Sunflower Land, Sunnyside ou dos kits que o usuário mostrou. Os kits serviram só como
direção geral: grama verde-limão, caminho bege, volume fofo, celeiro vermelho e contorno fino
colorido.

Build reproduzível. Sai 0 só se todo o QA passar e também atualiza `art/manifest.json`:

```bash
python3 -m pip install -r art/source/tools/requirements.txt
python3 art/source/tools/build_alvo_visual_iso_01.py
```

## O que o usuário olha

| Arquivo | O que é |
|---|---|
| `cena.png` | cena a zoom 1,0 com @1x (1280×800) |
| `cena@2x.png` | a mesma cena com @2x (tela retina) |
| `cena-zoom05.png` | cena a zoom 0,5 (celular afastado) |
| `cena-celular.png` | recorte de 390 px de largura a 0,5 (largura de um celular em retrato) |
| `prancha.png` | peças isoladas a 1:1 com nome e sombra, mais detalhe @2x de avatar, tomate, feno e indicador |
| `prancha-tecnica.png` | teste de repetição da grama (8×8 sem e com manchas) e o autotile do caminho em curvas, T e cruz |
| `prancha-debug.png` | grade, coordenadas, pegadas (ciano) e âncoras (magenta) |
| `qa.json` | resultado de todo o QA |

## Peças (62 peças + sombras = 160 PNGs, @1x e @2x, cada uma com `.json` de âncora)

| Família (pasta) | Peças |
|---|---|
| `iso-ground` | `ground_grass_a/b/c`; `ground_water_a/b`; `ground_path_dirt_<máscara>` (autotile de 16, mais `xpxn_b` e `ypyn_b`); `ground_edge_grass_<máscara>` (8 bordas, mais `xp_b/_c` e `yp_b/_c`); `ground_pond_2x2`; `decor_grass_patch_a/b`; `decor_flowers_a`; `decor_pebbles_a` |
| `iso-nature` | `tree_oak_a`, `tree_apple_a`, `prop_bush_a`, `prop_bush_flower_a`, `rock_ore_gold_a` |
| `iso-crops` | `plot_raised_bed`, `crop_tomato_s1` (broto), `_s2` (médio), `_s3` (maduro) |
| `iso-props` | `prop_hay_roll`, `prop_crate`, `prop_fence_{x, y, corner_n, corner_e, corner_w, corner_s, end_xn, end_xp}` |
| `iso-buildings` | `bld_barn_small` (3×3) |
| `iso-characters` | `avatar_base_idle_se` (substitui o boneco cinza `ref_scale_figure`) |
| `iso-ui` | `ui_indicator_ready` |

Máscara do autotile: `xp` = vizinho em +x, `yp` = +y, `xn` = −x, `yn` = −y.

## Decisões técnicas novas (registradas no guia v2.1)

- **Caminho:** autotile de 16 tiles por máscara de 4 vizinhos. A faixa tem 0,6 tile de largura,
  com cantos convexos arredondados (raio 0,2), cantos côncavos suavizados (0,1), filete de sombra
  da grama, borda interna rebaixada, centro gasto mais claro e tufos invadindo a beira. Os braços
  passam da borda do tile e o clip do losango corta, então o trecho continua sem costura.
- **Ilha:** a grama fica no plano z=0 e a água 40 px abaixo. Os tiles de borda +x e +y têm
  barranco com estratos, pedras e espuma, e o pé ondulado é periódico (período de 1 tile), então
  emenda entre vizinhos. A sangria do topo só vai para dentro da ilha. As bordas do fundo têm só
  um filete de luz.
- **Canteiro = objeto** (`plot_raised_bed`, altura 16, terra em z=12). A cultura é um sprite à
  parte, com a mesma âncora do canteiro e base em `z_base_px = 12` (no manifesto). Tem 4 plantas
  em 2 camalhões, e a base fica fixa entre os estágios.
- **Fardo de feno em rolo:** cilindro deitado no eixo y com espiral na face clara, amarras e
  palha saindo da silhueta. Resolve a leitura de "caixote amarelo".
- **Cerca:** um poste no centro do tile e trilhos do centro até a borda, em cor chapada e cortados
  na linha da borda, para emendar sem costura no vizinho. Peças por máscara (reto, canto, ponta).
- **Celeiro:** empena com o portão virada para a face clara (+y). Telhado de 2 águas com a
  cumeeira no eixo y; só a água +x aparece. Porta com 94 px (≈1,02× o avatar).
- **Paleta v2.1:** entram 3 rampas (`barranco`, `fruta_vermelha`, `flor_rosa`) e o total vai para
  121 cores. O tomate e a maçã usam um vermelho mais frio que o do celeiro, para não confundir.

## QA (todos passaram)

- **Costura do topo da ilha:** 0 pixels não opacos a zoom 0,5, 0,75, 1, 1,5 e 2.
- **3×3 de cada tile** de grama, caminho e água: 23/23 sem buraco.
- **Paleta:** nenhum hex fora de `palette.json` nos SVGs.
- **Contrato:** canvas múltiplo de 4, âncora em x = W/2, âncora par (inteira a zoom 0,5) e nenhum
  objeto encostando na borda do canvas (@1x e @2x).
- **`asset_report.py --expect-size --require-alpha`:** os 160 PNGs, agrupados por tamanho,
  saíram com código 0.

## Revisão interna do diretor de arte (refeito antes de mandar)

1. **Marcas de folha que pareciam sorrisos:** os arcos "‿" isolados na copa liam como rostinhos.
   Viraram escamas de 2–3 lóbulos ligados, com a borda para cima.
2. **Barranco repetitivo:** as pedras formavam uma fileira regular. Agora são 3 arranjos de pedras
   por face, escolhidos por hash da posição.
3. **Água em grade:** os "~" alinhados viravam papel de parede. Agora são 2 variantes mais
   esparsas, escolhidas por hash.
4. **Pedrinhas do caminho:** repetiam a cada tile no trecho reto. Diminuí a quantidade e criei a
   variante `_b` dos retos.
5. **Indicador escondendo o broto:** o canteiro maduro foi para a frente-esquerda. O balão não
   cobre mais os outros canteiros.
6. **Janela redonda do celeiro:** ficava meio coberta pelo friso da empena e só aparecia como um
   "fantasma". Foi removida.
7. **Estágio médio pouco distinto do broto a 0,5:** a moita ficou mais alta e cheia, com 3 flores
   amarelas.
8. **Rodada técnica:** o rolo de feno, os trilhos de cerca que vão para trás, o balão e a sombra
   do celeiro encostavam na borda do canvas. Canvas e geometria ajustados.

## Pendências e limites conhecidos

- Ainda não visto **no jogo rodando** (Phaser). A cena é uma composição em Pillow com a mesma
  ordem de camadas e de profundidade do guia.
- Só existe a direção `_se` do avatar e nenhuma animação (fica com o `animador` depois da aprovação).
- Faltam os **ícones de inventário 64×64** do alvo original (sementes, tomate, moeda) nesta direção.
  Proposta: próximo lote, para o `artista-icones-ui`, só depois desta aprovação.
- Os trechos retos de borda e caminho ainda têm 2–3 variantes. Em mapas grandes pode ser preciso
  mais variação.
- A ordenação por `x + y` do celeiro 3×3 só é segura sem objetos encostados nas laterais de trás.
  Em mapa de jogo, ou se fatia o celeiro em colunas ou se reserva a pegada.
- O lago é um decalque plano. Os juncos ficam do lado do fundo para não brigar com a ordenação.
- Este alvo junta 24 entradas de manifesto, acima do limite normal de 12 por lote. Foi uma exceção
  combinada, por ser o quadro de estilo.

## Pergunta ao usuário

Aprova esta direção (acabamento, cores, proporções e leitura a 0,5)? Se não, diga quais peças
reprovar e por quê.
