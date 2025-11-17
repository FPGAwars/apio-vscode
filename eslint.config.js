// eslint.config.js
module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
        vscode: "readonly"
      }
    },
    rules: {
      "camelcase": "warn",           // ← this will finally catch o_rg, my_var, etc.
      "no-underscore-dangle": "off",
      "no-console": "off",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "semi": ["warn", "always"]
    }
  }
];
