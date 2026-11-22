# Decisões de economia

Uma entrada por decisão: data, o que mudou, por quê, simulação usada.

---

## 2026-11-21 — Economia v0: 4 culturas, 2 recursos, regras iniciais

**Status:** proposta v0 — **reprovada pelo usuário em 2026-11-21** ("os números estão muito grandes"). Refazer em escala menor. Substituída pela proposta v1 em Gold (entrada de 2026-11-22 abaixo); os números desta seção ficam só como histórico. Decisão sobre saldos da testnet na Fase 2: adiada pelo usuário.
**Fonte:** `economy/economy.csv` (sha256 `meta.source` em `packages/game-core/src/data/economy.generated.ts`).
**Simulação:** `pnpm econ:sim` → `economy/sim/out/{daily.csv,summary.json,sim-90d.png}`.
**Escopo de moeda:** só moeda soft off-chain ("moedas"). Sem gemas, sem token, sem saque. O token
fungível segue em aberto (recomendação: "depois").

### Por que trocar os ids do placeholder

`crop_a..d` e `resource_a..b` viraram nomes originais e legíveis, sem relação com o jogo de
referência: `mintleaf`, `redroot`, `honeyleek`, `stripemelon` (+ `<id>_seed`) e `driftwood`,
`flint`. Ids são estáveis a partir daqui; renomear exige migração de save. Testes do game-core que
citavam ids fixos foram ajustados (só troca de string).

### Regras iniciais

| Regra | Valor | Motivo |
|---|---|---|
| `starting_coins` | 20 | Compra 1 semente de honeyleek ou 20 de mintleaf: dá escolha já no 1º minuto sem pular a rampa. |
| `starting_plot_count` | 6 | Grid 3×2 cabe numa tela de celular com alvos ≥ 44 px; expansão de terreno é o sink de longo prazo da Fase 2. |
| `start_item mintleaf_seed` | 6 | Enche os 6 canteiros no tutorial sem gastar moeda; a 1ª colheita acontece dentro da 1ª sessão. |
| `max_quantity_per_action` | 1000 | Teto anti-abuso por compra/venda; nenhum perfil simulado chega perto. |

### Culturas

| Cultura | Semente | Venda (un.) | Qtd | Tempo | Bruto | Lucro/colheita | Lucro/hora/canteiro | Semente ÷ bruto | Papel |
|---|---|---|---|---|---|---|---|---|---|
| `mintleaf` | 1 | 1.5 | 1 | 2 min | 1.5 | 0.5 | 15 | 67 % | tutorial e feedback dentro da sessão |
| `redroot` | 4 | 10 | 1 | 20 min | 10 | 6 | **18 (teto)** | 40 % | pausa curta (jogador volta logo) |
| `honeyleek` | 12 | 20 | 2 | 2 h | 40 | 28 | 14 | 30 % | intervalo entre sessões do jogador ativo |
| `stripemelon` | 40 | 40 | 3 | 8 h | 120 | 80 | 10 | 33 % | noite / jogador casual; maior lucro por sessão |

Justificativas:

- **Lucro por colheita cresce com o tempo; lucro por hora cai** (exceto mintleaf, ver abaixo).
  Assim quem volta pouco (casual) planta a longa e ganha mais *por sessão*; quem volta muito
  (ativo) ganha mais *por dia*, mas sem disparar.
- **O teto de lucro por hora define o ganho de um bot.** Um bot 24/7 planta sempre a cultura de
  maior lucro/hora; o ganho diário dele é ≈ `canteiros × 24 h × max(lucro/h)` = 6 × 24 × 18 =
  2 592 moedas + recursos. Mantivemos esse teto só ~30 % acima da honeyleek (que o ativo usa) e
  1,8× a stripemelon (que o casual usa).
- **mintleaf é barata e de propósito ineficiente (15/h < 18/h).** Na 1ª versão ela tinha lucro 1
  (30/h) e o bot ganhava 2,9× o ativo — no limite do alarme de 3×. Baixar a venda para 1.5 levou o
  bot para redroot e a razão para 1,75×. O papel dela é feedback rápido (colheita visível em 2 min
  dentro da sessão), não eficiência.
- **harvest_qty > 1 nas longas** (2 e 3) para a colheita grande "parecer" grande no inventário e
  preparar receitas da cozinha (Fase 2) sem mudar o lucro.
- **Sementes como sink:** 30–40 % do bruto nas culturas que o jogador realmente usa.
- Tempos: 2 min cabe numa sessão de 3–10 min (GDD); 2 h casa com sessões do ativo a cada ~2h15;
  8 h cobre a noite/um turno de trabalho.

### Recursos

| Recurso | Venda (un.) | Nós | Recarga | Rendimento | Máx./dia/fazenda | Moedas máx./dia |
|---|---|---|---|---|---|---|
| `driftwood` | 4 | 3 | 4 h | 1 | 18 | 72 |
| `flint` | 10 | 2 | 8 h | 1 | 6 | 60 |

- Preço de venda é **piso**, baixo de propósito (≤ 132 moedas/dia mesmo para bot): o valor real de
  recurso virá dos sinks da Fase 2 (ferramentas, expansões, construções). Se vender recurso for
  bom, ninguém vai querer gastá-lo depois.
- Recurso é **limitado pelo timer do nó**, então bot e ativo ganham quase o mesmo aqui (anti-bot
  natural, autoritativo no servidor).
- `node_count`, `recharge_seconds`, `yield_qty` ainda não estão no contrato `EconomyData` nem há
  ação de coleta no motor: o gerador valida mas não exporta; o simulador replica a regra.

### Perfis simulados (economy/sim/profiles.json)

| Perfil | Sessões/dia | Horários | Duração | Variação | Faltas | Por quê |
|---|---|---|---|---|---|---|
| casual | 2 | 08:00 e 20:00 | 4 min | ±45 min | 10 % | Piso do público do GDD (celular, "várias vezes ao dia"); manhã e noite. |
| ativo | 8 | 07:00–22:45, a cada 2h15 | 6 min | ±15 min | 3 % | Jogador engajado acordado ~16 h; 8×/dia é o padrão da skill de economia. |
| bot | contínuo | toque a cada 60 s, 24/7 | — | — | 0 % | Teto teórico. 60 s divide os 20 min da redroot exatamente: um bot mais rápido não ganha mais. |

Política: colhe tudo, coleta nós prontos, vende tudo e replanta. Humano escolhe a cultura de maior
lucro por colheita que fica pronta até a próxima sessão (e mintleaf dentro da sessão); bot escolhe
sempre o maior lucro por hora. Motor real (`applyActions`), exceto a coleta de recursos.

### Resultado (90 dias, 1 conta por perfil)

| Perfil | Moedas dia 7 | Dia 30 | Dia 90 | Moedas/dia (dias 61–90) | Vendas de cultura | Vendas de recurso | Gasto em sementes | Sink ÷ fontes |
|---|---|---|---|---|---|---|---|---|
| casual | 6 162 | 26 364 | 82 308 | 881 | 117 498 | 5 152 | 40 362 | 32,9 % |
| ativo | 10 103 | 44 182 | 137 143 | 1 555 | 198 363 | 7 896 | 69 136 | 33,5 % |
| bot | 19 028 | 81 680 | 245 120 | 2 724 | 388 740 | 11 880 | 155 520 | 38,8 % |

| Razão | Dia 7 | Dia 30 | Dia 90 | Regime (moedas/dia) |
|---|---|---|---|---|
| bot ÷ casual | 3,09 | 3,10 | 2,98 | 3,09 |
| bot ÷ ativo | 1,88 | 1,85 | 1,79 | **1,75** (alarme: > 3) |
| ativo ÷ casual | 1,64 | 1,68 | 1,67 | 1,77 |

Leitura: o bot ganha ~1,75× o ativo e ~3× o casual **por conta**. Isso está dentro do limite da
skill (bot ≤ 3× ativo). O ativo ganha ~1,7× o casual: jogar mais compensa, mas não humilha quem
joga 2×/dia.

### Sources e sinks na v0

- **Sources:** venda de culturas (≈ 96–97 % da emissão) e venda de recursos (3–4 %).
- **Sink:** só sementes (33–39 % do que entra).
- **Risco de inflação — alto.** A emissão líquida é linear e sem destino: no dia 90 o casual tem
  ~82 mil e o bot ~245 mil moedas, e o único gasto possível custa no máximo 240 moedas por sessão
  (6 × stripemelon). A moeda perde utilidade em ~1 semana. Isso é aceitável **só** porque a v0 é
  testnet/off-chain, sem saque e sem token.
- **Entra na Fase 2 (sinks, nesta ordem de impacto):**
  1. Expansão de terreno com custo `floor(base × g^n)`, g alto (1,5–3), + requisito de recursos —
     o principal sink de longo prazo; cuidado: mais canteiros também elevam o teto do bot.
  2. Ferramentas para coletar recursos (consumível ou com durabilidade — simular as duas, como
     pede `docs/referencia/02-recursos.md`).
  3. Cozinha/crafting que destrói insumos (culturas e recursos), dando XP.
  4. Cosméticos/decoração pagos em moeda (sink sem efeito no poder).
  5. Itens sazonais que expiram.
  Meta da Fase 2: sinks ≥ 80–100 % das sources do jogador ativo em regime.
- **Decisão pendente do usuário:** zerar saldos da testnet ao lançar os sinks da Fase 2 (recomendado)
  ou calibrar os preços da Fase 2 contra estoques de 80–250 mil moedas.

### Riscos e limites anti-bot sugeridos para a Fase 1 (a simular antes de virar número)

1. **Multicontas é o risco real**, não a razão por conta: N contas de bot = N × 2,7 mil/dia. Sem
   saque não há dano externo; antes de qualquer saque exigir idade de conta, reputação e
   verificação humana (skill `web3-game-economy`).
2. **Teto de lucro/hora como invariante:** nenhuma cultura nova pode passar de 18/h (ou o teto
   aprovado) sem nova simulação; boosts entram na mesma conta.
3. **Retornos decrescentes em ciclos curtos:** ex. após ~150 colheitas/dia de culturas < 1 h, a
   venda delas cai pela metade. O ativo simulado faz ~150 colheitas curtas/dia, o bot ~430.
4. **Sem recompensa fixa por login** e sem presente inicial maior que o atual (20 moedas + 6
   sementes), para não premiar criação de contas.
5. **Servidor:** já rejeita colheita antes do tempo; somar checagem de `createdAt` monotônico e
   próximo do relógio do servidor no lote de ações (sem isso um cliente forja o tempo).
6. **Telemetria:** alertar contas com visitas em intervalos regulares 24 h por dia (padrão de bot
   do simulador).

### Sinalização ao produtor (regulatório)

Moedas são off-chain, não sacáveis e sem compra com dinheiro: não há risco regulatório na v0. Se
um token fungível vier depois, **toda** a emissão acima vira emissão de token — a conversão
moeda→token precisaria de teto e de nova simulação, e a decisão de venda ao público não é do
economista. NFTs de item (Fase 3+) não devem ser vendidos como investimento.

### Pendências

- Aprovação dos números acima pelo usuário (até lá, ficam como proposta v0).
- Contrato: acrescentar definição de nó de recurso (`node_count`, recarga, rendimento) em
  `types.ts` + ação de coleta no game-core; aí o gerador passa a exportar e o simulador deixa de
  replicar a regra.
- `packages/game-core/README.md` ainda chama os dados de PLACEHOLDER (fora do escopo desta tarefa).
- Considerar uma cultura de ~12 h para o casual (hoje a stripemelon fica pronta 4 h antes da volta).

---

## 2026-11-22 — proposta v1 — aguardando aprovação

**Status:** proposta v1 — **aguardando aprovação do usuário**. Nada aqui é oficial até o "aprovado".
**Gatilho:** reprovação da v0 ("os números estão muito grandes") e decisões do usuário de
2026-11-22 (tabela "Decisões do usuário" em `docs/ARQUITETURA.md`): duas moedas (Gold off-chain +
token de governança ERC-20) e culturas de 0,01 Gold (lucro 100 %) até 10 Gold (lucro ~30 %).
**Fonte:** `economy/economy.csv` (sha256 em `meta.source` de
`packages/game-core/src/data/economy.generated.ts`, `meta.version = "v1"`).
**Simulação:** `pnpm econ:sim` → `economy/sim/out/{daily.csv,summary.json,sim-90d.png}`; sinks
propostos em `economy/sim/sinks-proposal.json` (fora do motor).
**Sala limpa:** nenhum número, nome ou tempo veio do jogo de referência; `reference/` não foi aberto.

### O que mudou em relação à v0

| Tema | v0 (reprovada) | v1 (proposta) |
|---|---|---|
| Moeda | "moedas" | **Gold** (off-chain, precisão 0,01) |
| Culturas | 4 (semente 1–40) | **6** (semente 0,01–10) |
| Ganho do casual no regime | ~881/dia | **~33 Gold/dia** |
| Validação | decimal ≥ 0 | + múltiplo de 0,01; semente ≥ 0,01; lucro por colheita ≥ 0,01 (em centavos inteiros) |
| Regra no CSV | `starting_coins` | `starting_gold` (o gerador mapeia para `rules.startingCoins`, nome atual do contrato) |

Ids de cultura e recurso da v0 foram mantidos (`mintleaf`, `redroot`, `honeyleek`, `stripemelon`,
`driftwood`, `flint`): saves de testnet continuam válidos. Novos ids originais: `pebblepea` e
`glowgourd`. O campo `coins` do `GameState` e `startingCoins` do contrato continuam com esse nome;
renomear para `gold` é mudança do game-core (com migração de save), fora do escopo do economista —
fica como pendência para o `produtor` decidir.

### Por que 6 culturas

Cada cultura cobre uma **janela de ausência** diferente. Como o jogador colhe uma vez por ausência,
a cultura certa é a de maior lucro por colheita que fica pronta até ele voltar. Com 6 janelas a
escolha depende de como a pessoa joga, e não existe "a melhor cultura":

| Janela | Quem | Cultura |
|---|---|---|
| dentro da sessão (2 min) | todos, tutorial | `mintleaf` |
| pausa curta (15 min) | quem fica com o jogo aberto; bot | `pebblepea` |
| entre sessões do ativo (1h45) | ativo (sessões a cada ~2h15) | `redroot` |
| meio turno (4 h) | quem joga 3–4×/dia | `honeyleek` |
| noite do ativo (7h30) | ativo, das 22:45 às 07:00 | `stripemelon` |
| casual 2×/dia (10 h) | casual (08:00 e 20:00, ±45 min) | `glowgourd` |

Com 4 culturas sobrariam buracos (o ativo ou o casual ficaria com uma cultura que fica pronta muito
antes de ele voltar). Com mais de 6, as culturas vizinhas teriam lucro/h quase igual e virariam
redundância. Tempos escolhidos pela janela que o perfil realmente tem: 1h45 cabe em ~98 % das
pausas do ativo (1h39–2h39 com o jitter); 7h30 cabe na noite do ativo (7h39–8h39); 10 h cabe em
todas as ausências do casual (10h26–13h26).

### Culturas (Gold)

| Cultura | Semente | Colheita total (qtd × venda) | Lucro/colheita | Margem | Tempo | Lucro/h/canteiro |
|---|---|---|---|---|---|---|
| `mintleaf` | 0,01 | 0,02 (1 × 0,02) | 0,01 | **100 %** | 2 min | 0,30 |
| `pebblepea` | 0,14 | 0,25 (1 × 0,25) | 0,11 | 79 % | 15 min | **0,44 (teto)** |
| `redroot` | 1,10 | 1,80 (2 × 0,90) | 0,70 | 64 % | 1h45 | 0,40 |
| `honeyleek` | 2,90 | 4,35 (3 × 1,45) | 1,45 | 50 % | 4 h | 0,36 |
| `stripemelon` | 6,30 | 8,70 (3 × 2,90) | 2,40 | 38 % | 7h30 | 0,32 |
| `glowgourd` | 10,00 | 13,00 (5 × 2,60) | 3,00 | **30 %** | 10 h | 0,30 |

Todos os preços são múltiplos de 0,01 (checado pelo gerador e por `data.test.ts`). O menor lucro
por colheita é 0,01 (mintleaf); nenhum arredonda para 0.

**A curva.** A margem cai de 100 % para 30 % conforme a semente fica cara (pedido do usuário), e o
lucro por colheita sobe 300× (0,01 → 3,00). O **lucro por hora por canteiro**, porém, fica numa
faixa estreita, de 0,30 a 0,44 (1,47× do menor ao maior), e **cai** conforme a cultura fica longa
e cara: `pebblepea` 0,44 → `redroot` 0,40 → `honeyleek` 0,36 → `stripemelon` 0,32 → `glowgourd`
0,30. Ou seja, a cultura cara **não** é a mais eficiente por hora. Ela é a melhor *por ausência*:
quem volta pouco ganha mais por visita, quem volta muito ganha mais por dia, e nenhum dos dois
domina o outro.
- `mintleaf` é exceção de propósito (0,30/h, igual ao piso): é o tutorial (6 sementes grátis) e o
  feedback dentro da sessão. Se ela fosse a mais eficiente, o bot plantaria a cada 2 min.
- O teto (0,44/h, `pebblepea`) define o ganho do bot: ≈ canteiros × 24 h × 0,44 = 63 Gold/dia com
  6 canteiros + recursos. Por isso o teto fica só 10 % acima da cultura do ativo (`redroot`) e 1,47×
  acima da do casual (`glowgourd`).
- Sementes são um sink forte nas culturas caras (77 % do bruto na `glowgourd`): no regime o casual
  devolve em sementes 76 % do que vende.
- `harvest_qty` > 1 nas culturas maiores para a colheita "parecer" grande e servir de insumo da
  cozinha (Fase 2) sem mudar o lucro.

Uso real no simulador (colheitas em 90 dias): casual = `glowgourd` 928 + `mintleaf` 1 936 (dentro
da sessão); ativo = `redroot` 3 525 + `stripemelon` 521 + `honeyleek` 96 + `mintleaf` 12 584;
bot = só `pebblepea` 51 834. Cada perfil tem sua cultura. `honeyleek` é para quem joga 3–4×/dia
(não simulado; pendência abaixo).

### Recursos (Gold)

| Recurso | Venda (un.) | Nós | Recarga | Rendimento | Máx./dia/fazenda | Gold máx./dia |
|---|---|---|---|---|---|---|
| `driftwood` | 0,15 | 3 | 4 h | 1 | 18 | 2,70 |
| `flint` | 0,40 | 2 | 8 h | 1 | 6 | 2,40 |

O preço de venda é **piso** e baixo de propósito: no regime, recurso é ~7 % do ganho do casual
(2,2 Gold/dia) e no máximo 5,1 Gold/dia para o bot. O valor real virá de construções, upgrades e
ferramentas (requisito em recurso, ver sinks). Recurso é limitado pelo timer do nó, então funciona
como anti-bot natural.

### Regras iniciais

| Regra | Valor | Motivo |
|---|---|---|
| `starting_gold` | 2 | Dá para comprar 1 `redroot` ou 6 `pebblepea` (0,84) já no 1º minuto. A escada até a `glowgourd` (60 Gold para 6 canteiros) é a primeira progressão. Testamos 3, 5 e 10: o regime não muda e o dia 7 do casual sobe só de 114 para 155, então mantivemos pequeno. |
| `starting_plot_count` | 6 | Igual à v0: grid 3×2 cabe na tela do celular; expansão é o 1º sink grande. |
| `start_item mintleaf_seed` | 6 | Enche os 6 canteiros no tutorial sem gastar Gold. |
| `max_quantity_per_action` | 1000 | Teto anti-abuso por compra/venda; nenhum perfil chega perto. |

### Perfis

Os mesmos da v0 (`economy/sim/profiles.json`): casual 2×/dia (08:00 e 20:00, 4 min, ±45 min, 10 % de
faltas), ativo 8×/dia (07:00–22:45 a cada 2h15, 6 min, ±15 min, 3 % de faltas) e bot 24/7 (toque a
cada 60 s). A política também é a mesma: o humano escolhe o maior lucro por colheita que fica pronto
até a próxima visita, e o bot escolhe o maior lucro por hora. Motor real (`applyActions`), exceto
na coleta de recursos e nos sinks propostos.

### Resultado — cenário base (só o motor; sementes são o único sink)

| Perfil | Gold dia 7 | Dia 30 | Dia 90 | **Gold/dia no regime** (dias 61–90) | Vendas (cultura + recurso) | Sementes | Sementes ÷ vendas |
|---|---|---|---|---|---|---|---|
| casual | 113,69 | 869,12 | 2 961,08 | **32,93** | 12 146,17 + 201,25 | 9 388,34 | 76 % |
| ativo | 282,66 | 1 363,31 | 4 323,02 | **49,54** | 11 710,98 + 305,10 | 7 695,06 | 64 % |
| bot | 479,72 | 2 054,30 | 6 161,90 | **68,46** | 12 958,50 + 459,00 | 7 257,60 | 54 % |

| Razão | Dia 7 | Dia 30 | Dia 90 | **Regime (Gold/dia)** |
|---|---|---|---|---|
| bot ÷ casual | 4,22 | 2,36 | 2,08 | **2,08** (meta ≤ 3) |
| bot ÷ ativo | 1,70 | 1,51 | 1,43 | **1,38** (alarme da skill: > 3) |
| ativo ÷ casual | 2,49 | 1,57 | 1,46 | **1,50** |

Leitura:
- **Escala:** no regime o casual ganha **~33 Gold/dia** e o ativo **~50 Gold/dia** (a v0 dava 881 e
  1 555). Uma semente cara custa 10 Gold: o casual leva ~2 dias para encher os 6 canteiros com a
  cultura mais cara do jogo só com o lucro.
- **Bot ≤ 3× casual no regime (2,08×)** e 1,38× o ativo. O dia 7 passa de 3× (4,22) por causa da
  rampa: o casual leva ~4 dias para subir a escada até a `glowgourd`, enquanto a cultura do bot custa
  0,14. Isso é saldo acumulado, não ritmo; do dia ~5 em diante o casual ganha no ritmo de regime.
- Jogar 4× mais (ativo) rende 1,5× o casual: compensa, sem punir quem joga 2×/dia.

### Sinks propostos (fora do motor, NÃO oficiais)

O usuário citou expansões, construções e upgrades de construções como gastos em Gold. Proposta de
**ordem de grandeza** (números em `economy/sim/sinks-proposal.json`, sem implementação no motor):

| Sink | Custo | Equivale a | Efeito |
|---|---|---|---|
| **1ª construção** | **60 Gold** (+ requisito sugerido de ~10 `driftwood`) | ~1,8 dia do casual, ~1,2 do ativo | desbloqueia receitas/boost (efeito não modelado: sink puro no simulador) |
| Upgrades da construção, nível L | 60 × 1,8^(L−1): 108 · 194,40 · 349,92 · 629,86 · 1 133,74 · 2 040,73 · 3 673,32 | crescente | idem |
| **1ª expansão** | **150 Gold** (+ requisito sugerido de ~10 `driftwood` e 3 `flint`) | ~4,6 dias do casual, ~3 do ativo | +2 canteiros (o casual paga em ~14 dias com os canteiros novos) |
| Expansões 2–4 | 150 × 2^(n−1): 300 · 600 · 1 200 | crescente | +2 canteiros cada (6 → 14) |

Requisitos em recurso são sugestão (o simulador ainda não os consome); dão valor ao recurso, que
hoje só tem preço-piso. Os valores do upgrade saem da fórmula; ao virar oficial, arredondar para
números redondos (ex.: 110, 195, 350, 630…). Política simulada: o jogador compra o próximo sink mais
barato sempre que sobra Gold acima de uma reserva de 10 Gold por canteiro (para replantar). O
simulador debita o Gold e adiciona os canteiros **direto no estado, fora do game-core**.

Resultado do cenário `sinks` (linhas tracejadas no gráfico):

| Perfil | Gold dia 90: base → com sinks | Gasto em sinks (90 d) | Sinks ÷ ganho líquido (90 d) | Canteiros no dia 90 | Gold/dia no regime (antes de sinks) |
|---|---|---|---|---|---|
| casual | 2 961 → **197** (−93 %) | 4 725,92 | 96 % | 14 (4ª expansão no dia 88) | 63,87 |
| ativo | 4 323 → **1 204** (−72 %) | 6 766,65 | 85 % | 14 (dia 62) | 109,99 |
| bot | 6 162 → **1 623** (−74 %) | 10 439,97 | 87 % | 14 (dia 43) | 152,94 |

Leitura:
- **Reduzem a inflação:** os sinks absorvem 85–96 % do Gold líquido emitido em 90 dias, e o saldo
  em caixa vira um "dente de serra" (junta → gasta), em vez de reta crescente.
- **Mas a expansão aumenta a emissão:** mais canteiros = mais Gold/dia (casual 33 → 64; bot 68 →
  153). Por isso o custo da expansão precisa crescer mais rápido que o ganho (g = 2) e ter teto.
- **A escada acaba.** O bot termina as expansões no dia 43 e o nível 8 da construção no dia 81; a
  partir daí, toda a emissão volta a acumular. Escadas únicas só **adiam** a inflação; o equilíbrio
  de longo prazo precisa de sinks **recorrentes** (ferramentas consumíveis, cozinha que destrói
  insumo, cosméticos, taxas, itens sazonais), como já listado na v0.
- **Riqueza composta:** quem ganha mais expande antes e passa a ganhar ainda mais (bot com 14
  canteiros no dia 43, casual no dia 88). Recomendação: expansão também exige **nível do avatar /
  idade da conta**, e não só Gold, para que o bot não chegue lá na metade do tempo.

### Token de governança — riscos para a economia de Gold (sinalização ao `produtor`)

O economista **não precifica o token** (preço livre, decisão do usuário) e **não decide** a relação
token↔Gold nem venda ao público. Riscos de cada desenho:

1. **Token → Gold (depositar token e receber Gold):** o Gold passa a ter preço de mercado implícito
   (Gold por token × preço do token). Quem compra token compra progresso (pay-to-win), e os sinks em
   Gold precisam ser recalibrados para jogadores com Gold "comprado". Se a taxa for fixa, o jogo
   vira emissor de Gold contra dinheiro; se for de mercado, os preços em Gold oscilam com o token.
2. **Gold → token (sacar Gold como token):** **toda** emissão de Gold vira emissão de token. O bot
   (2× o casual por conta) e as multicontas passam a gerar dinheiro, e o preço do token cai com o
   aumento de jogadores (sinal de alarme da skill). Exigiria teto de conversão, idade de conta,
   verificação humana/KYC e nova simulação.
3. **Conversão indireta via marketplace:** se um item feito com Gold (semente, colheita, produto de
   construção) puder ser vendido por token entre jogadores, o Gold ganha preço em token mesmo sem
   conversão direta. É preciso decidir **quais itens são negociáveis** no marketplace.
4. **Recompensa em token por jogar:** se o jogo distribuir token, precisa de teto de emissão fixo e
   não pode depender da emissão de Gold; senão o problema 2 volta.
5. **Governança sobre preços:** se o token votar preços/emissão de Gold, conflita com "preços
   definidos por nós" e expõe a economia a captura por grandes detentores.

**Recomendação técnica (não decisão):** começar com o Gold **sem nenhuma conversão** para token (nem
direta nem via itens feitos com Gold) e o token usado só para governança e marketplace de NFTs, até
termos sinks recorrentes simulados e um parecer jurídico.

### Perguntas que o usuário precisa decidir (relação token ↔ Gold)

1. O token pode ser **trocado por Gold** dentro do jogo? Se sim, a taxa é fixa (definida por nós) ou
   de mercado? Com limite por conta/dia?
2. O Gold pode **virar token** (saque)? Se sim, com qual teto, idade mínima de conta e verificação?
3. **O que o token compra** dentro do jogo, se compra algo: só NFTs e cosméticos? Taxas de
   marketplace? Aceleradores? (aceleradores pagos = pay-to-win)
4. **Quais itens são negociáveis** por token no marketplace? Itens produzidos com Gold (colheitas,
   produtos de construção) entram ou só NFTs de supply fixo?
5. Como o token é **emitido**: supply fixo cunhado de uma vez? Reserva para recompensas de jogo? Há
   teto?
6. O marketplace cobra **taxa**? Em token? A taxa é queimada ou vai para o tesouro?
7. **O que a governança vota?** Pode alterar preços em Gold, emissão ou regras da economia?
8. **Venda ao público / listagem em exchange:** quando, em qual jurisdição e com qual assessoria
   jurídica? (decisão do usuário com o jurídico, não do economista; ver abaixo)

### Sinalização regulatória ao `produtor` (não é parecer jurídico)

- **Gold** off-chain, sem saque e sem compra com dinheiro: risco baixo, como na v0. Isso muda se o
  Gold puder ser convertido em token (perguntas 1, 2 e 4).
- **Token vendido em exchange / ao público (Brasil):** um token oferecido ao público com expectativa
  de retorno pelo esforço de terceiros pode ser enquadrado como **valor mobiliário** (contrato de
  investimento coletivo, Lei 6.385/1976 art. 2º IX), sob a **CVM**, que já orientou sobre
  criptoativos (Parecer de Orientação CVM 40/2022). O rótulo "governança" não afasta isso sozinho:
  conta como o token é ofertado e divulgado. Se não for valor mobiliário, a **Lei 14.478/2022**
  (marco legal dos ativos virtuais) exige que quem intermedeia, custodia ou troca ativos virtuais
  seja prestador autorizado (Banco Central como supervisor). Há ainda reporte à Receita Federal
  (IN RFB 1.888/2019) e, em jogo, cuidado com público menor de idade.
- **Ações sugeridas antes de qualquer venda:** parecer jurídico especializado; nunca divulgar o token
  ou NFTs como investimento ou com promessa de valorização; não prometer recompensas em token; manter
  tudo em testnet (CLAUDE.md, regra 5). **A decisão de vender ao público é do usuário, não do
  economista.**

### Pendências

- **Aprovação** da v1 pelo usuário (até lá, proposta).
- Decisões token↔Gold (perguntas acima) **antes** de desenhar qualquer emissão de token.
- Renomear `coins`/`startingCoins` para `gold` no game-core (contrato + `GameState` + migração de
  save) — tarefa do `produtor`/game-core.
- Contrato e ação de coleta de recursos no motor (igual à v0).
- Sinks: implementar expansão/construção no motor só depois de aprovados; consumir os requisitos de
  recurso no simulador; somar sinks recorrentes (ferramentas, cozinha) antes da Fase 3.
- Perfil "regular 3–4×/dia" no simulador para validar a `honeyleek`.
- Saldos da testnet: a v1 muda a escala (~1/27 da v0). Zerar saldos ao aplicar a v1 continua sendo a
  recomendação; decisão do usuário (adiada).
