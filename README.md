# NFT Farm Adventure

## Visão Geral

**NFT Farm Adventure** é um jogo NFT de farming casual que combina elementos de estratégia, gerenciamento de recursos e economia Web3. Os jogadores podem cultivar terras, coletar itens, negociar no marketplace e agora, **criar novos itens através do sistema de crafting**.

Este projeto foi desenvolvido utilizando **React**, **TypeScript**, **Node.js** com **tRPC** para o backend, e **MySQL/TiDB** com **Drizzle ORM** para o banco de dados. A autenticação é feita via Web3 (MetaMask e WalletConnect) e o jogo é integrado à **Base Network**.

## Funcionalidades Principais

- **Farming:** Cultive diversas plantas em suas terras NFT, com elementos de sorte e risco.
- **Inventário:** Gerencie seus itens coletados, com sistema de slots e categorias.
- **Marketplace:** Compre e venda itens com outros jogadores, com taxas de transação e economia de tokens HARVEST.
- **Crafting:** Crie novos itens a partir de receitas, utilizando ingredientes do seu inventário. Acompanhe o progresso e colete seus produtos.

## Sistema de Crafting (Fase 10)

O sistema de crafting permite que os jogadores transformem itens básicos em itens mais avançados ou valiosos. Ele inclui:

- **Receitas:** Definição de ingredientes, tempo de crafting, custo (opcional) e item de saída.
- **Jobs de Crafting:** Gerenciamento de processos de criação em andamento, com status, tempo restante e chance de sucesso.
- **Interface Dedicada:** Uma página e um painel intuitivos para visualizar receitas, iniciar novos jobs e acompanhar os existentes.

Para mais detalhes sobre o sistema de crafting, consulte:
- [API de Crafting](./CRAFTING_API.md)
- [Otimizações e Boas Práticas de Crafting](./CRAFTING_OPTIMIZATION.md)
- [Guia de Início Rápido do Crafting](./CRAFTING_QUICKSTART.md)

## Estrutura do Projeto

```
nft-farm-game/
├── client/             # Frontend (React, TypeScript, TailwindCSS)
│   ├── public/
│   ├── src/
│   │   ├── _core/      # Hooks e utilitários core
│   │   ├── components/ # Componentes de UI (incluindo CraftingPanel)
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/      # Páginas (Home, Farming, Inventory, Marketplace, Crafting)
├── server/             # Backend (Node.js, tRPC)
│   ├── _core/          # Core do servidor
│   ├── routers/        # Routers tRPC (farming, inventory, marketplace, crafting)
│   ├── crafting.ts     # Lógica de negócio do crafting
│   ├── db.ts           # Conexão com banco de dados
│   ├── farming.ts      # Lógica de negócio do farming
│   ├── inventory.ts    # Lógica de negócio do inventário
│   ├── marketplace.ts  # Lógica de negócio do marketplace
│   └── seed-recipes.mjs # Script para popular receitas de crafting
├── shared/             # Código compartilhado entre frontend e backend
├── drizzle/            # Configuração e schema do Drizzle ORM
├── DATABASE_SCHEMA.md  # Documentação do esquema do banco de dados
├── DESIGN_SYSTEM.md    # Documentação do sistema de design
├── GAME_DESIGN.md      # Documentação do design do jogo
├── SMART_CONTRACTS.md  # Documentação dos smart contracts
├── UI_WIREFRAMES.md    # Wireframes da interface do usuário
├── todo.md             # Lista de tarefas do projeto
└── README.md           # Este arquivo
```

## Como Rodar o Projeto

### Pré-requisitos

- Node.js (v18 ou superior)
- pnpm (gerenciador de pacotes)
- MySQL/TiDB (ou Docker para ambiente de desenvolvimento)

### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd nft-farm-game
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example` (se existir) ou com as seguintes variáveis:

```env
DATABASE_URL="mysql://user:password@host:port/database"
# Outras variáveis de ambiente necessárias para Web3 Auth, etc.
```

### 3. Instalar Dependências

```bash
pnpm install
```

### 4. Configurar Banco de Dados

Execute as migrações para criar as tabelas:

```bash
pnpm run db:migrate
```

Popule o banco de dados com dados iniciais (opcional, mas recomendado para testes):

```bash
node server/seed-crops.mjs # Seed de cultivos
node server/seed-recipes.mjs # Seed de receitas de crafting
```

### 5. Iniciar o Servidor de Desenvolvimento

```bash
pnpm run dev
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:3000`.

## Testes

Para executar os testes unitários e de integração:

```bash
pnpm test
```

## Contribuição

Contribuições são bem-vindas! Siga o padrão de código existente e abra Pull Requests para novas funcionalidades ou correções.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## Contato

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

---

**Autor:** Manus AI
**Última Atualização:** 25 de Fevereiro de 2026
**Versão:** 1.0.0


---

# Equipe de agentes — jogo de fazenda NFT

Kit para Claude Code: **16 agentes** especializados + **25 skills** (17 do
[awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills),
Apache-2.0, e 8 escritas para este projeto) + docs iniciais do jogo.

## Instalação

1. Copie todo o conteúdo desta pasta para a raiz do repositório do jogo (inclusive `.claude/`).
2. Clone a referência (só leitura, fica fora do git):
   `bash scripts/sync-reference.sh`
3. Para os scripts de arte: Python 3.10+ e `pip install "Pillow>=10,<14"`.
4. Abra o Claude Code na raiz e peça, por exemplo:
   *"produtor, comece a Fase 0 do roadmap"*.
   Veja os agentes com `/agents`.

## A equipe

| Área | Agente | Skills |
|---|---|---|
| Liderança | `produtor` | router, game-docs, prototype-fast, art-approval-pipeline |
| Referência | `analista-referencia` | sfl-reference-cleanroom |
| Design | `game-designer` | game-docs, farming-sim-loop, survival-crafting, rpg, level-design, dialogue-systems |
| Design | `economista-tokenomics` | web3-game-economy, farming-sim-loop |
| Engenharia | `dev-game-logic` | server-authoritative-game-logic, save-systems, farming-sim-loop |
| Engenharia | `dev-phaser` | phaser-core, phaser-arcade-physics, tilemap-phaser-tiled, camera-systems, input-systems, game-feel, performance-optimization |
| Engenharia | `dev-ui-react` | game-ui-ux, game-feel |
| Engenharia | `dev-blockchain` | web3-nft-integration |
| Arte | `diretor-de-arte` | create-game-assets, art-approval-pipeline, pixel-art-scripted, tilemap-phaser-tiled |
| Arte | `artista-icones-ui` | pixel-art-scripted, create-game-assets, art-approval-pipeline, game-ui-ux |
| Arte | `artista-tilemaps` | tilemap-phaser-tiled, pixel-art-scripted, level-design, create-game-assets, art-approval-pipeline |
| Arte | `artista-personagens` | pixel-art-scripted, create-game-assets, art-approval-pipeline |
| Arte | `artista-objetos-construcoes` | pixel-art-scripted, create-game-assets, art-approval-pipeline |
| Arte | `animador` | pixel-art-scripted, game-feel, phaser-core, art-approval-pipeline, create-game-assets |
| Áudio | `designer-de-audio` | audio-design |
| Qualidade | `qa-seguranca` | server-authoritative-game-logic, web3-nft-integration, performance-optimization |

## Como a arte funciona (você só aprova)

1. O `diretor-de-arte` cria guia de estilo, paleta e um **alvo visual** (1 personagem, 3 tiles,
   3 ícones num mini-mapa).
2. Os artistas produzem por script (grade de pixels + paleta travada → PNG), passam no QA técnico
   automático e montam uma **prancha de revisão** em `art/review/<lote>/`.
3. O diretor revisa a coesão; só lotes bons chegam a você.
4. O `produtor` te mostra a prancha (e o preview do mapa, no caso de tilemaps). Você responde
   **"aprovado"** ou **"reprovado: <motivo>"**. Reprovados são refeitos pelos agentes.
5. Só o que você aprovou entra no jogo.

Ferramentas incluídas: `pixel_from_grid.py` (sprites/ícones/tiles), `ascii_to_tiled.py`
(mapa ASCII → Tiled JSON), `render_tilemap_preview.py` (mapa → PNG com colisão),
`asset_report.py` e `build_preview_sheet.py` (QA e pranchas). Se você conectar um gerador de
imagens ao Claude Code, os artistas podem usá-lo para conceitos, sempre normalizando para a
grade e a paleta.

## Sobre o Sunflower Land (importante)

O repositório do Sunflower Land é público, mas **não tem licença open source**
(`"license": "UNLICENSED"` no `package.json`) e a arte vem do pack pago *Sunnyside*. Por isso
este kit **não faz fork** dele: o `analista-referencia` estuda o código e escreve notas de
funcionalidade com palavras próprias (`docs/referencia/`), e a equipe constrói tudo do zero com
arquitetura própria. Já existe um mapa inicial em `docs/referencia/00-mapa-funcionalidades-sfl.md`.

## Créditos

Skills de `awesome-gamedev-agent-skills` © Abhishek Barali e contribuidores, Apache-2.0
(`.claude/skills/LICENSE-awesome-gamedev-agent-skills`, `NOTICE-…`), copiadas sem alterações do
commit `c6ca6c4`. Skills próprias: `sfl-reference-cleanroom`, `server-authoritative-game-logic`,
`web3-nft-integration`, `web3-game-economy`, `farming-sim-loop`, `art-approval-pipeline`,
`pixel-art-scripted`, `tilemap-phaser-tiled`.
