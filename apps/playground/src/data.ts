export interface Item {
  id: string;
  name: string;
  type?: string;
  children?: Item[];
}

const file = (dir: string, name: string): Item => ({
  id: dir ? `${dir}/${name}` : name,
  name,
  type: "file",
});
const dir = (path: string, children: (string | Item)[]): Item => ({
  id: path,
  name: path.split("/").pop()!,
  type: "folder",
  children: children.map((c) => (typeof c === "string" ? file(path, c) : c)),
});

export const files: Item[] = [
  dir("src", [
    dir("src/components", [
      dir("src/components/ui", ["button.tsx", "checkbox.tsx", "dialog.tsx", "input.tsx"]),
      "header.tsx",
      "sidebar.tsx",
      "tree-view.tsx",
    ]),
    dir("src/hooks", ["use-debounce.ts", "use-media-query.ts"]),
    dir("src/lib", ["api.ts", "utils.ts"]),
    "app.tsx",
    "main.tsx",
    "styles.css",
  ]),
  dir("public", ["favicon.svg", "robots.txt"]),
  dir("tests", ["tree.test.tsx", "setup.ts"]),
  file("", ".gitignore"),
  file("", "package.json"),
  file("", "README.md"),
  file("", "tsconfig.json"),
];

// The data from the original shadcn-ui-tree-view demo.
export const science: Item[] = [
  {
    id: "science",
    name: "Science",
    children: [
      {
        id: "physics",
        name: "Physics",
        children: [
          {
            id: "mechanics",
            name: "Mechanics",
            children: [
              { id: "newton1", name: "Newton's First Law" },
              { id: "newton2", name: "Newton's Second Law" },
              { id: "newton3", name: "Newton's Third Law" },
              { id: "momentum", name: "Conservation of Momentum" },
            ],
          },
          {
            id: "thermo",
            name: "Thermodynamics",
            children: [
              { id: "thermo1", name: "First Law of Thermodynamics" },
              { id: "thermo2", name: "Second Law of Thermodynamics" },
              { id: "entropy", name: "Entropy" },
            ],
          },
        ],
      },
      {
        id: "chemistry",
        name: "Chemistry",
        children: [
          {
            id: "organic",
            name: "Organic Chemistry",
            children: [
              { id: "alkanes", name: "Alkanes" },
              { id: "alkenes", name: "Alkenes" },
              { id: "alcohols", name: "Alcohols" },
              { id: "ketones", name: "Ketones" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "math",
    name: "Mathematics",
    children: [
      {
        id: "algebra",
        name: "Algebra",
        children: [
          {
            id: "linear",
            name: "Linear Algebra",
            children: [
              { id: "matrices", name: "Matrices" },
              { id: "vectors", name: "Vectors" },
              { id: "eigen", name: "Eigenvalues" },
            ],
          },
        ],
      },
    ],
  },
];

/** Builds `folders × subfolders × leaves` nodes plus the folders themselves. */
export function generateTree(folders: number, subfolders: number, leaves: number): Item[] {
  const out: Item[] = [];
  for (let a = 0; a < folders; a++) {
    const kids: Item[] = [];
    for (let b = 0; b < subfolders; b++) {
      const leafItems: Item[] = [];
      for (let c = 0; c < leaves; c++) {
        leafItems.push({ id: `${a}.${b}.${c}`, name: `Item ${a}.${b}.${c}` });
      }
      kids.push({ id: `${a}.${b}`, name: `Group ${a}.${b}`, children: leafItems });
    }
    out.push({ id: `${a}`, name: `Folder ${a}`, children: kids });
  }
  return out;
}

export const countNodes = (items: readonly Item[]): number =>
  items.reduce((n, i) => n + 1 + (i.children ? countNodes(i.children) : 0), 0);

/** Immutably removes the node at `key` (ids are unique here). */
export function removeItem(items: Item[], key: string): Item[] {
  return items
    .filter((i) => i.id !== key)
    .map((i) => (i.children ? { ...i, children: removeItem(i.children, key) } : i));
}
