/**
 * ============================================================================================
 *  PLACEHOLDER — será substituído pelo gerador do economista; números não oficiais.
 * ============================================================================================
 *
 * Este arquivo será GERADO a partir de `economy/economy.csv` (veja CLAUDE.md, regra 3).
 * Não edite à mão quando o gerador existir. Os números abaixo servem apenas para o scaffold e
 * os testes da Fase 0; nenhum deles está registrado em `docs/economia/decisoes.md`.
 *
 * Contrato: exportar `economy` do tipo `EconomyData` (veja `./types.ts`).
 */
import type { EconomyData } from "./types";

export const economy: EconomyData = {
  meta: {
    version: "placeholder-0",
    placeholder: true,
    source: "hand-written placeholder (packages/game-core, Fase 0)",
  },
  rules: {
    startingCoins: "10",
    startingPlotCount: 6,
    startingInventory: { crop_a_seed: 3 },
    maxQuantityPerAction: 1000,
  },
  items: {
    crop_a_seed: { id: "crop_a_seed", kind: "seed", buyPrice: "1", sellPrice: null },
    crop_b_seed: { id: "crop_b_seed", kind: "seed", buyPrice: "2.5", sellPrice: null },
    crop_c_seed: { id: "crop_c_seed", kind: "seed", buyPrice: "6", sellPrice: null },
    crop_d_seed: { id: "crop_d_seed", kind: "seed", buyPrice: "15", sellPrice: null },
    crop_a: { id: "crop_a", kind: "crop", buyPrice: null, sellPrice: "1.5" },
    crop_b: { id: "crop_b", kind: "crop", buyPrice: null, sellPrice: "4" },
    crop_c: { id: "crop_c", kind: "crop", buyPrice: null, sellPrice: "10" },
    crop_d: { id: "crop_d", kind: "crop", buyPrice: null, sellPrice: "26" },
    resource_a: { id: "resource_a", kind: "resource", buyPrice: null, sellPrice: "0.5" },
    resource_b: { id: "resource_b", kind: "resource", buyPrice: null, sellPrice: "1.2" },
  },
  crops: {
    crop_a: { id: "crop_a", seedItemId: "crop_a_seed", harvestItemId: "crop_a", growSeconds: 60, harvestQty: 1 },
    crop_b: { id: "crop_b", seedItemId: "crop_b_seed", harvestItemId: "crop_b", growSeconds: 300, harvestQty: 1 },
    crop_c: { id: "crop_c", seedItemId: "crop_c_seed", harvestItemId: "crop_c", growSeconds: 1800, harvestQty: 1 },
    crop_d: { id: "crop_d", seedItemId: "crop_d_seed", harvestItemId: "crop_d", growSeconds: 7200, harvestQty: 1 },
  },
};
