# economy/ — fonte única dos números do jogo

Dono: `economista-tokenomics`. Toda mudança de número passa por aqui **e** por um registro em
`docs/economia/decisoes.md` (CLAUDE.md, regra 3).

```
economy/
├─ economy.csv            fonte única: regras, culturas (com desbloqueio), recursos e seus nós
├─ expansions.csv         fonte única: ilhas (custo de mudança), 30 blocos (custo, tempo, nível, o que adicionam)
├─ gen/
│  ├─ economy-csv.mjs     parser + validação + conversão para EconomyData
│  └─ generate.mjs        escreve economy.generated.ts e world.generated.ts em packages/game-core/src/data/ (ou --check)
└─ sim/
   ├─ profiles.json       perfis de jogador (casual / ativo / bot) e parâmetros da simulação
   ├─ reference-totals.json totais por ilha da referência (código e fã) para comparação
   ├─ sinks-proposal.json (v1, substituído; não usado)
   ├─ register-ts.mjs     hook do Node para importar o TS de game-core direto da fonte
   ├─ simulate.mjs        simulador de 90 dias usando applyActions do game-core
   ├─ plot.py             gráfico PNG (Pillow)
   └─ out/                daily.csv, summary.json, sim-90d.png (gerados)

Arquivos auxiliares de mapeamento da referência: não há script; `expansions.csv` guarda na coluna
`ref_blocks` de onde cada bloco veio e `note` explica cada adaptação (decisoes.md, proposta v2).
```

## Comandos (na raiz)

| Comando | O que faz |
|---|---|
| `pnpm econ:gen` | valida os dois CSVs e regenera `economy.generated.ts` + `world.generated.ts` |
| `pnpm econ:check` | falha (exit 1) se algum dos gerados não bate com os CSVs — usar no CI |
| `pnpm econ:sim` | simula 90 dias (+ projeção de 1095 dias só para o dia de cada bloco) e gera `sim/out/` (~30 s) |

Requisitos: Node ≥ 22.18 (type stripping nativo, usado só pelo simulador) e Python 3 + Pillow
(o mesmo exigido pelos scripts de arte).

## Formato de `economy.csv`

CSV RFC 4180 (vírgula, aspas duplas para texto com vírgula), UTF-8, uma linha por registro e uma
coluna `row_type` que diz o tipo da linha. Colunas fixas, nesta ordem:

`row_type,id,seed_price,sell_price,grow_seconds,harvest_qty,node_id,recharge_seconds,yield_qty,unlock_block,value,note`

| row_type | Colunas obrigatórias | Vira no código |
|---|---|---|
| `rule` | `id` ∈ {`starting_gold`, `starting_plot_count`, `max_quantity_per_action`}, `value` | `rules.*` (`starting_gold` → `rules.startingCoins`, nome atual do contrato) |
| `start_item` | `id` (item existente), `value` = quantidade | `rules.startingInventory` |
| `crop` | `seed_price`, `sell_price`, `grow_seconds`, `harvest_qty`, `unlock_block` | item `<id>_seed` (seed), item `<id>` (crop), `crops.<id>`; `world.cropUnlockBlock.<id>` |
| `resource` | `sell_price`, `node_id`, `recharge_seconds`, `yield_qty` | item `<id>` (resource); `world.nodes.<node_id>` |

Regras checadas pelo gerador (erro lista todas as linhas problemáticas):

- `id` em snake_case ASCII minúsculo, único (inclui os `<crop>_seed` derivados). Ids são estáveis:
  renomear um id quebra saves — trate como migração.
- Moeda: **Gold**, precisão **0,01**. Preços e `starting_gold`: decimal ≥ 0 com no máximo 2
  casas (`3`, `0.5`, `0.14`; nunca `1,5`, `03`, `1e3` ou `0.005`). Tempos e quantidades: inteiros
  > 0, tempos em **segundos**.
- Colunas que não pertencem ao `row_type` devem ficar vazias.
- Cultura: semente ≥ 0,01 e lucro por colheita ≥ 0,01 Gold (`sell_price × harvest_qty −
  seed_price`, calculado em centavos inteiros, então nunca arredonda para 0); duas culturas não
  podem ter o mesmo `grow_seconds`.
- `note` é livre (justificativa curta); a justificativa oficial fica em `docs/economia/decisoes.md`.

**Contrato:** `economy.generated.ts` continua no contrato `EconomyData` (itens e culturas). O que o
contrato não tinha (nós, blocos, ilhas, `unlockBlock`) vai para `world.generated.ts` (`WorldData` em
`types.ts`), **só como dados**: nenhum reducer lê ainda (pendência do game-core).

## Formato de `expansions.csv`

Uma linha por ilha (`row_type=island`, colunas `cost_*` = custo de mudança para ENTRAR nela, pago
com o 1º bloco) e uma por bloco (`row_type=block`), na ordem de revelação. Colunas:
`build_seconds`, `min_level` (base da referência; ainda sem XP), `min_account_days`, `cost_gold`
(Gold, 2 casas), `cost_<recurso>` (11 recursos), `add_plot` e `add_<nó>` (12 tipos), `ref_blocks`,
`note`. Vazio = 0. O gerador confere: ids `<ilha>_NN` em sequência, terreno inicial grátis com
`add_plot = starting_plot_count`, todo material cobrado tem nó revelado num bloco **anterior**
(inclui custo de mudança), todo nó aparece em algum bloco, `unlock_block` das culturas existe.

`meta.source` dos gerados leva o sha256 (12 hex) dos CSVs, então qualquer edição sem
`pnpm econ:gen` é pega por `pnpm econ:check`.

## Simulador

- **Motor real** para semente, plantio, colheita e venda (`applyActions`); confere no fim que
  saldo = Gold inicial + vendas − sementes − expansões.
- **Fora do motor (marcado `[FORA]` no código):** coleta de nós, expansões (débito de Gold +
  materiais + custo de mudança, uma obra por vez, idade da conta, revelação que soma canteiros/nós,
  reabastece todos os nós e libera culturas) e o desbloqueio de culturas. **Nível do avatar é
  ignorado** (não há XP).
- Determinístico (PRNG do game-core, `profiles.json → rngSeed`).
- Política: colhe, coleta, vende todas as colheitas e só o **excedente** de recursos (guarda o que
  os blocos restantes pedem), replanta; humano escolhe o maior lucro por colheita que fica pronto
  até a próxima visita e só inicia obra na visita de saída (com o Gold que sobrou depois de
  replantar); bot visita a cada 60 s, maior lucro/h, inicia obra assim que pode.
- Saída: `out/daily.csv` (90 dias × perfil), `out/summary.json` (culturas, totais por ilha × referência,
  dia de cada bloco, gargalo de cada bloco, Gold/dia, razões, projeção de 1095 dias) e `out/sim-90d.png`.
