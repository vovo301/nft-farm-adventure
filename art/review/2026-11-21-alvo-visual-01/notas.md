# Lote 2026-11-21-alvo-visual-01 — alvo visual (Fase 0)

Autor: `diretor-de-arte`. Tudo por script: grades `.txt` em `art/source/` + paleta travada
`art/style-guide/palette.json`. Reproduzir: `python3 art/source/tools/build_alvo_visual.py`.

## Arquivos para o usuário olhar
- `prancha.png` — paleta, cada asset a 1× e 4×, testes 3×3 de repetição, ícones sobre os fundos
  do jogo, e o mini-mapa a 1× e 3×.
- `mapa-preview.png` (3×) / `mapa-preview-1x.png` — a cena montada.
- `mapa-grade-colisao.png` — mapa com grade e colisão (água em vermelho, spawn/objetos em amarelo).
- `prancha-contato.png` — prancha padrão do `build_preview_sheet.py`.

## QA técnico
`asset_report.py` passou em todos (tamanho, alpha, nº de cores conforme o guia).

## Revisão interna do diretor (rodada 1 → 2)
Reprovado internamente e refeito antes de enviar:
- terra arada lia como parede de tijolo (quebras verticais alinhadas) → camalhões de 8 px com torrões;
- grama ruidosa demais → menos tufos; variação extra por espelhamento no mapa;
- emblema da moeda lia como fechadura → broto cunhado (duas folhas + caule);
- mãos do avatar viravam bloco escuro → braço de 1 px de pele com contorno só embaixo;
- excesso de cores no avatar, saco e borda → cabelo usa a sombra de madeira, botões usam ouro, etc.

## Decisões abertas para o usuário
- Personagem com 19 cores (limite do guia subiu para 20 só para personagens).
- `tile_water_edge_n` é um 4º tile (extra) para a cena não ter corte seco grama/água.

## Respostas do usuário
_(pendente)_

## Resposta do usuário (2026-11-21)

Lote **reprovado**: "vamos trabalhar melhor na criação das artes". O usuário vai enviar exemplos de referência; a próxima rodada parte deles.
