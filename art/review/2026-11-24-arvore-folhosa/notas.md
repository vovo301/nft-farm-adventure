# Lote 2026-11-24-arvore-folhosa — árvore folhosa pintada (1 peça)

**Peça:** `tree_leafy_a` (+ `tree_leafy_a_shadow`) em `art/export/world-painted/`.
**Por quê:** a árvore vetorial `v32-nature/tree_oak_a` ficou chapada ao lado das imagens do usuário.
**Como:** pintura raster por script (`art/source/tools/paint_tree_leafy.py`, Python + Pillow + numpy,
semente fixa, sem IA, sem referência externa). Trabalho a 4×, redução em alfa pré-multiplicado
(Lanczos) para @2x e @1x.

- Copa em 7 massas irregulares (3 de fundo, 2 do meio, 2 da frente) feitas de ~1.100 folhas
  pontudas. Cada folha tem sombra própria, corpo e meia-folha iluminada; as da borda apontam para
  fora (silhueta recortada, sem bolas). Vão escuro-frio entre as massas e embaixo de cada uma.
- Luz quente no topo-esquerda (amarelo-verde) → sombra fria embaixo-direita (verde-azulado),
  textura sutil de pincelada, filete quente na borda iluminada e pequenos pontos de luz.
- Tronco com base alargada, 4 raízes curtas, casca com estrias verticais; 3 galhos principais e
  galhos finos aparecem nos vãos da copa.
- Contorno escuro-quente (`contorno_item.base`), 3 px @2x / 1,5 px @1x.
- Cores: tons da paleta v3.2 (`pinho`, `folhagem`, `grama_seca.highlight`, `casca`,
  `contorno_item`, `sombra`); a copa usa a sequência pinho.deep → … → grama_seca.highlight e mistura
  só tons vizinhos dela. Os degradês e o antisserrilhado geram tons intermediários (raster).

**Contrato:** sprite 200×240 @1x (400×480 @2x), âncora (100, 218) no centro do losango, pegada 1×1,
altura visível 213 px @1x (guia: 200–215). Sombra separada 264×60 @1x, âncora (30, 16).

**QA:** `asset_report.py --require-alpha --expect-size` exit 0 nos 4 PNGs; script sai 0; contrato
(lados ×4, âncora par, nada na borda) ok; leitura a 0,5 (L5): borda_dL 23,1 (≥ 16), índice 6,2
(≥ 1,6). Detalhes em `qa.json`. Reprodutível (mesmos bytes ao rodar de novo).

**Pranchas:** `comparativo.png` (vetorial v32 × pintada nova × tora e macieira do usuário, @2x sobre
a grama) e `zoom-0.5.png` (tamanho real a 0,5 + ampliação 3×).

**Autoavaliação contra os itens do usuário:** volume, luz quente/sombra fria, contorno e textura de
folhas agora casam com a macieira do usuário; a silhueta é recortada e adulta, não infantil.
Diferenças restantes: a casca do tronco é mais lisa que a da tora do usuário, e as folhas
iluminadas ficam um pouco repetitivas de perto (some em zoom 1 e 0,5). Se o usuário quiser, a
próxima rodada reforça a casca.

**v2 (pedido do usuário: "todas as árvores com a aparência da macieira"):** copa em domo largo de tufinhos densos tipo couve-flor (`paint_canopy_tufts`), luz amarelo-esverdeada em cima e sombra verde-azulada embaixo de cada tufo; tronco curto e grosso com raízes e terra discreta. 228×236 @1x, âncora (114, 212), altura 208, L5 24,0/7,2, QA exit 0.
Ver `comparativo-v2.png` (macieira s3 × folhosa v2, mesma escala @2x, + zoom 0,5). `comparativo.png` e `zoom-0.5.png` (este regerado) ficam como histórico da v1.

Resposta do usuário: _(pendente)_

## v3 (2026-11-24)
Usuário reprovou a v2 ("brócolis gigante") e pediu para recortar a macieira dele e só modificá-la. A v3 é a macieira do usuário (crop_apple_tree_s3) com as maçãs trocadas por folhagem da própria copa (`art/source/tools/derive_trees_from_user.py`). As versões pintadas por script (v1/v2) foram descartadas.
