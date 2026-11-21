# NFT Farm Adventure — jogo de fazenda Web3

Jogo de fazenda social em navegador (desktop e celular), com gameplay off-chain e posse de itens
on-chain (NFTs). Inspirado nas **funcionalidades** do Sunflower Land; código, dados e arte são
100% nossos.

## Equipe de agentes

Comece qualquer pedido pelo agente `produtor`: ele quebra o trabalho e delega para os outros 15
agentes em `.claude/agents/`. As skills de cada um estão em `.claude/skills/` (lista em
`README.md`).

## Regras inegociáveis

1. **Sala limpa.** O Sunflower Land é `UNLICENSED` (todos os direitos reservados) e usa o pack de
   arte pago Sunnyside. Só o `analista-referencia` lê `reference/sunflower-land/`; o resto da
   equipe usa as notas em `docs/referencia/`. Nunca copie código, constantes, números, nomes de
   itens, textos ou arte de lá.
2. **Servidor é a autoridade.** Toda regra de jogo é um reducer puro em `packages/game-core`,
   executado igual no cliente (otimista) e no servidor (decide). Sem `Date.now()` ou
   `Math.random()` em reducer.
3. **Números vêm da economia.** `economy/economy.csv` → gerador → `packages/game-core/src/data/`.
   Nenhum número inventado vira oficial sem registro em `docs/economia/decisoes.md`.
4. **Arte: os agentes produzem, o usuário só aprova.** Fluxo em
   `.claude/skills/art-approval-pipeline/SKILL.md`. Só assets com status `approved` em
   `art/manifest.json` entram no jogo.
5. **Blockchain só em testnet** até o usuário autorizar mainnet e haver auditoria externa.
6. **Não fazer commit, push, deploy ou gasto** sem pedido explícito do usuário.

## Stack (veja `docs/ARQUITETURA.md`)

Monorepo pnpm · TypeScript · `apps/client` (Vite + React + Tailwind + Phaser) ·
`apps/server` (Node + Postgres) · `packages/game-core` (regras compartilhadas) ·
`packages/contracts` (Foundry + OpenZeppelin) · `art/` (fontes e exports de arte) ·
`economy/` (planilha e simulador).

## Comandos (quando o scaffold existir)

- `pnpm -r test` · `pnpm -r typecheck` · `pnpm -r lint`
- Cliente: `pnpm --filter client dev`
- Contratos: `cd packages/contracts && forge test`
- Arte: scripts em `.claude/skills/{pixel-art-scripted,tilemap-phaser-tiled,create-game-assets}/scripts/`
  (Python 3.10+ e Pillow).

## Idioma

Docs, specs e comunicação com o usuário em português do Brasil. Código e identificadores em inglês.
Textos do jogo via i18n (`pt-BR`, `en`).
