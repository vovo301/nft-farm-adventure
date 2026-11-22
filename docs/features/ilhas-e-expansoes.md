# Ilhas e expansões

**Status:** especificada · **Atualizado:** 2026-11-22 · [GDD](../GDD.md) · ids: [ilhas-e-expansoes-ids.md](ilhas-e-expansoes-ids.md) · moeda premium: [diamantes.md](diamantes.md)

O jogador começa num pedaço pequeno de terra e vê a fazenda crescer bloco a bloco. Cada expansão
revela um bloco novo com canteiros, árvores, pedras e minérios, e tudo na ilha fica pronto para
coletar na hora (o "momento uau"). Os recursos coletados pagam as próximas expansões. Ao completar
uma ilha, abre-se a travessia para a próxima: são 4 ilhas em sequência, cada uma com tema,
culturas, frutas e minério próprios. Serve aos pilares 1 (sempre há algo pronto ao voltar) e 2
(layout livre: a fazenda é a cara do jogador).

> Sala limpa: ilhas, recursos, culturas e textos são nossos. A estrutura de blocos é **1:1 com a
> tabela de expansões do usuário** (decisão em `docs/ARQUITETURA.md`, exceção da regra 1). Todos os
> números (Gold, Diamantes, materiais, tempo, nível, idade de conta, nós por bloco) moram em
> `economy/expansions.csv` (economista; registro em `docs/economia/decisoes.md`, v2.1). Esta spec
> descreve o que cada bloco traz **qualitativamente** e não repete valores.

## Objetivo para o jogador

- Curto prazo: "falta pouco para o próximo bloco" (barra de materiais na placa do bloco).
- Médio prazo: desbloquear a próxima cultura, fruta ou minério.
- Longo prazo: completar as 4 ilhas; a ilha cheia é o marcador social de progresso nas visitas.

## Loop

1. Coletar recursos e colher culturas nos blocos já revelados.
2. Abrir a placa do próximo bloco (borda da terra revelada): ver requisitos (Gold, Diamantes,
   materiais, nível, idade de conta) e o que o bloco traz.
3. Pagar e iniciar a obra; um timer aparece sobre o bloco.
4. Voltar quando a obra termina e tocar em **Revelar**: o bloco aparece com nós novos, todos os nós
   da fazenda reabastecem e as culturas/recursos novos entram na loja.
5. (Opcional) Entrar no modo paisagismo e reorganizar.
6. Depois do último bloco de uma ilha, pagar a **travessia** (custo próprio da ilha seguinte) e
   seguir para o bloco `_01` dela.

## As 4 ilhas

O mundo é um **arquipélago contínuo**: o jogador não troca de ilha nem perde o layout; as ilhas
anteriores continuam dele e ele navega entre elas pelo mapa (câmera/atalho). [ASSUMPTION] Difere de
propósito da referência, onde a troca de ilha guarda tudo no inventário.

**Identidade visual — estilo C, pintado semirrealista** (decisão do usuário; produção em vetor por
script, sem IA): proporções reais (árvores com copa irregular e tronco fino, nada de formas
"bolinha"), texturas sugeridas por pinceladas e manchas, paleta terrosa dessaturada, luz de fim de
tarde com **sombras longas** na grade isométrica. Cada ilha varia matiz e luz, nunca o estilo.

| # | id | Nome | Tema | Identidade visual (estilo C, para o diretor de arte) | Conteúdo exclusivo |
|---|---|---|---|---|---|
| 1 | `homestead` | **Ilha Morada** | o sítio de partida: grama, cercas de madeira, riacho | Verde-oliva, marrom-terra e palha; céu claro levemente enevoado. Casa de madeira com telhado de telha gasta, cercas de estaca irregulares, riacho raso com seixos e musgo. Luz da manhã, sombras médias. Leitura "trabalho honesto, começo de tudo". | culturas básicas e as 5 primeiras médias; `driftwood`, `flint`, `rustite`, `glintstone` |
| 2 | `breezewood` | **Bosque da Brisa** | pomar de colinas ventosas, flores e cata-ventos | Verde-sálvia, lavanda acinzentada e creme. Colinas com capim alto inclinado pelo vento, pomar em fileiras, cata-ventos de madeira e lona, cristais leitosos entre raízes. Luz difusa, sombras suaves. Leitura "primavera fresca". | frutas `bellpear` e `mistplum`; minério `dewquartz`; culturas `bluepod`, `frillhead`, `sunbulb`, `silkpod`, `crownbloom` |
| 3 | `ochremesa` | **Mesa Ocre** | planalto de argila em camadas, cânions e palmeiras | Ocre, terracota e areia, com turquesa só no oásis. Paredões estratificados com erosão visível, potes de barro rachados, tamareiras de tronco escamado, poeira dourada. Sol baixo, sombras longas e duras. Leitura "calor, tesouro escondido". | fruta `honeydate`; minério `sandglint`; culturas `sandspud`, `duneroot`, `miragemelon`, `starthistle` |
| 4 | `emberpeak` | **Pico Brasa** | encosta de vulcão adormecido, rios de brasa fria | Grafite, basalto e cinza quente, laranja-brasa só nos veios; verde-musgo nas fendas. Rocha porosa, fumaça rente ao chão, figueiras retorcidas com frutos que brilham de leve. Crepúsculo, contraluz. Leitura "perigo bonito, fim de jornada". | fruta `firefig`; minério `cinderite`; culturas `cinderpod`, `ashbloom`, `magmabulb`, `embercrown` |

### Distribuição dos 65 blocos

| Ilha | Blocos | Ritmo |
|---|---|---|
| `homestead` | 7 (o `_01` é o terreno inicial grátis) | Onboarding: obras de segundos a horas, só materiais básicos; blocos grandes de canteiros. |
| `breezewood` | 12 | Pomar e 1º cristal; obras de minutos a 1 dia; Diamantes a partir do `_03`. |
| `ochremesa` | 21 | Obras de horas a dias; Gold volta a pesar a partir do `_06`; Diamantes a partir do `_03`. |
| `emberpeak` | 25 | Obras longas e caras (até 3 d por bloco); Diamantes a partir do `_02`. |
| **Total** | **65** (64 expansões pagas + 3 travessias) | 1:1 com a tabela do usuário; `ref_blocks` e `note` em `expansions.csv` dão o mapeamento. |

## Sequência de blocos

Conteúdo **fixo por bloco** (todo jogador recebe o mesmo no mesmo estágio), posição livre (ver
Regras de colocação). "Adiciona" lista os **tipos** de nó, em negrito o primeiro de cada tipo;
contagens, custos e tempos: `economy/expansions.csv`. **D** = o bloco custa Diamantes (onde a
tabela do usuário tinha a moeda premium).

### Ilha Morada (`homestead`, 7)

| Bloco | Adiciona | Desbloqueia | D |
|---|---|---|---|
| `homestead_01` | **canteiros**, **árvores**, **pedras** (terreno inicial, 6 canteiros como hoje) | `mintleaf`, `dewcress`, `pebblepea`; `driftwood`, `flint` | grátis |
| `homestead_02` | canteiros, árvores, pedra, **nó de `rustite`** | `curlwort`, `sweetstalk`; minério `rustite` | — |
| `homestead_03` | lote grande de canteiros, árvore, pedra, `rustite`, **nó de `glintstone`** | `puffbean`, `redroot`; minério `glintstone` | — |
| `homestead_04` | lote grande de canteiros, árvore, pedra | `honeyleek` | — |
| `homestead_05` | canteiros, árvore, pedra, `rustite` | `stripemelon` | — |
| `homestead_06` | canteiros, árvore, pedra, `glintstone` | `glowgourd` | — |
| `homestead_07` | canteiros, `rustite` | fecha a ilha → travessia para o Bosque da Brisa | — |

### Bosque da Brisa (`breezewood`, 12)

| Bloco | Adiciona | Desbloqueia | D |
|---|---|---|---|
| `breezewood_01` | canteiros, árvores, pedras, `rustite`, `glintstone`, **pomar de `bellpear_tree`** | `bluepod`; fruta `bellpear` | — |
| `breezewood_02` | árvore, pedra, **`mistplum_tree`** | `frillhead`; fruta `mistplum` | — |
| `breezewood_03` | canteiros, árvore, pedra, **nó de `dewquartz`** | `sunbulb`; minério `dewquartz` | D |
| `breezewood_04` | canteiros, pedra, `rustite`, `glintstone`, `bellpear_tree` | — | D |
| `breezewood_05` | árvore, `mistplum_tree` | — | D |
| `breezewood_06` | `rustite`, `glintstone`, `bellpear_tree` | — | D |
| `breezewood_07` | canteiros, árvore, pedra, `mistplum_tree` | `silkpod` (1ª advanced) | D |
| `breezewood_08` | canteiros | — | D |
| `breezewood_09` | árvore, pedra, `rustite`, `mistplum_tree` | — | D |
| `breezewood_10` | canteiros, `bellpear_tree` | `crownbloom` | D |
| `breezewood_11` | canteiro, árvore, pedra, `rustite`, `dewquartz`, `mistplum_tree` | — | D |
| `breezewood_12` | canteiro, árvore, `glintstone` | fecha a ilha → travessia para a Mesa Ocre | D |

### Mesa Ocre (`ochremesa`, 21)

| Bloco | Adiciona | Desbloqueia | D |
|---|---|---|---|
| `ochremesa_01` | canteiro, pedra, `rustite`, **nó de `sandglint`** | minério `sandglint` | — |
| `ochremesa_02` | **`honeydate_palm`** | fruta `honeydate` | — |
| `ochremesa_03` | canteiros, `dewquartz` | `sandspud` | D |
| `ochremesa_04` | canteiros | — | D |
| `ochremesa_05` | árvore, pedra | — | D |
| `ochremesa_06` | canteiro, `rustite` | `duneroot` | D |
| `ochremesa_07` | canteiro, `honeydate_palm` | — | D |
| `ochremesa_08` | canteiros | — | D |
| `ochremesa_09` | árvore | — | D |
| `ochremesa_10` | canteiro, pedra | — | D |
| `ochremesa_11` | canteiro, `sandglint` | — | D |
| `ochremesa_12` | canteiro, árvore | `miragemelon` | D |
| `ochremesa_13` | canteiros | — | D |
| `ochremesa_14` | canteiro, `glintstone` | — | D |
| `ochremesa_15` | canteiro, `honeydate_palm` | — | D |
| `ochremesa_16` | árvore, pedra, `sandglint` | — | D |
| `ochremesa_17` | canteiro, `rustite` | — | D |
| `ochremesa_18` | árvore, `honeydate_palm` | `starthistle` | D |
| `ochremesa_19` | canteiro, `dewquartz` | — | D |
| `ochremesa_20` | canteiro | — | D |
| `ochremesa_21` | canteiro, pedra | fecha a ilha → travessia para o Pico Brasa | D |

### Pico Brasa (`emberpeak`, 25)

Mais da metade dos blocos daqui **não traz nó novo** (na tabela do usuário eles traziam nós
especiais, colmeias e flores, que ficaram fora do jogo; ver `note`). Eles valem como **terra
livre** para paisagismo e decoração. [ASSUMPTION] (pergunta 7)

| Bloco | Adiciona | Desbloqueia | D |
|---|---|---|---|
| `emberpeak_01` | **`firefig_tree`** | fruta `firefig` | — |
| `emberpeak_02` | **nó de `cinderite`** | minério `cinderite` | D |
| `emberpeak_03` · `_04` | terra livre | — | D |
| `emberpeak_05` | `glintstone` | `cinderpod` | D |
| `emberpeak_06` | `firefig_tree` | — | D |
| `emberpeak_07` · `_08` · `_09` | terra livre | — | D |
| `emberpeak_10` | `cinderite` | `ashbloom` | D |
| `emberpeak_11` | `sandglint` | — | D |
| `emberpeak_12` · `_13` · `_14` | terra livre | — | D |
| `emberpeak_15` | terra livre | `magmabulb` | D |
| `emberpeak_16` | `firefig_tree` | — | D |
| `emberpeak_17` | terra livre | — | D |
| `emberpeak_18` | `rustite` | — | D |
| `emberpeak_19` | `cinderite` | — | D |
| `emberpeak_20` | `dewquartz` | — | D |
| `emberpeak_21` … `_24` | terra livre | — | D |
| `emberpeak_25` | terra livre | `embercrown`; marco "arquipélago completo" | D |

## Recursos

| Papel | id | Onde aparece | Para que serve |
|---|---|---|---|
| material básico 1 | `driftwood` | árvores (`tree`) desde `homestead_01`, em blocos das ilhas 1–3 | expansões de todas as ilhas, ferramentas, construções |
| material básico 2 | `flint` | pedras (`flint_rock`) desde `homestead_01` | idem |
| minério comum | `rustite` | nós desde `homestead_02`, em todas as ilhas | expansões a partir de `homestead_05`, ferramentas de 2º nível |
| minério raro | `glintstone` | nós desde `homestead_03`, poucos por ilha | expansões a partir de `homestead_06`, **travessia para `breezewood`**, upgrades |
| minério da ilha 2 | `dewquartz` | nós desde `breezewood_03` (também em blocos das ilhas 3 e 4) | expansões da ilha 2 em diante, **travessia para `ochremesa`** |
| minério da ilha 3 | `sandglint` | nós desde `ochremesa_01` (também em `emberpeak_11`) | expansões das ilhas 3–4, **travessia para `emberpeak`** |
| minério da ilha 4 | `cinderite` | nós desde `emberpeak_02` | expansões finais (a partir de `emberpeak_05`), prestígio (candidato a NFT, fora deste escopo) |
| frutas | `bellpear`, `mistplum` (ilha 2), `honeydate` (ilha 3), `firefig` (ilha 4) | árvores frutíferas da própria ilha | venda, cozinha, pedidos de NPC. **Saem do custo de expansão** quando o economista trocar a conversão antiga (frutas) por Diamantes |
| moeda premium | `diamond` | ver [diamantes.md](diamantes.md) (origem a definir) | custo de expansão nos blocos **D**; demais usos na spec própria |

Regra de projeto: cada ilha exige nas suas expansões o minério **dela** + os das ilhas anteriores,
para que todo recurso antigo continue útil. Recarga, rendimento e ferramentas: spec de recursos
(pendente) e `economy.csv`.

## Culturas (23)

Tiers (decisão do usuário): **basic** 1 a 30 min · **medium** 1 h a 12 h · **advanced** 16 h a 48 h.
Preço, tempo e bloco de desbloqueio: `economy.csv` (coluna `unlock_block`, já na numeração de 65).

| # | id | Tier | Desbloqueio | Descrição |
|---|---|---|---|---|
| 1 | `mintleaf` | basic | `homestead_01` | Folhinha de hortelã que brota em minutos; a semente do tutorial. |
| 2 | `dewcress` | basic | `homestead_01` | Agrião que amanhece coberto de orvalho. |
| 3 | `pebblepea` | basic | `homestead_01` | Ervilha de vagem dura e redonda como seixo. |
| 4 | `curlwort` | basic | `homestead_02` | Erva de folhas enroladas, boa para temperos. |
| 5 | `puffbean` | basic | `homestead_03` | Feijão que estufa a vagem quando está pronto. |
| 6 | `sweetstalk` | medium | `homestead_02` | Caule doce de mastigar, colhido em feixes. |
| 7 | `redroot` | medium | `homestead_03` | Raiz vermelha e firme, base de sopas. |
| 8 | `honeyleek` | medium | `homestead_04` | Alho-poró de miolo adocicado. |
| 9 | `stripemelon` | medium | `homestead_05` | Melão de casca listrada, pesado e suculento. |
| 10 | `glowgourd` | medium | `homestead_06` | Cabaça que brilha de leve à noite. |
| 11 | `bluepod` | medium | `breezewood_01` | Vagem azul que balança ao vento do bosque. |
| 12 | `frillhead` | medium | `breezewood_02` | Cabeça de folhas franzidas como babado. |
| 13 | `sunbulb` | medium | `breezewood_03` | Bulbo dourado que vira a ponta para o sol. |
| 14 | `sandspud` | medium | `ochremesa_03` | Tubérculo de casca arenosa que aguenta a seca. |
| 15 | `silkpod` | advanced | `breezewood_07` | Casulo vegetal de fibra macia e brilhante. |
| 16 | `crownbloom` | advanced | `breezewood_10` | Flor comestível em forma de coroa. |
| 17 | `duneroot` | advanced | `ochremesa_06` | Raiz funda que cresce seguindo a areia. |
| 18 | `miragemelon` | advanced | `ochremesa_12` | Melão translúcido que parece tremular no calor. |
| 19 | `starthistle` | advanced | `ochremesa_18` | Cardo de flor em estrela, colhido com cuidado. |
| 20 | `cinderpod` | advanced | `emberpeak_05` | Vagem escura que amadurece no calor da rocha. |
| 21 | `ashbloom` | advanced | `emberpeak_10` | Flor cinzenta que só abre sobre solo vulcânico. |
| 22 | `magmabulb` | advanced | `emberpeak_15` | Bulbo com veios alaranjados, morno ao toque. |
| 23 | `embercrown` | advanced | `emberpeak_25` | A cultura mais rara do arquipélago; coroa de folhas em brasa. |

Remapeamento antigo → novo (mesmo ponto da progressão): breezewood 05→07, 07→10; ochremesa 01→03,
02→06, 04→12, 06→18; emberpeak 01→05, 02→10, 03→15, 05→25; demais iguais. `glowgourd` já está
como medium no `economy.csv`, com preço pendente de confirmação do usuário (pergunta 5).

## Regras

1. **Sequência fixa.** Os blocos se revelam na ordem da tabela; o próximo bloco é sempre o de menor
   número ainda não revelado. Não há escolha de qual bloco comprar. [ASSUMPTION]
2. **Uma obra por vez** por fazenda. Iniciar exige: obra anterior revelada; Gold, **Diamantes** e
   cada material suficientes; nível do avatar ≥ mínimo do bloco; idade da conta ≥ mínimo do bloco.
3. **Débito no início.** Ao iniciar, o servidor debita Gold, Diamantes e materiais e grava o início
   da obra (tempo vindo da ação validada, nunca `Date.now()` no reducer). Pronto = início + duração;
   é derivado, não guardado.
4. **Revelar** só com obra concluída. Efeitos, numa única ação atômica: adiciona ao inventário de
   nós os itens do bloco; posiciona-os num arranjo padrão dentro do bloco novo; **reabastece todos
   os nós de recurso da fazenda** (todas as ilhas); libera as culturas do bloco na loja de sementes.
5. **Travessia.** Depois do último bloco de uma ilha, a placa da próxima ilha pede o **custo de
   travessia** (linha `island` de `expansions.csv`: um minério da ilha atual). Pagar revela a borda
   da nova ilha e torna o bloco `_01` dela o próximo; o `_01` também tem idade mínima de conta.
6. **Acelerar obra:** proposta atual do economista é Gold com teto e proibido em obras longas; a
   decisão do usuário prevê Diamantes para "acelerar construções". Fica em aberto (pergunta 4).
   Nunca com token. [ASSUMPTION]
7. **Nada é perdido.** Ilhas anteriores continuam ativas; mudar de ilha não guarda nem reseta nada.
8. **Culturas** desbloqueadas podem ser plantadas em qualquer canteiro de qualquer ilha.
   [ASSUMPTION] (pergunta 2)
9. **Desbloqueios por contagem de blocos** (vagas de pedidos, construções) ficam numa única tabela
   de dados em `packages/game-core/src/data/`, nunca espalhados pelo código.

### Regras de colocação (layout livre)

1. Tudo que o bloco traz (canteiros, árvores, pedras, nós de minério, árvores frutíferas) é um item
   posicionável: pode ser movido para qualquer célula livre de **terra revelada**.
2. Nós comuns (`plot`, `tree`, `flint_rock`, `rustite_node`, `glintstone_node`) podem ir para
   qualquer ilha revelada. Nós de minério de ilha (`dewquartz_node`, `sandglint_node`,
   `cinderite_node`) podem ficar na ilha de origem **ou numa ilha posterior** (a tabela dá
   `dewquartz` e `sandglint` também em blocos das ilhas 3–4). As 4 árvores frutíferas só ficam na
   ilha de origem.
3. Colisão por footprint na grade isométrica da fazenda (tamanho de célula em `docs/ARQUITETURA.md`);
   não pode sobrepor, sair da terra revelada nem ocupar água.
4. Mover preserva o timer do nó e a cultura plantada no canteiro.
5. Nó guardado no inventário não pode ser coletado nem plantado.
6. **Modo paisagismo:** o jogador monta um rascunho do arranjo e confirma de uma vez; a validação
   checa "dentro da terra" separado de "sobreposição", para permitir trocar dois itens de lugar. A
   mesma validação roda no cliente e no servidor (`packages/game-core`).

### Anti-bot

Cada bloco tem, além de Gold, Diamantes e materiais (valores em `expansions.csv`):

- **nível mínimo do avatar** (XP vem de ações que não escalam bem com bot, como cozinha e pedidos);
- **idade mínima de conta** nos blocos `_01` das ilhas 2–4, para não premiar multicontas novas;
- **uma obra por vez** e duração real da obra (acelerar tem teto);
- recursos limitados pelo timer dos nós, autoritativo no servidor;
- Diamantes como custo: o efeito anti-bot depende da origem deles ([diamantes.md](diamantes.md)).

## Estados e erros

| Estado do bloco | O jogador vê |
|---|---|
| `locked` | silhueta em névoa; placa mostra só o nome da ilha |
| `available` | placa com requisitos e o que o bloco traz; botão "Expandir" |
| `building` | andaime + timer; botão "Acelerar" |
| `ready` | brilho + botão "Revelar" |
| `revealed` | terra normal, nós novos |

| Erro (rejeição do reducer) | Mensagem (i18n) |
|---|---|
| `expansion_in_progress` | "Já tem uma obra em andamento." |
| `not_next_block` | "Esse bloco ainda não está disponível." |
| `insufficient_gold` / `insufficient_diamond` / `insufficient_material` | "Faltam: …" (lista o que falta) |
| `crossing_required` | "Pague a travessia para chegar a esta ilha." |
| `level_too_low` | "Chegue ao nível N para expandir." |
| `account_too_new` | "Disponível em X dias de conta." |
| `not_ready` | "A obra termina em …" |
| `invalid_placement` | célula fica vermelha; confirmar desabilitado |
| `node_island_locked` | "Esse item não pode ficar nesta ilha." |

Casos de borda: revelar com inventário cheio (nós não ocupam espaço de mochila; sem falha);
fechar o jogo durante a obra (timer segue no servidor); dois cliques em "Expandir" (o 2º é
rejeitado por `expansion_in_progress`); save antigo sem ilhas (migração: fazenda atual vira
`homestead_01` revelado); save com blocos da numeração de 30 (não existe em produção; se existir em
dev/testnet, recriar o estado).

## UI necessária

- Placa do próximo bloco na borda (toque ≥ 44 px) com requisitos em barras "tenho/preciso",
  Diamantes com ícone próprio e atalho para "como conseguir" (depende de [diamantes.md](diamantes.md)).
- Painel de expansão: ícones do que o bloco traz e das culturas que libera.
- Timer de obra no mundo + no HUD; notificação quando ficar pronto.
- Animação de revelação (névoa abre, nós caem, todos os nós brilham "pronto").
- Mapa do arquipélago (4 ilhas, progresso X/N por ilha: 7/12/21/25, atalho de câmera).
- Modo paisagismo: arrastar, girar se houver, confirmar/cancelar, aviso de célula inválida.
- Tela de travessia (cartão da nova ilha com nome, tema e custo).

## Assets necessários (lista para a arte, estilo C)

- Tiles de terreno isométrico das 4 ilhas: chão, borda/costa, água, névoa de bloco bloqueado, com
  textura pintada e variações para não repetir.
- Cenário temático por ilha (cercas e riacho; capim ao vento e cata-ventos; paredões e potes;
  rocha porosa, veios e fumaça), com sombra longa coerente com a luz da ilha.
- Nós: `tree`, `flint_rock`, `rustite_node`, `glintstone_node`, `dewquartz_node`, `sandglint_node`,
  `cinderite_node` (cheio e esgotado). `tree` em variante por ilha se o diretor de arte quiser.
- Árvores frutíferas: `bellpear_tree`, `mistplum_tree`, `honeydate_palm`, `firefig_tree` (com e sem
  fruta).
- Ícones de item: 11 recursos + `diamond` + 23 culturas + 23 sementes.
- 4 estágios de crescimento para cada uma das 23 culturas (a arte antiga foi reprovada; tudo refeito
  no estilo C).
- Andaime de obra, placa de expansão, efeito de revelação, ponte/barco de travessia.
- Cartões das 4 ilhas (tela de travessia e mapa).

## Números necessários (pedido ao `economista-tokenomics`)

- **Coluna `cost_diamond`** em `expansions.csv` com o valor da moeda premium da tabela do usuário
  (hoje só na `note` como "gema N"), e remoção da conversão antiga em frutas.
- Teto e moeda de "acelerar obra" (após a pergunta 4).
- Recalibrar `min_level` (vai até 120) com a curva de XP.
- Recarga, rendimento e preço de venda por recurso; teto de canteiros total (hoje 65) contra o bot.

## Critérios de aceite

- [ ] Estado novo começa com só `homestead_01` revelado e as culturas `mintleaf`, `dewcress`,
  `pebblepea` na loja.
- [ ] Iniciar expansão sem Gold, Diamantes, material, nível ou idade suficientes é rejeitado e não
  altera o estado.
- [ ] Iniciar com tudo suficiente debita exatamente os custos de `expansions.csv` e grava o início.
- [ ] Iniciar uma segunda obra com outra em andamento é rejeitado.
- [ ] Revelar antes do fim é rejeitado; depois do fim adiciona exatamente os nós da linha do bloco
  e deixa todos os nós de recurso da fazenda prontos.
- [ ] Revelar `homestead_07` não libera `breezewood_01` até a travessia ser paga; depois dela,
  `breezewood_01` é o próximo bloco.
- [ ] Os dados têm 65 blocos (7/12/21/25) e cada cultura tem `unlock_block` existente.
- [ ] Toda cultura e todo recurso é alcançável: seguindo os blocos em ordem, cada material pedido
  por um bloco ou travessia já foi desbloqueado por um bloco anterior (teste de grafo nos dados).
- [ ] Colocação fora da terra revelada, em sobreposição, de árvore frutífera fora da ilha ou de
  minério de ilha numa ilha anterior é rejeitada; trocar dois itens de lugar é aceito.
- [ ] Mover canteiro plantado ou nó em recarga preserva o timer.
- [ ] Cliente e servidor produzem o mesmo estado para a mesma sequência de ações (reducer puro).
- [ ] Save antigo migra para `homestead_01` revelado sem perder canteiros, nós nem plantações.

## Perguntas abertas para o usuário

1. **Troca de ilha:** (a) arquipélago contínuo, nada se perde (recomendado); (b) como a referência,
   mudar de ilha guarda tudo e recomeça o layout.
2. **Culturas de ilha:** (a) plantáveis em qualquer canteiro depois de desbloqueadas (recomendado);
   (b) só na ilha de origem (mais identidade, mais atrito).
3. **Ordem dos blocos:** (a) sequência fixa (recomendado no MVP); (b) escolher entre 2 blocos
   adjacentes, com conteúdo fixo pelo número da expansão.
4. **Acelerar obra de expansão:** (a) só Gold, com teto (proposta atual do economista); (b) só
   Diamantes (como "acelerar construções" da decisão); (c) ambos; nunca token. Recomendo (c) com
   teto, se Diamantes puderem ser ganhos jogando.
5. **`glowgourd`:** medium (10 h) com semente 6,60 (recomendado, já no CSV) ou advanced (≥ 16 h)?
6. **Nomes das ilhas** (Ilha Morada, Bosque da Brisa, Mesa Ocre, Pico Brasa): aprovados?
7. **Blocos vazios do Pico Brasa** (15 dos 25 sem nó novo): (a) terra livre para decorar no MVP
   (recomendado); (b) preencher com conteúdo novo nosso (colmeias, flores, nós especiais) depois.

Perguntas sobre Diamantes (origem, on/off-chain, obrigatório nas expansões, VIP, leilão, restock):
[diamantes.md](diamantes.md#perguntas-abertas-para-o-usuário).

## Histórico

- 2026-11-22: especificada (4 ilhas, 30 blocos, 11 recursos, 23 culturas).
- 2026-11-22: 65 blocos 1:1 com a tabela do usuário (7/12/21/25), desbloqueios remapeados,
  travessia com custo próprio, Diamantes como custo de expansão, identidade visual no estilo C.
