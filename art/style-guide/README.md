# Guia de estilo: NFT Farm Adventure (v3 · pintado/ilustrado)

> Dono: `diretor-de-arte`. **Versão 3.1 (2026-11-22).**
> Substitui a v2.1 (isométrico cartoon arredondado, reprovada no lote `2026-11-22-alvo-visual-iso-01`),
> arquivada em `art/style-guide/archive/cartoon-v2.1/` junto com a paleta v2.1. A v1 (pixel art) está
> em `archive/pixel-v0/`.
>
> **Decisões do usuário que este guia segue:**
> 1. Estilo **C · pintado semirrealista** da prancha `2026-11-22-estilos-comparativo` ("o modelo C
>    ainda é o melhor").
> 2. As imagens próprias do usuário (`art/source/user-provided/2026-11-22/`, uso autorizado) são o
>    **estilo-alvo oficial** de ícones, recursos, ferramentas e culturas. Elas também são a referência
>    de acabamento para todo o resto: "aqui estão modelos que eu quero que crie nesse estilo".
> 3. Nada infantil e nada arredondado demais: o personagem é adulto e a natureza tem silhueta
>    pontuda, não em lobos redondos.
>
> Estado: **proposta.** A grade, o export, as âncoras e as sombras separadas já valem. Forma, cor e
> acabamento viram oficiais quando o alvo `2026-11-22-alvo-visual-c-01` e os recortes
> `2026-11-22-itens-usuario-recortados` forem `approved`.

A arte é original ou do usuário. Nada vem de Sunflower Land, do pack Sunnyside ou de kits de
terceiros, e não copiamos composição, forma nem proporção de lá.

## 0. Fontes de arte e método

| Fonte | Para quê | Como entra | `source.kind` |
|---|---|---|---|
| **Arte do usuário** (`art/source/user-provided/`) | ícones de item, recursos, ferramentas e culturas (23 × 4 estágios) | recorte por script (`cut_user_items.py`); escala/âncora para o mundo por script | `user_owned` |
| **Vetor por script** (`iso_vector.py` + `paint_vector.py`) | mundo: chão, ilha, árvores, construções, cercas, props, personagem | SVG gerado por código, PNG @1x/@2x | `scripted` |

- **Nós não usamos gerador de imagem por IA**, nem para conceito. Também não pintamos à mão sobre
  a arte do usuário: só recortamos, escalamos e ancoramos.
- Para corrigir um asset, edite o script que o gera e nunca o PNG. Todo PNG pode ser refeito.
- Peças novas da família do usuário (por exemplo, uma ferramenta que falta) precisam de nova arte
  do usuário ou de uma peça vetorial que siga as seções 5 a 9. O manifesto registra qual foi o caso.

## 1. Quadro do jogo

| Item | Decisão |
|---|---|
| Fantasia | cuidar de uma fazenda bonita e viva, voltar e sempre ter algo pronto |
| Verbos | plantar, colher, coletar, minerar, cozinhar, vender, decorar |
| Engine | Phaser 4 (WebGL), `pixelArt: false`, filtro **linear**, `roundPixels: false` |
| Plataformas | navegador desktop e celular (retrato e paisagem) |
| Vista | **isométrica 2:1**, câmera fixa olhando do sul, sem rotação |
| Tile de chão | losango **128×64 px a 1×** (passo de 64 px em x e 32 px em y por tile) |
| Densidade | texturas **@1x** e **@2x**. Usar @2x quando `devicePixelRatio × zoom > 1,2` |
| Zoom | desktop 1,0 (faixa 0,75–1,5); celular 0,5–0,75 |

## 2. Projeção e grade (igual à v2.1)

- Grade `(x, y)`: x desce para a **direita**, y desce para a **esquerda**. Tela:
  `sx = (x − y)·64`, `sy = (x + y)·32 − z` (z em px a 1×).
- Para volumes (sombra, faces), use o mundo de `paint_vector.py`: 1 tile = 72 px de mundo, e
  z de tela = z de mundo × 1,0887.
- Ordem de desenho: chão → decalques → **sombras** → objetos por `x + y` da âncora (empate: maior
  `x` por último) → overlays (indicadores) → UI.

## 3. Contrato técnico (tamanhos a 1×; @2x = ×2)

| Tipo | Canvas @1x | Âncora | Prefixo |
|---|---|---|---|
| Tile de chão | 136×68 (128×64 + sangria) | (68, 34), centro do losango | `ground_` |
| Borda da ilha | 136×116 | (68, 34) | `ground_edge_` |
| Objeto, recurso, árvore, construção (vetor) | **ajustado ao conteúdo** (múltiplo de 4, âncora x = W/2) | centro do losango da pegada | `prop_`, `tree_`, `rock_`, `bld_` |
| Personagem | ajustado ao conteúdo | entre os pés | `avatar_`, `npc_` |
| Cultura no mundo (sobre canteiro) | ajustado | base do monte de terra em `z_base_px = 11` | `crop_<nome>_s<N>` |
| Cerca (peça por máscara) | 160×108 fixo | (80, 64) | `prop_fence_` |
| Indicador sobre objeto | 48×60 | (24, 56), ponta | `ui_` |
| **Item do usuário: recurso** | 244×244 (@2x 488) | centro | `resource_` |
| **Item do usuário: ferramenta** | 212×212 (@2x 424) | centro | `tool_` |
| **Item do usuário: cultura** | 196×146 (@2x 392×292) | base-centro (base do monte de terra) | `crop_<nome>_s0..s3` |

- Cada export tem um `<nome>.json` com `size_1x`, `anchor_px_1x`, `origin` e `footprint_tiles`.
  O cliente lê o `origin` daí e não usa números fixos.
- Canvas sempre com lados múltiplos de 4, âncora par e nenhum pixel encostado na borda.
- **Sombra projetada = arquivo separado** `<nome>_shadow`. Ela tem **canvas e âncora próprios**
  (novo na v3: a sombra longa sai para a direita e não cabe no canvas do sprite) e o mesmo ponto
  de âncora no mundo. Vai na camada `Shadows`, que é composta inteira antes dos objetos.
- Os itens do usuário em `art/export/user-items/` estão em **resolução de ícone**. No mundo, as
  culturas usam a versão escalada pelo build da cena (`CROP_WORLD_SCALE = 0,60` do @2x), com a
  âncora na terra do canteiro.
- PNG RGBA, sRGB, alfa reto. As reduções (@2x → @1x, mundo) são feitas em **alfa
  pré-multiplicado**, para não criar franja escura.
- Nomes em inglês, `snake_case`. Itens do usuário são nomeados pelo que a imagem mostra
  (`crop_rice`, `crop_wheat`, `tool_pickaxe_gold`). O mapeamento para os ids do jogo fica para
  depois.

## 4. Escala (a 1×, tile = 128×64)

| Coisa | Altura na tela | Nota |
|---|---|---|
| Personagem adulto | **~94 px** com chapéu | **~6 cabeças** (cabeça ≈ 14,6 px), ombros largos, mandíbula marcada, olho de traço |
| Cultura madura no canteiro | 40–70 px | base fixa entre estágios |
| Fardos de feno / caixote | 35–50 px | |
| Árvore folhosa | 200–215 px | ≈ 2,2× o personagem |
| Pinheiro | ~235 px | |
| Galpão 3×3 | ~300 px | porta ≈ 1,1× o personagem |

Não há cabeça grande nem proporção chibi. As proporções são reais, levemente estilizadas.

## 5. Luz, volume e sombra (extraído da arte do usuário + estilo C)

- **Luz do topo-esquerda.** Nas imagens do usuário, o brilho especular cai sempre no topo-esquerda
  (cristais, frutos, metal) e o lado direito-baixo escurece. No mundo: topo claro, face +y (esquerda
  da tela) média, face +x (direita) na sombra.
- **Volume pintado:** degradês suaves dentro de cada forma, com 3 a 5 tons da rampa, só entre tons
  vizinhos. Superfícies lisas (fruto, cristal, metal) têm **1 brilho especular** pequeno e nítido
  no topo-esquerda. Superfícies foscas (terra, madeira, folha) não têm brilho, só a luz difusa.
- **Textura sugerida, não fotográfica:** veios de madeira, estrias de casca, telhas
  desencontradas, grãos da espiga e torrões de terra. O contraste interno da textura fica em
  ΔL\* ≤ 8 dentro de um plano (some com elegância a 0,5).
- **Luz de borda (rim):** as imagens do usuário têm um filete claro na borda do lado da luz. No
  mundo, `paint_vector.rim()` (1,2–1,6 px, highlight da rampa, 40–70 %) só nas peças interativas.
- **Sombra projetada longa e suave:** projetada pela luz (`L_CAST`), com ~0,9× a altura do objeto
  para a direita e um pouco para baixo, em 3 camadas (mais escura perto da base). Mais uma elipse de
  contato (`sombra.contact`, 22 %). Nada de sombra preta ou dura.
- **Chão calmo:** a grama tem valor médio e contraste baixo (textura periódica comum + miolo por
  variante). O que se clica tem o maior contraste local (seção 8).

## 6. Brilho e partículas (só itens especiais)

Regra tirada das imagens do usuário: o **brilho é raro e significa valor**.

| Quem brilha | Como |
|---|---|
| cristais (azul, roxo, verde) | halo da cor do cristal + 6–12 partículas pequenas (2–6 px @2x) em volta |
| minério de ouro, ferramenta de ouro/cristal | halo quente fraco + poucas faíscas |
| cogumelo (cultura especial) | luz interna quente sob o chapéu e pontos de luz na terra |
| maduro com destaque (girassol, pepino) | 1–3 faíscas discretas, sem halo |

- Brilho e partículas são **alfa suave** no PNG (sem halo escuro e sem fundo). O recorte por
  "unmultiply" preserva isso (seção 11).
- Itens comuns (pedra, tora, culturas normais, ferramentas de ferro) **não brilham**.
- No mundo, o brilho é um efeito do cliente (sprite aditivo por cima) e não é pintado no sprite
  de chão.

## 7. Contorno

| Tipo | Contorno |
|---|---|
| Itens do usuário (ícones, recursos, ferramentas, culturas) | o da própria arte: **escuro quente, fino**, ~3 px @2x (1,5 px @1x), cor `contorno_item` (nunca preto puro) |
| Objetos vetoriais do mundo (árvores, construção, props, personagem, canteiro) | silhueta por valor + **anel de raster** de 3 px no @2x em `contorno_item.base` a 85 % (`outline_pair` do build); o @1x é a redução do @2x, então fica com 1,5 px, a mesma espessura da arte do usuário. Harmoniza o mundo com a arte do usuário |
| Peças interativas | + `rim()` no lado da luz e `occlusion()` (filete escuro no lado da sombra) |
| Chão, decalques, água | **sem contorno**: transições por valor |
| Linhas internas | traços de 0,7–1,2 px em `deep`/`shadow` da rampa, a 45–75 % |

## 8. Forma, materiais e cor

- **Forma:** proporções reais. A folhagem é feita em **massas** (sub-copas) de **tufos pontudos**
  (`paint_vector.crown`), nunca em lobos redondos. As pedras são angulares, em 3 planos. As
  construções têm quinas vivas, tábuas e telhas. Frutos, cristais e legumes podem ser redondos
  porque são assim, mas têm volume, brilho especular e contorno (como na arte do usuário).
- **Materiais:** madeira (tábua, casca, madeira cinza de cerca), barro (telha), pedra, terra
  (canteiro, caminho, barranco), palha, metal, tecido (linho, brim, couro), água, cristal.
- **Paleta `palette.json` v3.1:**
  - 32 rampas do **estilo C** (terrosas, saturação baixa a média), para chão, construções,
    natureza e personagem;
  - **+14 rampas `origin: user_art`**, extraídas das imagens do usuário por
    `extract_palette_v3.py`: `folha_viva`, `terra_monte`, `fruta_viva`, `laranja_viva`,
    `amarelo_vivo`, `roxo_vivo`, `ouro`, `aco`, `cabo_madeira`, `pedra_ilustrada`,
    `cristal_azul`, `cristal_roxo`, `cristal_verde` e `contorno_item`. Elas são mais saturadas e
    valem para itens, culturas, frutos e efeitos.
  - **Hierarquia de saturação:** chão < construções < natureza < itens/culturas maduras < efeitos.
    O que é recompensa é o mais vivo da tela.
  - No SVG-fonte, toda cor é um tom da paleta ou a mistura de **dois tons vizinhos da mesma
    rampa** (`paint_vector.tone`). O QA verifica cada hex, com tolerância de 2/255.
- **Exclusões:** texto dentro da arte, logos, preto e branco puros, contorno preto, cabeça grande
  ou olhos grandes, copas em bolas, textura fotográfica, ruído, perspectiva com fuga e pixel art.

## 9. Leitura a zoom 0,5 (o ponto fraco do estilo C, com regras e prova)

Na prancha comparativa, o estilo C virava mancha a 0,5 (trigo e pedra). As regras:

- **L1 · Silhueta forte.** O objeto precisa ser reconhecível pintado de uma cor só a 0,5. A
  folhagem vai em 4–6 **massas** com vão escuro entre elas. O trigo vai em **touceiras**
  agrupadas (não em 64 hastes soltas). A pedra é feita de 2–3 planos grandes, com pepitas de
  ≥ 7 px @1x.
- **L2 · Contraste local mínimo.** Peça interativa contra o que está atrás dela: **ΔL\* médio
  ≥ 16 no anel da silhueta**, medido a 0,5. O chão fica numa faixa de valor média, e a peça é
  claramente mais clara ou mais escura que ele, com plano claro e plano escuro.
- **L3 · Menos micro-detalhe.** Detalhe que importa tem ≥ 4 px @1x. Traço < 1 px só em textura
  de material e dentro de um plano (ΔL\* ≤ 8), e nunca cruza a silhueta. Na pintura, o número de
  marcas finas cai pela metade em relação à prancha C (agulhas, estrias, líquen).
- **L4 · Realce sutil nas peças clicáveis.** `rim()` no lado da luz + `occlusion()` no lado da
  sombra + o contorno fino (seção 7). No jogo, o hover/seleção reforça o mesmo filete (mais
  claro e mais largo). Não usamos brilho em volta.
- **L5 · Medida no QA.** O build mede cada peça interativa a 0,5, sobre a mesma grama: `borda_dL`
  (ΔL\* no anel de 1 px da silhueta) ≥ 16 e `indice` (borda ÷ ruído médio do miolo) ≥ 1,6. Se
  falhar, o build sai com 1. A prova antes/depois fica em
  `art/review/2026-11-22-alvo-visual-c-01/prova-leitura-05.png`.

Regras gerais que continuam: estados de jogo mudam forma **e** cor; indicadores ficam acima do
objeto com ≥ 24 px @1x; área de toque ≥ 44 CSS px.

## 10. Camadas

**No SVG:** corpo → textura/detalhe → acessórios → realce (`rim`) → oclusão. A sombra sempre em
`_shadow`. Debug nunca vai para o export.

**No jogo:** `Water` → `Ground` → `GroundDecor` → `Shadows` → `Objects` (profundidade `x + y`) →
`Overlay` (indicadores, brilho aditivo) → UI.

## 11. Ferramentas

| Script | Faz |
|---|---|
| `art/source/tools/iso_vector.py` | projeção, `Asset` (SVG → PNG @1x/@2x + JSON), losango de chão, `use_palette()` |
| `art/source/tools/paint_vector.py` | estilo pintado: `tone()`, `crown()` (massas de tufos), `leaf_clump`, `blade_tuft`, `stone`, `rim`, `occlusion`, `soft_shadow` (luz `L_CAST`), `palette_mix_ok` |
| `art/source/tools/cut_user_items.py` | recorte das imagens do usuário: fundo estimado, objeto por preenchimento a partir da borda (bordas nítidas e contorno bloqueiam), brilho por *unmultiply*, cor descontaminada, @2x original / @1x pré-multiplicado, QA e pranchas |
| `art/source/tools/extract_palette_v3.py` | rampas `user_art` da paleta v3.1 |
| `art/source/tools/build_alvo_visual_c_01.py` | alvo visual v3: peças, cenas, prova de leitura a 0,5, QA e manifesto |

Instalação: `python3 -m pip install -r art/source/tools/requirements.txt` (cairosvg, Pillow,
numpy). Os builds dos lotes v2.1 continuam reproduzíveis porque apontam para a paleta arquivada.

QA de cada lote: `asset_report.py --expect-size WxH --require-alpha` em todo PNG; costura do chão
a 0,5, 0,75, 1, 1,5 e 2; 3×3 de cada tile; paleta; contrato (canvas, âncora, borda); leitura a 0,5
(L5); pranchas sobre fundo claro e escuro.

## 12. Estado

- Recortes do usuário: lote `2026-11-22-itens-usuario-recortados` (**in_review**).
- Alvo visual v3: lote `2026-11-22-alvo-visual-c-01` (**in_review**).
- Nada é produzido em escala antes das duas aprovações.
