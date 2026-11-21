---
name: sfl-reference-cleanroom
description: >
  Como estudar o repositório do Sunflower Land como REFERÊNCIA de funcionalidades, sem copiar código
  ou arte. Use ao pesquisar como uma mecânica do SFL funciona, ao montar um mapa de features, ou
  antes de especificar um sistema "igual ao do Sunflower Land".
---

# Referência Sunflower Land em sala limpa (clean room)

O repositório `sunflower-land/sunflower-land` é público, mas **não é open source**: o
`package.json` declara `"license": "UNLICENSED"` (todos os direitos reservados), e a arte vem do
pack pago *Sunnyside* do Daniel Diggle, que nem está no repo. Ler para entender é permitido; copiar
código, dados, textos, nomes de itens ou arte para o nosso jogo não é.

## Regras

1. **Só o `analista-referencia` lê o clone** em `reference/sunflower-land/` (somente leitura, no
   `.gitignore`). Os outros agentes trabalham a partir das notas dele.
2. **A saída é uma nota de funcionalidade, nunca código.** Descreva *o que* o sistema faz e *por
   quê* (loop, entradas, saídas, timers, sinks/sources, edge cases), com suas próprias palavras.
3. **Nada de identificadores do SFL** no nosso código: nomes de itens (Sunflower, Bumpkin, Goblin,
   SFL, FLOWER…), nomes de eventos, constantes, números de balanceamento e textos de UI.
   Nossos números saem da planilha do `economista-tokenomics`, não do SFL.
4. **Caminho de referência vale; trecho não.** Na nota, cite o arquivo onde olhar
   (ex.: `src/features/game/events/landExpansion/plant.ts`) sem colar o conteúdo.
5. **Arte:** nunca use, trace ou faça "inspired-by" pixel a pixel de sprites do SFL/Sunnyside.
   Estilo geral (pixel art top-down, 16 px) não é protegido; assets específicos são.

## Mapa rápido do repo (para achar as coisas)

| Assunto | Onde olhar |
|---|---|
| Regras do repo, paridade FE/BE, convenções | `CLAUDE.md`, `AGENTS.md` |
| Estado do jogo (formato do save) | `src/features/game/types/game.ts` |
| Ações do jogador (~500 reducers) | `src/features/game/events/landExpansion/` |
| Dados de itens (culturas, frutas, animais, construções, ferramentas…) | `src/features/game/types/*.ts` |
| Máquina de estados do jogo/sessão (xstate) | `src/features/game/lib/gameMachine.ts`, `src/features/auth/` |
| Boosts e ordem de aplicação | `src/features/game/types/boosts.ts`, `lib/boostWindows.ts` |
| Cenas Phaser (mundo, NPCs, plaza) | `src/features/world/` |
| Carteira e contratos (Polygon/Base, viem/wagmi) | `src/lib/blockchain/`, `src/features/wallet/` |
| Marketplace | `src/features/marketplace/` |
| Design system da UI | `docs/DESIGN_SYSTEM.md`, `docs/UI_DESIGN_GUIDE.md` |
| API off-chain | `docs/OFFCHAIN_API.md`, `docs/openapi.json` |

## Formato da nota (`docs/referencia/<sistema>.md`)

```markdown
# <Sistema> — nota de referência
Fonte: SFL @ <commit curto>, arquivos: <caminhos>
## O que o jogador faz
## Regras observadas (em palavras nossas)
## Timers / custos / recompensas (apenas a FORMA: "cresce em X horas", "custo sobe por nível")
## Por que funciona (retenção, sink, social)
## O que faremos diferente
```

Atualize o clone com `scripts/sync-reference.sh` e anote o commit em cada nota.
