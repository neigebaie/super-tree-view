import { copyFileSync } from "node:fs";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  target: "es2020",
  platform: "neutral",
  clean: true,
  // Directives are stripped when bundling; Next.js needs this one at the top of the entry.
  banner: { js: '"use client";' },
  hooks: {
    "build:done": () => copyFileSync("../core/src/tree.css", "dist/tree.css"),
  },
});
