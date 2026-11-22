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
  "node_count",
  "recharge_seconds",
  "yield_qty",
  "value",
  "note",
];

/** Colunas obrigatórias por tipo de linha; as demais (exceto `note`) devem ficar vazias. */
const REQUIRED = {
  rule: ["value"],
  start_item: ["value"],
  crop: ["seed_price", "sell_price", "grow_seconds", "harvest_qty"],
  resource: ["sell_price", "node_count", "recharge_seconds", "yield_qty"],
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
 *   crops: {id:string,seedPrice:string,sellPrice:string,growSeconds:number,harvestQty:number,note:string}[],
 *   resources: {id:string,sellPrice:string,nodeCount:number,rechargeSeconds:number,yieldQty:number,note:string}[] }}
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
        model.resources.push({
          id: r.id,
          sellPrice: gold("sell_price"),
          nodeCount: int("node_count"),
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

  if (errors.length > 0) throw new Error(`economy.csv inválido:\n  - ${errors.join("\n  - ")}`);
  model.startItems = model.startItems.map(({ id, qty }) => ({ id, qty }));
  return model;
}

/** Converte o modelo no objeto `EconomyData` (contrato em packages/game-core/src/data/types.ts). */
export function toEconomyData(model, version = "v1") {
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
