# economy/ — fonte única dos números do jogo

Dono: `economista-tokenomics`. Toda mudança de número passa por aqui **e** por um registro em
`docs/economia/decisoes.md` (CLAUDE.md, regra 3).

```
economy/
├─ economy.csv            fonte única (este formato)
├─ gen/
│  ├─ economy-csv.mjs     parser + validação + conversão para EconomyData
│  └─ generate.mjs        escreve packages/game-core/src/data/economy.generated.ts (ou --check)
└─ sim/
   ├─ profiles.json       perfis de jogador (casual / ativo / bot) e parâmetros da simulação
   ├─ sinks-proposal.json sinks de Gold PROPOSTOS (expansão/construção/upgrade), não oficiais
   ├─ register-ts.mjs     hook do Node para importar o TS de game-core direto da fonte
   ├─ simulate.mjs        simulador de 90 dias usando applyActions do game-core
   ├─ plot.py             gráfico PNG (Pillow)
   └─ out/                daily.csv, summary.json, sim-90d.png (gerados)
```

## Comandos (na raiz)

| Comando | O que faz |
|---|---|
| `pnpm econ:gen` | valida `economy.csv` e regenera `economy.generated.ts` |
| `pnpm econ:check` | falha (exit 1) se `economy.generated.ts` não bate com o CSV — usar no CI |
| `pnpm econ:sim` | roda a simulação de 90 dias (cenários `base` e `sinks`) e gera `sim/out/` (exige gerado em dia) |

Requisitos: Node ≥ 22.18 (type stripping nativo, usado só pelo simulador) e Python 3 + Pillow
(o mesmo exigido pelos scripts de arte).

## Formato de `economy.csv`

CSV RFC 4180 (vírgula, aspas duplas para texto com vírgula), UTF-8, uma linha por registro e uma
coluna `row_type` que diz o tipo da linha. Colunas fixas, nesta ordem:

`row_type,id,seed_price,sell_price,grow_seconds,harvest_qty,node_count,recharge_seconds,yield_qty,value,note`

| row_type | Colunas obrigatórias | Vira no código |
|---|---|---|
| `rule` | `id` ∈ {`starting_gold`, `starting_plot_count`, `max_quantity_per_action`}, `value` | `rules.*` (`starting_gold` → `rules.startingCoins`, nome atual do contrato) |
| `start_item` | `id` (item existente), `value` = quantidade | `rules.startingInventory` |
| `crop` | `seed_price`, `sell_price`, `grow_seconds`, `harvest_qty` | item `<id>_seed` (seed), item `<id>` (crop), `crops.<id>` |
| `resource` | `sell_price`, `node_count`, `recharge_seconds`, `yield_qty` | item `<id>` (resource) |

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

**Colunas só do simulador (por enquanto):** `node_count`, `recharge_seconds` e `yield_qty` dos
recursos ainda não existem no contrato `EconomyData` (`types.ts`) nem há ação de coleta no motor.
O gerador valida, mas não exporta; o simulador as lê direto do CSV. Quando o motor ganhar a coleta,
o contrato deve receber esses campos e o gerador passa a exportá-los.

`meta.source` do arquivo gerado leva o sha256 (12 hex) do CSV, então qualquer edição no CSV sem
`pnpm econ:gen` é pega por `pnpm econ:check`.

## Simulador

- Usa o **motor real**: compra, plantio, colheita e venda passam por `applyActions` de
  `packages/game-core` (validações e aritmética decimal reais). No fim confere que o saldo do motor
  = Gold inicial + vendas − sementes − sinks propostos (cenário `sinks`).
- **Exceção declarada:** a coleta de recursos é replicada fora do motor (nó com recarga fixa,
  rendimento fixo), porque a ação ainda não existe. A venda do recurso usa o motor.
- Determinístico: o jitter de horário e as sessões perdidas usam o PRNG do game-core com seed fixa
  (`profiles.json → rngSeed`). Mesmo CSV + mesmos perfis ⇒ mesmos números.
- Política dos jogadores: em cada visita colhe tudo, coleta nós prontos, vende tudo e planta em
  cada canteiro vazio. Humano: dentro da sessão replanta a cultura que fica pronta antes de sair
  (feedback); ao sair escolhe, por canteiro, a cultura de **maior lucro por colheita** que fica
  pronta até a próxima sessão. Bot: visita a cada 60 s e escolhe sempre o **maior lucro por hora**.
- **Dois cenários:** `base` (só o motor: sementes são o único sink) e `sinks`, que soma expansões,
  construção e upgrades de `sim/sinks-proposal.json` **aplicados fora do motor** (o simulador
  debita o Gold e adiciona canteiros direto no estado; o efeito da construção não é modelado). Os
  números desse arquivo são proposta, não oficiais, e não entram no `economy.generated.ts`.
- Saída: `out/daily.csv` (uma linha por dia × cenário × perfil), `out/summary.json` (tabela de
  culturas, Gold no dia 7/30/90, Gold/dia no regime = dias 61–90, razões, colheitas por cultura) e
  `out/sim-90d.png`.
