// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Regras do jogo precisam ser puras e determinísticas (CLAUDE.md, regra 2).
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Use action.createdAt; reducers são puros." },
        { object: "Math", property: "random", message: "Use src/lib/rng.ts (PRNG com seed)." },
        { object: "performance", property: "now", message: "Reducers não leem relógio." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "Sem relógio em game-core; use createdAt." },
      ],
      "no-restricted-globals": [
        "error",
        { name: "crypto", message: "Aleatoriedade só via src/lib/rng.ts." },
        { name: "fetch", message: "game-core não faz I/O." },
      ],
    },
  },
  {
    files: ["eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },
);
