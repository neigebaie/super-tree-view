import { copyFileSync } from "node:fs";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  target: "es2020",
  platform: "neutral",
  clean: true,
  hooks: {
    "build:done": () => copyFileSync("src/tree.css", "dist/tree.css"),
  },
});
