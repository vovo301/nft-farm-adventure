# Equilíbrio das expansões — nota de referência (tabelas numéricas)

Fonte: SFL @ `4e3606f` (clone raso, 2026-11-19). Arquivos:
- `src/features/game/types/expansions.ts` — requisitos por bloco (custo, tempo, nível), layouts
  por bloco (quantos nós cada bloco traz), nós na chegada de cada ilha e a derivação dos totais
  acumulados.
- `src/features/game/expansion/lib/expansionRequirements.ts` — teto de blocos por ilha.
- `src/features/game/events/landExpansion/upgradeFarm.ts` — custo e pré-requisito de mudar de ilha.
- `src/features/game/lib/constants.ts`, `lib/resourceNodes.ts` — tempos de recarga dos nós.
- `events/landExpansion/chop.ts`, `stoneMine.ts`, `ironMine.ts`, `mineGold.ts`,
  `mineCrimstone.ts`, `mineSunstone.ts`, `placeSunstone.ts`, `drillOilReserve.ts`,
  `startLavaPit.ts`, `collectLavaPit.ts` — rendimento-base e ferramenta exigida por nó.
- `src/features/game/types/tools.ts`, `types/oilDrill.ts` — preço das ferramentas.

> **Base legal desta nota:** exceção da regra 1 do `CLAUDE.md` decidida pelo usuário em
> 2026-11-22 — os *números* da curva de expansões podem servir de base. **Nomes de itens,
> recursos, ilhas, textos, código e arte continuam proibidos**: tudo aqui usa rótulos genéricos de
> papel. Os números foram extraídos por contagem/soma dos dados (script descartável fora do repo);
> nenhum trecho de código foi colado.

## Rótulos genéricos

Mantive os rótulos de `equilibrio-totais-ilhas.md` para as duas notas serem comparáveis.

| Rótulo | Papel no modelo de referência |
|---|---|
| **moeda soft** | moeda comum ganha jogando (vendas, pedidos). Única moeda cobrada por bloco nas ilhas 1–4. |
| **madeira** | material básico 1, sai das árvores. |
| **pedra** | material básico 2, sai das pedras. |
| **minério 1 (comum)** | primeiro minério; nó disponível desde a ilha 1. |
| **minério 2 (raro)** | segundo minério, recarga longa; nó raro na ilha 1. É o preço de saída da ilha 1. |
| **minério I2** | minério que só aparece a partir da ilha 2; recarga longa e bônus por sequência. Preço de saída da ilha 2. |
| **recurso I3** | recurso líquido extraído de uma reserva, a partir da ilha 3. Preço de saída da ilha 3. |
| **minério I4** | produto de um nó "forno" da ilha 4 (o nó é alimentado com colheitas + minérios por estação). |
| **nó especial finito** (Esp) | nó de pedra preciosa que se esgota depois de um número fixo de coletas. No arquivo de totais aparece como "nó de gema". |
| **moeda premium** | moeda comprável com dinheiro real (no arquivo de totais: "gema"). Todos os custos são múltiplos de 15 (o código expressa como *n* × 15). |
| **token** | moeda on-chain. O campo existe nos requisitos das ilhas 3–4 mas está **zerado em todos os blocos**: nenhuma expansão custa token hoje. |

Abreviações dos nós nas tabelas: Can = canteiro de cultivo, Árv = árvore, Ped = pedra,
M1 = nó de minério 1, M2 = nó de minério 2, MI2 = nó de minério I2, Esp = nó especial finito,
Frut = canteiro de frutífera, Flor = canteiro de flores, Colm = colmeia, RI3 = reserva do recurso I3,
NI4 = nó "forno" do minério I4.

## Estrutura geral

| Ilha | Blocos jogáveis | Chega com | Teto | Pré-requisito para sair | Custo de saída |
|---|---|---|---|---|---|
| Ilha 1 | 4 → 9 (6 blocos) | 3 blocos já revelados | 9 | ter 9 blocos | 10 × minério 2 |
| Ilha 2 | 5 → 16 (12 blocos) | 4 blocos, já com todos os nós da ilha 1 | 16 | ter 16 blocos | 20 × minério I2 |
| Ilha 3 | 5 → 25 (21 blocos) | 4 blocos, já com todos os nós da ilha 2 | 25 | ter 25 blocos | 200 × recurso I3 |
| Ilha 4 | 6 → 30 (25 blocos) | 5 blocos, já com todos os nós da ilha 3 | 30 | ter 30 blocos | cresce por "ascensão" (ver fim) |

Observações estruturais:
- Ao mudar de ilha o jogador **não perde nós**: a nova ilha começa com o total acumulado da anterior
  (a contagem de chegada de cada ilha = total final da ilha anterior, conferido para as três
  transições). O que muda é o número do bloco (volta para 4 ou 5) e o layout.
- O número de bloco é contínuo dentro da ilha, mas **reinicia** na troca. A ilha 2 tem dados de
  requisitos para blocos 17–20 e a ilha 1 para 10–23 que **não são jogáveis** (ficam acima do teto):
  os da ilha 1 são de uma versão antiga em que a ilha 1 ia até 23 e servem só para reembolso.
- Bônus de itens podem reduzir custos em percentual; as tabelas mostram o valor-base.
- Nível mínimo = nível do avatar do jogador.

## 1. Tabelas bloco a bloco

### Ilha 1

Nós na chegada (bloco 3): Árv 3, Ped 2

| Bloco | Nível mín. | Tempo | Moeda soft | Madeira | Pedra | Min. 1 | Min. 2 | Min. I2 | Rec. I3 | Min. I4 | Premium | Adiciona | Acumulado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 | 1 | 5 s | — | 3 | — | — | — | — | — | — | — | Can +9, Árv +2, Ped +1, M1 +1 | Can 9 · Árv 5 · Ped 3 · M1 1 |
| 5 | 1 | 5 s | 60 | 5 | — | — | — | — | — | — | — | Can +8, Árv +1, Ped +1, M1 +1, M2 +1 | Can 17 · Árv 6 · Ped 4 · M1 2 · M2 1 |
| 6 | 2 | 1 min | 60 | — | 1 | — | — | — | — | — | — | Can +8, Árv +1, Ped +1 | Can 25 · Árv 7 · Ped 5 · M1 2 · M2 1 |
| 7 | 3 | 5 min | 100 | — | 3 | — | — | — | — | — | — | Can +2, Árv +1, Ped +1, M1 +1 | Can 27 · Árv 8 · Ped 6 · M1 3 · M2 1 |
| 8 | 8 | 4 h | 200 | — | — | 3 | 1 | — | — | — | — | Can +2, Árv +1, Ped +1, M2 +1 | Can 29 · Árv 9 · Ped 7 · M1 3 · M2 2 |
| 9 | 11 | 12 h | 300 | 100 | 40 | 5 | — | — | — | — | — | Can +2, M1 +1 | Can 31 · Árv 9 · Ped 7 · M1 4 · M2 2 |
| **Total** | | **16 h 6 min 10 s** | **720** | **108** | **44** | **8** | **1** | **—** | **—** | **—** | **—** | | |

### Ilha 2

Nós na chegada (bloco 4): Can 31, Árv 9, Ped 7, M1 4, M2 2, Frut 2

| Bloco | Nível mín. | Tempo | Moeda soft | Madeira | Pedra | Min. 1 | Min. 2 | Min. I2 | Rec. I3 | Min. I4 | Premium | Adiciona | Acumulado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 11 | 1 min | 100 | 20 | — | — | — | — | — | — | — | Can +2, Árv +2, Ped +2, M1 +1, M2 +1, Frut +1 | Can 33 · Árv 11 · Ped 9 · M1 5 · M2 3 · Frut 3 |
| 6 | 13 | 5 min | 200 | 10 | 5 | — | 2 | — | — | — | — | Árv +1, Ped +1, Frut +1, Flor +1, Colm +1 | Can 33 · Árv 12 · Ped 10 · M1 5 · M2 3 · Frut 4 · Flor 1 · Colm 1 |
| 7 | 16 | 30 min | 300 | 30 | 20 | 5 | — | — | — | — | 15 | Can +2, Árv +1, Ped +1, MI2 +1 | Can 35 · Árv 13 · Ped 11 · M1 5 · M2 3 · MI2 1 · Frut 4 · Flor 1 · Colm 1 |
| 8 | 20 | 2 h | 400 | 20 | — | — | — | 1 | — | — | 15 | Can +2, Ped +1, M1 +1, M2 +1, Frut +1 | Can 37 · Árv 13 · Ped 12 · M1 6 · M2 4 · MI2 1 · Frut 5 · Flor 1 · Colm 1 |
| 9 | 23 | 2 h | 500 | 50 | — | — | 5 | — | — | — | 15 | Árv +1, Esp +1, Frut +1 | Can 37 · Árv 14 · Ped 12 · M1 6 · M2 4 · MI2 1 · Esp 1 · Frut 6 · Flor 1 · Colm 1 |
| 10 | 25 | 4 h | 500 | — | 10 | — | — | 3 | — | — | 15 | M1 +1, M2 +1, Frut +1, Flor +1, Colm +1 | Can 37 · Árv 14 · Ped 12 · M1 7 · M2 5 · MI2 1 · Esp 1 · Frut 7 · Flor 2 · Colm 2 |
| 11 | 27 | 8 h | 500 | 100 | 25 | — | 5 | 1 | — | — | 15 | Can +2, Árv +1, Ped +1, Frut +1 | Can 39 · Árv 15 · Ped 13 · M1 7 · M2 5 · MI2 1 · Esp 1 · Frut 8 · Flor 2 · Colm 2 |
| 12 | 29 | 12 h | 500 | 50 | — | 5 | — | 3 | — | — | 30 | Can +2 | Can 41 · Árv 15 · Ped 13 · M1 7 · M2 5 · MI2 1 · Esp 1 · Frut 8 · Flor 2 · Colm 2 |
| 13 | 32 | 12 h | 500 | 50 | 25 | 10 | 10 | — | — | — | 30 | Árv +1, Ped +1, M1 +1, Esp +1, Frut +1 | Can 41 · Árv 16 · Ped 14 · M1 8 · M2 5 · MI2 1 · Esp 2 · Frut 9 · Flor 2 · Colm 2 |
| 14 | 36 | 1 d | 500 | 100 | 10 | — | — | 5 | — | — | 30 | Can +2, Frut +1 | Can 43 · Árv 16 · Ped 14 · M1 8 · M2 5 · MI2 1 · Esp 2 · Frut 10 · Flor 2 · Colm 2 |
| 15 | 40 | 1 d | 500 | 150 | 10 | 10 | 5 | 5 | — | — | 30 | Can +1, Árv +1, Ped +1, M1 +1, MI2 +1, Frut +1 | Can 44 · Árv 17 · Ped 15 · M1 9 · M2 5 · MI2 2 · Esp 2 · Frut 11 · Flor 2 · Colm 2 |
| 16 | 43 | 1 d | 500 | 100 | 10 | — | 5 | 8 | — | — | 30 | Can +1, Árv +1, M2 +1, Flor +1, Colm +1 | Can 45 · Árv 18 · Ped 15 · M1 9 · M2 6 · MI2 2 · Esp 2 · Frut 11 · Flor 3 · Colm 3 |
| **Total** | | **4 d 16 h 36 min** | **5 000** | **680** | **115** | **30** | **32** | **26** | **—** | **—** | **225** | | |

### Ilha 3

Nós na chegada (bloco 4): Can 45, Árv 18, Ped 15, M1 9, M2 6, MI2 2, Esp 2, Frut 11, Flor 3, Colm 3

| Bloco | Nível mín. | Tempo | Moeda soft | Madeira | Pedra | Min. 1 | Min. 2 | Min. I2 | Rec. I3 | Min. I4 | Premium | Adiciona | Acumulado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 40 | 1 min | 500 | 50 | 10 | 5 | 5 | — | — | — | — | Can +1, Ped +1, M1 +1, RI3 +1 | Can 46 · Árv 18 · Ped 16 · M1 10 · M2 6 · MI2 2 · Esp 2 · Frut 11 · Flor 3 · Colm 3 · RI3 1 |
| 6 | 40 | 5 min | 500 | 100 | 20 | 10 | 5 | — | — | — | — | Esp +1, Frut +1 | Can 46 · Árv 18 · Ped 16 · M1 10 · M2 6 · MI2 2 · Esp 3 · Frut 12 · Flor 3 · Colm 3 · RI3 1 |
| 7 | 41 | 30 min | 500 | 150 | 20 | 10 | 5 | — | — | — | 15 | Can +2, MI2 +1 | Can 48 · Árv 18 · Ped 16 · M1 10 · M2 6 · MI2 3 · Esp 3 · Frut 12 · Flor 3 · Colm 3 · RI3 1 |
| 8 | 42 | 2 h | 500 | 150 | 10 | 5 | 5 | 3 | 5 | — | 30 | Can +2, Esp +1 | Can 50 · Árv 18 · Ped 16 · M1 10 · M2 6 · MI2 3 · Esp 4 · Frut 12 · Flor 3 · Colm 3 · RI3 1 |
| 9 | 43 | 2 h | 500 | 50 | 5 | 5 | 5 | 6 | 5 | — | 30 | Árv +1, Ped +1 | Can 50 · Árv 19 · Ped 17 · M1 10 · M2 6 · MI2 3 · Esp 4 · Frut 12 · Flor 3 · Colm 3 · RI3 1 |
| 10 | 44 | 8 h | 384 | 100 | 50 | 10 | 5 | 12 | 10 | — | 45 | Can +1, M1 +1 | Can 51 · Árv 19 · Ped 17 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 12 · Flor 3 · Colm 3 · RI3 1 |
| 11 | 45 | 12 h | 768 | 150 | 75 | 10 | 5 | 15 | 30 | — | 45 | Can +1, Frut +1 | Can 52 · Árv 19 · Ped 17 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 1 |
| 12 | 47 | 12 h | 1 536 | 100 | 100 | 5 | 10 | 18 | 30 | — | 45 | Can +2 | Can 54 · Árv 19 · Ped 17 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 1 |
| 13 | 50 | 1 d | 3 072 | 200 | 50 | 15 | 10 | 21 | 40 | — | 45 | Árv +1 | Can 54 · Árv 20 · Ped 17 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 1 |
| 14 | 53 | 1 d | 3 840 | 200 | 100 | 15 | 10 | 24 | 50 | — | 45 | Can +1, Ped +1 | Can 55 · Árv 20 · Ped 18 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 1 |
| 15 | 56 | 1 d | 3 840 | 300 | 50 | 20 | 10 | 27 | 75 | — | 45 | Can +1, RI3 +1 | Can 56 · Árv 20 · Ped 18 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 2 |
| 16 | 58 | 1 d 12 h | 3 840 | 250 | 125 | 15 | 15 | 30 | 100 | — | 60 | Can +1, Árv +1 | Can 57 · Árv 21 · Ped 18 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 2 |
| 17 | 60 | 1 d 12 h | 5 760 | 350 | 75 | 20 | 10 | 33 | 125 | — | 60 | Can +2 | Can 59 · Árv 21 · Ped 18 · M1 11 · M2 6 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 2 |
| 18 | 63 | 1 d 12 h | 5 760 | 400 | 125 | 25 | 15 | 36 | 150 | — | 75 | Can +1, M2 +1 | Can 60 · Árv 21 · Ped 18 · M1 11 · M2 7 · MI2 3 · Esp 4 · Frut 13 · Flor 3 · Colm 3 · RI3 2 |
| 19 | 65 | 1 d 12 h | 7 680 | 450 | 150 | 30 | 20 | 39 | 200 | — | 60 | Can +1, Frut +1 | Can 61 · Árv 21 · Ped 18 · M1 11 · M2 7 · MI2 3 · Esp 4 · Frut 14 · Flor 3 · Colm 3 · RI3 2 |
| 20 | 68 | 2 d | 7 680 | 525 | 200 | 35 | 30 | 42 | 250 | — | 60 | Árv +1, Ped +1, RI3 +1 | Can 61 · Árv 22 · Ped 19 · M1 11 · M2 7 · MI2 3 · Esp 4 · Frut 14 · Flor 3 · Colm 3 · RI3 3 |
| 21 | 70 | 2 d | 9 600 | 550 | 150 | 30 | 25 | 45 | 350 | — | 60 | Can +1, M1 +1, Esp +1 | Can 62 · Árv 22 · Ped 19 · M1 12 · M2 7 · MI2 3 · Esp 5 · Frut 14 · Flor 3 · Colm 3 · RI3 3 |
| 22 | 72 | 2 d | 9 600 | 600 | 200 | 35 | 30 | 48 | 450 | — | 75 | Árv +1, Frut +1 | Can 62 · Árv 23 · Ped 19 · M1 12 · M2 7 · MI2 3 · Esp 5 · Frut 15 · Flor 3 · Colm 3 · RI3 3 |
| 23 | 73 | 2 d 12 h | 9 600 | 650 | 250 | 40 | 35 | 51 | 500 | — | 75 | Can +1, MI2 +1 | Can 63 · Árv 23 · Ped 19 · M1 12 · M2 7 · MI2 4 · Esp 5 · Frut 15 · Flor 3 · Colm 3 · RI3 3 |
| 24 | 74 | 2 d 12 h | 11 520 | 700 | 300 | 50 | 45 | 54 | 550 | — | 75 | Can +1, Esp +1 | Can 64 · Árv 23 · Ped 19 · M1 12 · M2 7 · MI2 4 · Esp 6 · Frut 15 · Flor 3 · Colm 3 · RI3 3 |
| 25 | 75 | 2 d 12 h | 13 440 | 750 | 350 | 50 | 50 | 60 | 650 | — | 75 | Can +1, Ped +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 7 · MI2 4 · Esp 6 · Frut 15 · Flor 3 · Colm 3 · RI3 3 |
| **Total** | | **24 d 36 min** | **100 420** | **6 775** | **2 415** | **440** | **350** | **564** | **3 570** | **—** | **1 020** | | |

### Ilha 4

Nós na chegada (bloco 5): Can 65, Árv 23, Ped 20, M1 12, M2 7, MI2 4, Esp 6, Frut 15, Flor 3, Colm 3, RI3 3

| Bloco | Nível mín. | Tempo | Moeda soft | Madeira | Pedra | Min. 1 | Min. 2 | Min. I2 | Rec. I3 | Min. I4 | Premium | Adiciona | Acumulado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6 | 70 | 10 s | 500 | 100 | 50 | 30 | 10 | — | — | — | — | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 7 · MI2 4 · Esp 6 · Frut 15 · Flor 3 · Colm 3 · RI3 3 |
| 7 | 72 | 5 min | 384 | 200 | 75 | 25 | 15 | 4 | 30 | — | 30 | NI4 +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 7 · MI2 4 · Esp 6 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 8 | 74 | 30 min | 768 | 300 | 100 | 40 | 20 | 8 | 60 | — | 30 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 7 · MI2 4 · Esp 7 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 9 | 76 | 1 h | 1 152 | 400 | 150 | 35 | 25 | 12 | 90 | — | 60 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 7 · MI2 4 · Esp 7 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 10 | 78 | 2 h | 1 920 | 450 | 200 | 30 | 20 | 16 | 120 | 1 | 60 | M2 +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 7 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 11 | 80 | 4 h | 3 000 | 500 | 175 | 30 | 30 | 20 | 100 | — | 90 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 7 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 12 | 82 | 8 h | 3 840 | 650 | 225 | 25 | 25 | 24 | 100 | 2 | 150 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 8 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 13 | 84 | 12 h | 4 800 | 550 | 200 | 40 | 30 | 28 | 100 | — | 150 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 8 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 14 | 86 | 12 h | 5 760 | 700 | 250 | 35 | 35 | 32 | 100 | 1 | 150 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 8 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 1 |
| 15 | 88 | 1 d | 6 720 | 650 | 200 | 30 | 40 | 36 | 200 | 2 | 150 | NI4 +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 8 · Frut 15 · Flor 3 · Colm 3 · RI3 3 · NI4 2 |
| 16 | 90 | 1 d | 7 680 | 750 | 250 | 40 | 30 | 40 | 200 | 4 | 150 | RI3 +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 8 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 17 | 92 | 1 d | 9 600 | 700 | 200 | 35 | 35 | 44 | 200 | 4 | 150 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 9 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 18 | 94 | 1 d 12 h | 12 000 | 800 | 300 | 45 | 45 | 48 | 200 | 6 | 180 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 9 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 19 | 96 | 1 d 12 h | 15 360 | 750 | 250 | 40 | 40 | 52 | 200 | 6 | 180 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 10 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 20 | 98 | 2 d | 18 000 | 850 | 300 | 45 | 30 | 56 | 200 | 8 | 180 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 10 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 21 | 100 | 2 d | 21 600 | 900 | 325 | 50 | 35 | 60 | 200 | 8 | 180 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 22 | 102 | 2 d | 25 200 | 800 | 300 | 45 | 30 | 64 | 200 | 10 | 180 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 12 · M2 8 · MI2 4 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 23 | 104 | 2 d | 30 000 | 950 | 350 | 50 | 35 | 68 | 200 | 10 | 180 | M1 +1 | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 4 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 2 |
| 24 | 106 | 2 d | 33 600 | 1 000 | 400 | 55 | 40 | 72 | 300 | 12 | 180 | NI4 +1 | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 4 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| 25 | 108 | 2 d 12 h | 38 400 | 1 100 | 450 | 60 | 35 | 80 | 300 | 12 | 180 | MI2 +1 | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 5 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| 26 | 110 | 2 d 12 h | 42 000 | 1 200 | 350 | 65 | 30 | 85 | 300 | 18 | 180 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 5 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| 27 | 112 | 2 d 12 h | 45 600 | 1 250 | 450 | 70 | 40 | 95 | 300 | 24 | 225 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 5 · Esp 11 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| 28 | 114 | 2 d 12 h | 50 400 | 1 150 | 500 | 60 | 45 | 100 | 300 | 30 | 225 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 5 · Esp 12 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| 29 | 116 | 3 d | 54 000 | 1 350 | 550 | 65 | 40 | 105 | 300 | 36 | 225 | (nada) | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 5 · Esp 12 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| 30 | 120 | 3 d | 60 000 | 1 500 | 600 | 70 | 50 | 125 | 300 | 42 | 225 | Esp +1 | Can 65 · Árv 23 · Ped 20 · M1 13 · M2 8 · MI2 5 · Esp 13 · Frut 15 · Flor 3 · Colm 3 · RI3 4 · NI4 3 |
| **Total** | | **33 d 15 h 35 min 10 s** | **492 284** | **19 550** | **7 200** | **1 115** | **810** | **1 274** | **4 600** | **236** | **3 690** | | |

## Conferência com os dados do usuário

### Amostra de fã, blocos 4–9 da ilha 1

| Item | Fã | Código @ 4e3606f | Bate? |
|---|---|---|---|
| Tempos 4–9 | 5 s, 5 s, 1 min, **30 min**, 4 h, 12 h | 5 s, 5 s, 1 min, **5 min**, 4 h, 12 h | **Não no bloco 7** |
| Custos começam em poucas madeiras e passam a pedra/minérios | sim | 3 e 5 madeiras → 1 e 3 pedras → 3 min. 1 + 1 min. 2 → 100 madeiras + 40 pedras + 5 min. 1 | Sim |
| Canteiros: ~8 nos primeiros, depois ~2 | sim | +9, +8, +8, depois +2, +2, +2 | Sim (o primeiro traz 9) |

### Totais por ilha (`equilibrio-totais-ilhas.md`)

| Item | Ilha 1 | Ilha 2 | Ilha 3 | Ilha 4 |
|---|---|---|---|---|
| Nós finais (todos os tipos) | bate | bate | bate | bate |
| Madeira, pedra, min. 1, min. 2 | **diverge**: pedra 44 (fã 46), min. 1 8 (fã 9); madeira e min. 2 batem | bate | bate | bate |
| Min. I2, rec. I3, min. I4, moeda premium | — | bate | bate | bate |
| Tempo total | **diverge**: 16 h 6 min (fã 16 h 31 min) | bate (4 d 16 h 36 min) | bate (24 d 0 h 36 min) | bate (33 d 15 h 35 min; a ferramenta arredonda 10 s) |
| Moeda soft | **diverge**: 720 (fã 60,25) | fã não lista; código soma 5 000 | **diverge**: 100 420 (fã 81 600) | **diverge**: 492 284 (fã 409 820) |
| Custo de saída | bate | bate | bate | — |

Causa provável das divergências: **versão do jogo**. A ferramenta de fã reflete uma versão anterior:
(a) na ilha 1 o bloco 7 durava 30 min e os custos dos blocos 6–9 eram um pouco diferentes — o
código atual traz comentários dizendo que os blocos iniciais foram re-precificados para casar com o
tutorial (a primeira entrega de pedido paga quase exatamente o bloco 5); o valor fracionado de
moeda (60,25) sugere uma época em que o custo era em outra moeda/escala; (b) nas ilhas 3 e 4 só a
moeda soft diverge, e o resto bate ao centavo — sinal de que a moeda soft foi rebalanceada depois
(a sequência de dobras 384 → 768 → 1 536 → 3 072 na ilha 3 parece um ajuste posterior). O clone é
raso, então não deu para confirmar o histórico. **Recomendação: usar o código como fonte** e a
ferramenta só como sanidade.

## 2. Nós de recurso: recarga, rendimento e ferramenta

Rendimento-base sem bônus (bônus de itens/habilidades somam frações ou multiplicam; não listados).

| Nó | Recarga | Rendimento-base por coleta | Ferramenta consumida (1 por coleta) | Preço da ferramenta |
|---|---|---|---|---|
| Árvore → madeira | 2 h | 1 | machado | 20 moeda soft |
| Pedra → pedra | 4 h | 1 | picareta 1 | 20 moeda soft + 3 madeira |
| Nó de minério 1 | 8 h | 1 | picareta 2 | 20 moeda soft + 3 madeira + 5 pedra |
| Nó de minério 2 | 24 h | 1 | picareta 3 | 80 moeda soft + 3 madeira + 5 minério 1 |
| Nó de minério I2 | 24 h | 1; a cada 5ª coleta seguida (sem deixar passar mais de 24 h além da recarga) +2 | picareta 4 | 100 moeda soft + 3 madeira + 3 minério 2 |
| Nó especial finito | 3 dias | 1; o nó **some após 10 coletas** | picareta 4 | (idem) |
| Reserva do recurso I3 | 20 h | 10; a cada 3ª extração +20 | broca (só vendida a partir da ilha 3) | 100 moeda soft + 20 madeira + 9 minério 1 + 10 de um produto animal (couro; com habilidade, troca por lã em quantidade decrescente 20/15/10) |
| Nó "forno" do minério I4 | 72 h por ciclo | 1 | não usa ferramenta: cada ciclo é **alimentado** com uma cesta que muda por estação (centenas a milhares de colheitas comuns + alguns minérios I2, às vezes minério 2 ou recurso I3) | — |

Notas:
- A cadeia de ferramentas é a espinha da progressão: cada picareta custa o material do degrau de
  baixo, então minerar o degrau N exige ter minerado o N−1.
- Canteiros de cultivo, frutíferas, flores e colmeias não usam ferramenta (usam sementes/tempo) e
  estão fora do escopo desta tabela — ver `01-plantio.md`.
- A loja tem estoque limitado de cada ferramenta que repõe com o tempo (`craftTool.ts`), outro
  limitador de ritmo além da recarga.

## 3. Forma da curva

**Tempo de obra**
- Cada ilha **reinicia** a curva de tempo: começa quase instantânea e vai subindo. Primeiros
  blocos: 5 s / 1 min / 10 s / 10 s nas ilhas 1–4.
- Ilha 1: 5 s → 5 s → 1 min (×12) → 5 min (×5) → 4 h (**×48, o grande salto**) → 12 h (×3). Os
  quatro primeiros blocos cabem numa sessão; os dois últimos ensinam a "voltar amanhã".
- Ilhas 2–4 seguem uma escada parecida — 1 min, 5 min, 30 min, 1–2 h, 4 h, 8 h, 12 h, 1 d,
  1,5 d, 2 d — e terminam num teto: 1 d (ilha 2), 2,5 d (ilha 3), 3 d (ilha 4). Cada degrau dura
  2–5 blocos; o tempo cresce rápido no começo de cada ilha (×5 a ×6 por bloco) e quase para no fim.
- Tempo total por ilha: ~16 h → ~4,7 d → ~24 d → ~33,6 d (razões ~7×, ~5×, ~1,4×).

**Moeda soft**
- Ilha 1: 0 → 60 → 60 → 100 → 200 → 300 (cresce ~1,5–2× por bloco, valores pequenos).
- Ilha 2: 100 → 500 em 5 blocos e depois **plano em 500** até o fim — na ilha 2 o freio são os
  materiais e a moeda premium, não a moeda soft.
- Ilha 3: plano em 500 nos 5 primeiros blocos, cai para 384 no bloco 10 e **dobra três vezes
  seguidas** (384 → 768 → 1 536 → 3 072), depois sobe em degraus (3 840 → 5 760 → 7 680 → 9 600 →
  11 520 → 13 440).
- Ilha 4: cresce quase **linearmente** de ~400 a 60 000 (passo de ~2 400–4 800 por bloco no fim).
  É a ilha em que a moeda soft vira o sink dominante (~5× o total da ilha 3).

**Materiais**
- Madeira é o material de maior volume em todas as ilhas e cresce mais ou menos linear dentro da
  ilha (ilha 3: 50 → 750; ilha 4: 100 → 1 500), com oscilações de ±15 % entre blocos vizinhos
  (a curva "serrilha" de propósito para não ser monótona).
- Pedra segue madeira a ~1/3 do volume; minérios 1 e 2 ficam em dezenas.
- Os materiais exclusivos têm **rampa aritmética pura**: minério I2 na ilha 3 sobe +3 por bloco
  (3, 6, 12, 15, 18 … 60: +3 por bloco depois de um salto inicial); na ilha 4 +4 por bloco (4 → 125 com acelerada no fim). Recurso I3 na ilha 3 vai
  5 → 650 com aceleração forte (é o material que mais cresce, ~130×). Minério I4 sobe 1 → 42.
- Moeda premium: 0 nos primeiros blocos de cada ilha e depois degraus de 15: ilha 2 15 → 30;
  ilha 3 15 → 75; ilha 4 30 → 225.

**Quando cada material passa a ser exigido**

| Material | Primeiro bloco que exige | Nó disponível desde |
|---|---|---|
| madeira | ilha 1, bloco 4 | chegada |
| moeda soft | ilha 1, bloco 5 | — |
| pedra | ilha 1, bloco 6 | chegada |
| minério 1 e minério 2 | ilha 1, bloco 8 | blocos 4 e 5 da ilha 1 |
| moeda premium | ilha 2, bloco 7 | — (comprada) |
| minério I2 | ilha 2, bloco 8 | bloco 7 da ilha 2 (1 bloco antes) |
| recurso I3 | ilha 3, bloco 8 | bloco 5 da ilha 3 (3 blocos antes) |
| minério I4 | ilha 4, bloco 10 | bloco 7 da ilha 4 (3 blocos antes; 1 ciclo de 72 h cabe) |

Padrão: um material novo é **apresentado** (o nó aparece num bloco) e **cobrado 1–3 blocos depois**,
primeiro em quantidade simbólica (1–5), e só então sobe.

**O que cada bloco adiciona**
- Ilha 1 é a "ilha de canteiros": 31 canteiros em 6 blocos (9/8/8 e depois 2/2/2).
- Ilha 2 diversifica: só +14 canteiros em 12 blocos, mas traz frutíferas, colmeias, flores, os
  primeiros nós de minério I2 e especiais. Cada bloco traz 2–9 nós (média ~5).
- Ilha 3 adiciona +20 canteiros em 21 blocos (~1 por bloco), com ~2 nós por bloco no total.
- Ilha 4 **não adiciona canteiros**: 25 blocos trazem só 14 nós no total (7 especiais finitos, 3
  fornos, 4 avulsos), e 11 blocos não trazem nada. Lá a expansão é quase puro sink/prestígio.
- Retorno decrescente claro: custo cresce, nós por bloco caem (média de nós por bloco ≈ 8 → 5 → 2 → 0,6).

**Nível mínimo**
- Ilha 1: 1 → 11; ilha 2: 11 → 43; ilha 3: 40 → 75; ilha 4: 70 → 120. Há sobreposição entre o
  fim de uma ilha e o começo da seguinte (o jogador pode chegar adiantado de nível) e o passo é
  ~2–4 níveis por bloco.

**Além da ilha 4 (só a forma)**: as ilhas seguintes não têm tabela fixa; custos de bloco e de
mudança são fórmula que multiplica a base por ~1,4 a cada "ascensão" (`expansion/lib/ascension.ts`,
`upgradeFarm.ts`) e exigem nível alto. Fora do escopo do MVP.

## Por que funciona (retenção, sink, social)
- Reinício da curva de tempo em cada ilha dá um "momento de abundância" (várias obras rápidas)
  logo depois da conquista grande de mudar de ilha.
- Cobrar o material novo poucos blocos depois de apresentar o nó ensina o loop sem tutorial.
- Moeda soft plana na ilha 2 e explosiva na ilha 4 desloca o sink: primeiro materiais (tempo de
  jogo), depois moeda (economia acumulada).
- Retorno decrescente de nós por bloco segura a inflação de produção no fim do jogo.

## O que faremos diferente
Sugestões para o `game-designer` e o `economista-tokenomics`:
- **Usar a forma, não os números crus.** A escada de tempos (segundos → minutos → horas → 1–3 dias,
  reiniciando a cada ilha) e o padrão "apresenta o nó, cobra 1–3 blocos depois" são o que vale
  copiar. Quantidades devem ser recalculadas a partir da nossa produção por hora (recargas e
  rendimentos nossos), não 1:1.
- **Converter moeda soft pela renda diária**, não pelo valor nominal (nossas culturas valem 0,01–10
  Gold; ver nota do arquivo de totais). Registrar o fator em `docs/economia/decisoes.md`.
- **Moeda premium:** decidir se teremos uma. Se não, substituir os degraus de premium por um
  material raro nosso, para não criar pay-to-expand.
- **Token nunca no custo de expansão** (a referência também zerou). Mantém expansão off-chain e
  evita que o sink principal dependa de preço de mercado.
- **Ilha 4 sem nós é um ponto fraco:** 25 blocos quase vazios. Sugiro que nossos blocos finais
  tragam algo visível (decoração exclusiva, slot de construção, bioma) para a revelação continuar
  "uau".
- **Bloco 4 da ilha 1 com 9 canteiros** dá abundância imediata; manter algo parecido no nosso
  tutorial, mas com nossos recursos e números.
- **Usar dados versionados** (`economy/economy.csv`) e um teste que confira totais por ilha — a
  divergência entre a ferramenta de fã e o código mostra como esses números mudam entre versões.
