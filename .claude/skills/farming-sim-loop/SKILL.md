---
name: farming-sim-loop
description: >
  Gênero fazenda idle/social em navegador (estilo farming sim Web3): loop plantar-esperar-colher-
  vender, recursos (árvore, pedra, minérios), animais, cozinha/crafting, pedidos de NPC, expansão
  de terreno, avatar com wearables, eventos sazonais e social. Use para desenhar ou implementar
  qualquer desses sistemas ou para priorizar o MVP.
---

# Loop de fazenda idle/social

Combine com `survival-crafting` (receitas e árvore de tecnologia), `rpg` (itens, raridade) e
`web3-game-economy` (números).

## Loops

- **Núcleo (minutos):** plantar → timer → colher → vender/estocar. Cada lote cabe numa sessão
  curta. Mostre o timer no mundo (barra/ícone) e permita colher em massa depois.
- **Médio (horas/dias):** recursos com recarga (árvore→madeira, pedra, ferro, ouro), animais que
  precisam ser alimentados, cozinha que transforma colheita em comida (XP do avatar), pedidos de
  NPC (entrega X por Y) e tarefas diárias.
- **Longo (semanas):** expansão de terreno, construções que desbloqueiam receitas, árvore de
  habilidades do avatar, temporadas/capítulos com itens e loja temporários, colecionáveis com boost.
- **Social:** visitar fazendas, ajudar/curtir, facções/guildas, marketplace entre jogadores,
  ranking de temporada.

## Ordem de MVP sugerida

1. Grid da fazenda + plantar/colher 4 culturas + vender por moeda soft (tudo off-chain).
2. Inventário, loja de sementes, save no servidor (autoritativo).
3. Recursos (árvore/pedra) + ferramentas consumíveis (primeiro sink).
4. Cozinha + XP/nível do avatar + desbloqueios por nível.
5. Pedidos de NPC + tarefas diárias (retenção).
6. Expansão de terreno + colocação livre de decorações.
7. Login com carteira + NFT da fazenda (testnet) + saque de 1 tipo de item.
8. Marketplace, temporadas, facções.

## Regras de design

- Toda espera tem uma decisão antes (o que plantar) e uma recompensa depois (feedback de colheita
  com `game-feel`).
- Boosts são itens visíveis no mapa (colecionáveis com área de efeito), não números escondidos.
- Grid fixo (ex.: 16 px por tile) para colocação; colisão de construções por footprint.
- Mobile primeiro: toque, alvos ≥ 44 px, UI em React por cima do canvas Phaser.
