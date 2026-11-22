# Guia de estilo: NFT Farm Adventure (isométrico cartoon)

> Dono: `diretor-de-arte`. **Versão 2.1 (2026-11-22).** Substitui a v1 em pixel art top-down
> (reprovada no lote `2026-11-21-alvo-visual-01`), arquivada em
> `art/style-guide/archive/pixel-v0/` só como histórico.
> Estado: **proposta técnica.** As regras de grade, export e âncora já valem. Forma, cor e
> acabamento viram oficiais quando o alvo visual vetorial for `approved` pelo usuário.

Arte 100% original. Nada derivado de Sunflower Land, do pack Sunnyside ou dos kits de terceiros
que o usuário mostrou como direção geral. Não copiamos composição, formas, proporções nem assets.

## 0. Método de produção (decisão do usuário, 2026-11-22)

- **Só vetor por script.** Cada asset é gerado por código Python como SVG e rasterizado para PNG
  (`art/source/tools/iso_vector.py`).
- **Nenhum gerador de imagem por IA**, nem para conceito ou alvo visual. Todo manifesto registra
  `source.kind: "scripted"`.
- Corrigir um asset é editar o script que o gera, nunca o PNG. O PNG é sempre reproduzível.

## 1. Quadro do jogo

| Item | Decisão |
|---|---|
| Fantasia | cuidar de uma fazendinha colorida e aconchegante, voltar e sempre ter algo pronto |
| Verbos | plantar, colher, coletar, cozinhar, vender, decorar |
| Engine | Phaser 4 (WebGL), **`pixelArt: false`**, filtro **linear**, `roundPixels: false` |
| Plataformas | navegador desktop e celular (retrato e paisagem) |
| Vista | **isométrica 2:1 (dimétrica de jogo)**, câmera fixa olhando do sul, sem rotação |
| Tile de chão | losango **128×64 px a 1×** (passo da grade: 64 px em x e 32 px em y por tile) |
| Densidade de tela | texturas **@1x** e **@2x**. Usar @2x quando `devicePixelRatio × zoom > 1,2` |
| Zoom de câmera | desktop 1,0 (faixa 0,75–1,5); celular 0,5–0,75. Zoom livre (não precisa ser inteiro) |

## 2. Projeção e grade

- Coordenadas de grade `(x, y)`: o eixo x desce para a **direita** e o eixo y desce para a
  **esquerda**. Tela: `sx = (x − y)·64`, `sy = (x + y)·32 − z` (z = altura em px a 1×).
- Linhas do chão em 2:1 exato (2 px em x para 1 px em y). Não usamos 30° "verdadeiros".
- Ordem de desenho (profundidade): chão → decoração plana → **sombras** → objetos e personagens
  ordenados por `x + y` da âncora (empate: maior `x` por último).
- Objetos de mais de um tile ordenam pela âncora do canto frontal da pegada. Construções grandes
  podem ser fatiadas em colunas se a ordenação falhar.

## 3. Contrato técnico (tamanhos a 1×; @2x = tudo ×2)

| Tipo | Canvas @1x | Pegada | Âncora (px @1x) | Prefixo |
|---|---|---|---|---|
| Tile de chão | **136×68** (128×64 + sangria) | 1×1 | (68, 34) = centro do losango | `ground_` |
| Tile de chão com borda/espessura (ilha, barranco) | 136×(68+altura) | 1×1 | (68, 34) | `ground_edge_` |
| Objeto pequeno (feno, caixote, arbusto) | 160×(altura+44) | 1×1 | (80, H−44) | `prop_` |
| Recurso (árvore, pedra, minério) | 160×(altura+44) | 1×1 | (80, H−44) | `tree_`, `rock_` |
| Cultura (estágios) | 128×(altura+40) | 1×1 (sobre `ground_soil_*`) | (64, H−40) | `crop_<nome>_s<N>` |
| Personagem/NPC | 64–96×(altura+12) | ponto | (W/2, H−12) = entre os pés | `avatar_`, `npc_`, `animal_` |
| Construção n×m | (n+m)·64 + 32 × (altura + (n+m)·16 + 12) | n×m | centro do losango da pegada | `bld_` |
| Ícone de UI/inventário | 64×64 (exibido 32–64 CSS px) | — | centro | `icon_` |
| Canteiro elevado (objeto) | 160×96 | 1×1 | (80, 52) | `plot_` |
| Decalque de chão (lago, manchas, flores soltas) | livre, múltiplo de 4 | n×m | centro da pegada | `ground_` (n×m), `decor_` |
| Indicador sobre objeto | 48×60 | — | (24, 56) = ponta do rabicho | `ui_` |

Regras gerais:

- **Âncora = centro do losango da pegada** (ponto de chão onde o objeto "está"). Cada export tem
  um `<nome>.json` ao lado com `size_1x`, `anchor_px_1x`, `origin` (fração para
  `setOrigin`) e `footprint_tiles`. O cliente lê o `origin` daí e não usa números fixos no código.
- Canvas sempre com largura e altura **múltiplas de 4**, e âncora em x = metade da largura.
- **Sangria do chão:** o losango é desenhado 4 px mais largo e 2 px mais alto, com borda nítida
  (`crispEdges`). Vizinhos se sobrepõem e não aparece costura com filtro linear nem a zoom 0,5.
  No Tiled, use um tileset de 136×68 com `tileoffset` (−4, +2) sobre um mapa de 128×64.
- **Sombra projetada = arquivo separado** `<nome>_shadow@Nx.png`, com o mesmo canvas e a mesma
  âncora do sprite. Vai numa camada de sombras acima do chão e abaixo de todos os objetos, para
  não "pintar" objetos vizinhos.
- PNG RGBA, sRGB, alfa reto. Atlas com 2 px de padding e extrusão. Mipmaps ligados só em atlas POT.
- Nomes em inglês, `snake_case`: `<prefixo>_<nome>[_<variante a|b|c>][_<estado>][_<dir>]@<1|2>x.png`.
  Direções: `_se` (padrão, de frente para a câmera), `_sw`, `_ne`, `_nw`. Os lados opostos
  podem ser espelhados (`flipX`) se o asset não tiver texto nem assimetria importante.
- Pastas: fonte gerada `art/source/<familia>/<nome>.svg` (não editar, ela sai do script), script
  `art/source/tools/build_<lote>.py`, export `art/export/<familia>/`, revisão
  `art/review/<lote>/`.

### 3.1 Regras adicionadas na v2.1 (alvo visual iso-01)

- **Autotile de chão por máscara de 4 vizinhos:** sufixo `_<máscara>` com `xp`, `yp`, `xn`,
  `yn` (ex.: `ground_path_dirt_xpyn`), ou `none` sem vizinhos. Variantes do mesmo encaixe
  ganham `_b`, `_c` e são escolhidas por hash da posição.
- **Ilha:** a água fica 40 px abaixo da grama. `ground_edge_grass_<máscara>` (136×116) tem
  barranco em +x e +y e um filete de luz em −x e −y. O pé do barranco e os estratos são
  periódicos em 1 tile.
- **Culturas sobre canteiro:** o sprite da cultura tem a mesma âncora do `plot_raised_bed`. A
  base das plantas fica em `z_base_px` = 12, registrado no manifesto.
- **Peças de cerca/trilho contínuo:** cor chapada (sem degradê por bounding box), cortadas na
  linha da borda do tile, para emendar sem costura.
- **Nunca** use arco "‿" isolado como marca de folha: a 1× ele lê como rostinho. Use escamas de
  2–3 lóbulos ligados.

## 4. Escala relativa (a 1×, tile = 128×64)

| Coisa | Altura na tela | Pegada | Nota |
|---|---|---|---|
| Personagem adulto (avatar) | **~92 px** (≈ 0,72 da largura do tile) | círculo de ~0,3 tile | cabeça grande (≈ 2,8 cabeças de altura), chibi |
| Animal pequeno (galinha) | 36–44 px | ponto | |
| Animal grande (vaca) | 70–80 px | 1×1 | |
| Cultura madura | 40–64 px | 1 tile de canteiro | estágios crescem de baixo para cima, base fixa |
| Fardo de feno / caixote | 50–60 px | ~0,6×0,45 | |
| Árvore redonda | **160–190 px** (≈ 2× o avatar) | 1×1 | copa de 120–135 px de largura |
| Cerca (segmento) | 40–48 px | aresta de 1 tile | |
| Casa / celeiro pequeno | 220–300 px | 3×3 | porta com ~1,15× a altura do avatar |
| Celeiro grande | 300–380 px | 4×4 | |

O boneco cinza `ref_scale_figure` é o gabarito de escala até o avatar existir. Toda prancha de
revisão inclui um boneco de escala ou o avatar.

## 5. Luz, volume e sombra

- **Luz do topo-esquerda** da tela. Em caixas, o **topo** fica mais claro (light → highlight), a
  **face esquerda** (sudoeste) em tom médio (base → light) e a **face direita** (sudeste) na
  sombra (shadow → deep).
- **2–3 tons por superfície** com degradê leve, só entre tons **vizinhos** da mesma rampa (nada
  de degradê de base para deep, por exemplo). Um brilho pontual (`highlight`) por objeto, no
  topo-esquerda.
- Formas orgânicas (copas, arbustos, frutas) usam lobos com degradê radial deslocado para o
  topo-esquerda, mais um escurecimento global da massa no canto inferior-direito.
- Aresta frontal do topo de caixas com filete de luz de 1 px (`highlight`). Aresta vertical
  frontal com 1 px de `deep` a 70%.
- **Sombra projetada:** elipse no chão deslocada para baixo-direita (≈ +10 a +14 px em x e
  +5 a +6 px em y por objeto de 1 tile), cor `sombra.cast` com opacidade 0,28–0,35 e degradê
  radial até 0 na borda. Nada de sombra dura ou preta.
- **Chão sem degradê por tile** (repetiria a grade). Variação vem de 2–3 variantes por tipo,
  tufos, manchas suaves e das sombras dos objetos.

## 6. Contorno

| Tipo | Espessura visível @1x | Cor |
|---|---|---|
| Objetos, recursos, culturas, personagens | **2 px** | `outline` da rampa do material |
| Construções | **3 px** | `outline` da rampa dominante (telhado, parede) |
| Linhas internas (lobos, dobras, tábuas) | 1 px | `shadow` ou `deep` da rampa |
| Tiles de chão | **sem contorno** | transições usam `shadow`/`deep` |
| Ícones de UI | 2 px a 64×64 | `outline` do material |

- O contorno é **colorido escuro**, da rampa do próprio material (verde-escuro na folhagem,
  marrom no feno). Nunca preto puro. A `tinta` (`#2e2438`) só aparece em olhos e boca.
- Na técnica de "traço atrás", a silhueta é desenhada antes do preenchimento com traço de
  2×espessura, então a espessura visível fica exata e as junções saem arredondadas.
- Cada material dentro do mesmo objeto mantém o próprio contorno (tronco marrom, copa verde).

## 7. Formas e cor

- **Formas arredondadas e fofas:** cantos com raio, junções `round`, copas em lobos, nada de
  quinas vivas em coisas orgânicas. Construções têm proporções "gordinhas" (telhado grande,
  paredes baixas).
- **Cor saturada e alegre:** grama verde-limão, caminhos bege, canteiros marrom-avermelhados,
  telhados vermelhos e azuis, água ciano. Hue shift: sombras puxam para azul/roxo, luzes para
  amarelo.
- A folhagem é mais escura e azulada que a grama, para a árvore se destacar do chão.
- **Valores:** o chão é médio e calmo; o que se clica (culturas maduras, objetos, personagens)
  tem o maior contraste.
- Paleta: `palette.json` v2.1 (121 cores em 24 rampas; +`barranco`, +`fruta_vermelha`, +`flor_rosa`). No SVG-fonte só entram cores da paleta. As cores
  intermediárias que surgem do antialias ou do degradê no PNG são esperadas. Não existe limite
  de cores no PNG.
- **Exclusões:** texto ou letras dentro da arte (texto é i18n), logos, preto e branco puros,
  texturas fotográficas, ruído, contornos pretos, perspectiva com fuga, pixel art.

## 8. Leitura no celular

1. Todo asset precisa ser reconhecível a **zoom 0,5** (tile com 64 CSS px). É a vista mais
   afastada do celular. A prancha técnica sempre mostra a cena a 0,5.
2. Nenhum detalhe que importa pode ter menos de **4 px @1x** (2 CSS px a 0,5). O contorno de 2 px
   continua visível a 0,5.
3. Silhueta primeiro: o objeto precisa ser reconhecível pintado de uma cor só, a 0,5.
4. Estados de jogo (pronto para colher, com fome, quebrado) mudam forma **e** cor, nunca só
   um detalhe pequeno. Indicadores de "pronto" ficam acima do objeto, com 24 px ou mais @1x.
5. Duas coisas interativas vizinhas não podem ter a mesma silhueta e a mesma cor dominante.
6. Área de toque mínima de 44 CSS px. Objetos menores ganham hitbox maior que o sprite.
7. Se só dá para entender com zoom, simplifique em vez de adicionar detalhe.

## 9. Camadas

**No SVG** (`<g id>`, nesta ordem): `outline` (silhueta por trás) → `body`/`base` →
`texture`/`detail` → `twine`/acessórios → `highlight`. A sombra fica sempre em outro arquivo,
`_shadow`. Camadas de depuração (`debug`: pegada e âncora) nunca vão para o export.

**No jogo (Phaser/Tiled):** `Water` → `Ground` → `GroundDecor` (plana, sem profundidade) →
`Shadows` → `Objects` (com profundidade por `x + y`) → `Overlay` (balões, indicadores) → UI.

## 10. Ferramenta

`art/source/tools/iso_vector.py` tem as primitivas: `iso()`, `ground_diamond()` (losango com
sangria), `ground_clip()`, `iso_box()` (bloco de 3 faces com luz), `cylinder()`, `fluffy()` (copa
fofa de lobos), `sphere()`, `drop_shadow()`, `outline_path()`, `scatter()` (detalhe
determinístico) e `Asset.export()` (SVG + PNG @1x/@2x + JSON de âncora).
Instalação: `python3 -m pip install -r art/source/tools/requirements.txt` (cairosvg + Pillow;
o cairosvg precisa da libcairo do sistema). Ela também funciona como CLI:
`python3 art/source/tools/iso_vector.py render arquivo.svg --out-dir pasta/`.

QA de cada lote: `asset_report.py --expect-size WxH --require-alpha` em todo PNG @1x e @2x
(sem `--max-colors`, porque o vetor tem antialias), teste de costura do chão a zoom 0,5, 1, 1,5
e 2 (zero pixels não opacos), além da prancha com debug de âncora e pegada.

## 11. Estado

- Base técnica: lote `2026-11-22-base-isometrica` (draft).
- **Alvo visual:** lote `2026-11-22-alvo-visual-iso-01` (**in_review**), em
  `art/review/2026-11-22-alvo-visual-iso-01/`. Build: `art/source/tools/build_alvo_visual_iso_01.py`.
  Quando for `approved`, forma, cor e acabamento deste guia viram oficiais. Nada é produzido em
  escala antes disso.
