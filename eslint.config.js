import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", ".venv/", ".archive/", "scratch/", "assets/", "art/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.browser },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs", "tests/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.node },
  },
  {
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
    },
  },
];
