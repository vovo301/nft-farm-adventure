// Leitura e validação de economy/economy.csv (fonte única dos números do jogo).
// Usado pelo gerador (generate.mjs) e pelo simulador (economy/sim/simulate.mjs).
// Formato documentado em economy/README.md.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ECONOMY_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = join(ECONOMY_DIR, "..");
export const CSV_PATH = join(ECONOMY_DIR, "economy.csv");

export const COLUMNS = [
  "row_type",
  "id",
  "seed_price",
  "sell_price",
  "grow_seconds",
  "harvest_qty",
  "node_id",
  "recharge_seconds",
  "yield_qty",
  "unlock_block",
  "value",
  "note",
];

/** Colunas obrigatórias por tipo de linha; as demais (exceto `note`) devem ficar vazias. */
const REQUIRED = {
  rule: ["value"],
  start_item: ["value"],
  crop: ["seed_price", "sell_price", "grow_seconds", "harvest_qty", "unlock_block"],
  resource: ["sell_price", "node_id", "recharge_seconds", "yield_qty"],
};

const RULES = {
  starting_gold: "gold",
  starting_plot_count: "posint",
  max_quantity_per_action: "posint",
};

const ID_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const POSINT_RE = /^[1-9]\d*$/;
/** Precisão do Gold: 0,01. Todo preço/saldo precisa ser múltiplo de 0,01 (no máximo 2 casas). */
const GOLD_RE = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

/** Converte um decimal canônico de até 2 casas em centavos de Gold (inteiro, sem float). */
export function toCents(value) {
  const [int, frac = ""] = value.split(".");
  return Number(int) * 100 + Number(frac.padEnd(2, "0"));
}

/** Parser CSV mínimo (RFC 4180): vírgula, aspas duplas, "" como escape, LF ou CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quoted) throw new Error("CSV: aspas não fechadas");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/**
 * Lê, valida e devolve o modelo da economia. Lança um Error com TODOS os problemas encontrados.
 * @returns {{ hash: string, rules: Record<string,string>, startItems: {id:string,qty:number}[],
 *   crops: {id:string,seedPrice:string,sellPrice:string,growSeconds:number,harvestQty:number,unlockBlock:string,note:string}[],
 *   resources: {id:string,sellPrice:string,nodeId:string,rechargeSeconds:number,yieldQty:number,note:string}[] }}
 */
export function loadEconomyCsv(path = CSV_PATH) {
  const text = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
  const rows = parseCsv(text);
  const errors = [];
  const err = (line, msg) => errors.push(`economy.csv:${String(line)}: ${msg}`);

  const header = rows[0] ?? [];
  if (header.join(",") !== COLUMNS.join(",")) {
    throw new Error(`economy.csv: cabeçalho deve ser exatamente:\n${COLUMNS.join(",")}`);
  }

  const model = { hash, rules: {}, startItems: [], crops: [], resources: [] };
  const seenIds = new Map();

  rows.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    if (cells.length !== COLUMNS.length) {
      err(line, `esperava ${String(COLUMNS.length)} colunas, achou ${String(cells.length)}`);
      return;
    }
    const r = Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i].trim()]));
    const required = REQUIRED[r.row_type];
    if (!required) {
      err(line, `row_type desconhecido "${r.row_type}" (use: ${Object.keys(REQUIRED).join(", ")})`);
      return;
    }
    if (!ID_RE.test(r.id)) err(line, `id "${r.id}" deve ser snake_case ascii minúsculo`);
    for (const col of COLUMNS.slice(2, -1)) {
      const filled = r[col] !== "";
      if (required.includes(col) && !filled) err(line, `${r.row_type} exige a coluna ${col}`);
      if (!required.includes(col) && filled) err(line, `${r.row_type} não usa a coluna ${col} (deixe vazia)`);
    }
    const gold = (col) => {
      if (!GOLD_RE.test(r[col])) err(line, `${col}="${r[col]}" deve ser Gold com no máximo 2 casas (múltiplo de 0.01)`);
      return r[col];
    };
    const int = (col) => {
      if (!POSINT_RE.test(r[col])) err(line, `${col}="${r[col]}" deve ser inteiro > 0`);
      return Number(r[col]);
    };
    const claim = (id) => {
      if (seenIds.has(id)) err(line, `id "${id}" duplicado (já usado na linha ${String(seenIds.get(id))})`);
      seenIds.set(id, line);
    };

    switch (r.row_type) {
      case "rule": {
        const kind = RULES[r.id];
        if (!kind) {
          err(line, `regra desconhecida "${r.id}" (use: ${Object.keys(RULES).join(", ")})`);
          return;
        }
        if (r.id in model.rules) err(line, `regra "${r.id}" duplicada`);
        model.rules[r.id] = kind === "gold" ? gold("value") : String(int("value"));
        break;
      }
      case "start_item":
        model.startItems.push({ id: r.id, qty: int("value"), line });
        break;
      case "crop": {
        claim(r.id);
        claim(`${r.id}_seed`);
        const crop = {
          id: r.id,
          seedPrice: gold("seed_price"),
          sellPrice: gold("sell_price"),
          growSeconds: int("grow_seconds"),
          harvestQty: int("harvest_qty"),
          unlockBlock: r.unlock_block,
          note: r.note,
        };
        if (GOLD_RE.test(crop.seedPrice) && GOLD_RE.test(crop.sellPrice) && Number.isInteger(crop.harvestQty)) {
          // Aritmética em centavos inteiros: lucro por colheita >= 0.01 Gold (nunca arredonda para 0).
          const grossCents = toCents(crop.sellPrice) * crop.harvestQty;
          const seedCents = toCents(crop.seedPrice);
          if (seedCents < 1) err(line, `cultura "${r.id}": semente precisa custar >= 0.01 Gold`);
          if (grossCents - seedCents < 1) {
            err(line, `cultura "${r.id}" não dá lucro de pelo menos 0.01: venda×qtd (${String(grossCents)}c) - semente (${String(seedCents)}c) < 1c`);
          }
        }
        model.crops.push(crop);
        break;
      }
      case "resource":
        claim(r.id);
        if (!ID_RE.test(r.node_id)) err(line, `node_id "${r.node_id}" deve ser snake_case ascii minúsculo`);
        model.resources.push({
          id: r.id,
          sellPrice: gold("sell_price"),
          nodeId: r.node_id,
          rechargeSeconds: int("recharge_seconds"),
          yieldQty: int("yield_qty"),
          note: r.note,
        });
        break;
    }
  });

  for (const name of Object.keys(RULES)) {
    if (!(name in model.rules)) errors.push(`economy.csv: falta a regra "${name}"`);
  }
  const startSeen = new Set();
  for (const s of model.startItems) {
    if (!seenIds.has(s.id)) errors.push(`economy.csv:${String(s.line)}: start_item "${s.id}" não é item conhecido`);
    if (startSeen.has(s.id)) errors.push(`economy.csv:${String(s.line)}: start_item "${s.id}" duplicado`);
    startSeen.add(s.id);
  }
  if (model.crops.length === 0) errors.push("economy.csv: nenhuma cultura (row_type=crop)");
  const growTimes = model.crops.map((c) => c.growSeconds);
  if (new Set(growTimes).size !== growTimes.length) errors.push("economy.csv: duas culturas com o mesmo grow_seconds");
  const nodeIds = model.resources.map((r) => r.nodeId);
  if (new Set(nodeIds).size !== nodeIds.length) errors.push("economy.csv: dois recursos com o mesmo node_id");
  for (const n of nodeIds) if (seenIds.has(n)) errors.push(`economy.csv: node_id "${n}" colide com um id de item`);

  if (errors.length > 0) throw new Error(`economy.csv inválido:\n  - ${errors.join("\n  - ")}`);
  model.startItems = model.startItems.map(({ id, qty }) => ({ id, qty }));
  return model;
}

/** Converte o modelo no objeto `EconomyData` (contrato em packages/game-core/src/data/types.ts). */
export function toEconomyData(model, version = "v2") {
  const items = {};
  for (const c of model.crops) {
    items[`${c.id}_seed`] = { id: `${c.id}_seed`, kind: "seed", buyPrice: c.seedPrice, sellPrice: null };
  }
  for (const c of model.crops) items[c.id] = { id: c.id, kind: "crop", buyPrice: null, sellPrice: c.sellPrice };
  for (const r of model.resources) items[r.id] = { id: r.id, kind: "resource", buyPrice: null, sellPrice: r.sellPrice };

  const crops = {};
  for (const c of model.crops) {
    crops[c.id] = {
      id: c.id,
      seedItemId: `${c.id}_seed`,
      harvestItemId: c.id,
      growSeconds: c.growSeconds,
      harvestQty: c.harvestQty,
    };
  }

  return {
    meta: { version, placeholder: false, source: `economy/economy.csv@sha256:${model.hash}` },
    rules: {
      // Contrato ainda chama o saldo de `startingCoins`/`coins`; a moeda é o Gold (renomear o
      // contrato é tarefa do game-core, com migração de save).
      startingCoins: model.rules.starting_gold,
      startingPlotCount: Number(model.rules.starting_plot_count),
      startingInventory: Object.fromEntries(model.startItems.map((s) => [s.id, s.qty])),
      maxQuantityPerAction: Number(model.rules.max_quantity_per_action),
    },
    items,
    crops,
  };
}

// ---------------------------------------------------------------------------------------------
// economy/expansions.csv — ilhas, blocos de expansão e custo de mudança de ilha.
// ---------------------------------------------------------------------------------------------
export const EXPANSIONS_PATH = join(ECONOMY_DIR, "expansions.csv");
/**
 * Recursos e nós na ordem das colunas cost_* / add_* (mesmos ids de economy.csv).
 * v2.2: frutas não pagam mais expansão (a "gema" da referência virou Diamantes, `cost_diamonds`);
 * continuam como recurso das frutíferas (venda).
 */
export const COST_ITEMS = ["driftwood", "flint", "rustite", "glintstone", "dewquartz", "sandglint", "cinderite"];
export const ADD_NODES = ["plot", "tree", "flint_rock", "rustite_node", "glintstone_node", "dewquartz_node", "sandglint_node", "cinderite_node", "bellpear_tree", "mistplum_tree", "honeydate_palm", "firefig_tree"];
export const EXP_COLUMNS = [
  "row_type", "id", "island", "build_seconds", "min_level", "min_account_days", "cost_gold", "cost_diamonds",
  ...COST_ITEMS.map((i) => `cost_${i}`), ...ADD_NODES.map((n) => `add_${n}`), "ref_blocks", "note",
];
const UINT_RE = /^(0|[1-9]\d*)$/;

/**
 * Lê e valida expansions.csv contra o modelo de economy.csv (recursos, nós, culturas).
 * Ordem das linhas = ordem de desbloqueio. Lança Error com TODOS os problemas.
 */
export function loadExpansionsCsv(model, path = EXPANSIONS_PATH) {
  const text = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
  const rows = parseCsv(text);
  const errors = [];
  const err = (line, msg) => errors.push(`expansions.csv:${String(line)}: ${msg}`);
  if ((rows[0] ?? []).join(",") !== EXP_COLUMNS.join(",")) {
    throw new Error(`expansions.csv: cabeçalho deve ser exatamente:\n${EXP_COLUMNS.join(",")}`);
  }
  const resourceIds = new Set(model.resources.map((r) => r.id));
  const nodeOf = Object.fromEntries(model.resources.map((r) => [r.id, r.nodeId]));
  for (const i of COST_ITEMS) if (!resourceIds.has(i)) errors.push(`expansions.csv: coluna cost_${i} sem recurso em economy.csv`);
  for (const r of model.resources) if (!ADD_NODES.includes(r.nodeId)) errors.push(`expansions.csv: falta coluna add_${r.nodeId}`);

  const islands = [];
  const blocks = [];
  const islandSeen = new Map();
  rows.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    if (cells.length !== EXP_COLUMNS.length) {
      err(line, `esperava ${String(EXP_COLUMNS.length)} colunas, achou ${String(cells.length)}`);
      return;
    }
    const r = Object.fromEntries(EXP_COLUMNS.map((c, i) => [c, cells[i].trim()]));
    const qty = (col) => {
      if (r[col] === "") return 0;
      if (!POSINT_RE.test(r[col])) err(line, `${col}="${r[col]}" deve ser inteiro > 0 (ou vazio)`);
      return Number(r[col]);
    };
    const items = {};
    for (const i of COST_ITEMS) {
      const q = qty(`cost_${i}`);
      if (q > 0) items[i] = q;
    }
    if (!ID_RE.test(r.id)) err(line, `id "${r.id}" deve ser snake_case ascii minúsculo`);
    if (r.row_type === "island") {
      if (r.id !== r.island) err(line, "linha island: id e island devem ser iguais");
      for (const c of ["build_seconds", "min_level", "min_account_days", "cost_gold", "cost_diamonds", ...ADD_NODES.map((n) => `add_${n}`)]) {
        if (r[c] !== "") err(line, `island não usa a coluna ${c}`);
      }
      if (islandSeen.has(r.id)) err(line, `ilha "${r.id}" duplicada`);
      islandSeen.set(r.id, islands.length);
      islands.push({ id: r.id, order: islands.length + 1, crossingCost: items, line });
    } else if (r.row_type === "block") {
      if (!islandSeen.has(r.island)) err(line, `ilha "${r.island}" não declarada antes do bloco`);
      const n = blocks.filter((b) => b.islandId === r.island).length + 1;
      const expectedId = `${r.island}_${String(n).padStart(2, "0")}`;
      if (r.id !== expectedId) err(line, `bloco deveria se chamar "${expectedId}" (sequência da ilha)`);
      const uint = (col) => {
        if (!UINT_RE.test(r[col])) err(line, `${col}="${r[col]}" deve ser inteiro >= 0`);
        return Number(r[col]);
      };
      if (!GOLD_RE.test(r.cost_gold)) err(line, `cost_gold="${r.cost_gold}" deve ser Gold com no máximo 2 casas`);
      const nodes = {};
      for (const nd of ADD_NODES.slice(1)) {
        const q = qty(`add_${nd}`);
        if (q > 0) nodes[nd] = q;
      }
      blocks.push({
        id: r.id,
        islandId: r.island,
        order: blocks.length + 1,
        buildSeconds: uint("build_seconds"),
        minLevel: qty("min_level"),
        minAccountDays: uint("min_account_days"),
        gold: r.cost_gold,
        diamonds: qty("cost_diamonds"),
        items,
        plots: qty("add_plot"),
        nodes,
        refBlocks: r.ref_blocks,
        line,
      });
    } else err(line, `row_type desconhecido "${r.row_type}" (use: island, block)`);
  });

  // Ilhas em sequência contígua; primeira ilha começa com bloco grátis e instantâneo.
  let lastIsland = -1;
  for (const b of blocks) {
    const idx = islandSeen.get(b.islandId) ?? -1;
    if (idx < lastIsland) err(b.line, "blocos de uma ilha devem vir juntos e na ordem das ilhas");
    lastIsland = idx;
  }
  const first = blocks[0];
  if (!first) errors.push("expansions.csv: nenhum bloco");
  else {
    if (first.gold !== "0" || first.diamonds !== 0 || Object.keys(first.items).length || first.buildSeconds !== 0) err(first.line, "o primeiro bloco é o terreno inicial: grátis e com build_seconds 0");
    if (first.plots !== Number(model.rules.starting_plot_count)) err(first.line, `add_plot do terreno inicial (${String(first.plots)}) ≠ starting_plot_count (${model.rules.starting_plot_count})`);
  }
  for (const isl of islands) if (!blocks.some((b) => b.islandId === isl.id)) err(isl.line, `ilha "${isl.id}" sem blocos`);
  if (islands[0] && Object.keys(islands[0].crossingCost).length) err(islands[0].line, "a ilha inicial não tem custo de mudança");

  // Alcançabilidade: todo material cobrado (bloco ou travessia) já tem nó revelado num bloco ANTERIOR.
  const revealedNodes = new Set();
  const islandStarted = new Set();
  for (const b of blocks) {
    const needs = { ...b.items };
    if (!islandStarted.has(b.islandId)) {
      islandStarted.add(b.islandId);
      const isl = islands[islandSeen.get(b.islandId) ?? -1];
      for (const [i, q] of Object.entries(isl?.crossingCost ?? {})) needs[i] = (needs[i] ?? 0) + q;
    }
    for (const i of Object.keys(needs)) {
      if (!revealedNodes.has(nodeOf[i])) err(b.line, `${b.id} cobra "${i}" mas o nó "${nodeOf[i]}" ainda não foi revelado por um bloco anterior`);
    }
    for (const nd of Object.keys(b.nodes)) revealedNodes.add(nd);
  }
  for (const r of model.resources) if (!revealedNodes.has(r.nodeId)) errors.push(`expansions.csv: nenhum bloco traz o nó "${r.nodeId}" (${r.id} inalcançável)`);
  const blockIds = new Set(blocks.map((b) => b.id));
  for (const c of model.crops) {
    if (!blockIds.has(c.unlockBlock)) errors.push(`economy.csv: cultura "${c.id}" com unlock_block "${c.unlockBlock}" inexistente`);
  }
  if (errors.length > 0) throw new Error(`expansions.csv inválido:\n  - ${errors.join("\n  - ")}`);
  return { hash, islands: islands.map(({ line: _l, ...i }) => i), blocks: blocks.map(({ line: _l, ...b }) => b) };
}

/** Converte em `WorldData` (contrato em packages/game-core/src/data/types.ts). Só dados, sem regra. */
export function toWorldData(model, exp, version = "v2") {
  const islands = {};
  for (const i of exp.islands) {
    islands[i.id] = { id: i.id, order: i.order, blockIds: exp.blocks.filter((b) => b.islandId === i.id).map((b) => b.id), crossingCost: i.crossingCost };
  }
  const blocks = {};
  for (const b of exp.blocks) {
    blocks[b.id] = {
      id: b.id,
      islandId: b.islandId,
      order: b.order,
      buildSeconds: b.buildSeconds,
      minLevel: b.minLevel,
      minAccountDays: b.minAccountDays,
      cost: { gold: b.gold, diamonds: b.diamonds, items: b.items },
      adds: { plots: b.plots, nodes: b.nodes },
      unlocksCrops: model.crops.filter((c) => c.unlockBlock === b.id).map((c) => c.id),
    };
  }
  const nodes = {};
  for (const r of model.resources) nodes[r.nodeId] = { id: r.nodeId, itemId: r.id, rechargeSeconds: r.rechargeSeconds, yieldQty: r.yieldQty };
  return {
    meta: { version, placeholder: false, source: `economy/economy.csv@sha256:${model.hash} + economy/expansions.csv@sha256:${exp.hash}` },
    islands,
    blockOrder: exp.blocks.map((b) => b.id),
    blocks,
    nodes,
    cropUnlockBlock: Object.fromEntries(model.crops.map((c) => [c.id, c.unlockBlock])),
  };
}
