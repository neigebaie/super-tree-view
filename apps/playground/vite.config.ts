import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const pkg = (p: string) => fileURLToPath(new URL(`../../packages/${p}`, import.meta.url));

export default defineConfig({
  // GitHub Pages serves the site from /super-tree-view/.
  base: process.env.PAGES_BASE ?? "/",
  plugins: [react()],
  resolve: {
    // Use the sources directly: instant HMR while working on the packages.
    alias: [
      { find: /^@super-tree-view\/react\/tree\.css$/, replacement: pkg("core/src/tree.css") },
      { find: /^@super-tree-view\/react$/, replacement: pkg("react/src/index.ts") },
      { find: /^@super-tree-view\/core$/, replacement: pkg("core/src/index.ts") },
    ],
  },
});
