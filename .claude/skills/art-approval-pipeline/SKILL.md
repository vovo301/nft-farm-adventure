---
name: art-approval-pipeline
description: >
  Fluxo de produção de arte onde os agentes criam tudo e o dono do projeto só aprova ou reprova:
  fila de aprovação, pranchas de revisão, status no manifesto, rodadas de correção. Use sempre que
  um agente de arte terminar um lote (ícones, sprites, tiles, mapas, UI) ou quando o usuário
  aprovar/reprovar algo.
---

# Pipeline de aprovação de arte

O usuário **não desenha nem edita arte**: ele só diz "aprovado" ou "reprovado: <motivo>". Toda a
produção, QA técnico e correção é dos agentes. Combine com `create-game-assets` (QA e
proveniência), `pixel-art-scripted` (produção) e `tilemap-phaser-tiled` (mapas).

## Pastas

```
art/
  style-guide/        # guia de estilo, paleta (palette.json), alvo visual aprovado
  source/<familia>/   # arquivos-fonte (grids .txt, .aseprite, .svg, prompts)
  export/<familia>/   # PNG/SVG finais normalizados
  review/<lote>/      # prancha.png + mapa-preview.png + notas.md (o que o usuário olha)
  manifest.json       # um registro por asset (copiado de create-game-assets/assets/asset-manifest.json)
docs/arte/fila-aprovacao.md
```

## Status de cada asset no manifesto

`draft` → `qa_passed` → `in_review` → `approved` | `rejected` → (`draft` de novo).
Só `approved` pode ser importado em `apps/client/public/assets/`.

## Fluxo de um lote

1. **Diretor de arte** define o lote (≤ 12 assets da mesma família) e as restrições (tamanho,
   paleta, vista, âncora).
2. **Artista** produz, normaliza e roda o QA técnico:
   `python .claude/skills/create-game-assets/scripts/asset_report.py art/export/<familia>/*.png --expect-size 16x16 --require-alpha --max-colors 32 --json`
   (deve sair 0). Marca `qa_passed`.
3. **Artista** monta a prancha:
   `python .claude/skills/create-game-assets/scripts/build_preview_sheet.py art/export/<familia>/*.png --out art/review/<lote>/prancha.png --columns 6 --cell-size 96`
   Para tiles/mapas, também o preview do mapa (`tilemap-phaser-tiled`). Se possível, um print do
   jogo rodando com os assets.
4. **Diretor de arte** revisa coesão contra o guia de estilo; devolve ao artista se falhar
   (o usuário não vê lotes que o diretor reprovaria).
5. **Produtor** adiciona o lote em `docs/arte/fila-aprovacao.md`, marca `in_review` e **envia a
   prancha ao usuário** com uma linha por asset. Pergunta só: aprovar tudo, ou quais reprovar e
   por quê.
6. Usuário responde. `approved` → importar. `rejected` → o motivo vai para `notas.md` e o artista
   refaz *a partir do alvo aprovado*, não da versão reprovada.

## Formato da fila

```markdown
## Lote 2026-11-21-icones-culturas-01  — status: in_review
Prancha: art/review/2026-11-21-icones-culturas-01/prancha.png
| # | asset | tamanho | nota |
|---|---|---|---|
| 1 | crop_tomato_icon | 16×16 | ícone de inventário |
Resposta do usuário: _(pendente)_
```

## Regras

- Primeiro lote do projeto = **alvo visual** (1 herói + 3 tiles + 3 ícones). Nada em escala
  é produzido antes dele estar `approved`.
- Nunca mande ao usuário arte sem QA técnico passado.
- Todo asset tem proveniência no manifesto (`source.kind`: `scripted`, `ai_generated`, `licensed`,
  `hand_made`). Nada derivado de Sunflower Land / Sunnyside (ver `sfl-reference-cleanroom`).
