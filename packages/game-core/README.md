# @nft-farm/game-core

Regras do jogo compartilhadas por `apps/client` (otimista) e `apps/server` (autoridade).
Padrões: `.claude/skills/server-authoritative-game-logic/SKILL.md`.

- `src/state.ts` — `GameState` v1, `createInitialState()`, `CURRENT_SCHEMA_VERSION`.
- `src/events/` — um reducer puro por evento + `applyAction`/`applyActions`.
- `src/migrations.ts` — `migrate(save)` de ausente/v0 → versão atual.
- `src/data/` — tipos (`types.ts`) e números (`economy.generated.ts`, gerado pelo economista;
  hoje é PLACEHOLDER). Reducers só leem números daí.
- `src/lib/rng.ts` — PRNG com seed (sfc32 + cyrb128). `src/lib/money.ts` — decimal.js.

## Comandos

`pnpm test` (Vitest) · `pnpm typecheck` (`tsc`, sem emitir) · `pnpm lint` (ESLint).

**Lint:** ESLint flat config com `typescript-eslint` `strictTypeChecked`. Em `src/` também
proíbe `Date.now`, `new Date()`, `Math.random`, `performance.now`, `crypto` e `fetch`, para manter
os reducers puros e determinísticos.

**TypeScript 6.0** (não 7): o `typescript-eslint` atual só suporta TS < 6.1.

O pacote é consumido como fonte (`exports` → `src/index.ts`); o passo de build para o servidor
entra na Fase 1.
