# Roadmap

Uma mudança visível por vez. O `produtor` atualiza este arquivo a cada entrega.

## Fase 0 — Fundação (semana 1–2)
- [x] Decisões do usuário: NFT Farm Adventure · Base Sepolia · Phaser 4 · código antigo em `legacy/` (`docs/ARQUITETURA.md`)
- [x] `analista-referencia`: notas de plantio, recursos, cozinha, expansão, pedidos (`docs/referencia/01–05`, SFL @ 4e3606f)
- [~] `diretor-de-arte`: guia de estilo + paleta + **alvo visual** → aprovação do usuário (lote entregue, aguardando aprovação)
- [x] `dev-game-logic`: scaffold do monorepo, `game-core` com `GameState` v1 e testes (67 testes verdes; números ainda placeholder)
- [x] `economista-tokenomics`: `economy.csv` v0 (4 culturas, 2 recursos) + simulador (proposta aguardando aprovação)

## Fase 1 — Fazenda jogável off-chain (semana 3–6)
- [ ] `artista-tilemaps`: tileset base + mapa da fazenda inicial → aprovação
- [ ] `artista-objetos-construcoes`: 4 culturas × estágios, árvore, pedra → aprovação
- [ ] `artista-icones-ui`: ícones de itens + painéis/botões → aprovação
- [ ] `artista-personagens` + `animador`: avatar base, andar/idle → aprovação
- [ ] `dev-phaser`: cena da fazenda, plots, colheita com feedback
- [ ] `dev-ui-react`: HUD, inventário, loja
- [ ] `dev-game-logic`: servidor + autosave em lote
- [ ] `qa-seguranca`: rodada de exploits na economia
- [ ] `designer-de-audio`: SFX do núcleo

## Fase 2 — Retenção (semana 7–10)
Cozinha + XP, pedidos de NPC, tarefas diárias, expansão de terreno, decoração livre.

## Fase 3 — Web3 em testnet (semana 11–14)
Login com carteira, NFT da fazenda, saque/depósito de 1 tipo de item, auditoria interna.

## Fase 4 — Alpha fechado
Marketplace, primeira temporada, facções. **Antes de mainnet:** auditoria externa e parecer jurídico.

## Riscos
- Jurídico/regulatório de token e venda de NFT (CVM, Lei 14.478/2022) → advogado antes de vender.
- Bots e farms de contas → anti-bot no desenho da economia desde a Fase 1.
- Direitos autorais → sala limpa (nada do SFL/Sunnyside).
