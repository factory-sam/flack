import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "supabase/.branches/**",
      "next-env.d.ts"
    ]
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      complexity: ["error", 20],
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "allow", trailingUnderscore: "allow" },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allowSingleOrDouble"
        },
        { selector: "variable", modifiers: ["destructured"], format: null },
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "parameter", format: ["camelCase", "PascalCase"], leadingUnderscore: "allow" },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["camelCase", "PascalCase", "UPPER_CASE"] },
        {
          selector: "property",
          format: ["camelCase", "PascalCase", "UPPER_CASE", "snake_case"],
          leadingUnderscore: "allow"
        },
        { selector: "property", modifiers: ["requiresQuotes"], format: null }
      ]
    }
  }
];

export default eslintConfig;
