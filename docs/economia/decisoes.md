# Decisões de economia

Uma entrada por decisão: data, o que mudou, por quê, simulação usada.

---

## 2026-11-21 — Economia v0: 4 culturas, 2 recursos, regras iniciais

**Status:** proposta v0 — **reprovada pelo usuário em 2026-11-21** ("os números estão muito grandes"). Refazer em escala menor. Decisão sobre saldos da testnet na Fase 2: adiada pelo usuário.
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
