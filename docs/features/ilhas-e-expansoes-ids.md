# Ilhas e expansões — ids para alinhamento com a economia

> Contrato de nomes entre `game-designer` e `economista-tokenomics`. Fonte da verdade dos ids;
> a spec completa está em [ilhas-e-expansoes.md](ilhas-e-expansoes.md). Sem números aqui.

## Ilhas (ordem de desbloqueio) e blocos de expansão

| # | id | Nome (pt-BR) | Blocos | ids dos blocos |
|---|---|---|---|---|
| 1 | `homestead` | Ilha Morada | 10 | `homestead_01` … `homestead_10` |
| 2 | `breezewood` | Bosque da Brisa | 8 | `breezewood_01` … `breezewood_08` |
| 3 | `ochremesa` | Mesa Ocre | 7 | `ochremesa_01` … `ochremesa_07` |
| 4 | `emberpeak` | Pico Brasa | 5 | `emberpeak_01` … `emberpeak_05` |
| | | **Total** | **30** | |

`homestead_01` é o terreno inicial (grátis, já revelado). Expansões pagas: 29.

## Recursos (ids) e papel (para mapear os números da referência)

| Papel do recurso | id | Tipo | Ilha onde surge | Nó que gera |
|---|---|---|---|---|
| material básico 1 | `driftwood` | madeira (id já existente) | homestead | `tree` |
| material básico 2 | `flint` | pedra (id já existente) | homestead | `flint_rock` |
| minério comum | `rustite` | minério | homestead (desde `homestead_04`) | `rustite_node` |
| minério raro | `glintstone` | minério | homestead (desde `homestead_08`) | `glintstone_node` |
| minério exclusivo da ilha 2 | `dewquartz` | cristal | breezewood | `dewquartz_node` |
| minério exclusivo da ilha 3 | `sandglint` | minério | ochremesa | `sandglint_node` |
| minério exclusivo da ilha 4 | `cinderite` | minério | emberpeak | `cinderite_node` |
| fruta 1 | `bellpear` | fruta | breezewood | `bellpear_tree` |
| fruta 2 | `mistplum` | fruta | breezewood | `mistplum_tree` |
| fruta 3 | `honeydate` | fruta | ochremesa | `honeydate_palm` |
| fruta 4 | `firefig` | fruta | emberpeak | `firefig_tree` |

`driftwood` e `flint` mantêm os ids já usados em `economy/economy.csv` (sem migração de save).

## Culturas (23)

| id | Tier | Ilha de desbloqueio |
|---|---|---|
| `mintleaf` | basic | homestead |
| `dewcress` | basic | homestead |
| `pebblepea` | basic | homestead |
| `curlwort` | basic | homestead |
| `puffbean` | basic | homestead |
| `sweetstalk` | medium | homestead |
| `redroot` | medium | homestead |
| `honeyleek` | medium | homestead |
| `stripemelon` | medium | homestead |
| `glowgourd` | medium | homestead |
| `bluepod` | medium | breezewood |
| `frillhead` | medium | breezewood |
| `sunbulb` | medium | breezewood |
| `sandspud` | medium | ochremesa |
| `silkpod` | advanced | breezewood |
| `crownbloom` | advanced | breezewood |
| `duneroot` | advanced | ochremesa |
| `miragemelon` | advanced | ochremesa |
| `starthistle` | advanced | ochremesa |
| `cinderpod` | advanced | emberpeak |
| `ashbloom` | advanced | emberpeak |
| `magmabulb` | advanced | emberpeak |
| `embercrown` | advanced | emberpeak |

Tiers: basic = 1 a 30 min · medium = 1 h a 12 h · advanced = 16 h a 48 h (decisão do usuário,
2026-11-22). A ordem dentro de cada tier na tabela é a ordem de desbloqueio sugerida (tempo e
preço crescentes); tempos e preços finais são do economista. Atenção: `glowgourd` hoje custa
10 Gold, que passa a ser o teto do tier advanced (`embercrown`); o preço dela precisa ser revisto.
