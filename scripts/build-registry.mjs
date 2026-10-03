// Builds the copy-paste distribution (same idea as shadcn-ui-tree-view's create-schema.js):
//   r/registry.json, r/tree-view.json  -> `npx shadcn add <url>/r/tree-view.json`
//   r/tree-view.tsx, r/tree.css        -> raw files for any React project
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFile(path.join(root, p), "utf8");
const PKG = "@super-tree-view/react";
const HOMEPAGE = "https://neigebaie.github.io/super-tree-view";

/** Variables mapped to shadcn/ui theme tokens (Tailwind v4 themes, where tokens are full colors). */
const SHADCN_THEME = {
  "@layer stv": {
    ".stv-tree": {
      "--stv-accent": "var(--primary)",
      "--stv-accent-fg": "var(--primary-foreground)",
      "--stv-hover": "var(--accent)",
      "--stv-selected": "color-mix(in oklab, var(--primary) 14%, transparent)",
      "--stv-guide": "var(--border)",
      "--stv-muted": "var(--muted-foreground)",
      "--stv-radius": "calc(var(--radius) - 2px)",
    },
  },
};

const IMPORT = /import\s*\{([^}]*)\}\s*from\s*"(\.\/use-[\w-]+|@super-tree-view\/core)";\n/g;

/** `tree.tsx` with its internal imports merged into one import from the public package. */
export async function ejectTreeView() {
  const src = await read("packages/react/src/tree.tsx");
  const names = [];
  let first = -1;
  const body = src.replace(IMPORT, (_, specifiers, _from, offset) => {
    if (first < 0) first = offset;
    for (const s of specifiers.split(",")) if (s.trim()) names.push(s.trim());
    return "";
  });
  if (/from "\.\//.test(body))
    throw new Error("tree.tsx has a relative import the registry cannot rewrite");
  const merged = `import {\n${names.map((n) => `  ${n},`).join("\n")}\n} from "${PKG}";\nimport "${PKG}/tree.css";\n`;
  return [
    '"use client";',
    "",
    `// From super-tree-view (MIT): ${HOMEPAGE}`,
    `// This file is yours to edit. The tree logic stays in ${PKG}.`,
    body.slice(0, first) + merged + body.slice(first),
  ].join("\n");
}

export async function buildRegistry(outDir = path.join(root, "apps/playground/public/r")) {
  const component = await ejectTreeView();
  const { version } = JSON.parse(await read("packages/react/package.json"));
  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "tree-view",
    type: "registry:component",
    title: "Tree View",
    description:
      "Accessible, virtualized tree view with tri-state checkboxes, search, lazy loading and drag and drop. Zero runtime dependencies.",
    dependencies: [`${PKG}@^${version}`],
    files: [{ path: "components/tree-view.tsx", type: "registry:component", content: component }],
    css: SHADCN_THEME,
    docs: `Usage: import { Tree } from "@/components/tree-view". Docs: ${HOMEPAGE}`,
  };
  const { files: _files, ...summary } = item;
  const registry = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "super-tree-view",
    homepage: HOMEPAGE,
    items: [
      { ...summary, files: [{ path: "components/tree-view.tsx", type: "registry:component" }] },
    ],
  };

  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outDir, "tree-view.json"), `${JSON.stringify(item, null, 2)}\n`),
    writeFile(path.join(outDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`),
    writeFile(path.join(outDir, "tree-view.tsx"), component),
    writeFile(path.join(outDir, "tree.css"), await read("packages/core/src/tree.css")),
  ]);
  return outDir;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const out = await buildRegistry(process.argv[2] && path.resolve(process.argv[2]));
  console.log(`registry written to ${path.relative(root, out)}`);
}
