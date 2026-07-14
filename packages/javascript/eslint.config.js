import js from "@eslint/js";
export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { fetch: "readonly", URL: "readonly" },
    },
    rules: { "no-unused-vars": "error" },
  },
];
