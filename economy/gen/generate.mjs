#!/usr/bin/env node
// Gera packages/game-core/src/data/economy.generated.ts a partir de economy/economy.csv.
//
//   node economy/gen/generate.mjs           # escreve o arquivo  (pnpm econ:gen)
//   node economy/gen/generate.mjs --check   # falha (exit 1) se o arquivo estiver desatualizado (pnpm econ:check)

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadEconomyCsv, REPO_ROOT, toEconomyData } from "./economy-csv.mjs";

export const OUT_PATH = join(REPO_ROOT, "packages/game-core/src/data/economy.generated.ts");
export const ECONOMY_VERSION = "v1";

const lit = (v) => JSON.stringify(v);
const inline = (obj) =>
  `{ ${Object.entries(obj)
    .map(([k, v]) => `${k}: ${lit(v)}`)
    .join(", ")} }`;

/** Renderiza o módulo TS de forma determinística (mesmo CSV ⇒ mesmos bytes). */
export function renderModule(data) {
  const lines = [
    "/**",
    " * ============================================================================================",
    " *  GERADO — não edite à mão.",
    " * ============================================================================================",
    " *",
    ` * Fonte: ${data.meta.source}`,
    " * Gerador: economy/gen/generate.mjs · regenerar: `pnpm econ:gen` · conferir: `pnpm econ:check`",
    " * Justificativa de cada número: docs/economia/decisoes.md (proposta v1 em Gold — aguardando aprovação).",
    " *",
    " * Contrato: `EconomyData` em ./types.ts.",
    " */",
    'import type { EconomyData } from "./types";',
    "",
    "export const economy: EconomyData = {",
    `  meta: ${inline(data.meta)},`,
    "  rules: {",
    `    startingCoins: ${lit(data.rules.startingCoins)},`,
    `    startingPlotCount: ${lit(data.rules.startingPlotCount)},`,
    `    startingInventory: ${Object.keys(data.rules.startingInventory).length ? inline(data.rules.startingInventory) : "{}"},`,
    `    maxQuantityPerAction: ${lit(data.rules.maxQuantityPerAction)},`,
    "  },",
    "  items: {",
    ...Object.entries(data.items).map(([k, v]) => `    ${k}: ${inline(v)},`),
    "  },",
    "  crops: {",
    ...Object.entries(data.crops).map(([k, v]) => `    ${k}: ${inline(v)},`),
    "  },",
    "};",
    "",
  ];
  return lines.join("\n");
}

export function expectedModule() {
  return renderModule(toEconomyData(loadEconomyCsv(), ECONOMY_VERSION));
}

/** `true` se o arquivo gerado no disco bate com o CSV atual. */
export function isGeneratedFresh() {
  let current = "";
  try {
    current = readFileSync(OUT_PATH, "utf8");
  } catch {
    return false;
  }
  return current === expectedModule();
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const expected = expectedModule();
    if (process.argv.includes("--check")) {
      if (!isGeneratedFresh()) {
        console.error(
          "econ:check FALHOU: packages/game-core/src/data/economy.generated.ts está desatualizado em relação a economy/economy.csv.\n" +
            "Rode `pnpm econ:gen` (e registre a decisão em docs/economia/decisoes.md).",
        );
        process.exit(1);
      }
      console.log("econ:check ok — economy.generated.ts está em dia com economy/economy.csv");
    } else {
      writeFileSync(OUT_PATH, expected);
      console.log(`econ:gen ok — escrito ${OUT_PATH}`);
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
