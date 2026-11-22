#!/usr/bin/env node
// Simulador de 90 dias da economia (v1, moeda Gold) para os perfis de economy/sim/profiles.json.
//
//   pnpm econ:sim     (= node --import ./economy/sim/register-ts.mjs economy/sim/simulate.mjs + plot.py)
//
// Usa o MOTOR REAL: toda compra, plantio, colheita e venda passa por `applyActions` de
// packages/game-core, com os números de economy.generated.ts (que precisa estar em dia com o CSV).
// Exceção: coleta de recursos ainda NÃO existe no motor (não há ação nem `ResourceNodeDef` em
// types.ts). O simulador replica a regra prevista (nó com recarga fixa, rendimento fixo, lidos de
// economy.csv) e credita o recurso no inventário por fora; a VENDA do recurso usa o motor.
//
// Dois cenários por perfil:
//   - "base": só o que existe no motor (sementes são o único sink).
//   - "sinks": + expansões, construção e upgrades PROPOSTOS em economy/sim/sinks-proposal.json.
//     Esses gastos são aplicados POR FORA DO MOTOR (o simulador debita o Gold e adiciona canteiros
//     direto no estado). Não são números oficiais; servem só para medir o efeito na inflação.
//
// Saída: economy/sim/out/daily.csv, economy/sim/out/summary.json (gráfico: economy/sim/plot.py).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyActions,
  createInitialState,
  createRng,
  economy,
  isCropReady,
  Money,
} from "../../packages/game-core/src/index.ts";
import { ECONOMY_DIR, loadEconomyCsv } from "../gen/economy-csv.mjs";
import { isGeneratedFresh } from "../gen/generate.mjs";

const SIM_DIR = join(ECONOMY_DIR, "sim");
const OUT_DIR = join(SIM_DIR, "out");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

if (!isGeneratedFresh()) {
  console.error("economy.generated.ts está desatualizado; rode `pnpm econ:gen` antes de simular.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(SIM_DIR, "profiles.json"), "utf8"));
const sinks = JSON.parse(readFileSync(join(SIM_DIR, "sinks-proposal.json"), "utf8"));
const SCENARIOS = ["base", "sinks"];
const csv = loadEconomyCsv();
const T0 = config.startEpochMs;
const SIM_END = T0 + config.days * DAY;

const crops = Object.values(economy.crops).map((c) => {
  const seedPrice = Number(economy.items[c.seedItemId].buyPrice);
  const gross = Number(economy.items[c.harvestItemId].sellPrice) * c.harvestQty;
  return { ...c, seedPrice, growMs: c.growSeconds * 1000, profit: gross - seedPrice, perHour: (gross - seedPrice) / (c.growSeconds / 3600) };
});
const QUICK_MS = Math.min(...crops.map((c) => c.growMs));
const byPerHour = [...crops].sort((a, b) => b.perHour - a.perHour);

// ---------------------------------------------------------------------------------------------
// Fazenda simulada: estado do motor + nós de recurso (fora do motor) + contadores.
// ---------------------------------------------------------------------------------------------
function createFarm(withSinks) {
  return {
    withSinks,
    sinkSpent: new Money(0),
    expansions: 0,
    buildingLevel: 0,
    harvestsByCrop: Object.fromEntries(crops.map((c) => [c.id, 0])),
    state: createInitialState(),
    nodes: csv.resources.flatMap((r) =>
      Array.from({ length: r.nodeCount }, () => ({ id: r.id, rechargeMs: r.rechargeSeconds * 1000, yieldQty: r.yieldQty, readyAt: T0 })),
    ),
    earnedCrops: new Money(0),
    earnedResources: new Money(0),
    spent: new Money(0),
    harvests: 0,
    cropUnits: 0,
    resourceUnits: 0,
    sessions: 0,
    actions: 0,
  };
}

function apply(farm, actions) {
  if (actions.length === 0) return;
  farm.state = applyActions(farm.state, actions);
  farm.actions += actions.length;
}

/**
 * Um "toque" do jogador no instante t: colhe o que está pronto, coleta nós prontos, vende tudo,
 * e planta nos canteiros vazios com a lista de preferência `candidates` (ordem = prioridade).
 */
function visit(farm, t, candidates) {
  // 1) colher
  const harvest = [];
  farm.state.plots.forEach((plot, plotIndex) => {
    if (plot.status === "planted" && isCropReady(plot, t)) {
      harvest.push({ type: "crop.harvested", payload: { plotIndex }, createdAt: t });
      const crop = economy.crops[plot.cropId];
      farm.harvests++;
      farm.harvestsByCrop[crop.id]++;
      farm.cropUnits += crop.harvestQty;
    }
  });
  apply(farm, harvest);

  // 2) coletar recursos — FORA DO MOTOR (ação ainda não existe em game-core)
  let inventory = farm.state.inventory;
  for (const node of farm.nodes) {
    if (node.readyAt <= t) {
      inventory = { ...inventory, [node.id]: (inventory[node.id] ?? 0) + node.yieldQty };
      node.readyAt = t + node.rechargeMs;
      farm.resourceUnits += node.yieldQty;
    }
  }
  farm.state = { ...farm.state, inventory };

  // 3) vender tudo que é vendível
  const sells = [];
  for (const [itemId, qty] of Object.entries(farm.state.inventory)) {
    const item = economy.items[itemId];
    if (item.sellPrice === null) continue;
    sells.push({ type: "item.sold", payload: { itemId, qty }, createdAt: t });
    const revenue = new Money(item.sellPrice).times(qty);
    if (item.kind === "resource") farm.earnedResources = farm.earnedResources.plus(revenue);
    else farm.earnedCrops = farm.earnedCrops.plus(revenue);
  }
  apply(farm, sells);

  // 3b) sinks propostos — FORA DO MOTOR (só no cenário "sinks")
  if (farm.withSinks) buySinks(farm);

  // 4) plantar (greedy por canteiro: 1ª cultura da lista com semente em estoque ou que caiba no caixa)
  let coins = Number(farm.state.coins);
  const owned = { ...farm.state.inventory };
  const toBuy = {};
  const plants = [];
  farm.state.plots.forEach((plot, plotIndex) => {
    if (plot.status !== "empty") return;
    for (const crop of candidates) {
      if ((owned[crop.seedItemId] ?? 0) > 0) {
        owned[crop.seedItemId]--;
      } else if (coins >= crop.seedPrice) {
        coins -= crop.seedPrice;
        toBuy[crop.seedItemId] = (toBuy[crop.seedItemId] ?? 0) + 1;
      } else continue;
      plants.push({ type: "crop.planted", payload: { plotIndex, cropId: crop.id }, createdAt: t });
      break;
    }
  });
  const buys = Object.entries(toBuy).map(([itemId, qty]) => {
    farm.spent = farm.spent.plus(new Money(economy.items[itemId].buyPrice).times(qty));
    return { type: "seed.bought", payload: { itemId, qty }, createdAt: t };
  });
  apply(farm, [...buys, ...plants]);
}

const round2 = (x) => Math.round(x * 100) / 100;
const expansionCost = (n) => round2(sinks.expansion.base * sinks.expansion.growth ** (n - 1));
const buildingCost = (level) => round2(sinks.building.base * sinks.building.growth ** (level - 1));

/**
 * FORA DO MOTOR: compra o próximo sink mais barato (expansão ou construção/upgrade) enquanto sobrar
 * Gold acima de uma reserva para replantar todos os canteiros. Edita o estado direto: debita o Gold
 * e, na expansão, acrescenta canteiros vazios. O efeito da construção não é modelado (sink puro).
 */
function buySinks(farm) {
  for (;;) {
    const options = [];
    if (farm.expansions < sinks.expansion.maxCount) {
      options.push({ kind: "expansion", cost: expansionCost(farm.expansions + 1), plots: sinks.expansion.plotsPerExpansion });
    }
    if (farm.buildingLevel < sinks.building.maxLevel) {
      options.push({ kind: "building", cost: buildingCost(farm.buildingLevel + 1), plots: 0 });
    }
    if (options.length === 0) return;
    const next = options.sort((a, b) => a.cost - b.cost)[0];
    const reserve = (farm.state.plots.length + next.plots) * sinks.reserveSeedGoldPerPlot;
    const coins = new Money(farm.state.coins);
    if (coins.lt(next.cost + reserve)) return;
    farm.state = {
      ...farm.state,
      coins: coins.minus(next.cost).toString(),
      plots: [...farm.state.plots, ...Array.from({ length: next.plots }, () => ({ status: "empty" }))],
    };
    farm.sinkSpent = farm.sinkSpent.plus(next.cost);
    if (next.kind === "expansion") farm.expansions++;
    else farm.buildingLevel++;
  }
}

/** Humano: até a próxima visita só uma colheita cabe ⇒ maximiza lucro POR COLHEITA entre as que ficam prontas. */
function forGap(gapMs) {
  const fitting = crops.filter((c) => c.growMs <= gapMs).sort((a, b) => b.profit - a.profit);
  const rest = crops.filter((c) => c.growMs > gapMs).sort((a, b) => a.growMs - b.growMs);
  return [...fitting, ...rest.slice(0, fitting.length === 0 ? 1 : 0)];
}

/** Dentro da sessão: só culturas que ficam prontas antes de o jogador sair, melhor lucro por hora. */
function forInSession(remainingMs) {
  return byPerHour.filter((c) => c.growMs <= remainingMs);
}

function humanSessions(profile, rng) {
  const out = [];
  for (let day = 0; day < config.days; day++) {
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

/** Produz a lista de eventos (t, fn) do perfil; o laço principal tira snapshots diários entre eles. */
function* schedule(profile, farm, rng) {
  if (profile.kind === "bot") {
    for (let t = T0; t < SIM_END; t += profile.tickSeconds * 1000) {
      const plots = farm.state.plots;
      const anything =
        plots.some((p) => p.status === "empty" || isCropReady(p, t)) || farm.nodes.some((n) => n.readyAt <= t);
      if (!anything) continue;
      yield [t, () => visit(farm, t, byPerHour)];
    }
    return;
  }
  const sessions = humanSessions(profile, rng);
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const next = sessions[i + 1] ?? SIM_END;
    const e = Math.min(s + profile.sessionMinutes * MIN, next - MIN);
    yield [s, () => farm.sessions++];
    let t = s;
    while (t + QUICK_MS <= e) {
      const tt = t;
      yield [tt, () => visit(farm, tt, forInSession(e - tt))];
      t += QUICK_MS;
    }
    yield [e, () => visit(farm, e, forGap(next - e))];
  }
}

function snapshot(farm, profile, day) {
  const inv = Object.values(farm.state.inventory).reduce((a, b) => a + b, 0);
  return {
    day,
    scenario: farm.withSinks ? "sinks" : "base",
    profile: profile.id,
    gold: Number(farm.state.coins),
    earned_crops: Number(farm.earnedCrops),
    earned_resources: Number(farm.earnedResources),
    spent_seeds: Number(farm.spent),
    spent_sinks: Number(farm.sinkSpent),
    plots: farm.state.plots.length,
    expansions: farm.expansions,
    building_level: farm.buildingLevel,
    harvests: farm.harvests,
    crop_units: farm.cropUnits,
    resource_units: farm.resourceUnits,
    items_produced: farm.cropUnits + farm.resourceUnits,
    inventory_units: inv,
    sessions: farm.sessions,
    actions: farm.actions,
  };
}

function simulate(profile, withSinks) {
  const farm = createFarm(withSinks);
  const rng = createRng(`${config.rngSeed}:${profile.id}`);
  const rows = [];
  let nextDay = 1;
  for (const [t, fn] of schedule(profile, farm, rng)) {
    while (t >= T0 + nextDay * DAY) rows.push(snapshot(farm, profile, nextDay++));
    fn();
  }
  while (nextDay <= config.days) rows.push(snapshot(farm, profile, nextDay++));

  // Conferência de consistência: saldo = inicial + vendas − sementes − sinks (fora do motor).
  const expected = new Money(economy.rules.startingCoins)
    .plus(farm.earnedCrops)
    .plus(farm.earnedResources)
    .minus(farm.spent)
    .minus(farm.sinkSpent);
  if (!expected.equals(new Money(farm.state.coins))) {
    throw new Error(`inconsistência de saldo em ${profile.id}: motor=${farm.state.coins} esperado=${expected.toString()}`);
  }
  return { rows, harvestsByCrop: farm.harvestsByCrop };
}

// ---------------------------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const all = [];
const runs = { base: {}, sinks: {} };
for (const scenario of SCENARIOS) {
  for (const profile of config.profiles) {
    const started = performance.now();
    const run = simulate(profile, scenario === "sinks");
    runs[scenario][profile.id] = run;
    all.push(...run.rows);
    console.log(
      `${scenario.padEnd(6)} ${profile.id.padEnd(7)} ${String(run.rows.at(-1).actions).padStart(8)} ações  ${((performance.now() - started) / 1000).toFixed(1)} s`,
    );
  }
}

const header = Object.keys(all[0]);
writeFileSync(join(OUT_DIR, "daily.csv"), [header.join(","), ...all.map((r) => header.map((k) => r[k]).join(","))].join("\n") + "\n");

const round = (x, d = 2) => Number(x.toFixed(d));
const at = (scenario, id, day) => runs[scenario][id].rows[day - 1];
/** Ganho líquido médio por dia nos dias 61–90 (regime): vendas − sementes, ANTES de sinks propostos. */
const netPerDay = (scenario, id) => {
  const a = at(scenario, id, 60);
  const b = at(scenario, id, config.days);
  const net = (r) => r.earned_crops + r.earned_resources - r.spent_seeds;
  return round((net(b) - net(a)) / 30);
};

function profileSummary(scenario, p) {
  const last = at(scenario, p.id, config.days);
  const d60 = at(scenario, p.id, 60);
  const earned = last.earned_crops + last.earned_resources;
  return {
    label: p.label,
    goldDay7: at(scenario, p.id, 7).gold,
    goldDay30: at(scenario, p.id, 30).gold,
    goldDay90: last.gold,
    goldPerDayLast30: round((last.gold - d60.gold) / 30),
    netEarnedPerDayLast30: netPerDay(scenario, p.id),
    sources: { cropSales: round(last.earned_crops), resourceSales: round(last.earned_resources) },
    sinks: { seedPurchases: round(last.spent_seeds), proposedSinksOutsideEngine: round(last.spent_sinks) },
    sinkRatio: round((last.spent_seeds + last.spent_sinks) / earned, 3),
    plotsDay90: last.plots,
    expansionsDay90: last.expansions,
    buildingLevelDay90: last.building_level,
    harvests: last.harvests,
    harvestsByCrop: runs[scenario][p.id].harvestsByCrop,
    itemsProduced: last.items_produced,
    sessions: last.sessions,
    actions: last.actions,
  };
}

function ratios(scenario) {
  const g = (id, d) => at(scenario, id, d).gold;
  const out = Object.fromEntries(
    [7, 30, 90].map((d) => [
      `day${String(d)}`,
      { botOverCasual: round(g("bot", d) / g("casual", d)), botOverActive: round(g("bot", d) / g("active", d)), activeOverCasual: round(g("active", d) / g("casual", d)) },
    ]),
  );
  const n = (id) => netPerDay(scenario, id);
  out.steadyStateNetPerDay = {
    botOverCasual: round(n("bot") / n("casual")),
    botOverActive: round(n("bot") / n("active")),
    activeOverCasual: round(n("active") / n("casual")),
  };
  return out;
}

const cropTable = crops.map((c) => ({
  id: c.id,
  seedGold: c.seedPrice,
  harvestGold: round(c.seedPrice + c.profit),
  profitGold: round(c.profit),
  marginPct: round((c.profit / c.seedPrice) * 100, 1),
  growMinutes: c.growSeconds / 60,
  profitPerHourPerPlot: round(c.perHour, 4),
}));

const summary = {
  generatedFrom: economy.meta.source,
  currency: "Gold (off-chain, precisão 0.01)",
  engine: "packages/game-core applyActions (coleta de recursos e sinks propostos aplicados fora do motor)",
  days: config.days,
  crops: cropTable,
  scenarios: {
    base: {
      doc: "Só o motor atual: sementes são o único sink.",
      profiles: Object.fromEntries(config.profiles.map((p) => [p.id, profileSummary("base", p)])),
      ratios: ratios("base"),
    },
    sinks: {
      doc: "PROPOSTA, FORA DO MOTOR: + expansões/construção/upgrades de economy/sim/sinks-proposal.json.",
      proposal: sinks,
      profiles: Object.fromEntries(config.profiles.map((p) => [p.id, profileSummary("sinks", p)])),
      ratios: ratios("sinks"),
    },
  },
};
summary.alarm = {
  rules: ["bot > 3x ativo (skill web3-game-economy)", "bot > 3x casual (pedido do usuário, 2026-11-22)"],
  triggered:
    summary.scenarios.base.ratios.steadyStateNetPerDay.botOverActive > 3 ||
    summary.scenarios.base.ratios.steadyStateNetPerDay.botOverCasual > 3,
};
writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ base: summary.scenarios.base.ratios, sinks: summary.scenarios.sinks.ratios }, null, 2));
