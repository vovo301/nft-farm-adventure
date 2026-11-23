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

Resposta do usuário (2026-11-22): **escolheu C** ("o modelo C ainda é o melhor").

## Lote 2026-11-22-itens-usuario-recortados  — status: in_review
Arte **do usuário** (uso autorizado; `art/source/user-provided/2026-11-22/PROVENIENCIA.md`) recortada com fundo transparente. Nada foi repintado.
Pranchas: art/review/2026-11-22-itens-usuario-recortados/prancha-{recursos,ferramentas,culturas}-{claro,escuro,grama}.png · bordas: prancha-bordas-2x.png · Notas: notas.md
Guia: art/style-guide/README.md (v3.1: esta arte é o estilo-alvo de itens, recursos, ferramentas e culturas) · Paleta: palette.json (v3.1, +14 rampas extraídas desta arte)

| # | asset | tamanho @1x (@2x) | nota |
|---|---|---|---|
| 1 | resource_stone, resource_ore_gray, resource_ore_gold | 244×244 (488) | pedra, minério cinza, minério de ouro |
| 2 | resource_crystal_blue / _purple / _green | 244×244 (488) | cristais com brilho e partículas em alfa suave |
| 3 | resource_log | 244×244 (488) | tora com folhas |
| 4 | tool_shovel, tool_axe, tool_rake, tool_drill, tool_fishing_rod | 212×212 (424) | ferramentas |
| 5 | tool_pickaxe_iron / _iron_reinforced / _gold / _crystal | 212×212 (424) | 4 níveis de picareta |
| 6 | crop_<cultura>_s0..s3 (23 culturas, 92 PNG por escala) | 196×146 (392×292) | rice, pea, grape, apple_tree, mushroom, eggplant, chili_pepper, bell_pepper, strawberry, watermelon, sunflower, beet, cabbage, lettuce, onion, garlic, cucumber, carrot, pumpkin, tomato, corn, wheat, potato |

Pergunta ao usuário: o recorte está limpo (sem halo, brilho preservado)? Aprova os 108 itens, ou quais refazer e por quê.
Resposta do usuário: _(pendente)_

## Lote 2026-11-22-alvo-visual-c-01  — status: in_review
Alvo visual do guia v3 (estilo C pintado semirrealista, harmonizado com a arte do usuário), mesma composição do iso-01 para comparar. Vetor por script, sem IA; o trigo dos canteiros é a arte do usuário escalada. Nada é produzido em escala antes da aprovação.
Prancha: art/review/2026-11-22-alvo-visual-c-01/prancha.png
Cena: cena.png (@2x: cena@2x.png · 0,5: cena-zoom05.png · celular: cena-celular.png, cena-celular-dpr2.png) · Prova de leitura a 0,5: prova-leitura-05.png · Notas: notas.md

| # | asset | tamanho @1x | nota |
|---|---|---|---|
| 1 | ground_grass_a/b/c, ground_water_a/b | 136×68 | grama pintada (3 variantes) e água |
| 2 | ground_path_dirt_* (18) | 136×68 | caminho de terra, autotile de 16 + 2 variantes |
| 3 | ground_edge_grass_* (12) | 136×116 | borda da ilha com barranco, raízes e pedras |
| 4 | ground_pond_2x2 + decor_* (4) | vários | lago, manchas, flores, seixos |
| 5 | tree_oak_a, tree_apple_a, tree_pine_a | ajustado | copas em massas de tufos pontudos |
| 6 | prop_bush_a/b, rock_ore_a | ajustado | arbustos; pedra angular com minério |
| 7 | plot_raised_bed + crop_wheat_s1/s2/s3 | ajustado | canteiro de tábuas; trigo do usuário |
| 8 | prop_hay_bales, prop_crate | ajustado | fardos de feno; caixote com maçãs |
| 9 | prop_fence_* (8) | 160×108 | cerca de madeira envelhecida |
| 10 | bld_barn_small | ajustado | galpão 3×3, tábuas, telhas de barro |
| 11 | avatar_base_idle_se | ajustado | fazendeiro adulto, ~6 cabeças |
| 12 | ui_indicator_ready | 48×60 | indicador discreto (losango fosco com espiga) |

Pergunta ao usuário: aprova a direção para o mundo (proporções, materiais, cores, leitura no celular)? Se não, quais reprovar e por quê.
Resposta do usuário: _(pendente)_
