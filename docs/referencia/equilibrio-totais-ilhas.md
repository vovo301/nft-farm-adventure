# Equilíbrio — totais por ilha (dados fornecidos pelo usuário)

> Fonte: capturas de uma ferramenta de fã enviadas pelo usuário em 2026-11-22 ("custo exato das
> expansões"). Uso autorizado como **base numérica** (exceção à regra 1 do `CLAUDE.md`).
> Nomes da referência substituídos por **rótulos genéricos de papel**; o `game-designer` define
> nossos recursos e o mapeamento papel → recurso nosso. Instrução do usuário: "trabalhar dentro
> desses valores para não fugir muito do jogável".

## Rótulos genéricos

| Rótulo | Papel |
|---|---|
| moeda soft | moeda do jogo comprada/ganha jogando (para nós: **Gold**, mas em outra escala — ver nota) |
| madeira | material básico 1 (árvores) |
| pedra | material básico 2 (pedras) |
| minério comum | minério da ilha 1 |
| minério raro | minério raro da ilha 1 |
| gema | recurso premium/raro (gerado por nós especiais) |
| minério I2 | minério exclusivo da ilha 2 |
| recurso I3 | recurso extraído na ilha 3 (poço/reserva) |
| minério I4 | recurso exclusivo da ilha 4 |
| token | moeda on-chain da referência (custo "P2P" de comprar tudo no mercado) |

## Nós ao final de cada ilha (máximo)

| Nó | Ilha 1 | Ilha 2 | Ilha 3 | Ilha 4 |
|---|---|---|---|---|
| Canteiros | 31 | 45 | 65 | 65 |
| Árvores | 9 | 18 | 23 | 23 |
| Pedras | 7 | 15 | 20 | 20 |
| Minério comum | 4 | 9 | 12 | 13 |
| Minério raro | 2 | 6 | 7 | 8 |
| Frutíferas | — | 11 | 15 | 15 |
| Nó de minério I2 | — | 2 | 4 | 5 |
| Nó de gema | — | 2 | 6 | 13 |
| Colmeias | — | 3 | 3 | 3 |
| Canteiros de flores | — | 3 | 3 | 3 |
| Reserva de recurso I3 | — | — | 3 | 4 |
| Nó de minério I4 | — | — | — | 3 |

## Custo total para completar cada ilha

| Recurso | Ilha 1 | Ilha 2 | Ilha 3 | Ilha 4 |
|---|---|---|---|---|
| moeda soft | 60,25 | — | 81 600 | 409 820 |
| madeira | 108 | 680 | 6 775 | 19 550 |
| pedra | 46 | 115 | 2 415 | 7 200 |
| minério comum | 9 | 30 | 440 | 1 115 |
| minério raro | 1 | 32 | 350 | 810 |
| gema | — | 225 | 1 020 | 3 690 |
| minério I2 | — | 26 | 564 | 1 274 |
| recurso I3 | — | — | 3 570 | 4 600 |
| minério I4 | — | — | — | 236 |
| **Tempo total de construção** | 16 h 31 min | 4 d 16 h 36 min | 24 d 0 h 36 min | 33 d 15 h 35 min |
| Custo equivalente em token (mercado) | 3,74 | 43,85 | 1 183,12 | 6 146,81 |

## Custo de mudança para a próxima ilha

| Transição | Custo |
|---|---|
| Ilha 1 → 2 | 10 × minério raro |
| Ilha 2 → 3 | 20 × minério I2 |
| Ilha 3 → 4 | 200 × recurso I3 |

## Notas para o economista

- **Escala da moeda soft ≠ nosso Gold.** Nossas culturas vão de 0,01 a 10 Gold por semente
  (decisão do usuário). Converta "moeda soft" para Gold pela razão de renda (quanto um jogador
  ganha por dia em cada jogo), não 1:1, e registre o fator em `docs/economia/decisoes.md`.
- Custo em token da referência = preço de mercado dos materiais; para nós expansões custam
  **Gold + recursos**, não token.
- Blocos individuais da ilha 1 (amostra 4–9, também enviada pelo usuário): tempos 5 s, 5 s,
  1 min, 30 min, 4 h, 12 h; custos começam em poucas unidades de madeira e passam a pedra e
  minérios; os primeiros blocos somam ~8 canteiros, depois ~2 por bloco. A tabela bloco a bloco
  completa sai em `equilibrio-expansoes.md` (`analista-referencia`).
