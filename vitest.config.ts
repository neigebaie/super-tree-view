import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(`./packages/${p}`, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "core",
          root: "packages/core",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        // Test against the sources, not the build output.
        resolve: {
          alias: [
            { find: /^@super-tree-view\/react\/tree\.css$/, replacement: src("core/src/tree.css") },
            { find: /^@super-tree-view\/core$/, replacement: src("core/src/index.ts") },
            { find: /^@super-tree-view\/react$/, replacement: src("react/src/index.ts") },
          ],
        },
        test: {
          name: "react",
          root: "packages/react",
          environment: "jsdom",
          include: ["test/**/*.test.tsx"],
          setupFiles: ["test/setup.ts"],
        },
      },
    ],
  },
});
