import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
/** @type {import("eslint").Linter.Config[]} */
const nextConfig = require("eslint-config-next");

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  ...nextConfig,
];

export default eslintConfig;
