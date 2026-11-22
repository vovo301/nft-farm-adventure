/**
 * ============================================================================================
 *  GERADO — não edite à mão.
 * ============================================================================================
 *
 * Fonte: economy/economy.csv@sha256:3ef568e83fb3
 * Gerador: economy/gen/generate.mjs · regenerar: `pnpm econ:gen` · conferir: `pnpm econ:check`
 * Justificativa de cada número: docs/economia/decisoes.md (proposta v1 em Gold — aguardando aprovação).
 *
 * Contrato: `EconomyData` em ./types.ts.
 */
import type { EconomyData } from "./types";

export const economy: EconomyData = {
  meta: { version: "v1", placeholder: false, source: "economy/economy.csv@sha256:3ef568e83fb3" },
  rules: {
    startingCoins: "2",
    startingPlotCount: 6,
    startingInventory: { mintleaf_seed: 6 },
    maxQuantityPerAction: 1000,
  },
  items: {
    mintleaf_seed: { id: "mintleaf_seed", kind: "seed", buyPrice: "0.01", sellPrice: null },
    pebblepea_seed: { id: "pebblepea_seed", kind: "seed", buyPrice: "0.14", sellPrice: null },
    redroot_seed: { id: "redroot_seed", kind: "seed", buyPrice: "1.1", sellPrice: null },
    honeyleek_seed: { id: "honeyleek_seed", kind: "seed", buyPrice: "2.9", sellPrice: null },
    stripemelon_seed: { id: "stripemelon_seed", kind: "seed", buyPrice: "6.3", sellPrice: null },
    glowgourd_seed: { id: "glowgourd_seed", kind: "seed", buyPrice: "10", sellPrice: null },
    mintleaf: { id: "mintleaf", kind: "crop", buyPrice: null, sellPrice: "0.02" },
    pebblepea: { id: "pebblepea", kind: "crop", buyPrice: null, sellPrice: "0.25" },
    redroot: { id: "redroot", kind: "crop", buyPrice: null, sellPrice: "0.9" },
    honeyleek: { id: "honeyleek", kind: "crop", buyPrice: null, sellPrice: "1.45" },
    stripemelon: { id: "stripemelon", kind: "crop", buyPrice: null, sellPrice: "2.9" },
    glowgourd: { id: "glowgourd", kind: "crop", buyPrice: null, sellPrice: "2.6" },
    driftwood: { id: "driftwood", kind: "resource", buyPrice: null, sellPrice: "0.15" },
    flint: { id: "flint", kind: "resource", buyPrice: null, sellPrice: "0.4" },
  },
  crops: {
    mintleaf: { id: "mintleaf", seedItemId: "mintleaf_seed", harvestItemId: "mintleaf", growSeconds: 120, harvestQty: 1 },
    pebblepea: { id: "pebblepea", seedItemId: "pebblepea_seed", harvestItemId: "pebblepea", growSeconds: 900, harvestQty: 1 },
    redroot: { id: "redroot", seedItemId: "redroot_seed", harvestItemId: "redroot", growSeconds: 6300, harvestQty: 2 },
    honeyleek: { id: "honeyleek", seedItemId: "honeyleek_seed", harvestItemId: "honeyleek", growSeconds: 14400, harvestQty: 3 },
    stripemelon: { id: "stripemelon", seedItemId: "stripemelon_seed", harvestItemId: "stripemelon", growSeconds: 27000, harvestQty: 3 },
    glowgourd: { id: "glowgourd", seedItemId: "glowgourd_seed", harvestItemId: "glowgourd", growSeconds: 36000, harvestQty: 5 },
  },
};
