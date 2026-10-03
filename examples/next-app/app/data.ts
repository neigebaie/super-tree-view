export interface Item {
  id: string;
  name: string;
  children?: Item[];
}

export const data: Item[] = [
  {
    id: "app",
    name: "app",
    children: [
      { id: "app/layout.tsx", name: "layout.tsx" },
      { id: "app/page.tsx", name: "page.tsx" },
      { id: "app/file-tree.tsx", name: "file-tree.tsx" },
    ],
  },
  { id: "next.config.ts", name: "next.config.ts" },
  { id: "package.json", name: "package.json" },
];
