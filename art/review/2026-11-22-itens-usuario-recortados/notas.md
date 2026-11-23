# Lote 2026-11-22-itens-usuario-recortados: arte do usuário recortada (status: in_review)

O usuário enviou imagens próprias (uso autorizado, ver
`art/source/user-provided/2026-11-22/PROVENIENCIA.md`) e pediu: "aqui estão modelos que eu quero que
crie nesse estilo". Este lote **não pinta nada**: só tira o fundo escuro, centraliza ou ancora e
exporta. O guia v3.1 passa a tratar essa arte como estilo-alvo oficial de itens, recursos,
ferramentas e culturas.

```bash
python3 art/source/tools/cut_user_items.py         # sai 0 se o QA passar; ~5 min
python3 art/source/tools/extract_palette_v3.py     # rampas user_art da paleta v3.1
```

## O que foi recortado (108 itens, @2x + @1x + JSON de âncora)

| Família | Canvas @1x (@2x) | Âncora | Itens |
|---|---|---|---|
| `art/export/user-items/resources/` | 244×244 (488) | centro | `resource_stone`, `resource_ore_gray`, `resource_ore_gold`, `resource_crystal_blue`, `resource_crystal_purple`, `resource_crystal_green`, `resource_log` |
| `art/export/user-items/tools/` | 212×212 (424) | centro | `tool_shovel`, `tool_axe`, `tool_pickaxe_iron`, `tool_pickaxe_iron_reinforced`, `tool_pickaxe_gold`, `tool_pickaxe_crystal`, `tool_drill`, `tool_fishing_rod`, `tool_rake` |
| `art/export/user-items/crops/` | 196×146 (392×292) | base-centro (base do monte de terra) | 23 culturas × `_s0` semente, `_s1` broto, `_s2` crescendo, `_s3` madura |

Culturas: `rice` (culturas-a, linha 1: espigas pendentes, por isso **arroz**), `pea`, `grape`,
`apple_tree`, `mushroom`, `eggplant`, `chili_pepper`, `bell_pepper`, `strawberry`, `watermelon`,
`sunflower`, `beet`, `cabbage`, `lettuce`, `onion`, `garlic`, `cucumber`, `carrot`, `pumpkin`,
`tomato`, `corn`, `wheat` (culturas-d: **trigo**), `potato`. Os nomes descrevem a imagem; o
mapeamento para os ids do jogo fica para depois.

- **@2x = pixels originais** (sem reamostrar). **@1x = metade**, reduzido em alfa pré-multiplicado.
- Cada `<nome>.json` guarda `source_file` e `source_box_px` (caixa do recorte no original). O
  manifesto registra `source.kind = "user_owned"`, status `in_review`.

## Como o fundo foi tirado

1. Fundo estimado por média local só dos pixels de fundo (segue a vinheta e os painéis mais claros
   de `recursos.webp`).
2. Objeto = o que **não** é alcançado por um preenchimento a partir da borda da célula que anda
   só por pixels lisos (fundo, brilho, sombra suave). Bordas nítidas e o contorno escuro da arte
   bloqueiam. Vãos internos com cor de fundo ou de halo fraco continuam transparentes.
3. Brilho e partículas: alfa suave por *unmultiply* sobre o fundo conhecido. A cor é
   descontaminada, `F = (C − (1 − a)·B) / a`, e por isso não fica halo escuro.
4. A sombra projetada da arte (mais escura que o fundo) é descartada: no jogo a sombra é arquivo
   separado.
5. Pedaços do item da célula vizinha são removidos. Os únicos ajustes por item estão documentados
   no script: `GLOW_T` (cristais, ouro e ferramentas brilhantes) e `CLOSE_FILL` (faces escuras
   lisas da beterraba madura, da pedra, do minério cinza e da tora).

## Pranchas de conferência

| Arquivo | Para ver |
|---|---|
| `prancha-{recursos,ferramentas,culturas}-claro.png` | franja ou halo escuro apareceria aqui |
| `prancha-…-escuro.png` | brilho e partículas preservados |
| `prancha-…-grama.png` | sobre um fundo de jogo |
| `prancha-bordas-2x.png` | 5 itens críticos @2x sobre branco, preto e magenta (cristal, picareta de cristal, cogumelo, arroz, trigo) |

## QA

`qa.json`: 108 itens, `asset_report.py --expect-size --require-alpha` com código 0 nos 6 grupos de
tamanho, nada encostando na borda do canvas, `pass: true`.

## Revisão interna (refeito antes de mandar)

1. **1ª versão (limiar simples):** os halos dos cristais viravam ovais opacos. → Limiar alto só
   nos itens com brilho e halo por unmultiply.
2. **2ª versão (por borda nítida):** o monte de terra e a beterraba saíam desbotados. → Objeto por
   preenchimento a partir da borda.
3. **Manchas escuras** em volta do arroz, da uva e do cogumelo (halo quente fraco virando sólido).
   → Pixels lisos e só pouco mais claros que o fundo ficam como alfa.
4. **Pétalas do girassol** grudadas embaixo da melancia (célula vizinha). → Remoção de pedaços que
   tocam a borda da célula, e o brilho não é contado perto deles.
5. **Buracos** no lado escuro da beterraba, da pedra e da tora. → Fechamento largo só nesses itens.
6. **Recorte de linhas:** a grade de culturas-b junta linhas (a melancia encosta no girassol). →
   As linhas são detectadas por coluna.

## Limites conhecidos

- `resource_ore_gray`: sobra uma sombra cinza fraca no canto de cima à esquerda (painel mais
  claro do fundo original). Dá para ver no fundo claro.
- `crop_beet_s2`: um pouco do halo quente fica entre os talos.
- Algumas partículas do machado e das picaretas ficam como pontos escuros pequenos. É o próprio
  desenho delas (faísca com contorno).
- As culturas são de frente, com monte de terra próprio. No mundo isométrico elas vão sobre o
  canteiro, escaladas (ver o alvo `2026-11-22-alvo-visual-c-01`).

## Pergunta ao usuário

O recorte está limpo (sem halo e com o brilho preservado)? Aprova os 108 itens como base, ou diga
quais refazer e por quê.

## Resposta do usuário

_(pendente)_
