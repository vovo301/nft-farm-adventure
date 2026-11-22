# Ilhas e expansões

**Status:** especificada · **Atualizado:** 2026-11-22 · [GDD](../GDD.md) · ids: [ilhas-e-expansoes-ids.md](ilhas-e-expansoes-ids.md)

O jogador começa num pedaço pequeno de terra e vê a fazenda crescer bloco a bloco. Cada expansão
revela um bloco novo com canteiros, árvores, pedras e minérios, e tudo na ilha fica pronto para
coletar na hora (o "momento uau"). Os recursos coletados pagam as próximas expansões. Ao completar
uma ilha, abre-se a travessia para a próxima: são 4 ilhas em sequência, cada uma com tema,
culturas, frutas e minério próprios. Serve aos pilares 1 (sempre há algo pronto ao voltar) e 2
(layout livre: a fazenda é a cara do jogador).

> Sala limpa: ilhas, recursos, culturas e textos são nossos. A **forma** da curva (custos e tempos
> crescentes, materiais que migram de básicos para raros) segue a nota
> `docs/referencia/04-expansao.md`; os números vêm de `economy/economy.csv` (economista, a partir de
> `docs/referencia/equilibrio-expansoes.md`). Esta spec não define preço nem tempo.

## Objetivo para o jogador

- Curto prazo: "falta pouco para o próximo bloco" (barra de materiais na placa do bloco).
- Médio prazo: desbloquear a próxima cultura ou o próximo minério.
- Longo prazo: completar as 4 ilhas; a ilha cheia é o marcador social de progresso nas visitas.

## Loop

1. Coletar recursos e colher culturas nos blocos já revelados.
2. Abrir a placa do próximo bloco (borda da terra revelada): ver requisitos (Gold, materiais,
   nível, idade de conta) e o que o bloco traz.
3. Pagar e iniciar a obra; um timer aparece sobre o bloco.
4. Voltar quando a obra termina e tocar em **Revelar**: o bloco aparece com nós novos, todos os nós
   da fazenda reabastecem e as culturas/recursos novos entram na loja.
5. (Opcional) Entrar no modo paisagismo e reorganizar.
6. No último bloco de uma ilha, a revelação abre a **travessia** para a ilha seguinte, cujo
   primeiro bloco é a próxima expansão.

## As 4 ilhas

O mundo é um **arquipélago contínuo**: o jogador não troca de ilha nem perde o layout; as ilhas
anteriores continuam dele e ele navega entre elas pelo mapa (câmera/atalho). [ASSUMPTION] Difere de
propósito da referência, onde a troca de ilha guarda tudo no inventário.

| # | id | Nome | Tema | Identidade visual (para o diretor de arte) | Conteúdo exclusivo |
|---|---|---|---|---|---|
| 1 | `homestead` | **Ilha Morada** | o sítio de partida: grama, cercas de madeira, riacho | Verde-folha e marrom-terra, céu claro. Casinha de telhado vermelho, cercas tortas, riacho raso com pedras redondas. Leitura "aconchego, começo de tudo". | culturas básicas e as 5 primeiras médias; `driftwood`, `flint`, `rustite`, `glintstone` |
| 2 | `breezewood` | **Bosque da Brisa** | pomar de colinas ventosas, flores e cata-ventos | Lilás, rosa-claro e verde-menta. Colinas arredondadas, cata-ventos de pano, pétalas soltas no ar, cristais azulados brotando entre raízes. Leitura "primavera leve". | frutas `bellpear` e `mistplum`; minério `dewquartz`; culturas `bluepod`, `frillhead`, `sunbulb`, `silkpod`, `crownbloom` |
| 3 | `ochremesa` | **Mesa Ocre** | planalto de argila em camadas, cânions e palmeiras | Ocre, terracota e turquesa (oásis). Paredões listrados em camadas, potes de barro, palmeiras finas, brilho dourado na areia. Leitura "calor, sol baixo, tesouro". | fruta `honeydate`; minério `sandglint`; culturas `sandspud`, `duneroot`, `miragemelon`, `starthistle` |
| 4 | `emberpeak` | **Pico Brasa** | encosta de vulcão adormecido, rios de brasa fria | Grafite, laranja-brasa e verde-musgo nas fendas. Rocha escura com veios incandescentes, fumaça suave, figueiras retorcidas com frutos luminosos. Leitura "perigo bonito, fim de jornada". | fruta `firefig`; minério `cinderite`; culturas `cinderpod`, `ashbloom`, `magmabulb`, `embercrown` |

### Distribuição dos 30 blocos

| Ilha | Blocos | Por quê |
|---|---|---|
| `homestead` | 10 (o 1º é o terreno inicial grátis) | Onboarding: blocos rápidos e baratos em materiais básicos; muitos blocos curtos = muitos "momentos uau" nos primeiros dias, quando a retenção é decidida. |
| `breezewood` | 8 | Primeira ilha temática; ainda densa em novidade (2 frutas, 1 minério, 5 culturas). |
| `ochremesa` | 7 | Obras em horas; menos blocos porque cada um demora mais. |
| `emberpeak` | 5 | Obras longas e caras; poucos blocos de prestígio, cada um com uma cultura advanced. |
| **Total** | **30** (29 expansões pagas) | Total pedido pelo usuário (~30). O economista pode redistribuir ao mapear a curva da referência; os ids seguem o padrão `<ilha>_NN`. |

## Sequência de blocos

Conteúdo **fixo por bloco** (todo jogador recebe o mesmo no mesmo estágio), mas a posição dos nós
é livre (ver Regras de colocação). Contagens são proposta qualitativa [ASSUMPTION]: o economista
ajusta ao mapear a curva da referência. Custo e tempo de toda linha: **ver `economy.csv`**.

### Ilha Morada (`homestead`)

| Bloco | Adiciona | Desbloqueia | Custo/tempo |
|---|---|---|---|
| `homestead_01` | 6 canteiros, 3 árvores, 2 pedras (terreno inicial, igual ao jogo atual) | `mintleaf`, `dewcress`, `pebblepea`; `driftwood`, `flint` | grátis |
| `homestead_02` | +2 canteiros, +1 árvore | `curlwort`, `sweetstalk` | ver economy.csv |
| `homestead_03` | +2 canteiros, +1 pedra | `puffbean`, `redroot` | ver economy.csv |
| `homestead_04` | +1 nó de `rustite`, +1 árvore | `honeyleek`; minério `rustite` | ver economy.csv |
| `homestead_05` | +2 canteiros, +1 pedra | `stripemelon` | ver economy.csv |
| `homestead_06` | +2 canteiros, +1 nó de `rustite` | `glowgourd` | ver economy.csv |
| `homestead_07` | +2 canteiros, +1 árvore | — (bloco de espaço) | ver economy.csv |
| `homestead_08` | +1 nó de `glintstone`, +1 pedra | minério `glintstone` | ver economy.csv |
| `homestead_09` | +2 canteiros, +1 árvore, +1 nó de `rustite` | — | ver economy.csv |
| `homestead_10` | +2 canteiros, +1 nó de `glintstone` | **travessia para o Bosque da Brisa** | ver economy.csv |

### Bosque da Brisa (`breezewood`)

| Bloco | Adiciona | Desbloqueia | Custo/tempo |
|---|---|---|---|
| `breezewood_01` | +3 canteiros, +1 `bellpear_tree`, +1 árvore | `bluepod`; fruta `bellpear` | ver economy.csv |
| `breezewood_02` | +2 canteiros, +1 nó de `dewquartz` | `frillhead`; minério `dewquartz` | ver economy.csv |
| `breezewood_03` | +2 canteiros, +1 `mistplum_tree` | `sunbulb`; fruta `mistplum` | ver economy.csv |
| `breezewood_04` | +2 canteiros, +1 `bellpear_tree`, +1 nó de `rustite` | — | ver economy.csv |
| `breezewood_05` | +2 canteiros, +1 nó de `dewquartz` | `silkpod` (1ª advanced) | ver economy.csv |
| `breezewood_06` | +1 `mistplum_tree`, +1 árvore, +1 pedra | — | ver economy.csv |
| `breezewood_07` | +2 canteiros, +1 nó de `glintstone` | `crownbloom` | ver economy.csv |
| `breezewood_08` | +2 canteiros, +1 nó de `dewquartz` | **travessia para a Mesa Ocre** | ver economy.csv |

### Mesa Ocre (`ochremesa`)

| Bloco | Adiciona | Desbloqueia | Custo/tempo |
|---|---|---|---|
| `ochremesa_01` | +3 canteiros, +1 `honeydate_palm`, +1 pedra | `sandspud`; fruta `honeydate` | ver economy.csv |
| `ochremesa_02` | +2 canteiros, +1 nó de `sandglint` | `duneroot`; minério `sandglint` | ver economy.csv |
| `ochremesa_03` | +2 canteiros, +1 `honeydate_palm`, +1 nó de `rustite` | — | ver economy.csv |
| `ochremesa_04` | +2 canteiros, +1 nó de `sandglint` | `miragemelon` | ver economy.csv |
| `ochremesa_05` | +1 nó de `glintstone`, +1 pedra, +1 árvore | — | ver economy.csv |
| `ochremesa_06` | +2 canteiros, +1 `honeydate_palm` | `starthistle` | ver economy.csv |
| `ochremesa_07` | +2 canteiros, +1 nó de `sandglint` | **travessia para o Pico Brasa** | ver economy.csv |

### Pico Brasa (`emberpeak`)

| Bloco | Adiciona | Desbloqueia | Custo/tempo |
|---|---|---|---|
| `emberpeak_01` | +3 canteiros, +1 `firefig_tree`, +1 nó de `cinderite` | `cinderpod`; fruta `firefig`; minério `cinderite` | ver economy.csv |
| `emberpeak_02` | +2 canteiros, +1 `firefig_tree` | `ashbloom` | ver economy.csv |
| `emberpeak_03` | +2 canteiros, +1 nó de `cinderite`, +1 nó de `glintstone` | `magmabulb` | ver economy.csv |
| `emberpeak_04` | +2 canteiros, +1 `firefig_tree`, +1 árvore | — | ver economy.csv |
| `emberpeak_05` | +2 canteiros, +1 nó de `cinderite` | `embercrown`; marco "arquipélago completo" | ver economy.csv |

## Recursos

| Papel (para o economista mapear a referência) | id | Onde aparece | Para que serve |
|---|---|---|---|
| material básico 1 | `driftwood` | árvores (`tree`) desde `homestead_01`, + em blocos das 4 ilhas | expansões iniciais, ferramentas básicas, 1ª construção |
| material básico 2 | `flint` | pedras (`flint_rock`) desde `homestead_01` | expansões iniciais, ferramentas, construções |
| minério comum | `rustite` | nós a partir de `homestead_04` | ferramentas de 2º nível, expansões do meio de `homestead` em diante |
| minério raro | `glintstone` | nós a partir de `homestead_08`, poucos por ilha | travessias, expansões finais de cada ilha, upgrades de construção |
| minério exclusivo da ilha 2 | `dewquartz` | só `breezewood` | expansões de `breezewood` e seguintes, construções/decorações da ilha |
| minério exclusivo da ilha 3 | `sandglint` | só `ochremesa` | expansões de `ochremesa` e `emberpeak` |
| minério exclusivo da ilha 4 | `cinderite` | só `emberpeak` | expansões finais, itens de prestígio (candidato a NFT, fora deste escopo) |
| fruta 1 | `bellpear` | `bellpear_tree` em `breezewood` | venda, cozinha, pedidos de NPC; requisito de algumas expansões de `breezewood` |
| fruta 2 | `mistplum` | `mistplum_tree` em `breezewood` | idem |
| fruta 3 | `honeydate` | `honeydate_palm` em `ochremesa` | idem, em `ochremesa` |
| fruta 4 | `firefig` | `firefig_tree` em `emberpeak` | idem, em `emberpeak` |

Regra de projeto: cada ilha exige nas suas expansões o minério **dela** + o da ilha anterior, para
que todo recurso antigo continue útil (cadeia de dependência). Recarga, rendimento e ferramentas:
spec de recursos (pendente) e `economy.csv`.

## Culturas (23)

Tiers (decisão do usuário): **basic** 1 a 30 min · **medium** 1 h a 12 h · **advanced** 16 h a 48 h.
Preço de semente de 0,01 a 10 Gold, crescendo na ordem da tabela. Tempo e preço: `economy.csv`.

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
| 14 | `sandspud` | medium | `ochremesa_01` | Tubérculo de casca arenosa que aguenta a seca. |
| 15 | `silkpod` | advanced | `breezewood_05` | Casulo vegetal de fibra macia e brilhante. |
| 16 | `crownbloom` | advanced | `breezewood_07` | Flor comestível em forma de coroa. |
| 17 | `duneroot` | advanced | `ochremesa_02` | Raiz funda que cresce seguindo a areia. |
| 18 | `miragemelon` | advanced | `ochremesa_04` | Melão translúcido que parece tremular no calor. |
| 19 | `starthistle` | advanced | `ochremesa_06` | Cardo de flor em estrela, colhido com cuidado. |
| 20 | `cinderpod` | advanced | `emberpeak_01` | Vagem escura que amadurece no calor da rocha. |
| 21 | `ashbloom` | advanced | `emberpeak_02` | Flor cinzenta que só abre sobre solo vulcânico. |
| 22 | `magmabulb` | advanced | `emberpeak_03` | Bulbo com veios alaranjados, morno ao toque. |
| 23 | `embercrown` | advanced | `emberpeak_05` | A cultura mais rara do arquipélago; coroa de folhas em brasa. |

Os 6 ids existentes ficam nos tiers pelo tempo atual (`mintleaf` 2 min e `pebblepea` 15 min =
basic; `redroot`, `honeyleek`, `stripemelon`, `glowgourd` = medium). **Ajuste necessário:**
`glowgourd` hoje custa 10 Gold, que passa a ser o teto do tier advanced (`embercrown`); o
economista deve baixar o preço dela para dentro da faixa medium.

## Regras

1. **Sequência fixa.** Os blocos se revelam na ordem da tabela; o próximo bloco é sempre o de menor
   número ainda não revelado. Não há escolha de qual bloco comprar. [ASSUMPTION]
2. **Uma obra por vez** por fazenda. Iniciar exige: obra anterior revelada; Gold e cada material
   suficientes; nível do avatar ≥ mínimo do bloco; idade da conta ≥ mínimo do bloco.
3. **Débito no início.** Ao iniciar, o servidor debita Gold e materiais e grava o início da obra
   (tempo vindo da ação validada, nunca `Date.now()` no reducer). Pronto = início + duração; é
   derivado, não guardado.
4. **Revelar** só com obra concluída. Efeitos, numa única ação atômica: adiciona ao inventário de
   nós os itens do bloco; posiciona-os num arranjo padrão dentro do bloco novo; **reabastece todos
   os nós de recurso da fazenda** (todas as ilhas); libera as culturas do bloco na loja de sementes.
5. **Travessia.** Revelar o último bloco de uma ilha revela também o primeiro espaço da próxima
   ilha (vazio, só borda) e mostra a placa do bloco `_01` dela. A travessia é o bloco `_01`; não há
   custo separado. [ASSUMPTION]
6. **Pular obra** com Gold, com teto por obra (economista). Sem pular com token. [ASSUMPTION]
7. **Nada é perdido.** Ilhas anteriores continuam ativas; mudar de ilha não guarda nem reseta nada.
8. **Culturas** desbloqueadas podem ser plantadas em qualquer canteiro de qualquer ilha.
   [ASSUMPTION] (ver perguntas)
9. **Desbloqueios por contagem de blocos** (vagas de pedidos, construções) ficam numa única tabela
   de dados em `packages/game-core/src/data/`, nunca espalhados pelo código.

### Regras de colocação (layout livre)

1. Tudo que o bloco traz (canteiros, árvores, pedras, nós de minério, árvores frutíferas) é um item
   posicionável: pode ser movido para qualquer célula livre de **terra revelada**.
2. Nós comuns (`plot`, `tree`, `flint_rock`, `rustite_node`, `glintstone_node`) podem ir para
   qualquer ilha revelada. Nós exclusivos (`dewquartz_node`, `sandglint_node`, `cinderite_node` e as
   4 árvores frutíferas) só podem ficar na ilha de origem (o tema justifica e o visual não quebra).
3. Colisão por footprint na grade isométrica da fazenda (tamanho de célula definido pela arte em
   `docs/ARQUITETURA.md`); não pode sobrepor, sair da terra revelada nem ocupar água.
4. Mover preserva o timer do nó e a cultura plantada no canteiro.
5. Nó guardado no inventário não pode ser coletado nem plantado.
6. **Modo paisagismo:** o jogador monta um rascunho do arranjo e confirma de uma vez; a validação
   checa "dentro da terra" separado de "sobreposição", para permitir trocar dois itens de lugar. A
   mesma validação roda no cliente e no servidor (`packages/game-core`).

### Anti-bot

Sugestão do economista (`docs/economia/decisoes.md`): o bot terminava as expansões na metade do
tempo do casual só com Gold. Por isso cada bloco tem, além de Gold e materiais:

- **nível mínimo do avatar** (XP vem de ações que não escalam bem com bot, como cozinha e pedidos);
- **idade mínima de conta** a partir de certo bloco (ex.: travessias), para não premiar
  multicontas novas;
- **uma obra por vez** e duração real da obra (bot não acelera);
- recursos limitados pelo timer dos nós, autoritativo no servidor.

Os valores de nível e idade por bloco são do economista (`economy.csv`).

## Estados e erros

| Estado do bloco | O jogador vê |
|---|---|
| `locked` | silhueta em névoa; placa mostra só o nome da ilha |
| `available` | placa com requisitos e o que o bloco traz; botão "Expandir" |
| `building` | andaime + timer; botões "Pular (Gold)" |
| `ready` | brilho + botão "Revelar" |
| `revealed` | terra normal, nós novos |

| Erro (rejeição do reducer) | Mensagem (i18n) |
|---|---|
| `expansion_in_progress` | "Já tem uma obra em andamento." |
| `not_next_block` | "Esse bloco ainda não está disponível." |
| `insufficient_gold` / `insufficient_material` | "Faltam: …" (lista o que falta) |
| `level_too_low` | "Chegue ao nível N para expandir." |
| `account_too_new` | "Disponível em X dias de conta." |
| `not_ready` | "A obra termina em …" |
| `invalid_placement` | célula fica vermelha; confirmar desabilitado |
| `node_island_locked` | "Esse item só cresce na sua ilha de origem." |

Casos de borda: revelar com inventário cheio (nós não ocupam espaço de mochila; sem falha);
fechar o jogo durante a obra (timer segue no servidor); dois cliques em "Expandir" (o 2º é
rejeitado por `expansion_in_progress`); salvar antigo sem ilhas (migração: fazenda atual vira
`homestead_01` revelado).

## UI necessária

- Placa do próximo bloco na borda (toque ≥ 44 px) com requisitos em barras "tenho/preciso".
- Painel de expansão: ícones do que o bloco traz e das culturas que libera.
- Timer de obra no mundo + no HUD; notificação quando ficar pronto.
- Animação de revelação (névoa abre, nós caem, todos os nós brilham "pronto").
- Mapa do arquipélago (4 ilhas, progresso X/N por ilha, atalho de câmera).
- Modo paisagismo: arrastar, girar se houver, confirmar/cancelar, aviso de célula inválida.
- Tela de travessia (cartão da nova ilha com nome e tema).

## Assets necessários (lista para a arte)

- Tiles de terreno isométrico das 4 ilhas: chão, borda/costa, água, névoa de bloco bloqueado.
- Elementos de cenário temáticos por ilha (cercas e riacho; cata-ventos e pétalas; paredões e
  potes; rocha com veios e fumaça).
- Nós: `tree`, `flint_rock`, `rustite_node`, `glintstone_node`, `dewquartz_node`, `sandglint_node`,
  `cinderite_node` (estado cheio e esgotado de cada).
- Árvores frutíferas: `bellpear_tree`, `mistplum_tree`, `honeydate_palm`, `firefig_tree` (com e sem
  fruta).
- Ícones de item: os 11 recursos + 23 culturas + 23 sementes (17 culturas novas; as 6 existentes
  já estão no pipeline).
- 4 estágios de crescimento para cada uma das 17 culturas novas.
- Andaime de obra, placa de expansão, efeito de revelação, ponte/barco de travessia.
- Cartões das 4 ilhas (tela de travessia e mapa).

## Números necessários (pedido ao `economista-tokenomics`)

Por bloco: Gold, materiais (ids acima), tempo de obra, nível mínimo, idade mínima de conta, teto de
pular obra. Por cultura nova: semente, venda, tempo, quantidade. Por recurso: nós por bloco
(conferir as contagens propostas), recarga, rendimento, preço de venda. Revisão do preço de
`glowgourd`. Teto de canteiros total (as contagens propostas somam 59 canteiros; checar o teto do
bot).

## Critérios de aceite

- [ ] Estado novo começa com só `homestead_01` revelado e as culturas `mintleaf`, `dewcress`,
  `pebblepea` na loja.
- [ ] Iniciar expansão sem Gold, material, nível ou idade suficientes é rejeitado e não altera o
  estado.
- [ ] Iniciar com tudo suficiente debita exatamente os custos de `economy.csv` e grava o início.
- [ ] Iniciar uma segunda obra com outra em andamento é rejeitado.
- [ ] Revelar antes do fim é rejeitado; depois do fim adiciona exatamente os nós da tabela do bloco
  e deixa todos os nós de recurso da fazenda prontos.
- [ ] Revelar `homestead_10` torna `breezewood_01` o próximo bloco disponível.
- [ ] Toda cultura e todo recurso é alcançável: seguindo os blocos em ordem, cada requisito de
  material de um bloco já foi desbloqueado por um bloco anterior (teste de grafo nos dados).
- [ ] Colocação fora da terra revelada, em sobreposição ou de nó exclusivo fora da ilha é rejeitada;
  trocar dois itens de lugar no paisagismo é aceito.
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
4. **Pular obra:** (a) só com Gold, com teto (recomendado); (b) também com token; (c) não pode.
5. **`glowgourd`** a 10 Gold vira medium com preço menor (recomendado) ou sobe para advanced
   (tempo ≥ 16 h)?
6. **Nomes das ilhas** (Ilha Morada, Bosque da Brisa, Mesa Ocre, Pico Brasa): aprovados?

## Histórico

- 2026-11-22: especificada (4 ilhas, 30 blocos, 11 recursos, 23 culturas).
