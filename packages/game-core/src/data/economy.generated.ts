/**
 * ============================================================================================
 *  GERADO — não edite à mão.
 * ============================================================================================
 *
 * Fonte: economy/economy.csv@sha256:b099455405dc
 * Gerador: economy/gen/generate.mjs · regenerar: `pnpm econ:gen` · conferir: `pnpm econ:check`
 * Justificativa de cada número: docs/economia/decisoes.md (proposta v0 — aguardando aprovação).
 *
 * Contrato: `EconomyData` em ./types.ts.
 */
import type { EconomyData } from "./types";

export const economy: EconomyData = {
  meta: { version: "v0", placeholder: false, source: "economy/economy.csv@sha256:b099455405dc" },
  rules: {
    startingCoins: "20",
    startingPlotCount: 6,
    startingInventory: { mintleaf_seed: 6 },
    maxQuantityPerAction: 1000,
  },
  items: {
    mintleaf_seed: { id: "mintleaf_seed", kind: "seed", buyPrice: "1", sellPrice: null },
    redroot_seed: { id: "redroot_seed", kind: "seed", buyPrice: "4", sellPrice: null },
    honeyleek_seed: { id: "honeyleek_seed", kind: "seed", buyPrice: "12", sellPrice: null },
    stripemelon_seed: { id: "stripemelon_seed", kind: "seed", buyPrice: "40", sellPrice: null },
    mintleaf: { id: "mintleaf", kind: "crop", buyPrice: null, sellPrice: "1.5" },
    redroot: { id: "redroot", kind: "crop", buyPrice: null, sellPrice: "10" },
    honeyleek: { id: "honeyleek", kind: "crop", buyPrice: null, sellPrice: "20" },
    stripemelon: { id: "stripemelon", kind: "crop", buyPrice: null, sellPrice: "40" },
    driftwood: { id: "driftwood", kind: "resource", buyPrice: null, sellPrice: "4" },
    flint: { id: "flint", kind: "resource", buyPrice: null, sellPrice: "10" },
  },
  crops: {
    mintleaf: { id: "mintleaf", seedItemId: "mintleaf_seed", harvestItemId: "mintleaf", growSeconds: 120, harvestQty: 1 },
    redroot: { id: "redroot", seedItemId: "redroot_seed", harvestItemId: "redroot", growSeconds: 1200, harvestQty: 1 },
    honeyleek: { id: "honeyleek", seedItemId: "honeyleek_seed", harvestItemId: "honeyleek", growSeconds: 7200, harvestQty: 2 },
    stripemelon: { id: "stripemelon", seedItemId: "stripemelon_seed", harvestItemId: "stripemelon", growSeconds: 28800, harvestQty: 3 },
  },
};
