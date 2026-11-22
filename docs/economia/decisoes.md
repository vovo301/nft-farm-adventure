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

---

## 2026-11-22 — proposta v2 — aguardando aprovação

**Status:** proposta v2 — **aguardando aprovação do usuário**. Nada aqui é oficial até o "aprovado".
**Gatilho:** decisões do usuário de 2026-11-22 (`docs/ARQUITETURA.md`): 23 culturas em 3 tiers; mundo
de 4 ilhas com 30 blocos de expansão; **modelo de equilíbrio da referência como base numérica**
(exceção à regra 1 do `CLAUDE.md`; nomes e recursos nossos); e, durante a tarefa, a instrução:
*"pode manter os valores de moedas de ouro como da referência, isso não é para mudar"*.
**Fontes:** `economy/economy.csv` (regras, culturas, recursos/nós) + `economy/expansions.csv` (ilhas,
blocos, custo de mudança) → `packages/game-core/src/data/economy.generated.ts` (contrato atual) +
`world.generated.ts` (novo, só dados). Referência: `docs/referencia/equilibrio-expansoes.md`
(analista, código) e `equilibrio-totais-ilhas.md` (ferramenta de fã); totais em
`economy/sim/reference-totals.json`. `reference/` não foi aberto.
**Simulação:** `pnpm econ:sim` → `economy/sim/out/{daily.csv,summary.json,sim-90d.png}`.

### 1. Escala da moeda: fator de conversão = 1 (moeda soft da referência = Gold, 1:1)

| Item | Valor |
|---|---|
| Fator moeda soft → Gold | **1,00** (decisão do usuário; o custo em Gold de cada bloco é o número da referência) |
| Fonte padrão | valores do **código** (tabela do analista). Os do fã ficam registrados abaixo como divergência |
| Preço das culturas | mantido na faixa do usuário (semente 0,01 a 10 Gold) |

Antes dessa instrução eu calculei um fator pela razão de renda (≈ **0,02 Gold por moeda soft**,
supondo que a referência precifica a Ilha 4 para ser paga durante o tempo de obra dela). Com fator 1
os custos ficam ~50× maiores que isso para a nossa renda; o efeito está na seção 7 e é a principal
pergunta desta proposta.

### 2. Divergências fã × código (padrão: código)

| Ilha | Item | Código (usado) | Fã ("custo exato" do usuário) |
|---|---|---|---|
| 1 | Gold total | **720** | 60,25 |
| 1 | pedra (`flint`) | 44 | 46 |
| 1 | minério comum (`rustite`) | 8 | 9 |
| 1 | tempo do 5º bloco / total | 5 min / 16 h 6 min | 30 min / 16 h 31 min |
| 2 | Gold total | 5 000 | (não lista) |
| 3 | Gold total | **100 420** | 81 600 |
| 4 | Gold total | **492 284** | 409 820 |
| 2–4 | materiais, moeda premium, tempos, nós finais, custos de mudança | iguais | iguais |

Causa provável (analista): versões diferentes do jogo; o código re-precificou a Ilha 1 e a moeda soft
das ilhas 3–4. **Pergunta 1** ao usuário.

### 3. Mapeamento papel → recurso nosso

| Papel na referência | Recurso nosso | Nó nosso | Observação |
|---|---|---|---|
| madeira | `driftwood` | `tree` | |
| pedra | `flint` | `flint_rock` | |
| minério 1 (comum) | `rustite` | `rustite_node` | |
| minério 2 (raro) | `glintstone` | `glintstone_node` | custo da travessia 1→2 |
| minério I2 | `dewquartz` | `dewquartz_node` | custo da travessia 2→3 |
| recurso I3 (reserva) | `sandglint` | `sandglint_node` | custo da travessia 3→4 |
| minério I4 (nó "forno") | `cinderite` | `cinderite_node` | a alimentação do nó com colheitas **não** foi adotada |
| frutíferas | `bellpear`, `mistplum` (ilha 2), `honeydate` (3), `firefig` (4) | `*_tree`/`honeydate_palm` | contagem igual à ref (11 → 15) + 3 `firefig_tree` na ilha 4 (fruta da ilha 4 pedida pelo designer) |
| **moeda premium ("gema" no arquivo do fã)** | **frutas, 1:1** | — | proposta; **pergunta 2** |
| nó especial finito ("nó de gema") | — (fora) | — | produz um item que não entra em custo de expansão; ref tem 2/6/13 |
| canteiro de flores, colmeia | — (fora) | — | sistemas que não temos (3 de cada na ref) |
| token | nunca | — | a ref também zera token em expansão |

Premium → frutas: ilha 2 divide entre `bellpear`/`mistplum`; ilha 3: 40 % `honeydate`, 30 % cada
fruta da ilha 2; ilha 4: 30 % `firefig`, 30 % `honeydate`, 20 % cada fruta da ilha 2 (múltiplos de 5).
Por quê: troca "pagar com dinheiro" por "colher no tempo", sem moeda premium, e dá uso às frutas.

### 4. Blocos: agregação da curva da referência em 10/8/7/5

A ref tem 6/12/21/25 blocos jogáveis por ilha; nós temos 10/8/7/5 (29 pagos). Regra: **cada bloco
nosso soma um grupo contíguo de blocos da ref** (coluna `ref_blocks` em `expansions.csv`), então os
**totais por ilha batem exatamente com o código** (Gold, materiais, tempo, nós finais).

- Ilha 1 (10 > 6): o terreno inicial grátis (6 canteiros, 3 árvores, 2 pedras = jogo atual) + 9 blocos
  que dividem os 6 da ref (b8 em 3 partes, b9 em 2). Tempos 5 s · 5 s · 1 min · 5 min · 15 min ·
  45 min · 1 h · 4 h · 10 h = **16 h 6 min 10 s** (igual ao código).
- Ilha 2: grupos [5] [6] [7] [8,9] [10,11] [12,13] [14] [15,16]; ilha 3: grupos de 3; ilha 4: grupos de 5.
- Nível mínimo = o do último bloco da ref no grupo (1→11, 11→43, 41→75, 78→120). **Sem XP no jogo**:
  dado exportado, ignorado no simulador.
- Idade mínima de conta [ASSUMPTION]: `breezewood_01` 1 dia, `ochremesa_01` 5 dias, `emberpeak_01`
  30 dias (≈ tempo acumulado de obra da ref até ali); demais 0.
- Custo de mudança de ilha = o da ref (10 `glintstone`, 20 `dewquartz`, 200 `sandglint`), cobrado
  junto com o 1º bloco da ilha (linha `island` do CSV). O designer tinha "travessia sem custo"
  [ASSUMPTION]; segui a referência.
- **Consequência da agregação:** obras longas nas ilhas 3–4 (até 7 d 12 h na ilha 3 e 13 d 12 h na
  ilha 4; a ref nunca passa de 3 d por bloco). **Pergunta 3.**
- Alcançabilidade (todo material tem nó revelado num bloco anterior): 3 ajustes, anotados em `note`:
  honeydate de `ochremesa_01` → bellpear; firefig de `emberpeak_01` → honeydate; o 1 `cinderite` de
  `emberpeak_01` → `emberpeak_02`. Nós da ilha 1 seguem a forma da ref (rustite em `homestead_04`,
  glintstone em `homestead_05` e `_08` — o designer pôs glintstone em `_08`/`_10`; adiantei para dar
  tempo de juntar os 10 da travessia).

**Contagens [ASSUMPTION] do designer ajustadas para a referência:** canteiros finais 31/45/65/65 (o
designer somava 20/35/48/59); árvores 9/18/23/23; pedras 7/15/20/20; rustite 4/9/12/13; glintstone
2/6/7/8; dewquartz 0/2/4/5; sandglint 0/0/3/4; cinderite 3; frutíferas 0/11/15/18. A ilha 4 não ganha
canteiros (como na ref): ganha nós, frutas e as 4 culturas finais.

Totais por ilha (nossos dados = código da ref, por construção):

| Ilha | Blocos (nosso/ref) | Gold | Materiais | Frutas (no lugar de premium) | Mudança | Obra | Canteiros/nós no fim |
|---|---|---|---|---|---|---|---|
| homestead | 10 / 6 | 720 | 108 driftwood, 44 flint, 8 rustite, 1 glintstone | — | — | 16 h 6 min | 31 / 22 |
| breezewood | 8 / 12 | 5 000 | 680 · 115 · 30 · 32 + 26 dewquartz | 225 | 10 glintstone | 4 d 16 h 36 min | 45 / 61 |
| ochremesa | 7 / 21 | 100 420 | 6 775 · 2 415 · 440 · 350 · 564 + 3 570 sandglint | 1 020 | 20 dewquartz | 24 d 0 h 36 min | 65 / 84 |
| emberpeak | 5 / 25 | 492 284 | 19 550 · 7 200 · 1 115 · 810 · 1 274 · 4 600 + 236 cinderite | 3 690 | 200 sandglint | 33 d 15 h 35 min | 65 / 94 |

### 5. Culturas (23)

Regras mantidas da v1: margem cai de 100 % (0,01) a 30 % (10); **quanto mais longa, maior o lucro por
colheita e menor o lucro por hora** (exceto `mintleaf`, de propósito abaixo do teto); teto de
lucro/h = `pebblepea` 0,44 (cultura do bot). Os 5 valores aprovados da v1 (`mintleaf`, `pebblepea`,
`redroot`, `honeyleek`, `stripemelon`) **não mudaram**. Testado em `data.test.ts` a partir dos dados.

| # | Cultura | Tier | Semente | Colheita (qtd × venda) | Lucro | Margem | Tempo | Lucro/h/canteiro | Desbloqueio |
|---|---|---|---|---|---|---|---|---|---|
| 1 | mintleaf | basic | 0,01 | 0,02 (1×0,02) | 0,01 | 100 % | 2 min | 0,300 | homestead_01 |
| 2 | dewcress | basic | 0,04 | 0,07 (1×0,07) | 0,03 | 75 % | 5 min | 0,360 | homestead_01 |
| 3 | pebblepea | basic | 0,14 | 0,25 (1×0,25) | 0,11 | 79 % | 15 min | **0,440** | homestead_01 |
| 4 | curlwort | basic | 0,24 | 0,42 (2×0,21) | 0,18 | 75 % | 25 min | 0,432 | homestead_02 |
| 5 | puffbean | basic | 0,30 | 0,51 (3×0,17) | 0,21 | 70 % | 30 min | 0,420 | homestead_03 |
| 6 | sweetstalk | medium | 0,61 | 1,02 (2×0,51) | 0,41 | 67 % | 1 h | 0,410 | homestead_02 |
| 7 | redroot | medium | 1,10 | 1,80 (2×0,90) | 0,70 | 64 % | 1 h 45 | 0,400 | homestead_03 |
| 8 | bluepod | medium | 1,60 | 2,56 (4×0,64) | 0,96 | 60 % | 2 h 30 | 0,384 | breezewood_01 |
| 9 | frillhead | medium | 2,10 | 3,24 (3×1,08) | 1,14 | 54 % | 3 h | 0,380 | breezewood_02 |
| 10 | honeyleek | medium | 2,90 | 4,35 (3×1,45) | 1,45 | 50 % | 4 h | 0,363 | homestead_04 |
| 11 | sunbulb | medium | 4,60 | 6,60 (4×1,65) | 2,00 | 43 % | 6 h | 0,333 | breezewood_03 |
| 12 | stripemelon | medium | 6,30 | 8,70 (3×2,90) | 2,40 | 38 % | 7 h 30 | 0,320 | homestead_05 |
| 13 | glowgourd | medium | **6,60** (v1: 10) | 9,10 (5×1,82) | 2,50 | 38 % | 10 h | 0,250 | homestead_06 |
| 14 | sandspud | medium | 6,90 | 9,45 (3×3,15) | 2,55 | 37 % | 12 h | 0,213 | ochremesa_01 |
| 15 | silkpod | advanced | 7,20 | 9,80 (4×2,45) | 2,60 | 36 % | 16 h | 0,163 | breezewood_05 |
| 16 | crownbloom | advanced | 7,50 | 10,16 (4×2,54) | 2,66 | 35 % | 20 h | 0,133 | breezewood_07 |
| 17 | duneroot | advanced | 7,80 | 10,52 (4×2,63) | 2,72 | 35 % | 24 h | 0,113 | ochremesa_02 |
| 18 | miragemelon | advanced | 8,20 | 11,00 (5×2,20) | 2,80 | 34 % | 28 h | 0,100 | ochremesa_04 |
| 19 | starthistle | advanced | 8,60 | 11,44 (4×2,86) | 2,84 | 33 % | 32 h | 0,089 | ochremesa_06 |
| 20 | cinderpod | advanced | 9,00 | 11,88 (4×2,97) | 2,88 | 32 % | 36 h | 0,080 | emberpeak_01 |
| 21 | ashbloom | advanced | 9,30 | 12,20 (5×2,44) | 2,90 | 31 % | 40 h | 0,073 | emberpeak_02 |
| 22 | magmabulb | advanced | 9,60 | 12,55 (5×2,51) | 2,95 | 31 % | 44 h | 0,067 | emberpeak_03 |
| 23 | embercrown | advanced | 10,00 | 13,00 (5×2,60) | 3,00 | 30 % | 48 h | 0,063 | emberpeak_05 |

- **Nenhuma cultura de 1 min:** com lucro mínimo de 0,01 Gold, uma cultura de 1 min daria 0,60/h e
  viraria a cultura do bot (teto +36 %). O tier basic usa 2 a 30 min. **Pergunta 5.**
- **`glowgourd`** continua medium (10 h) com semente 6,60 (era 10), como recomendou o designer:
  **pendente de confirmação** (pergunta 4). O casual perde ~17 % por canteiro em relação à v1.
- **Compressão no topo:** como a semente mais cara (10 Gold, 30 %) dá no máximo 3,00 por colheita e
  a `stripemelon` aprovada dá 2,40, as 11 culturas de 10 h a 48 h ficam entre 2,50 e 3,00 de lucro por
  colheita. Quem joga 1×/dia ganha só ~13 % a mais com `duneroot` (24 h) do que replantando
  `stripemelon`. É consequência direta do teto de 10 Gold/30 % com os valores aprovados.
- O desbloqueio por bloco (`unlockBlock`) é **só dado** (`world.cropUnlockBlock`); 4 culturas antes
  livres (`redroot`, `honeyleek`, `stripemelon`, `glowgourd`) passam a depender de bloco. Motor sem
  desbloqueio: pendência do dev.

### 6. Recursos e nós

Regra de adaptação: **mesmo máximo diário por nó da referência**, com recarga esticada para caber no
ritmo do casual (12 h ± 45 min) e rendimento por coleta maior. Preço de venda = piso, ≈ 1,80 Gold/dia
por nó no ritmo máximo (driftwood e flint mantêm os valores da v1).

| Recurso | Nó | Ref (recarga × rendimento) | Nosso | Máx./dia/nó | Venda (Gold) |
|---|---|---|---|---|---|
| driftwood | tree | 2 h × 1 | 8 h × 4 | 12 | 0,15 |
| flint | flint_rock | 4 h × 1 | 8 h × 2 | 6 | 0,40 |
| rustite | rustite_node | 8 h × 1 | 8 h × 1 | 3 | 0,60 |
| glintstone | glintstone_node | 24 h × 1 | 20 h × 1 | 1,2 | 1,50 |
| dewquartz | dewquartz_node | 24 h × 1 (+2 a cada 5ª seguida) | 20 h × 1 (sem sequência) | 1,2 | 1,50 |
| sandglint | sandglint_node | 20 h × 10 (+20 a cada 3ª) | 20 h × 16 | 19,2 | 0,10 |
| cinderite | cinderite_node | 72 h × 1 (alimentado com colheitas) | 72 h × 1 | 0,33 | 5,40 |
| bellpear, mistplum, honeydate, firefig | frutíferas | sem tabela | 10 h × 3 [ASSUMPTION] | 7,2 | 0,25 |

Rendimento pode ter bônus de sequência / alimentação depois; não adotados para manter o motor simples.

### 7. Simulação (90 dias + projeção de 1095 dias, mesma política)

Perfis iguais à v1 (casual 2×/dia, ativo 8×/dia, bot a cada 60 s). Expansões, nós e desbloqueio
aplicados **fora do motor** (marcados `[FORA]`); nível do avatar ignorado. Gráfico:
`economy/sim/out/sim-90d.png`.

| Perfil | Ganho líquido/dia (vendas − sementes): dias 1–7 · 24–30 · **61–90** | Gasto em expansões (90 d) | Blocos no dia 90 | Gargalo no dia 90 |
|---|---|---|---|---|
| casual | 4,63 · 133 · **224** | 8 604 | 20 (`ochremesa_03` em espera) | Gold + dewquartz |
| ativo | 76,86 · 324 · **427** | 13 980 | 21 | dewquartz |
| bot | 284 · 466 · **623** | 25 500 | 22 | dewquartz |

Razões no regime (Gold/dia): **bot ÷ casual 2,78** (meta ≤ 3), **bot ÷ ativo 1,46** (alarme > 3),
ativo ÷ casual 1,90. Blocos no dia 90: bot ÷ casual 1,10. Sem alarme.

Dia em que cada perfil **completa** cada ilha (projeção) × referência:

| Ilha | Casual | Ativo | Bot | Referência (só tempo de obra, acumulado) |
|---|---|---|---|---|
| 1 (homestead) | dia 25 | dia 8 | dia 3,8 | 0,7 d (16 h 6 min) |
| 2 (breezewood) | dia 56 | dia 34 | dia 26 | 5,4 d |
| 3 (ochremesa) | dia 372 | dia 243 | dia 193 | 29,4 d |
| 4 (emberpeak) | não completa em 3 anos (bloco 29 no dia 968) | dia 1 047 | dia 758 | 63 d |

O dia de cada um dos 30 blocos por perfil está em `summary.json → projection` (e em
`profiles.*.blocks` com o gargalo de cada bloco nos 90 dias).

### 8. Problema: com Gold 1:1 as ilhas 3 e 4 ficam inviáveis para a nossa renda

- Na **Ilha 1** o casual leva **25 dias** (ref: 16 h). O Gold é o gargalo de todos os blocos: o casual
  ganha ~5 Gold/dia na 1ª semana (6 canteiros) e a ilha pede 720.
- Na **Ilha 3** (100 420 Gold) o ativo, a ~430 Gold/dia, leva ~8 meses; na **Ilha 4** (492 284) o
  ativo leva ~3 anos e o casual não chega.
- Materiais exclusivos também travam: `dewquartz` (564 na ilha 3 com 2–4 nós a 1,2/dia) é o gargalo
  do ativo e do bot desde o fim da ilha 2. Na referência esses volumes (e `sandglint`, `cinderite`)
  só fecham com mercado entre jogadores e bônus de rendimento, que não temos.
- Para a Ilha 1 caber em ~2–3 dias e a Ilha 3 em ~2 meses, a renda em Gold precisaria ser **~8 a 10×**
  maior. Com sementes de 0,01 a 10 Gold e margem 100 %→30 %, um canteiro rende no máximo ~3 Gold por
  colheita; 65 canteiros não chegam lá.

Opções para o usuário (não apliquei nenhuma; custos mantidos):

| Opção | Efeito esperado | Custo/risco |
|---|---|---|
| A. Aceitar jogo longo (Ilha 3 em ~1 ano para o casual) | nada a mudar | retenção: meses sem revelar bloco |
| B. Fator de conversão nos custos de bloco (ex.: 0,02–0,1) | ilhas no ritmo da ref | contraria a instrução "não mudar" |
| C. Subir volume/margem das culturas (ex.: `harvest_qty` maior nas medium/advanced; margem do topo acima de 30 %) | renda ×2–3, não ×8 | muda a faixa aprovada de margens; bot cresce junto (teto de lucro/h) |
| D. Nova fonte de Gold: pedidos de NPC/entregas (a ref paga o 1º bloco com a 1ª entrega) | pode cobrir a diferença sem mexer em culturas | sistema novo (game-designer); precisa de teto anti-bot |
| E. Renda de recursos maior (vender excedente acima do piso) | pequena: recurso vira concorrente da expansão | pouco efeito |
| F. Reduzir materiais exclusivos (dewquartz, sandglint, cinderite, frutas) ao que 1 jogador produz | destrava ativo/bot | não resolve o Gold |

Recomendação técnica: **D + C moderado** para as ilhas 1–2 e decidir B ou A para as ilhas 3–4.

### 9. Ferramentas (só proposta, não implementado nem simulado)

Ref: ferramenta consumível, 1 por coleta. Com Gold 1:1: machado 20, picareta 1 = 20 + 3 driftwood,
picareta 2 = 20 + 3 driftwood + 5 flint, picareta 3 = 80 + 3 driftwood + 5 rustite, picareta 4 =
100 + 3 driftwood + 3 glintstone (dewquartz), broca = 100 + 20 driftwood + 9 rustite + 10 honeydate
(no lugar do produto animal) (sandglint); cinderite e frutíferas sem ferramenta. **Inviável 1:1:** o
casual coleta ~24 árvores/dia no simulador → 480 Gold/dia só de machado, mais que a renda (224).
Proposta: preço por coleta ≈ 10–20 % do valor de venda do que a coleta rende (ex.: machado 0,10;
picareta 1 0,10 + 1 driftwood; picareta 2 0,20 + 1 driftwood + 1 flint; picareta 3 0,30 + 1 rustite;
picareta 4 0,30 + 1 glintstone; broca 0,20 + 2 driftwood + 1 rustite), ou ferramenta durável (20
usos pelo preço de 10). Simular antes de implementar: a cadeia consome materiais que os blocos pedem.

### 10. Outras regras propostas (dados, não implementadas)

- Pular obra: só com Gold, custo = 50 % do Gold do bloco × fração restante (mín. 0,50); proibido para
  obras > 24 h. Não simulado.
- Uma obra por vez; revelar reabastece **todos** os nós (simulado).

### Pendências para o dev (game-core)

- Reducers de expansão (`expansion.started`/`revealed`), coleta de nó e desbloqueio de cultura na loja
  lendo `world` (`packages/game-core/src/data/world.generated.ts`); `GameState` com blocos revelados,
  obra em andamento e nós (migração de save: fazenda atual = `homestead_01`).
- Exportar `world` no índice raiz `packages/game-core/src/index.ts` (fora do escopo do economista;
  hoje só em `src/data`).
- Sistema de XP (os `minLevel` vêm da ref e vão até 120; precisam ser recalibrados com a curva de XP).
- Renomear `coins`/`startingCoins` para `gold` (herdado da v1).

### Perguntas ao usuário

1. **Fã × código:** a tabela do fã (Ilha 1 = 60,25 de moeda; Ilha 3 = 81 600; Ilha 4 = 409 820) ou o
   código (720 / 100 420 / 492 284)? Usei o código.
2. **Moeda premium ("gema"):** (a) trocar por frutas 1:1 (proposto); (b) remover esse custo; (c) trocar
   por um minério raro (`glintstone`/exclusivo). Não há moeda premium por enquanto.
3. **Obras longas:** manter os totais da ref (obras de até 13,5 dias nas ilhas 3–4) ou limitar a 3 dias
   por bloco (ilha 3 cai para ~14 d e ilha 4 para ~12 d de obra), ou redistribuir os 30 blocos?
4. **`glowgourd`:** medium (10 h) com semente 6,60 (recomendado) ou advanced?
5. Uma cultura de **1 min** vale o custo (teto de lucro/h do bot +36 %)?
6. **Viabilidade (seção 8):** qual opção (A–F)?
7. Nós especiais finitos, flores e colmeias da ref: ficam fora (proposto) ou entram depois como conteúdo?
8. Custo de mudança de ilha (10 glintstone / 20 dewquartz / 200 sandglint) e idade mínima de conta
   (1 / 5 / 30 dias) nas travessias: aprovados?

### Sinalização ao `produtor` (regulatório)

Sem mudança em relação à v1: Gold off-chain, sem saque, expansão nunca custa token. Se o token
passar a comprar Gold ou materiais, os custos 1:1 da referência viram preço em dinheiro de progresso
(pay-to-win) e reabrem as perguntas token↔Gold da v1. Venda ao público não é decisão do economista.
