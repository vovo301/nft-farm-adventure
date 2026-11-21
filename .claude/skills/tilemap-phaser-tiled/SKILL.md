---
name: tilemap-phaser-tiled
description: >
  Tilesets e mapas de jogo top-down para Phaser com formato Tiled JSON: grid de 16 px, camadas
  (chão, água, decoração, colisão, objetos), autotile de bordas, extrusão contra bleeding, geração
  de mapa a partir de ASCII e preview em PNG para aprovação. Use para criar ou editar mapas,
  ilhas, a fazenda inicial, a praça, tilesets, ou para carregar um mapa no Phaser.
---

# Tilemaps (Tiled JSON + Phaser)

Mapas são dados versionados: um spec + grades ASCII em `art/source/maps/<mapa>/`, compilados para
Tiled JSON em `apps/client/public/assets/maps/`. O usuário aprova pelo PNG de preview. Combine com
`level-design` (layout e ritmo), `pixel-art-scripted` (tiles) e `phaser-core` (loader).

## Tileset

- Tile 16×16, tileset em grade (ex.: 8 colunas). Ordem fixa documentada em
  `art/style-guide/tileset-<nome>.md` (id → significado).
- **Bordas/autotile:** para cada transição (grama↔terra, grama↔água) faça o conjunto de 16 tiles
  por máscara de 4 vizinhos (N=1, L=2, S=4, O=8). Se precisar de cantos internos, use o
  conjunto "blob" de 47. Teste repetição 3×3 de cada tile antes de aprovar.
- **Extrusão** contra linhas entre tiles com zoom: `npx tile-extruder --tileWidth 16
  --tileHeight 16 --input tiles.png --output tiles-extruded.png`, depois margin 1 e spacing 2 no
  Phaser.

## Camadas padrão

| Camada | Tipo | Conteúdo |
|---|---|---|
| `Water` | tile | água / fundo |
| `Ground` | tile | grama, areia, terra, bordas |
| `Decor` | tile | flores, pedrinhas, cercas sem colisão |
| `Collision` | tile (invisível) | tiles com `collides=true` |
| `Objects` | objetos | `spawn`, `npc:<id>`, `portal:<mapa>`, `plot`, áreas de construção |

Objetos interativos (plots, árvores, construções do jogador) **não** são tiles: vêm do
`GameState` e são sprites posicionados no grid.

## Do ASCII ao preview

```bash
S=.claude/skills/tilemap-phaser-tiled/scripts
python $S/ascii_to_tiled.py art/source/maps/fazenda-inicial/spec.json --out apps/client/public/assets/maps/fazenda-inicial.json
python $S/render_tilemap_preview.py apps/client/public/assets/maps/fazenda-inicial.json \
  --out art/review/<lote>/mapa-preview.png --scale 3 --grid --show-collision
```

O spec documenta legenda, camadas e objetos (veja o docstring do script). Ambos saem com código 1
em erro (caractere fora da legenda, gid sem tileset, imagem ausente). O preview pinta colisão em
vermelho e objetos em amarelo — envie uma versão com e uma sem overlay ao usuário.

Mapas podem também ser editados no Tiled (formato JSON, camadas CSV, mapa não-infinito); o preview
funciona igual.

## Carregar no Phaser

```ts
preload() {
  this.load.image("farm-tiles", "assets/tiles/farm-tiles-extruded.png");
  this.load.tilemapTiledJSON("fazenda", "assets/maps/fazenda-inicial.json");
}
create() {
  const map = this.make.tilemap({ key: "fazenda" });
  const ts = map.addTilesetImage("farm", "farm-tiles", 16, 16, 1, 2); // nome do tileset no JSON
  map.createLayer("Water", ts!); map.createLayer("Ground", ts!); map.createLayer("Decor", ts!);
  const col = map.createLayer("Collision", ts!)!.setVisible(false);
  col.setCollisionByProperty({ collides: true });
  const spawn = map.findObject("Objects", o => o.name === "spawn");
}
```

Pixel art: `pixelArt: true` no config do jogo, zoom de câmera inteiro (2×, 3×, 4×) e
`roundPixels`. Confira a API na versão do Phaser fixada no projeto (`phaser-core`).

## Checklist de mapa antes de mandar para aprovação

- Caminhos legíveis; nenhum objeto de interação bloqueado por colisão.
- Spawn fora da colisão; portais em bordas claras.
- Sem padrão repetitivo visível em áreas grandes (varie com 2–3 tiles de grama).
- Cabe em telas de 375 px de largura com o zoom escolhido (ou a câmera segue o jogador).

## Exemplo funcionando

`examples/mini-fazenda/`: paleta, tiles em grade, duas camadas ASCII e o spec. Rode na pasta:
`python ../../../pixel-art-scripted/scripts/pixel_from_grid.py tiles.txt --palette pal.json --out farm-tiles.png`,
depois `ascii_to_tiled.py` e `render_tilemap_preview.py` como acima. Os tiles do exemplo são placeholders de teste, não arte do jogo.
