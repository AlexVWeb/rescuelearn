import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
      "react": reactPlugin,
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-unescaped-entities": "off",
      "react-hooks/purity": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='console'][callee.property.name=/^(log|error|warn)$/]",
          message: "Direct use of console.log, console.warn, or console.error is forbidden. Use the centralized logger from '@/lib/logger' instead to ensure security and PII sanitization.",
        },
      ],
    },
  },
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    ignores: [".next/*", "node_modules/*", "dist/*"],
  },
];
