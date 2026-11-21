#!/usr/bin/env node
// Simulador de 90 dias da economia v0 para os perfis de economy/sim/profiles.json.
//
//   pnpm econ:sim     (= node --import ./economy/sim/register-ts.mjs economy/sim/simulate.mjs + plot.py)
//
// Usa o MOTOR REAL: toda compra, plantio, colheita e venda passa por `applyActions` de
// packages/game-core, com os números de economy.generated.ts (que precisa estar em dia com o CSV).
// Exceção: coleta de recursos ainda NÃO existe no motor (não há ação nem `ResourceNodeDef` em
// types.ts). O simulador replica a regra prevista (nó com recarga fixa, rendimento fixo, lidos de
// economy.csv) e credita o recurso no inventário por fora; a VENDA do recurso usa o motor.
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
function createFarm() {
  return {
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
    profile: profile.id,
    coins: Number(farm.state.coins),
    earned_crops: Number(farm.earnedCrops),
    earned_resources: Number(farm.earnedResources),
    spent_seeds: Number(farm.spent),
    harvests: farm.harvests,
    crop_units: farm.cropUnits,
    resource_units: farm.resourceUnits,
    items_produced: farm.cropUnits + farm.resourceUnits,
    inventory_units: inv,
    sessions: farm.sessions,
    actions: farm.actions,
  };
}

function simulate(profile) {
  const farm = createFarm();
  const rng = createRng(`${config.rngSeed}:${profile.id}`);
  const rows = [];
  let nextDay = 1;
  for (const [t, fn] of schedule(profile, farm, rng)) {
    while (t >= T0 + nextDay * DAY) rows.push(snapshot(farm, profile, nextDay++));
    fn();
  }
  while (nextDay <= config.days) rows.push(snapshot(farm, profile, nextDay++));

  // Conferência de consistência: saldo do motor = inicial + vendas − sementes.
  const expected = new Money(economy.rules.startingCoins).plus(farm.earnedCrops).plus(farm.earnedResources).minus(farm.spent);
  if (!expected.equals(new Money(farm.state.coins))) {
    throw new Error(`inconsistência de saldo em ${profile.id}: motor=${farm.state.coins} esperado=${expected.toString()}`);
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const all = [];
const byProfile = {};
for (const profile of config.profiles) {
  const started = performance.now();
  const rows = simulate(profile);
  byProfile[profile.id] = rows;
  all.push(...rows);
  console.log(`${profile.id.padEnd(7)} ${String(rows.at(-1).actions).padStart(8)} ações  ${((performance.now() - started) / 1000).toFixed(1)} s`);
}

const header = Object.keys(all[0]);
writeFileSync(join(OUT_DIR, "daily.csv"), [header.join(","), ...all.map((r) => header.map((k) => r[k]).join(","))].join("\n") + "\n");

const at = (id, day) => byProfile[id][day - 1];
const round = (x, d = 2) => Number(x.toFixed(d));
const summary = {
  generatedFrom: economy.meta.source,
  engine: "packages/game-core applyActions (coleta de recursos replicada fora do motor)",
  days: config.days,
  profiles: Object.fromEntries(
    config.profiles.map((p) => {
      const last = at(p.id, config.days);
      const d60 = at(p.id, 60);
      const earned = last.earned_crops + last.earned_resources;
      return [
        p.id,
        {
          label: p.label,
          coinsDay7: at(p.id, 7).coins,
          coinsDay30: at(p.id, 30).coins,
          coinsDay90: last.coins,
          coinsPerDayLast30: round((last.coins - d60.coins) / 30),
          sources: { cropSales: last.earned_crops, resourceSales: last.earned_resources },
          sinks: { seedPurchases: last.spent_seeds },
          sinkRatio: round(last.spent_seeds / earned, 3),
          harvests: last.harvests,
          itemsProduced: last.items_produced,
          inventoryUnitsDay90: last.inventory_units,
          sessions: last.sessions,
          actions: last.actions,
        },
      ];
    }),
  ),
};
const c = (id, day) => at(id, day).coins;
summary.ratios = Object.fromEntries(
  [7, 30, 90].map((d) => [
    `day${String(d)}`,
    { botOverCasual: round(c("bot", d) / c("casual", d)), botOverActive: round(c("bot", d) / c("active", d)), activeOverCasual: round(c("active", d) / c("casual", d)) },
  ]),
);
summary.ratios.steadyStatePerDay = {
  botOverCasual: round(summary.profiles.bot.coinsPerDayLast30 / summary.profiles.casual.coinsPerDayLast30),
  botOverActive: round(summary.profiles.bot.coinsPerDayLast30 / summary.profiles.active.coinsPerDayLast30),
  activeOverCasual: round(summary.profiles.active.coinsPerDayLast30 / summary.profiles.casual.coinsPerDayLast30),
};
summary.alarm = {
  rule: "bot > 3x ativo (skill web3-game-economy)",
  triggered: summary.ratios.steadyStatePerDay.botOverActive > 3,
};
writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary.ratios, null, 2));
