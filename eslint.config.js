import js from "@eslint/js";
import globals from "globals";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			eqeqeq: "warn",
			"no-unused-vars": "error",
			"prefer-const": "warn",
			semi: "error",
			quotes: ["warn", "double"],
		},
	},
	{
		files: ["**/*.css"],
		plugins: { css },
		language: "css/css",
		extends: ["css/recommended"],
	},
]);
