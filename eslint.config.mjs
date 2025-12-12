// eslint.config.mjs

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        global: "readonly",
        vscode: "readonly",
      },
    },
    rules: {
      camelcase: "warn",
      "no-underscore-dangle": "off",
      "no-console": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      semi: ["warn", "always"],
    },
  },
];
