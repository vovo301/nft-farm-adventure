#!/usr/bin/env node
// Gera packages/game-core/src/data/economy.generated.ts (economy/economy.csv) e
// packages/game-core/src/data/world.generated.ts (economy/economy.csv + economy/expansions.csv).
//
//   node economy/gen/generate.mjs           # escreve o arquivo  (pnpm econ:gen)
//   node economy/gen/generate.mjs --check   # falha (exit 1) se o arquivo estiver desatualizado (pnpm econ:check)

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadEconomyCsv, loadExpansionsCsv, REPO_ROOT, toEconomyData, toWorldData } from "./economy-csv.mjs";

export const OUT_PATH = join(REPO_ROOT, "packages/game-core/src/data/economy.generated.ts");
export const WORLD_PATH = join(REPO_ROOT, "packages/game-core/src/data/world.generated.ts");
export const ECONOMY_VERSION = "v2";

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
    " * Justificativa de cada número: docs/economia/decisoes.md (proposta v2 — aguardando aprovação).",
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

/** Módulo world.generated.ts: ilhas, blocos, nós e desbloqueio de culturas (só dados). */
export function renderWorldModule(world) {
  const j = (v) => JSON.stringify(v);
  const lines = [
    "/**",
    " * ============================================================================================",
    " *  GERADO — não edite à mão.",
    " * ============================================================================================",
    " *",
    ` * Fonte: ${world.meta.source}`,
    " * Gerador: economy/gen/generate.mjs · regenerar: `pnpm econ:gen` · conferir: `pnpm econ:check`",
    " * Justificativa: docs/economia/decisoes.md (proposta v2 — aguardando aprovação).",
    " *",
    " * Contrato: `WorldData` em ./types.ts. SÓ DADOS: o motor ainda não tem expansão, nós de recurso",
    " * nem desbloqueio de cultura (pendência do game-core).",
    " */",
    'import type { WorldData } from "./types";',
    "",
    "export const world: WorldData = {",
    `  meta: ${j(world.meta)},`,
    "  islands: {",
    ...Object.entries(world.islands).map(([k, v]) => `    ${k}: ${j(v)},`),
    "  },",
    `  blockOrder: ${j(world.blockOrder)},`,
    "  blocks: {",
    ...Object.entries(world.blocks).map(([k, v]) => `    ${k}: ${j(v)},`),
    "  },",
    "  nodes: {",
    ...Object.entries(world.nodes).map(([k, v]) => `    ${k}: ${j(v)},`),
    "  },",
    "  cropUnlockBlock: {",
    ...Object.entries(world.cropUnlockBlock).map(([k, v]) => `    ${k}: ${j(v)},`),
    "  },",
    "};",
    "",
  ];
  return lines.join("\n");
}

/** [caminho, conteúdo esperado] de cada arquivo gerado. */
export function expectedModules() {
  const model = loadEconomyCsv();
  const exp = loadExpansionsCsv(model);
  return [
    [OUT_PATH, renderModule(toEconomyData(model, ECONOMY_VERSION))],
    [WORLD_PATH, renderWorldModule(toWorldData(model, exp, ECONOMY_VERSION))],
  ];
}

export function expectedModule() {
  return expectedModules()[0][1];
}

/** `true` se os arquivos gerados no disco batem com os CSVs atuais. */
export function isGeneratedFresh() {
  return expectedModules().every(([path, content]) => {
    try {
      return readFileSync(path, "utf8") === content;
    } catch {
      return false;
    }
  });
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const expected = expectedModules();
    if (process.argv.includes("--check")) {
      if (!isGeneratedFresh()) {
        console.error(
          "econ:check FALHOU: economy.generated.ts / world.generated.ts desatualizados em relação a economy/economy.csv + expansions.csv.\n" +
            "Rode `pnpm econ:gen` (e registre a decisão em docs/economia/decisoes.md).",
        );
        process.exit(1);
      }
      console.log("econ:check ok — economy.generated.ts e world.generated.ts em dia com os CSVs");
    } else {
      for (const [path, content] of expected) {
        writeFileSync(path, content);
        console.log(`econ:gen ok — escrito ${path}`);
      }
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
