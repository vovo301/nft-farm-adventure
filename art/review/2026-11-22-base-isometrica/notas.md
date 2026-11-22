# Lote 2026-11-22-base-isometrica: prancha de teste técnico (status: draft)

**Não é o alvo visual e não vai para aprovação.** Serve para validar a base da direção
isométrica cartoon (guia v2, `art/style-guide/README.md`): grade 2:1, encaixe sem costura,
ancoragem, luz, contorno e sombra projetada. Tudo é vetor gerado por script, sem IA e sem
referência externa.

Build reproduzível (sai 1 se algum QA falhar):

```bash
python3 -m pip install -r art/source/tools/requirements.txt
python3 art/source/tools/build_base_isometrica.py
```

## Arquivos

| Arquivo | O que é |
|---|---|
| `prancha.png` | cena 6×6 a zoom 1,0 com @1x (864×528) |
| `prancha@2x.png` | a mesma cena com @2x (tela retina) |
| `prancha-debug.png` | @2x com a grade, as coordenadas `i,j`, a pegada (ciano), a âncora (cruz magenta) e o canvas (laranja) |
| `prancha-tecnica.png` | 3×3 de cada tile a 1×, a cena a zoom 0,5 (celular) e um recorte a 1,5 |
| `qa.json` | teste de costura + `asset_report.py` de todos os PNGs |

## Peças (art/export/iso-base/, @1x e @2x + .json de âncora)

| asset | canvas @1x | âncora @1x | nota |
|---|---|---|---|
| ground_grass_a / _b | 136×68 | (68, 34) | grama verde-limão, 2 variantes (tufos e manchas) |
| ground_path_dirt | 136×68 | (68, 34) | caminho de terra bege com pedrinhas |
| ground_soil_tilled | 136×68 | (68, 34) | canteiro arado, camalhões no eixo x que continuam entre vizinhos |
| tree_round_a (+ _shadow) | 160×224 | (80, 180) | árvore de copa fofa em 8 lobos, tronco cilíndrico |
| prop_hay_bale (+ _shadow) | 160×112 | (80, 68) | bloco isométrico de 3 faces (fardo de feno com amarras) |
| ref_scale_figure (+ _shadow) | 64×112 | (32, 100) | boneco **cinza de escala** (~92 px); placeholder, não é arte |

## Resultado do QA

- **Costura:** 0 pixels não opacos dentro do chão a zoom 0,5, 1, 1,5 e 2. O primeiro teste
  falhou a 0,5 com 2 px de sangria; com **4 px na horizontal e 2 px na vertical**, passou. A
  reamostragem do teste usa BOX, que se comporta como mipmap ou bilinear da GPU. O Lanczos cria
  "ringing" de alfa (252–254), que não acontece no engine.
- **asset_report.py** (`--expect-size`, `--require-alpha`): 20/20 PNGs saíram com código 0.
- Âncoras conferidas em `prancha-debug.png`: o pé do boneco, a base do tronco e o centro do
  fardo caem no centro do losango.

## Observações do diretor de arte (para o alvo visual)

1. As bordas entre materiais ainda são losangos duros. O alvo visual precisa de **transições**
   grama↔caminho e grama↔canteiro, com borda arredondada e um filete de `shadow`. Vai ser
   autotile de 4 vizinhos (16 tiles por par) ou "decalques" de borda por cima do chão.
2. Repetição da grama: com 2 variantes ainda dá para notar o padrão em área grande. O plano é
   ter 3 variantes e mais decoração solta (flores, pedrinhas) como objetos.
3. O canteiro do jogo deve ser **objeto elevado** (canteiro com borda de terra ou madeira,
   1 tile) sobre a grama, além do tile arado de chão. Isso fica mais legível no celular.
4. O fardo de feno lê como "caixote amarelo". No alvo, falta arredondar as quinas, pôr palha
   saindo da silhueta e talvez fazer um rolo cilíndrico.
5. Copa e tronco já funcionam a 0,5. A copa pode ganhar 1–2 frutos ou flores como ponto focal.
