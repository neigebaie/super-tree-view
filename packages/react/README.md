# @super-tree-view/react

A slim, accessible, virtualized React tree view with zero runtime dependencies beyond its own core (3.7 kB + 5.3 kB, min + brotli). It supports tri-state checkboxes, search, lazy loading, drag and drop and the full WAI-ARIA keyboard model.

**[Live demo](https://neigebaie.github.io/super-tree-view/) · [Docs](https://github.com/neigebaie/super-tree-view#readme)**

```bash
npm i @super-tree-view/react
```

```tsx
import { Tree } from "@super-tree-view/react";
import "@super-tree-view/react/tree.css";

<Tree data={data} checkMode="cascade" filter={query} aria-label="Files" style={{ height: 400 }} />;
```

To own the component code instead, run `npx shadcn add https://neigebaie.github.io/super-tree-view/r/tree-view.json`.
