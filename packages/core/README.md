# @super-tree-view/core

The framework-agnostic, zero-dependency engine behind [super-tree-view](https://github.com/neigebaie/super-tree-view). It handles indexing, flattened visible rows, selection, tri-state checkboxes, search, the WAI-ARIA keyboard model, lazy loading, drag-and-drop logic and virtualization math. It never touches the DOM.

You'll usually install an adapter instead, such as [`@super-tree-view/react`](https://www.npmjs.com/package/@super-tree-view/react). To build your own:

```ts
import { createTree } from "@super-tree-view/core";

const tree = createTree({ data, checkMode: "cascade" });
tree.subscribe(render);
tree.getVisibleNodes().forEach((node) => {
  const attrs = tree.getRowAttrs(node); // role, aria-*, data-*, tabIndex
});
row.addEventListener("keydown", (e) => tree.handleKeyDown(e) && e.preventDefault());
```

The default theme ships as `@super-tree-view/core/tree.css`. See the [main README](https://github.com/neigebaie/super-tree-view#readme) for the full API.
