---
name: server-authoritative-game-logic
description: >
  Lógica de jogo como reducers puros em TypeScript compartilhados entre cliente e servidor, com o
  servidor como autoridade: eventos, validação, tempo, RNG determinístico, autosave e migração de
  estado. Use ao criar ou mudar qualquer ação do jogador (plantar, colher, craftar, comprar), um
  campo do estado, ou ao investigar dessincronia cliente/servidor.
---

# Lógica de jogo autoritativa no servidor

Num jogo com itens que viram NFT/token, **toda regra roda no servidor**. O cliente aplica a mesma
regra só para resposta instantânea (otimista) e o servidor decide. O SFL faz isso duplicando os
reducers em dois repositórios e sofre com paridade FE/BE; nós evitamos isso com **um único pacote**.

## Estrutura

```
packages/game-core/
  src/state.ts          # tipo GameState + makeInitialState + migrate(v)
  src/events/<acao>.ts  # um reducer por ação
  src/events/index.ts   # mapa { "crop.planted": plant, ... }
  src/data/*.ts         # tabelas de itens/receitas (geradas da planilha de economia)
  src/lib/rng.ts        # PRNG com seed
  test/<acao>.test.ts
```

Cliente (`apps/client`) e servidor (`apps/server`) importam o mesmo `game-core`.

## Contrato de um reducer

```ts
export type Action<T extends string, P> = { type: T; payload: P; createdAt: number };

export function plant(state: GameState, action: PlantAction): GameState {
  // 1. validar (lança GameError com código estável — nunca retorna estado parcial)
  // 2. calcular com action.createdAt (NUNCA Date.now())
  // 3. retornar novo estado (immer `produce` ou cópia)
}
```

Regras:
- **Puro e determinístico.** Sem `Date.now()`, `Math.random()`, rede ou I/O. Tempo vem de
  `createdAt`; aleatoriedade vem de `rng(seed, farmId, counter)`. O servidor gera a seed.
- **O cliente envia intenção, nunca quantidade/preço.** `{type:"item.bought", payload:{item, qty}}`;
  o preço é lido de `data/` no servidor.
- **Valide tudo:** item existe, quantidade inteira > 0 e ≤ limite, posição livre, timer pronto,
  saldo suficiente, feature flag ativa naquele `createdAt`.
- **Decimais:** use `decimal.js` para saldos e preços; nunca float para dinheiro/token.
- **Ordem de boosts documentada:** base × multiplicadores, depois + bônus fixos. Escreva a ordem
  no arquivo de boosts e teste-a.

## Autosave em lote

O cliente acumula ações e envia a cada N segundos (`POST /actions`, lote ordenado). O servidor:
1. carrega o estado + versão (lock otimista por `version`);
2. checa `createdAt` de cada ação: não no futuro (tolerância ~1 min), não anterior à última ação;
3. reaplica cada reducer; na primeira falha rejeita o lote inteiro e devolve o estado canônico;
4. grava estado + `version+1` + log de ações (auditoria) numa transação.

## Mudar o estado

Campo novo em `GameState` ⇒ (a) valor padrão em `makeInitialState`, (b) passo em `migrate()`
incrementando `schemaVersion`, (c) teste de migração com um save antigo fixo. Veja também
`save-systems` para versionamento e escrita atômica.

## Testes (TDD obrigatório para lógica)

Escreva o teste, veja falhar, implemente, veja passar. Para cada reducer teste: caminho feliz,
cada validação que lança, limites (0, negativo, enorme, `NaN`), e tempo (antes/depois do timer).
Faça mutation test manual: quebre a regra e confirme que o teste fica vermelho.
