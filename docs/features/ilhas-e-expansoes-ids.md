# Ilhas e expansões — ids para alinhamento com a economia

> Contrato de nomes entre `game-designer` e `economista-tokenomics`. Fonte da verdade dos ids;
> a spec completa está em [ilhas-e-expansoes.md](ilhas-e-expansoes.md). Sem números aqui
> (valores em `economy/expansions.csv` e `economy/economy.csv`).

## Ilhas (ordem de desbloqueio) e blocos de expansão

| # | id | Nome (pt-BR) | Blocos | ids dos blocos | Bloco da tabela do usuário (`ref_blocks`) |
|---|---|---|---|---|---|
| 1 | `homestead` | Ilha Morada | 7 | `homestead_01` … `homestead_07` | chegada, b4–b9 |
| 2 | `breezewood` | Bosque da Brisa | 12 | `breezewood_01` … `breezewood_12` | b5–b16 |
| 3 | `ochremesa` | Mesa Ocre | 21 | `ochremesa_01` … `ochremesa_21` | b5–b25 |
| 4 | `emberpeak` | Pico Brasa | 25 | `emberpeak_01` … `emberpeak_25` | b6–b30 |
| | | **Total** | **65** | | |

`homestead_01` é o terreno inicial (grátis, já revelado). Expansões pagas: 64. Cada ilha 2–4 tem
ainda uma **travessia** (linha `row_type=island` com o id da ilha).

## Moedas usadas nas expansões

| id | Papel | Onde está definido |
|---|---|---|
| `gold` | moeda soft off-chain | `docs/ARQUITETURA.md` (decisões) |
| `diamond` | moeda premium (substitui 1:1 a moeda premium da tabela do usuário) | [diamantes.md](diamantes.md); coluna `cost_diamond` pendente em `expansions.csv` |

## Recursos (ids) e papel

| Papel do recurso | id | Tipo | Primeiro bloco | Nó que gera |
|---|---|---|---|---|
| material básico 1 | `driftwood` | madeira (id já existente) | `homestead_01` | `tree` |
| material básico 2 | `flint` | pedra (id já existente) | `homestead_01` | `flint_rock` |
| minério comum | `rustite` | minério | `homestead_02` | `rustite_node` |
| minério raro | `glintstone` | minério | `homestead_03` | `glintstone_node` |
| minério da ilha 2 | `dewquartz` | cristal | `breezewood_03` | `dewquartz_node` |
| minério da ilha 3 | `sandglint` | minério | `ochremesa_01` | `sandglint_node` |
| minério da ilha 4 | `cinderite` | minério | `emberpeak_02` | `cinderite_node` |
| fruta 1 | `bellpear` | fruta | `breezewood_01` | `bellpear_tree` |
| fruta 2 | `mistplum` | fruta | `breezewood_02` | `mistplum_tree` |
| fruta 3 | `honeydate` | fruta | `ochremesa_02` | `honeydate_palm` |
| fruta 4 | `firefig` | fruta | `emberpeak_01` | `firefig_tree` |

`driftwood` e `flint` mantêm os ids já usados em `economy/economy.csv` (sem migração de save).

## Culturas (23)

| id | Tier | Bloco de desbloqueio |
|---|---|---|
| `mintleaf` | basic | `homestead_01` |
| `dewcress` | basic | `homestead_01` |
| `pebblepea` | basic | `homestead_01` |
| `curlwort` | basic | `homestead_02` |
| `puffbean` | basic | `homestead_03` |
| `sweetstalk` | medium | `homestead_02` |
| `redroot` | medium | `homestead_03` |
| `honeyleek` | medium | `homestead_04` |
| `stripemelon` | medium | `homestead_05` |
| `glowgourd` | medium | `homestead_06` |
| `bluepod` | medium | `breezewood_01` |
| `frillhead` | medium | `breezewood_02` |
| `sunbulb` | medium | `breezewood_03` |
| `sandspud` | medium | `ochremesa_03` |
| `silkpod` | advanced | `breezewood_07` |
| `crownbloom` | advanced | `breezewood_10` |
| `duneroot` | advanced | `ochremesa_06` |
| `miragemelon` | advanced | `ochremesa_12` |
| `starthistle` | advanced | `ochremesa_18` |
| `cinderpod` | advanced | `emberpeak_05` |
| `ashbloom` | advanced | `emberpeak_10` |
| `magmabulb` | advanced | `emberpeak_15` |
| `embercrown` | advanced | `emberpeak_25` |

Tiers: basic = 1 a 30 min · medium = 1 h a 12 h · advanced = 16 h a 48 h (decisão do usuário,
2026-11-22). Os blocos acima são os de `unlock_block` em `economy/economy.csv` (v2.1); se divergirem,
vale o CSV.
