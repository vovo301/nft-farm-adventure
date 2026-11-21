// Permite que o Node (>= 22.18, type stripping nativo) importe o código-fonte TypeScript de
// packages/game-core, que usa imports sem extensão (moduleResolution "Bundler").
// Uso: node --import ./economy/sim/register-ts.mjs economy/sim/simulate.mjs
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      const code = error && typeof error === "object" ? error.code : undefined;
      if (!relative || (code !== "ERR_MODULE_NOT_FOUND" && code !== "ERR_UNSUPPORTED_DIR_IMPORT")) throw error;
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context);
        } catch {
          // tenta o próximo
        }
      }
      throw error;
    }
  },
});
