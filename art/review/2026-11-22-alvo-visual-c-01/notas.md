# Lote 2026-11-22-alvo-visual-c-01: alvo visual do guia v3 (status: in_review)

O usuário escolheu o **estilo C · pintado semirrealista** e depois mandou arte própria como
estilo-alvo de itens e culturas. Este alvo repete **a mesma composição do iso-01 reprovado**, para
uma comparação justa: ilha 10×8 com barranco, grama em 3 variantes, caminho de terra com
transições, lago, 4 canteiros (3 estágios + vazio), árvore folhosa, macieira, pinheiro, 3
arbustos, galpão 3×3 de telhas, cerca, fardos de feno, caixote, pedra com minério, fazendeiro
adulto (`_se`) e indicador discreto de "pronto para colher".

**Harmonização com a arte do usuário:** os canteiros mostram o **trigo do usuário**
(`culturas-d.webp`, estágios s1–s3) escalado para o mundo. As peças vetoriais ganharam o
contorno escuro-quente fino da arte dele (cor `contorno_item`, extraída das imagens).

```bash
python3 art/source/tools/cut_user_items.py         # antes: gera os recortes do usuário
python3 art/source/tools/extract_palette_v3.py
python3 art/source/tools/build_alvo_visual_c_01.py  # sai 0 só se todo o QA passar
```

## O que o usuário olha

| Arquivo | O que é |
|---|---|
| `cena.png` | cena a zoom 1,0 com @1x (1280×800) |
| `cena@2x.png` | a mesma com @2x (tela retina) |
| `cena-zoom05.png` | cena inteira a zoom 0,5 |
| `cena-celular.png` | recorte de 390×360 a 0,5 (celular em retrato, DPR 1: o pior caso) |
| `cena-celular-dpr2.png` | o mesmo enquadramento de celular com DPR 2 (texturas @2x) |
| `prancha.png` | peças isoladas a 1:1 com sombra, mais detalhe @2x |
| `prova-leitura-05.png` | **antes × depois a 0,5** (peças C da prancha comparativa × v3), com métricas |
| `prancha-tecnica.png` | grama 8×8 só com as variantes e o autotile do caminho |
| `prancha-debug.png` | grade e âncoras |
| `qa.json` | resultado de todo o QA |

## Peças (60 vetoriais + 3 estágios do usuário; @1x, @2x e JSON de âncora)

| Pasta | Peças |
|---|---|
| `art/export/v3-ground/` | `ground_grass_a/b/c`, `ground_water_a/b`, `ground_path_dirt_*` (16 + `xpxn_b`, `ypyn_b`), `ground_edge_grass_*` (8 + 4 variantes), `ground_pond_2x2`, `decor_grass_patch_a/b`, `decor_flowers_a`, `decor_pebbles_a` |
| `art/export/v3-nature/` | `tree_oak_a`, `tree_apple_a`, `tree_pine_a`, `prop_bush_a`, `prop_bush_b`, `rock_ore_a` (+ `_shadow`) |
| `art/export/v3-crops/` | `plot_raised_bed` (vetor), `crop_wheat_s1/s2/s3` (arte do usuário, escala 0,60, base na terra do canteiro) |
| `art/export/v3-props/` | `prop_hay_bales`, `prop_crate`, `prop_fence_{x, y, corner_n/e/w/s, end_xn/xp}` |
| `art/export/v3-buildings/` | `bld_barn_small` (3×3) |
| `art/export/v3-characters/` | `avatar_base_idle_se` (~94 px, ~6 cabeças) |
| `art/export/v3-ui/` | `ui_indicator_ready` |

## Leitura a zoom 0,5: regras e prova (guia v3, seção 9)

- **L1 silhueta forte:** copa em 4–6 massas com vão escuro entre elas; trigo em touceiras
  agrupadas; pedra em 3 planos grandes com pepitas de ≥ 7 px @1x.
- **L2 contraste local:** ΔL\* ≥ 16 no anel da silhueta da peça interativa contra a grama.
- **L3 menos micro-detalhe:** detalhe que importa tem ≥ 4 px @1x; agulhas, estrias e líquen
  cortados pela metade; textura interna com ΔL\* ≤ 8.
- **L4 realce sutil:** `rim()` no lado da luz, `occlusion()` no lado da sombra e contorno fino
  (3 px @2x / 1,5 px @1x).
- **L5 medida no build** (falha = código 1).

| Peça a 0,5 | Antes (prancha C): borda ΔL\* / índice | Depois (v3) |
|---|---|---|
| canteiro com trigo maduro | 14,0 / 2,29 (**não passa**) | **19,4** / 2,96 |
| pedra com minério | 10,5 / 3,67 (**não passa**) | **21,0** / 6,90 |
| árvore folhosa | 19,8 / 5,60 | **27,0** / 7,76 |
| fazendeiro | 15,5 / 1,72 (**não passa**) | **21,5** / 3,25 |

Outras peças interativas (depois): galpão 23,3; macieira 27,3; pinheiro 27,7; fardos 19,8;
caixote 22,5; canteiro vazio 21,4; trigo broto 20,4; trigo crescendo 18,6. Todas ≥ 16.

O critério que separa antes e depois é a **borda ΔL\***. O índice borda/ruído passou nos dois
lados e serve de trava contra textura demais no miolo.

## QA (todos passaram)

- Costura do chão: 0 pixels não opacos a 0,5, 0,75, 1, 1,5 e 2. 3×3 de 23 tiles sem buraco.
- Paleta: todo hex dos SVGs é tom da paleta v3.1 ou mistura de 2 tons vizinhos da mesma rampa.
- Contrato: canvas múltiplo de 4, âncora par, x = W/2 (sprites), nada na borda do canvas.
- `asset_report.py --expect-size --require-alpha`: todos os grupos com código 0.
- Leitura a 0,5 (L5): todas as peças interativas ≥ mínimo.

## Revisão interna (contra o guia v3 e o feedback "nada infantil, nada arredondado")

1. **Falhou a regra L5 na 1ª rodada:** pedra 15,8, feno 12,6, caixote 14,4, trigo crescendo 15,7.
   → Planos mais separados (pedra: topo 0,88 / sombra 0,20; feno e caixote mais claros na face
   iluminada), realce e oclusão mais fortes, terra do canteiro um pouco mais clara (o monte de
   terra escuro do usuário se destaca) e contorno de 3 px @2x com o @1x derivado do @2x.
2. **Costura a 0,5 e 0,75** (5028 e 59 px): a redução LANCZOS amolecia a borda nítida do losango.
   → Redução BOX pré-multiplicada (como no iso-01).
3. **Filetes no vazio ao lado do telhado do galpão:** o realce usava a envoltória convexa. →
   Realce e oclusão aplicados nas formas reais (telhado, parede, oitão).
4. **Trigo do usuário pequeno demais no canteiro** (escala 0,42). → 0,60. O indicador subiu.
5. **Arredondado:** copas são massas de tufos pontudos (nada de bolas), a pedra é angular, o
   caminho tem cantos de raio pequeno (0,09 tile), o galpão tem quinas vivas e o personagem tem
   ~6 cabeças, olho de traço e barba curta. Frutos e legumes continuam redondos porque são assim.
6. **Sombra do C (~1,4× a altura) saía do quadro:** a luz da sombra subiu (~0,9× a altura) e
   cada sombra tem canvas próprio.

## Pendências e limites

- Ainda não visto **no jogo rodando** (Phaser). A cena é uma composição em Pillow com a ordem de
  camadas do guia.
- Ainda não existe animação. O personagem só tem a direção `_se`.
- A grama e as construções seguem a paleta terrosa do C. Elas ficam **mais calmas que a arte do
  usuário** de propósito (hierarquia de saturação, guia seção 8). Se o usuário quiser o mundo tão
  vivo quanto os itens, o próximo passo é subir um degrau de saturação nas rampas `grama`,
  `folhagem` e `telha`.
- A pedra, a árvore e o galpão do mundo são vetoriais. As versões do usuário (`resource_stone`,
  `resource_ore_*`, `resource_log`) são ícones de frente e ainda não têm versão isométrica de mundo.
- Este alvo junta 23 entradas de manifesto (acima de 12), por ser o quadro de estilo.

## Pergunta ao usuário

Aprova esta direção para o mundo (proporções, materiais, cores, leitura no celular), junto com os
recortes da sua arte? Se não, diga quais peças reprovar e por quê.

## Resposta do usuário

_(pendente)_
