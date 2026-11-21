# Guia de estilo — NFT Farm Adventure

> Dono: `diretor-de-arte`. Versão 1 (2026-11-21). Base: `create-game-assets/assets/art-direction-brief.md`.
> Estado: **proposta** — vira oficial quando o alvo visual (`art/review/2026-11-21-alvo-visual-01/`)
> for `approved` pelo usuário. Nada é produzido em escala antes disso.

Arte 100% original. Nada derivado de Sunflower Land nem do pack Sunnyside: não abrimos
`reference/`, não copiamos formas, proporções, paleta ou itens de lá.

## 1. Quadro do jogo

| Item | Decisão |
|---|---|
| Fantasia do jogador | cuidar de uma fazendinha aconchegante numa ilha, voltar e sempre ter algo pronto |
| Verbos centrais | plantar, colher, coletar, cozinhar, vender, decorar |
| Engine | Phaser (WebGL), `pixelArt: true`, `roundPixels: true` |
| Plataformas | navegador desktop e celular (retrato e paisagem) |
| Vista | **top-down ortogonal com leve 3/4**: chão visto de cima; personagens, objetos e construções mostram a face frontal (sul) e um pouco do topo |
| Tile | **16×16 px** |
| Escala | zoom de câmera **inteiro**: 3× no desktop, 2×–3× no celular. Nunca escala fracionária |
| Área visível | ~20×12 tiles (320×192 px a 1×) — cabe em 375 px de largura a 1× e em 1080 p a 3×+ |

## 2. Sistema visual

- **Formas:** arredondadas e "fofas", cantos cortados em 1 px (nada de quinas retas em objetos
  orgânicos). Personagem chibi: ~2,5 cabeças de altura.
- **Silhueta primeiro:** todo asset precisa ser reconhecível pintado de uma cor só, a 1×.
- **Valores:** o chão é médio e calmo; personagens e itens interativos têm o maior contraste da
  tela (contorno escuro + brilho claro). O olho deve ir para o que dá para clicar.
- **Luz:** sempre do **topo-esquerda**. Brilho no canto superior esquerdo da forma, sombra na
  base e no lado direito. Sombra de contato (elipse) é desenhada pelo engine/cena, na cor de
  sombra do material do chão — não vem no sprite.
- **Contorno:** 1 px, **colorido** — a cor mais escura da rampa do próprio material (nunca preto
  puro `#000`). Tiles de chão **não** têm contorno; bordas de terreno usam a sombra da rampa.
  A tinta `K` só aparece em olhos e detalhes mínimos.
- **Rampas com hue shift:** sombras puxam para frio/roxo, luzes para quente/amarelo. Branco puro
  é proibido (use `W` `#fff8e6`).
- **Densidade de detalhe:**
  - Chão: calmo, ≤ 4 cores por tile, poucos detalhes (tufos/ondas) espalhados; o detalhe nunca
    compete com objetos.
  - Objetos/ícones: 1 ponto focal (brilho especular, emblema) + 3 valores (luz/base/sombra).
  - Sem pixel órfão, sem dithering, sem antialias manual, sem "banding" (degraus paralelos).
    Clusters ≥ 2 px.
- **Movimento (para o `animador`):** idle de 2–4 quadros com respiração de 1 px; andar 4–6
  quadros; proporções e base nunca mudam entre quadros.
- **Exclusões:** texto ou letras dentro da arte (texto é i18n no código), logos, gradientes
  suaves, preto/branco puros, perspectiva isométrica, cores fora da paleta.

## 3. Paleta

`palette.json` — **47 cores** em 12 rampas por material (tinta, grama, terra, água, madeira,
pedra, pele, tecido azul, tecido vermelho, ouro/palha, roxo raro, UI/papel). Cada cor tem uma
chave de 1 caractere usada nas grades. `palette-keys.json` é gerado a partir dela (chave → hex)
para os scripts; **não edite à mão**. Mudar a paleta é decisão do diretor de arte e exige
regerar todos os assets.

Papéis fixos: `roxo_raro` só para itens/flores raros; `ouro_palha` = moeda, palha, trigo,
destaques de UI; `ui_papel` = painéis e tecidos claros.

## 4. Contrato técnico

| Tipo | Tamanho | Alpha | Âncora | Cores máx. (incl. transparente) |
|---|---|---|---|---|
| Tile de chão | 16×16 | opaco | — | 8 |
| Tile de transição (borda) | 16×16 | opaco | — | 12 |
| Ícone de inventário | 16×16, margem 1 px | sim | centro | 12 |
| Cultura em estágios | 16×16 × 4–5 quadros | sim | base-centro | 12 |
| Recurso (árvore, pedra) | 16×32 / 32×32 | sim | base-centro | 16 |
| Personagem/NPC | 16×24 | sim | base-centro (pé em y=24) | 20 |
| Construção | múltiplos de 16 | sim | base-esquerda no grid | 24 |

- PNG RGBA, sRGB, sem mipmaps, filtro **nearest**. Tilesets com extrusão de 1 px no import.
- Fonte = grade `.txt` em `art/source/<familia>/<id>.txt`; export em `art/export/<familia>/<id>.png`.
- Nomes em inglês, `snake_case`: `tile_*`, `icon_*`, `avatar_*`, `npc_*`, `crop_*_stageN`, `bld_*`.
- Direções: sufixo `_s`, `_n`, `_e`, `_w` (sul = de frente).
- QA: `asset_report.py` com tamanho, `--max-colors` da tabela e `--require-alpha` (exceto tiles).

## 5. Regras de leitura a 1×

1. Ícone reconhecível a 16×16 sem zoom, sobre grama, terra, água **e** painel de UI.
2. Personagem: chapéu, rosto (2 olhos) e roupa distinguíveis a 1×; pés tocam a base do quadro.
3. Duas coisas interativas vizinhas não podem ter a mesma silhueta + mesma cor dominante.
4. O chão nunca tem contraste maior que os objetos sobre ele.
5. Se precisar de zoom para entender, simplifique — não adicione detalhe.

## 6. Alvo visual (lote 2026-11-21-alvo-visual-01)

Prancha: `art/review/2026-11-21-alvo-visual-01/prancha.png`. Build reproduzível:
`python3 art/source/tools/build_alvo_visual.py` (gera exports, tileset, mapa Tiled, cena,
prancha e roda o QA).

- **Avatar base:** chapéu de palha largo com fita verde, lenço verde, camisa clara, jardineira
  azul com botões dourados, botas de madeira. É o "manequim" sobre o qual os wearables entram.
- **Tiles:** grama calma, terra arada em camalhões de 8 px, água com ondinhas curtas e uma borda
  grama→água com barranco e espuma.
- **Ícones:** saco de sementes de juta com broto, tomate colhido, moeda de ouro com broto cunhado
  (o broto é o motivo gráfico recorrente do jogo).

Aprovação: _(pendente — usuário)_.
