# Fila de aprovação de arte

O `produtor` adiciona cada lote aqui e mostra a prancha ao usuário. O usuário responde só
"aprovado" ou "reprovado: <motivo>". Formato em `.claude/skills/art-approval-pipeline/SKILL.md`.

## Lote 2026-11-21-alvo-visual-01  — status: rejected
Alvo visual do projeto (Fase 0). Nada é produzido em escala antes de ele estar `approved`.
Prancha: art/review/2026-11-21-alvo-visual-01/prancha.png
Cena: art/review/2026-11-21-alvo-visual-01/mapa-preview.png · Notas: art/review/2026-11-21-alvo-visual-01/notas.md
Guia de estilo proposto: art/style-guide/README.md · Paleta: art/style-guide/palette.json (47 cores)

| # | asset | tamanho | nota |
|---|---|---|---|
| 1 | avatar_base_idle_s | 16×24 | avatar base parado, de frente; chapéu de palha, jardineira azul |
| 2 | tile_grass | 16×16 | chão de grama, contínuo |
| 3 | tile_soil_tilled | 16×16 | terra arada (camalhões), contínuo |
| 4 | tile_water | 16×16 | água, contínuo |
| 5 | tile_water_edge_n | 16×16 | extra: borda grama→água |
| 6 | icon_seed_bag | 16×16 | ícone: saco de sementes |
| 7 | icon_tomato | 16×16 | ícone: tomate colhido |
| 8 | icon_coin | 16×16 | ícone: moeda com broto cunhado |

Pergunta ao usuário: aprova a direção (paleta + guia + estes 8 assets)? Se não, quais reprovar e por quê.
Resposta do usuário (2026-11-21): **reprovado** — "vamos trabalhar melhor na criação das artes"; o usuário vai enviar exemplos de referência. Próxima rodada parte dos exemplos, não desta versão.

## Lote 2026-11-22-alvo-visual-iso-01  — status: rejected
Alvo visual da direção v2 (isométrico cartoon, vetor por script, sem IA). Nada é produzido em escala antes de ele estar `approved`.
Prancha: art/review/2026-11-22-alvo-visual-iso-01/prancha.png
Cena: art/review/2026-11-22-alvo-visual-iso-01/cena.png (@2x: cena@2x.png · celular: cena-zoom05.png, cena-celular.png) · Notas: art/review/2026-11-22-alvo-visual-iso-01/notas.md
Guia: art/style-guide/README.md (v2.1) · Paleta: art/style-guide/palette.json (v2.1, 121 cores)

| # | asset | tamanho @1x | nota |
|---|---|---|---|
| 1 | ground_grass_a / _b / _c | 136×68 | grama verde-limão, 3 variantes |
| 2 | ground_water_a / _b | 136×68 | água ao redor da ilha |
| 3 | ground_path_dirt_* (18) | 136×68 | caminho bege, autotile de 16 + 2 variantes, cantos arredondados |
| 4 | ground_edge_grass_* (12) | 136×116 | borda da ilha com barranco na frente |
| 5 | ground_pond_2x2 | 288×168 | lago pequeno com margem, pedras e juncos |
| 6 | decor_grass_patch_a/b, decor_flowers_a, decor_pebbles_a | vários | decoração solta contra repetição |
| 7 | tree_oak_a / tree_apple_a | 160×232 | árvores fofas (uma com maçãs) |
| 8 | prop_bush_a / prop_bush_flower_a | 160×96 | arbustos (um florido) |
| 9 | rock_ore_gold_a | 160×100 | pedra com minério |
| 10 | plot_raised_bed + crop_tomato_s1/s2/s3 | 160×96 / 128×112 | canteiro elevado e tomate em 3 estágios |
| 11 | prop_hay_roll, prop_crate | 160×112 / 160×104 | fardo de feno em rolo, caixote |
| 12 | prop_fence_* (8) | 160×100 | cerca de madeira: retos, cantos, pontas |
| 13 | bld_barn_small | 416×308 | celeiro 3×3 vermelho, frisos creme, telhado de 2 águas |
| 14 | avatar_base_idle_se | 80×112 | avatar base de frente (chapéu de palha, xadrez vermelho, jardineira azul) |
| 15 | ui_indicator_ready | 48×60 | indicador "pronto para colher" |

Pergunta ao usuário: aprova a direção (acabamento, cores, proporções, leitura a 0,5)? Se não, quais reprovar e por quê.
Resposta do usuário (2026-11-22): **reprovado** — "está muito infantil, tudo muito arredondado, árvores com copas arredondadas, personagem com aspecto infantil". Próxima rodada: prancha comparativa de estilos menos infantis antes de produzir em escala.

## Lote 2026-11-22-estilos-comparativo  — status: escolha de direção (draft)

Prancha: art/review/2026-11-22-estilos-comparativo/prancha.png (@2x: prancha@2x.png) · Notas: notas.md

Mesmas 6 peças (árvore folhosa, pinheiro, galpão, fazendeiro adulto, canteiro com trigo, pedra com
minério) + trecho 3×3 em três direções: **A** estilizado maduro · **B** low-poly facetado ·
**C** pintado semirrealista. Recomendação do diretor: A, com paleta terrosa e sombra de C.

Resposta do usuário: _(pendente — escolher A, B, C ou mistura)_
