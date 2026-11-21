---
name: pixel-art-scripted
description: >
  Produz pixel art de produção (ícones de item, sprites, tiles, frames de animação) por script, a
  partir de grades de caracteres + paleta travada, sem precisar de ferramenta de desenho; e
  normaliza arte vinda de gerador de imagem para grade/paleta reais. Use para criar ou corrigir
  qualquer asset raster do jogo.
---

# Pixel art por script

Agentes não têm mão para desenhar, mas escrevem grades com precisão de pixel. Cada asset é um
arquivo-fonte de texto versionado em `art/source/`, e o PNG é gerado — então corrigir é editar
texto, e a paleta nunca deriva. Siga o `art-approval-pipeline` para entregar.

## Padrões do projeto (o diretor de arte pode mudar no guia de estilo)

| Tipo | Tamanho | Alpha | Âncora | Cores máx. |
|---|---|---|---|---|
| Tile de chão | 16×16 | opaco | — | 8 |
| Ícone de inventário | 16×16 (exibido 2–4×) | sim | centro | 12 |
| Cultura em estágios | 16×16 × 4–5 quadros | sim | base-centro | 12 |
| Recurso (árvore, pedra) | 16×32 / 32×32 | sim | base-centro | 16 |
| Personagem/NPC | 16×24 (vista 3/4 de cima) | sim | base-centro | 16 |
| Construção | múltiplos de 16 | sim | base-esquerda no grid | 24 |

Paleta única em `art/style-guide/palette.json` (32–48 cores, rampas de 3–5 tons por material).
Nenhum asset usa cor fora dela.

## Gerar

```bash
python .claude/skills/pixel-art-scripted/scripts/pixel_from_grid.py \
  art/source/icons/carrot.txt --palette art/style-guide/palette.json \
  --out art/export/icons/carrot.png
```

Grade: um caractere = um pixel, `.` = transparente, `---` separa quadros (sai um strip
horizontal — também serve como tileset de 1 linha). Sai 1 se houver cor fora da paleta ou quadros
de tamanhos diferentes.

## Regras de ofício

- **Silhueta primeiro**: desenhe a forma com 1 cor escura, depois preencha rampas. Teste a 1×.
- **Contorno** de 1 px na cor mais escura da rampa do material (não preto puro), mais claro no
  lado da luz. Luz sempre do **topo-esquerda**.
- Sem pixels órfãos e sem "banding" (degraus paralelos de cor). Clusters ≥ 2 px.
- Ícones de uma família compartilham: enquadramento (margem de 1 px), ângulo, peso de contorno.
- Estágios de cultura: o volume cresce de baixo para cima, a base fica fixa no mesmo pixel.
- Animação: ciclo de 2–4 quadros para idle, 4–6 para andar; nada de mudar proporção entre quadros.

## Arte vinda de gerador de imagem (opcional)

Se houver uma ferramenta de imagem (ex.: um MCP de geração), use só como rascunho/conceito:
reduza para a grade real com nearest-neighbour, quantize para `palette.json`, limpe à mão na grade
de texto e registre `source.kind: "ai_generated"` + prompt no manifesto. Veja `create-game-assets`
para transparência falsa e halos.

## QA

`asset_report.py` de `create-game-assets` com `--expect-size`, `--max-colors` e `--require-alpha`
(**não** use `--require-alpha` em tiles de chão opacos). Depois a prancha de revisão.
