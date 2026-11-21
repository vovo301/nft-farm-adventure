import { economy } from "./data";
import { GameError } from "./errors";
import { isDecimalString, money, toDecimalString } from "./lib/money";
import { isRecord, isTimestamp } from "./lib/validate";
import { createEmptyPlot, createInitialState, CURRENT_SCHEMA_VERSION, type GameState, type Plot } from "./state";

/**
 * Migrações de save. `migrations[n]` leva um save da versão n para n+1.
 * Para criar a v2: (1) acrescente o campo em state.ts + default em createInitialState,
 * (2) acrescente `1: migrateV1toV2`, (3) suba CURRENT_SCHEMA_VERSION, (4) teste com save v1 fixo.
 */
type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/**
 * v0 = qualquer save sem `schemaVersion` (ou com 0). Campos conhecidos (`coins`, `inventory`,
 * `plots`) são aproveitados quando válidos; o resto recebe o default da v1.
 */
function migrateV0toV1(save: Record<string, unknown>): Record<string, unknown> {
  const initial = createInitialState();

  let coins = initial.coins;
  const rawCoins = save["coins"];
  if (rawCoins !== undefined) {
    if (typeof rawCoins === "number" && Number.isFinite(rawCoins) && rawCoins >= 0) {
      coins = toDecimalString(money(String(rawCoins)));
    } else if (isDecimalString(rawCoins)) {
      coins = rawCoins;
    } else {
      throw new GameError("INVALID_SAVE", "coins inválido no save v0", { coins: rawCoins });
    }
  }

  let inventory: Record<string, number> = { ...initial.inventory };
  const rawInventory = save["inventory"];
  if (isRecord(rawInventory)) {
    inventory = {};
    for (const [id, qty] of Object.entries(rawInventory)) {
      if (Object.hasOwn(economy.items, id) && typeof qty === "number" && Number.isSafeInteger(qty) && qty > 0) {
        inventory[id] = qty;
      }
    }
  }

  const rawPlots = Array.isArray(save["plots"]) ? (save["plots"] as unknown[]) : [];
  const plots: Plot[] = rawPlots.map(toPlotOrEmpty);
  while (plots.length < initial.plots.length) plots.push(createEmptyPlot());

  return { schemaVersion: 1, coins, inventory, plots };
}

function toPlotOrEmpty(raw: unknown): Plot {
  if (
    isRecord(raw) &&
    raw["status"] === "planted" &&
    typeof raw["cropId"] === "string" &&
    Object.hasOwn(economy.crops, raw["cropId"]) &&
    isTimestamp(raw["plantedAt"])
  ) {
    return { status: "planted", cropId: raw["cropId"], plantedAt: raw["plantedAt"] };
  }
  return createEmptyPlot();
}

const migrations: Readonly<Record<number, Migration>> = {
  0: migrateV0toV1,
};

function isPlot(raw: unknown): raw is Plot {
  if (!isRecord(raw)) return false;
  if (raw["status"] === "empty") return Object.keys(raw).length === 1;
  return (
    raw["status"] === "planted" &&
    typeof raw["cropId"] === "string" &&
    Object.hasOwn(economy.crops, raw["cropId"]) &&
    isTimestamp(raw["plantedAt"])
  );
}

/** Checa a forma de um save na versão atual. */
export function isValidState(raw: unknown): raw is GameState {
  if (!isRecord(raw)) return false;
  if (raw["schemaVersion"] !== CURRENT_SCHEMA_VERSION) return false;
  if (!isDecimalString(raw["coins"])) return false;
  const inventory = raw["inventory"];
  if (!isRecord(inventory)) return false;
  for (const qty of Object.values(inventory)) {
    if (typeof qty !== "number" || !Number.isSafeInteger(qty) || qty <= 0) return false;
  }
  const plots = raw["plots"];
  return Array.isArray(plots) && plots.every(isPlot);
}

/**
 * Converte qualquer save (ausente, v0, …, atual) para o GameState atual. Não muta a entrada.
 * Lança `INVALID_SAVE` ou `UNSUPPORTED_SCHEMA_VERSION`.
 */
export function migrate(raw: unknown): GameState {
  if (raw === undefined || raw === null) return createInitialState();
  if (!isRecord(raw)) throw new GameError("INVALID_SAVE", "save deve ser um objeto");

  const version = raw["schemaVersion"] ?? 0;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0 || version > CURRENT_SCHEMA_VERSION) {
    throw new GameError("UNSUPPORTED_SCHEMA_VERSION", "versão de save não suportada", { schemaVersion: version });
  }

  // Saves são JSON: a cópia via JSON garante que nunca devolvemos/mutamos a entrada.
  let save = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) throw new GameError("UNSUPPORTED_SCHEMA_VERSION", `sem migração da v${String(v)}`);
    save = step(save);
  }

  if (!isValidState(save)) throw new GameError("INVALID_SAVE", "save inválido após migração");
  return save;
}
