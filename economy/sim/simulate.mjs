#!/usr/bin/env node
// Simulador de 90 dias da economia v2.2 (Gold + Diamantes) para os perfis de economy/sim/profiles.json,
// em cada cenário de Diamantes de profiles.json → diamondScenarios (fonte de Diamantes ainda não decidida).
//
//   pnpm econ:sim     (= node --import ./economy/sim/register-ts.mjs economy/sim/simulate.mjs + plot.py)
//
// MOTOR REAL: toda compra de semente, plantio, colheita e venda passa por `applyActions` de
// packages/game-core, com os números de economy.generated.ts (precisa estar em dia com os CSVs).
//
// FORA DO MOTOR (o game-core ainda não tem estas regras; o simulador as aplica editando o estado
// direto, com os dados de world.generated.ts):
//   [FORA] coleta de nós de recurso (recarga e rendimento de `world.nodes`);
//   [FORA] Diamantes: saldo fora do GameState (o motor ainda não tem a moeda); crédito diário do
//          cenário (na 1ª visita de cada dia com sessão) ou compra sob demanda (cenário pagante,
//          100 Diamantes = US$ 1), débito no início da obra;
//   [FORA] expansões: checa e debita Gold + Diamantes + materiais (+ custo de mudança de ilha no 1º bloco da
//          ilha), uma obra por vez, idade mínima da conta; na revelação adiciona canteiros e nós,
//          reabastece TODOS os nós e libera as culturas do bloco;
//   [FORA] desbloqueio de culturas: o jogador só planta culturas de blocos já revelados;
//   [IGNORADO] nível mínimo do avatar (não existe XP no jogo ainda) — ver decisoes.md.
//
// Saída: economy/sim/out/daily.csv, economy/sim/out/summary.json (gráfico: economy/sim/plot.py).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyActions, createInitialState, createRng, economy, isCropReady, Money } from "../../packages/game-core/src/index.ts";
import { world } from "../../packages/game-core/src/data/index.ts";
import { ECONOMY_DIR } from "../gen/economy-csv.mjs";
import { isGeneratedFresh } from "../gen/generate.mjs";

const SIM_DIR = join(ECONOMY_DIR, "sim");
const OUT_DIR = join(SIM_DIR, "out");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

if (!isGeneratedFresh()) {
  console.error("economy.generated.ts / world.generated.ts desatualizados; rode `pnpm econ:gen` antes de simular.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(SIM_DIR, "profiles.json"), "utf8"));
const reference = JSON.parse(readFileSync(join(SIM_DIR, "reference-totals.json"), "utf8"));
const T0 = config.startEpochMs;
const BLOCKS = world.blockOrder.map((id) => world.blocks[id]);
const ISLANDS = Object.values(world.islands).sort((a, b) => a.order - b.order);

const crops = Object.values(economy.crops).map((c) => {
  const seedPrice = Number(economy.items[c.seedItemId].buyPrice);
  const gross = Number(economy.items[c.harvestItemId].sellPrice) * c.harvestQty;
  return {
    ...c,
    seedPrice,
    growMs: c.growSeconds * 1000,
    profit: gross - seedPrice,
    perHour: (gross - seedPrice) / (c.growSeconds / 3600),
    unlockOrder: world.blocks[world.cropUnlockBlock[c.id]].order,
  };
});
const QUICK_MS = Math.min(...crops.map((c) => c.growMs));
const byPerHour = [...crops].sort((a, b) => b.perHour - a.perHour);

/** Necessidade total de cada material do bloco `fromIndex` em diante (inclui travessias). */
function remainingNeeds(fromIndex) {
  const need = {};
  for (let i = fromIndex; i < BLOCKS.length; i++) {
    for (const [k, q] of Object.entries(blockCost(i).items)) need[k] = (need[k] ?? 0) + q;
  }
  return need;
}
/** Custo efetivo do bloco i: o do bloco + custo de mudança se for o 1º bloco de uma ilha (não inicial). */
function blockCost(i) {
  const b = BLOCKS[i];
  const items = { ...b.cost.items };
  const isl = world.islands[b.islandId];
  if (isl.blockIds[0] === b.id) for (const [k, q] of Object.entries(isl.crossingCost)) items[k] = (items[k] ?? 0) + q;
  return { gold: Number(b.cost.gold), diamonds: b.cost.diamonds, items };
}
// Preço em US$ por Diamante (pago em token pela cotação do momento): base (100 = US$ 1,50), pacote
// de 15 500 (−54%) e o maior pacote (200 000 = US$ 1 299, −56,7%). Custo por unidade; o pacote
// mínimo que cobre cada ilha fica no decisoes.md.
const PRICING = config.diamondPricing;
const USD_PER_DIAMOND = PRICING.basePer100Usd / 100;
const perUnit = (qty) => {
  const pk = PRICING.packs.find((p) => p.qty === qty);
  return pk.priceUsd / pk.qty;
};
const USD_TIERS = { base: USD_PER_DIAMOND, pack15500: perUnit(15500), pack200000: perUnit(200000) };
const usd = (diamonds) => Object.fromEntries(Object.entries(USD_TIERS).map(([k, v]) => [k, Math.round(diamonds * v * 100) / 100]));
const NEEDS_FROM = BLOCKS.map((_, i) => remainingNeeds(i));

// ---------------------------------------------------------------------------------------------
function createFarm(scenario) {
  const farm = {
    scenario,
    diamonds: 0,
    diamondsEarned: 0,
    diamondsBought: 0,
    diamondsSpent: 0,
    lastDiamondDay: -1,
    state: createInitialState(),
    nodes: [],
    revealed: 0, // quantos blocos revelados (o terreno inicial conta)
    build: null, // { index, readyAt }
    unlocked: new Set(),
    blockLog: BLOCKS.map((b) => ({ id: b.id, startedDay: null, revealedDay: null, blockers: {}, readyDay: {} })),
    earnedCrops: new Money(0),
    earnedResources: new Money(0),
    spentSeeds: new Money(0),
    spentExpansions: new Money(0),
    harvestsByCrop: Object.fromEntries(crops.map((c) => [c.id, 0])),
    collectionsByNode: Object.fromEntries(Object.keys(world.nodes).map((n) => [n, 0])),
    resourceUnits: 0,
    harvests: 0,
    sessions: 0,
    actions: 0,
  };
  reveal(farm, 0, T0); // terreno inicial: o estado do motor já tem os 6 canteiros
  return farm;
}

function apply(farm, actions) {
  if (actions.length === 0) return;
  farm.state = applyActions(farm.state, actions);
  farm.actions += actions.length;
}

/** [FORA] Revela o bloco i: canteiros + nós novos, reabastece todos os nós, libera culturas. */
function reveal(farm, i, t) {
  const b = BLOCKS[i];
  if (i > 0) farm.state = { ...farm.state, plots: [...farm.state.plots, ...Array.from({ length: b.adds.plots }, () => ({ status: "empty" }))] };
  for (const [nodeId, q] of Object.entries(b.adds.nodes)) {
    const def = world.nodes[nodeId];
    for (let k = 0; k < q; k++) farm.nodes.push({ id: nodeId, itemId: def.itemId, rechargeMs: def.rechargeSeconds * 1000, yieldQty: def.yieldQty, readyAt: t });
  }
  for (const n of farm.nodes) n.readyAt = Math.min(n.readyAt, t);
  for (const c of b.unlocksCrops) farm.unlocked.add(c);
  farm.revealed = i + 1;
  farm.build = null;
  farm.blockLog[i].revealedDay = (t - T0) / DAY;
}

/** [FORA] Tenta iniciar a próxima obra. Registra o que faltou (para a tabela de gargalos). */
function tryStartExpansion(farm, t) {
  if (farm.build || farm.revealed >= BLOCKS.length) return;
  const i = farm.revealed;
  const b = BLOCKS[i];
  const cost = blockCost(i);
  const missing = [];
  if ((t - T0) / DAY < b.minAccountDays) missing.push("idade");
  const coins = new Money(farm.state.coins);
  if (coins.lt(cost.gold)) missing.push("gold");
  for (const [k, q] of Object.entries(cost.items)) if ((farm.state.inventory[k] ?? 0) < q) missing.push(k);
  const log = farm.blockLog[i];
  // Dia em que cada requisito ficou pronto (o último a ficar pronto é o gargalo do bloco).
  const day = (t - T0) / DAY;
  if (log.firstTryDay === undefined) log.firstTryDay = day;
  for (const k of ["idade", "gold", ...Object.keys(cost.items)]) if (!missing.includes(k) && log.readyDay[k] === undefined) log.readyDay[k] = day;
  // Pagante: compra só a diferença, e só quando o resto do bloco já está pronto.
  if (missing.length === 0 && farm.scenario.buyOnDemand && farm.diamonds < cost.diamonds) {
    const buy = cost.diamonds - farm.diamonds;
    farm.diamonds += buy;
    farm.diamondsBought += buy;
  }
  if (farm.diamonds < cost.diamonds && !(farm.scenario.buyOnDemand && missing.length)) missing.push("diamonds");
  else if (cost.diamonds > 0 && log.readyDay.diamonds === undefined) log.readyDay.diamonds = day;
  if (missing.length) {
    farm.lastMissing = missing;
    return;
  }
  for (const m of farm.lastMissing ?? []) log.blockers[m] = true;
  farm.lastMissing = null;
  const inventory = { ...farm.state.inventory };
  for (const [k, q] of Object.entries(cost.items)) {
    inventory[k] -= q;
    if (inventory[k] === 0) delete inventory[k];
  }
  farm.state = { ...farm.state, coins: coins.minus(cost.gold).toString(), inventory };
  farm.diamonds -= cost.diamonds;
  farm.diamondsSpent += cost.diamonds;
  farm.spentExpansions = farm.spentExpansions.plus(cost.gold);
  farm.build = { index: i, readyAt: t + b.buildSeconds * 1000 };
  log.startedDay = (t - T0) / DAY;
}

/** Um "toque" do jogador no instante t. `choose(unlockedCrops)` devolve a lista de preferência; `mayExpand` = pode iniciar obra. */
function visit(farm, t, choose, mayExpand = true) {
  // 0) [FORA] revelar obra pronta (antes de colher: os nós reabastecidos já entram nesta visita)
  if (farm.build && farm.build.readyAt <= t) reveal(farm, farm.build.index, t);

  // [FORA] crédito diário de Diamantes (cenário com fonte): exige visita no dia; dia perdido não acumula.
  const today = Math.floor((t - T0) / DAY);
  if (farm.scenario.perDay > 0 && today > farm.lastDiamondDay) {
    farm.lastDiamondDay = today;
    farm.diamonds += farm.scenario.perDay;
    farm.diamondsEarned += farm.scenario.perDay;
  }

  // 1) colher (motor)
  const harvest = [];
  farm.state.plots.forEach((plot, plotIndex) => {
    if (plot.status === "planted" && isCropReady(plot, t)) {
      harvest.push({ type: "crop.harvested", payload: { plotIndex }, createdAt: t });
      farm.harvests++;
      farm.harvestsByCrop[plot.cropId]++;
    }
  });
  apply(farm, harvest);

  // 2) [FORA] coletar nós prontos
  let inventory = farm.state.inventory;
  let changed = false;
  for (const node of farm.nodes) {
    if (node.readyAt <= t) {
      inventory = { ...inventory, [node.itemId]: (inventory[node.itemId] ?? 0) + node.yieldQty };
      node.readyAt = t + node.rechargeMs;
      farm.resourceUnits += node.yieldQty;
      farm.collectionsByNode[node.id]++;
      changed = true;
    }
  }
  if (changed) farm.state = { ...farm.state, inventory };

  // 3) vender (motor): todas as colheitas; recurso só o excedente do que as expansões restantes pedem
  const need = farm.revealed < BLOCKS.length ? NEEDS_FROM[farm.build ? farm.revealed + 1 : farm.revealed] ?? {} : {};
  const sells = [];
  for (const [itemId, qty] of Object.entries(farm.state.inventory)) {
    const item = economy.items[itemId];
    if (item.sellPrice === null) continue;
    const sellQty = item.kind === "resource" ? qty - (need[itemId] ?? 0) : qty;
    if (sellQty <= 0) continue;
    sells.push({ type: "item.sold", payload: { itemId, qty: sellQty }, createdAt: t });
    const revenue = new Money(item.sellPrice).times(sellQty);
    if (item.kind === "resource") farm.earnedResources = farm.earnedResources.plus(revenue);
    else farm.earnedCrops = farm.earnedCrops.plus(revenue);
  }
  apply(farm, sells);

  // 4) plantar (motor) só culturas desbloqueadas [FORA]: greedy por canteiro
  const candidates = choose(crops.filter((c) => farm.unlocked.has(c.id)));
  let coins = Number(farm.state.coins);
  const owned = { ...farm.state.inventory };
  const toBuy = {};
  const plants = [];
  farm.state.plots.forEach((plot, plotIndex) => {
    if (plot.status !== "empty") return;
    for (const crop of candidates) {
      if ((owned[crop.seedItemId] ?? 0) > 0) owned[crop.seedItemId]--;
      else if (coins >= crop.seedPrice) {
        coins -= crop.seedPrice;
        toBuy[crop.seedItemId] = (toBuy[crop.seedItemId] ?? 0) + 1;
      } else continue;
      plants.push({ type: "crop.planted", payload: { plotIndex, cropId: crop.id }, createdAt: t });
      break;
    }
  });
  const buys = Object.entries(toBuy).map(([itemId, qty]) => {
    farm.spentSeeds = farm.spentSeeds.plus(new Money(economy.items[itemId].buyPrice).times(qty));
    return { type: "seed.bought", payload: { itemId, qty }, createdAt: t };
  });
  apply(farm, [...buys, ...plants]);

  // 5) [FORA] expansão com o Gold que sobrou DEPOIS de replantar (sementes já reservadas).
  //    Humano só decide na visita de saída (senão gastaria o Gold da semente longa da saída).
  if (mayExpand) tryStartExpansion(farm, t);
}

/** Humano: entre visitas cabe uma colheita ⇒ maior lucro POR COLHEITA entre as que ficam prontas. */
const forGap = (gapMs) => (unlocked) => {
  const fitting = unlocked.filter((c) => c.growMs <= gapMs).sort((a, b) => b.profit - a.profit);
  const rest = unlocked.filter((c) => c.growMs > gapMs).sort((a, b) => a.growMs - b.growMs);
  return [...fitting, ...rest.slice(0, fitting.length === 0 ? 1 : 0)];
};
/** Dentro da sessão: só o que fica pronto antes de sair, melhor lucro por hora. */
const forInSession = (remainingMs) => (unlocked) => unlocked.filter((c) => c.growMs <= remainingMs).sort((a, b) => b.perHour - a.perHour);
const botChoice = (unlocked) => [...unlocked].sort((a, b) => b.perHour - a.perHour);

function humanSessions(profile, rng, days) {
  const SIM_END = T0 + days * DAY;
  const out = [];
  for (let day = 0; day < days; day++) {
    for (const hhmm of profile.sessions) {
      const [h, m] = hhmm.split(":").map(Number);
      const skip = rng.next() < profile.skipChance;
      const jitter = Math.round((rng.next() * 2 - 1) * profile.jitterMinutes) * MIN;
      if (skip) continue;
      out.push(T0 + day * DAY + h * HOUR + m * MIN + jitter);
    }
  }
  return out.filter((s) => s >= T0 && s < SIM_END).sort((a, b) => a - b);
}

function canStartCheap(farm, t) {
  if (farm.build || farm.revealed >= BLOCKS.length) return false;
  const i = farm.revealed;
  if ((t - T0) / DAY < BLOCKS[i].minAccountDays) return false;
  const cost = blockCost(i);
  return (
    Number(farm.state.coins) >= cost.gold &&
    (farm.scenario.buyOnDemand || farm.diamonds >= cost.diamonds) &&
    Object.entries(cost.items).every(([k, q]) => (farm.state.inventory[k] ?? 0) >= q)
  );
}

function* schedule(profile, farm, rng, days) {
  const SIM_END = T0 + days * DAY;
  if (profile.kind === "bot") {
    for (let t = T0; t < SIM_END; t += profile.tickSeconds * 1000) {
      const anything =
        farm.state.plots.some((p) => p.status === "empty" || isCropReady(p, t)) ||
        farm.nodes.some((n) => n.readyAt <= t) ||
        (farm.build && farm.build.readyAt <= t) ||
        canStartCheap(farm, t);
      if (!anything) continue;
      yield [t, () => visit(farm, t, botChoice)];
    }
    return;
  }
  const sessions = humanSessions(profile, rng, days);
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const next = sessions[i + 1] ?? SIM_END;
    const e = Math.min(s + profile.sessionMinutes * MIN, next - MIN);
    yield [s, () => farm.sessions++];
    let t = s;
    while (t + QUICK_MS <= e) {
      const tt = t;
      yield [tt, () => visit(farm, tt, forInSession(e - tt), false)];
      t += QUICK_MS;
    }
    yield [e, () => visit(farm, e, forGap(next - e))];
  }
}

function snapshot(farm, profile, day) {
  return {
    scenario: farm.scenario.id,
    day,
    profile: profile.id,
    gold: Number(farm.state.coins),
    earned_crops: Number(farm.earnedCrops),
    earned_resources: Number(farm.earnedResources),
    spent_seeds: Number(farm.spentSeeds),
    spent_expansions: Number(farm.spentExpansions),
    diamonds: farm.diamonds,
    diamonds_earned: farm.diamondsEarned,
    diamonds_bought: farm.diamondsBought,
    diamonds_spent: farm.diamondsSpent,
    blocks_revealed: farm.revealed,
    plots: farm.state.plots.length,
    nodes: farm.nodes.length,
    harvests: farm.harvests,
    resource_units: farm.resourceUnits,
    sessions: farm.sessions,
    actions: farm.actions,
  };
}

/** Sem fonte de Diamantes e o próximo bloco pede mais do que o saldo: travado para sempre. */
const stuckForever = (farm) =>
  farm.scenario.perDay === 0 && !farm.scenario.buyOnDemand && !farm.build && farm.revealed < BLOCKS.length && blockCost(farm.revealed).diamonds > farm.diamonds;

function simulate(profile, days, scenario) {
  const farm = createFarm(scenario);
  const rng = createRng(`${config.rngSeed}:${profile.id}`);
  const rows = [];
  let nextDay = 1;
  for (const [t, fn] of schedule(profile, farm, rng, days)) {
    while (t >= T0 + nextDay * DAY) rows.push(snapshot(farm, profile, nextDay++));
    fn();
    if (days > config.days && (farm.revealed >= BLOCKS.length || stuckForever(farm))) break; // projeção: para ao completar (ou travar sem saída)
  }
  while (nextDay <= days) rows.push(snapshot(farm, profile, nextDay++));
  const expected = new Money(economy.rules.startingCoins)
    .plus(farm.earnedCrops)
    .plus(farm.earnedResources)
    .minus(farm.spentSeeds)
    .minus(farm.spentExpansions);
  if (!expected.equals(new Money(farm.state.coins))) {
    throw new Error(`inconsistência de saldo em ${profile.id}: motor=${farm.state.coins} esperado=${expected.toString()}`);
  }
  return { rows, farm };
}

// ---------------------------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const round = (x, d = 2) => Number(x.toFixed(d));
const SCENARIOS = config.diamondScenarios;
const REGIME = [61, config.days];
const net = (r) => r.earned_crops + r.earned_resources - r.spent_seeds;

// Totais por ilha (dados) para comparar com a referência.
const islandsData = ISLANDS.map((isl) => {
  const items = {};
  let gold = 0;
  let diamonds = 0;
  let seconds = 0;
  const idx = isl.blockIds.map((id) => world.blockOrder.indexOf(id));
  for (const i of idx) {
    const c = blockCost(i);
    gold += c.gold;
    diamonds += c.diamonds;
    seconds += BLOCKS[i].buildSeconds;
    for (const [k, q] of Object.entries(BLOCKS[i].cost.items)) items[k] = (items[k] ?? 0) + q;
  }
  const upTo = idx.at(-1);
  const plots = BLOCKS.slice(0, upTo + 1).reduce((a, b) => a + b.adds.plots, 0);
  const nodes = {};
  for (const b of BLOCKS.slice(0, upTo + 1)) for (const [k, q] of Object.entries(b.adds.nodes)) nodes[k] = (nodes[k] ?? 0) + q;
  return { id: isl.id, blocks: isl.blockIds.length, gold, diamonds, diamondsUsd: usd(diamonds), items, crossingCost: isl.crossingCost, buildSeconds: seconds, finalPlots: plots, finalNodes: nodes };
});

/**
 * Diamantes/dia (taxa constante, crédito diário) para que os Diamantes nunca atrasem um calendário
 * de início de obras: max_k (Diamantes acumulados até o bloco k) / (dia de início de k).
 * `startDays[k]` = dia em que o bloco k começaria sem esperar Diamantes.
 */
function requiredRate(startDays) {
  let cum = 0;
  let worst = { perDay: 0, block: null };
  BLOCKS.forEach((b, k) => {
    cum += b.cost.diamonds;
    const d = startDays[k];
    if (b.cost.diamonds === 0 || d === null || d === undefined) return;
    const rate = cum / Math.max(d, 1); // crédito do dia 0 já conta: no mínimo 1 dia de crédito
    if (rate > worst.perDay) worst = { perDay: round(rate, 1), block: b.id, cumulative: cum, day: round(d, 2) };
  });
  return worst;
}
// Ritmo da referência = só tempo de obra, sem esperar Gold nem material.
const refStart = [];
{
  let acc = 0;
  for (const b of BLOCKS) {
    refStart.push(acc / 86400);
    acc += b.buildSeconds;
  }
}
const refByIsland = Object.fromEntries(
  ISLANDS.map((isl) => {
    const idx = isl.blockIds.map((id) => world.blockOrder.indexOf(id));
    const sub = BLOCKS.map((_, k) => (idx.includes(k) ? refStart[k] : null));
    return [isl.id, requiredRate(sub)];
  }),
);
const referencePace = {
  doc: "Diamantes/dia para não atrasar o ritmo da referência (obra contínua desde o dia 0, sem esperar Gold/material)",
  overall: requiredRate(refStart),
  islandAverage: Object.fromEntries(islandsData.map((d) => [d.id, d.buildSeconds ? round(d.diamonds / (d.buildSeconds / 86400), 1) : 0])),
  byIslandWorstBlock: refByIsland,
};

function profileSummary(p, run) {
  const { farm, rows } = run;
  const at = (day) => rows[day - 1];
  const netPerDay = (a, b) => round((net(at(b)) - (a > 1 ? net(at(a - 1)) : 0)) / (b - a + 1));
  const last = at(config.days);
  const islands = Object.fromEntries(
    ISLANDS.map((isl) => {
      const lastB = farm.blockLog.find((l) => l.id === isl.blockIds.at(-1));
      return [isl.id, lastB.revealedDay === null ? null : round(lastB.revealedDay, 2)];
    }),
  );
  return {
    label: p.label,
    goldDay7: at(7).gold,
    goldDay30: at(30).gold,
    goldDay90: last.gold,
    netPerDay: { days1to7: netPerDay(1, 7), days24to30: netPerDay(24, 30), regime61to90: netPerDay(...REGIME) },
    sources: { cropSales: round(last.earned_crops), resourceSales: round(last.earned_resources) },
    sinks: { seeds: round(last.spent_seeds), expansionsOutsideEngine: round(last.spent_expansions) },
    diamonds: { earned: last.diamonds_earned, bought: last.diamonds_bought, boughtUsd: usd(last.diamonds_bought), spent: last.diamonds_spent, balanceDay90: last.diamonds },
    blocksRevealedDay90: last.blocks_revealed,
    nextBlock: BLOCKS[last.blocks_revealed]?.id ?? null,
    nextBlockMissing: farm.lastMissing ?? null,
    plotsDay90: last.plots,
    nodesDay90: last.nodes,
    islandsCompletedDay: islands,
    blocks: blockTable(farm),
    harvestsByCrop: farm.harvestsByCrop,
    collectionsByNode: farm.collectionsByNode,
    inventoryDay90: farm.state.inventory,
    sessions: last.sessions,
    actions: last.actions,
  };
}
/**
 * Por bloco: início, revelação, o que faltou na última tentativa e o requisito que ficou pronto por
 * último (gargalo; "sessão" = nada faltou, só esperou a próxima visita).
 */
function blockTable(farm) {
  return farm.blockLog.map((l) => {
    const ready = Object.entries(l.readyDay);
    const bottleneck = ready.length && l.startedDay !== null ? ready.sort((a, b) => b[1] - a[1])[0] : null;
    return {
      id: l.id,
      startedDay: l.startedDay === null ? null : round(l.startedDay, 2),
      revealedDay: l.revealedDay === null ? null : round(l.revealedDay, 2),
      waitedFor: Object.keys(l.blockers),
      // "sessão" = tudo já estava pronto na 1ª tentativa; só esperou o jogador voltar.
      bottleneck: bottleneck ? (bottleneck[1] - l.firstTryDay > 1e-9 ? bottleneck[0] : "sessão") : null,
    };
  });
}

const scenarios = {};
const dailyRows = [];
for (const sc of SCENARIOS) {
  const runs = {};
  const projection = {};
  for (const profile of config.profiles) {
    const started = performance.now();
    if (sc.ninetyDays !== false) runs[profile.id] = simulate(profile, config.days, sc);
    const proj = simulate(profile, config.projectionDays, sc);
    const { farm, rows } = proj;
    const lastRow = rows.at(-1);
    const startDays = farm.blockLog.map((l) => l.startedDay);
    projection[profile.id] = {
      islandsCompletedDay: Object.fromEntries(
        ISLANDS.map((isl) => {
          const l = farm.blockLog.find((x) => x.id === isl.blockIds.at(-1));
          return [isl.id, l.revealedDay === null ? null : round(l.revealedDay, 1)];
        }),
      ),
      blocks: Object.fromEntries(farm.blockLog.map((l) => [l.id, l.revealedDay === null ? null : round(l.revealedDay, 1)])),
      blockTable: blockTable(farm),
      blocksRevealed: farm.revealed,
      stuckAt: farm.revealed < BLOCKS.length ? { block: BLOCKS[farm.revealed].id, missing: stuckForever(farm) ? ["diamonds"] : (farm.lastMissing ?? null), sinceDay: farm.blockLog[farm.revealed - 1]?.revealedDay === null ? null : round(farm.blockLog[farm.revealed - 1].revealedDay, 1) } : null,
      diamondsBought: lastRow.diamonds_bought,
      diamondsBoughtUsd: usd(lastRow.diamonds_bought),
      diamondsEarned: lastRow.diamonds_earned,
      requiredPerDayForThisPace: sc.buyOnDemand ? requiredRate(startDays) : undefined,
      lastDay: rows.length,
    };
    console.log(`${sc.id.padEnd(7)} ${profile.id.padEnd(7)} ${((performance.now() - started) / 1000).toFixed(1)} s  blocos=${String(farm.revealed)}  ilhas=${JSON.stringify(projection[profile.id].islandsCompletedDay)}`);
  }
  const profiles = Object.fromEntries(config.profiles.filter(() => sc.ninetyDays !== false).map((p) => [p.id, profileSummary(p, runs[p.id])]));
  for (const p of config.profiles) if (runs[p.id]) dailyRows.push(...runs[p.id].rows);
  const ratio = (a, b) => (b ? round(a / b) : null);
  const n = (id) => profiles[id]?.netPerDay.regime61to90;
  const ratios = profiles.bot
    ? {
        regimeNetPerDay: { botOverCasual: ratio(n("bot"), n("casual")), botOverActive: ratio(n("bot"), n("active")), activeOverCasual: ratio(n("active"), n("casual")) },
        blocksDay90: { botOverCasual: ratio(profiles.bot.blocksRevealedDay90, profiles.casual.blocksRevealedDay90), botOverActive: ratio(profiles.bot.blocksRevealedDay90, profiles.active.blocksRevealedDay90) },
      }
    : null;
  scenarios[sc.id] = { label: sc.label, perDay: sc.perDay, buyOnDemand: !!sc.buyOnDemand, doc: sc.doc, profiles, ratios, projection };
  if (ratios) console.log(sc.id, JSON.stringify(ratios));
}

const header = Object.keys(dailyRows[0]);
writeFileSync(join(OUT_DIR, "daily.csv"), [header.join(","), ...dailyRows.map((r) => header.map((k) => r[k]).join(","))].join("\n") + "\n");

const cropTable = crops
  .sort((a, b) => a.growMs - b.growMs)
  .map((c) => ({
    id: c.id,
    seedGold: c.seedPrice,
    harvestGold: round(c.seedPrice + c.profit),
    profitGold: round(c.profit),
    marginPct: round((c.profit / c.seedPrice) * 100, 1),
    growMinutes: c.growSeconds / 60,
    profitPerHourPerPlot: round(c.perHour, 4),
    unlockBlock: world.cropUnlockBlock[c.id],
  }));

const summary = {
  generatedFrom: `${economy.meta.source} | ${world.meta.source}`,
  currency:
    "Gold (off-chain, precisão 0.01) = moeda soft da referência 1:1; Diamantes (off-chain, inteiro) = gema da referência 1:1, comprados com token a 100 = US$ 1,50 (base) com pacotes (decisões do usuário 2026-11-22)",
  engine: "packages/game-core applyActions para sementes/plantio/colheita/venda; nós, Diamantes, expansões e desbloqueio FORA do motor; nível do avatar IGNORADO",
  days: config.days,
  diamondPricing: { ...PRICING, usdPerDiamond: USD_TIERS },
  crops: cropTable,
  islandsData,
  reference,
  referencePace,
  scenarios,
  projectionDays: config.projectionDays,
};
summary.alarm = {
  rules: ["bot > 3x ativo (skill web3-game-economy)", "bot > 3x casual (pedido do usuário, 2026-11-22)"],
  triggered: Object.fromEntries(
    Object.entries(scenarios)
      .filter(([, v]) => v.ratios)
      .map(([k, v]) => [k, (v.ratios.regimeNetPerDay.botOverActive ?? 0) > 3 || (v.ratios.regimeNetPerDay.botOverCasual ?? 0) > 3]),
  ),
};
writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log("referencePace", JSON.stringify(referencePace.overall), JSON.stringify(referencePace.islandAverage));
