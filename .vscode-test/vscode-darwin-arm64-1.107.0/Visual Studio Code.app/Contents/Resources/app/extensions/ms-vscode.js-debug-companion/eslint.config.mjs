// eslint.config.mjs
import globals from "globals";

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        require: false,     // Explicitly disallow require (overrides globals.node)
        module: false,      // Disallow module.exports for consistency
        vscode: "readonly"
      }
    },
    rules: {
      "camelcase": "warn",
      "no-underscore-dangle": "off",
      "no-console": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "semi": ["warn", "always"]
    }
  }
];