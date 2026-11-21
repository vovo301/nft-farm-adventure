# NFT Farm Adventure

Jogo de fazenda social em pixel art no navegador, com posse de itens on-chain (NFT) em **Base Sepolia** (testnet). O código anterior (Harvest Realm) está arquivado em `legacy/` só para consulta.

Decisões, arquitetura e roadmap: `docs/ARQUITETURA.md`, `docs/GDD.md`, `docs/ROADMAP.md`.

## Equipe de agentes

Kit para Claude Code: **16 agentes** especializados + **25 skills** (17 do
[awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills),
Apache-2.0, e 8 escritas para este projeto) + docs iniciais do jogo.

### Instalação

1. Copie todo o conteúdo desta pasta para a raiz do repositório do jogo (inclusive `.claude/`).
2. Clone a referência (só leitura, fica fora do git):
   `bash scripts/sync-reference.sh`
3. Para os scripts de arte: Python 3.10+ e `pip install "Pillow>=10,<14"`.
4. Abra o Claude Code na raiz e peça, por exemplo:
   *"produtor, comece a Fase 0 do roadmap"*.
   Veja os agentes com `/agents`.

### A equipe

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

### Como a arte funciona (você só aprova)

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

### Sobre o Sunflower Land (importante)

O repositório do Sunflower Land é público, mas **não tem licença open source**
(`"license": "UNLICENSED"` no `package.json`) e a arte vem do pack pago *Sunnyside*. Por isso
este kit **não faz fork** dele: o `analista-referencia` estuda o código e escreve notas de
funcionalidade com palavras próprias (`docs/referencia/`), e a equipe constrói tudo do zero com
arquitetura própria. Já existe um mapa inicial em `docs/referencia/00-mapa-funcionalidades-sfl.md`.

### Créditos

Skills de `awesome-gamedev-agent-skills` © Abhishek Barali e contribuidores, Apache-2.0
(`.claude/skills/LICENSE-awesome-gamedev-agent-skills`, `NOTICE-…`), copiadas sem alterações do
commit `c6ca6c4`. Skills próprias: `sfl-reference-cleanroom`, `server-authoritative-game-logic`,
`web3-nft-integration`, `web3-game-economy`, `farming-sim-loop`, `art-approval-pipeline`,
`pixel-art-scripted`, `tilemap-phaser-tiled`.
