# Arquitetura

Baseada no que funciona no Sunflower Land (React + Phaser + estado em máquina de estados +
servidor que revalida as ações), corrigindo a maior dor que o próprio repositório deles documenta:
a lógica do jogo existe **duplicada** no front e no back e precisa ser editada nos dois. Aqui ela
existe uma vez só.

```
repo/
├─ apps/
│  ├─ client/            Vite + React + TypeScript + Tailwind
│  │  ├─ src/game/       Phaser (cenas, mapas, sprites, câmera, input)
│  │  ├─ src/ui/         React (HUD, modais, inventário, lojas, carteira)
│  │  ├─ src/state/      store do jogo (xstate ou zustand) + fila de ações + autosave
│  │  └─ public/assets/  só arte/áudio APROVADOS
│  └─ server/            Node + TypeScript (Fastify) + Postgres
│     ├─ api/            /session, /state, /actions (lote), /withdraw, /marketplace
│     ├─ indexer/        escuta eventos on-chain (depósito, saque, transferências)
│     └─ signer/         assinatura EIP-712 de saques (chave em KMS)
├─ packages/
│  ├─ game-core/         GameState, reducers puros, dados gerados, PRNG, migrações
│  └─ contracts/         Foundry: Farm (ERC-721), Items (ERC-1155), Token (ERC-20, opcional)
├─ economy/              economy.csv, gerador de dados, simulador
├─ art/                  style-guide, source, export, review, manifest.json
├─ docs/                 GDD, features, referência, economia, arte, QA
└─ reference/            clone do Sunflower Land (gitignored, só leitura)
```

## Fluxo de uma ação

1. Jogador toca num plot → cena Phaser chama `dispatch({type:"crop.planted", payload, createdAt})`.
2. O store aplica o reducer do `game-core` localmente (resposta instantânea) e enfileira a ação.
3. A cada ~10 s (ou ao sair) o cliente envia o lote para `POST /actions`.
4. O servidor reaplica cada reducer sobre o estado salvo; se algo falha, rejeita o lote e devolve o
   estado canônico, que o cliente adota.

## Fluxo on-chain

Login com carteira (assinatura de mensagem → sessão). A fazenda é um ERC-721. Itens ficam no jogo
até o jogador sacar: servidor debita, assina EIP-712, jogador minta. Depósito: contrato trava/queima
e o indexador credita.

## Decisões do usuário

| Decisão | Escolha | Data |
|---|---|---|
| Nome (provisório) | **NFT Farm Adventure** | 2026-11-21 |
| Código anterior | Arquivado em `legacy/` (só consulta, fora do build); monorepo novo do zero | 2026-11-21 |
| Rede | **Base Sepolia** (testnet). Mainnet só com autorização + auditoria externa | 2026-11-21 |
| Versão do Phaser | **Phaser 4** | 2026-11-21 |
| Moedas | **Duas moedas.** (1) **Gold Coin**: off-chain, moeda de troca do jogo (sementes, expansões, construções, upgrades de construções); preços definidos pela economia. (2) **Token de governança** (ERC-20): negociado entre jogadores no marketplace, comprável em exchange e depositável no jogo; preço livre por oferta e demanda | 2026-11-22 |
| Preços das culturas (em Gold) | Mais barata: compra 0,01 Gold, lucro 100%. Mais cara: compra 10 Gold, lucro ~30%. Intermediárias definidas pelo economista dentro desse intervalo, com economia sustentável | 2026-11-22 |
| Direção de arte | **Isométrica, cartoon colorida** (estilo "isometric cartoon farm"), não pixel art. Exemplos de referência enviados pelo usuário em 2026-11-22 (só direção de estilo, sem copiar assets de terceiros) | 2026-11-22 |
| Método de produção de arte | **Vetor por script** (SVG gerado por código → PNG), inclusive o conceito/alvo visual. **Sem geradores de imagem por IA** e sem gasto de créditos | 2026-11-22 |
| Culturas | **23 culturas**: 5 básicas (1 a 30 min), 9 médias (1 h a 12 h), 9 avançadas (16 h a 48 h). Valores das 6 culturas da proposta v1 aprovados como "dentro do esperado" | 2026-11-22 |
| Mundo e expansões | Terreno cresce por **expansões** (blocos revelados em sequência, cada um com mais canteiros, árvores, pedras e minérios; recursos coletados pagam as próximas). Mundo com **4 ilhas/biomas** em sequência, com conteúdo novo (árvores frutíferas, novos minérios). Estrutura e curva inspiradas na referência enviada pelo usuário; nomes, temas e números próprios (regra 1) | 2026-11-22 |

## Decisões em aberto (do usuário)

| Decisão | Opções | Recomendação inicial |
|---|---|---|
| Relação token ↔ Gold | token compra Gold? Gold vira token? só marketplace? | A definir antes da Fase 3 |
| Saldos da testnet na Fase 2 | zerar / recalibrar | Adiada pelo usuário |
| Login de não-cripto | só carteira / carteira embutida (social login) | Carteira embutida para crescer |
