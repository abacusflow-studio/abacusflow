import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Ignore generated OpenAPI code
  {
    ignores: ["packages/core/src/openapi/**"],
  },
  // Base config for all files
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  // Recommended JS rules
  js.configs.recommended,
  // Recommended TS rules
  tseslint.configs.recommended,
  // Recommended React rules with settings
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);
