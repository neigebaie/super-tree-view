# super-tree-view

A slim, accessible, virtualized tree view with **zero runtime dependencies**.

A headless TypeScript core does the work: indexing, flattening, selection, tri-state checkboxes, search, keyboard navigation, lazy loading and drag and drop. Thin adapters render it. React is available today; Vue and Angular are next. The default theme is plain CSS, so Tailwind is optional.

**[Live demo →](https://neigebaie.github.io/super-tree-view/)**

| Package | Size (min + brotli) | Runtime dependencies |
|---|---|---|
| `@super-tree-view/core` | 5.3 kB | none |
| `@super-tree-view/react` | 3.7 kB | `@super-tree-view/core` (peer: `react >= 18`) |

Size budgets are enforced in CI.

- **Accessible**: follows the [WAI-ARIA tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). It uses roving tabindex and `aria-level` / `setsize` / `posinset` / `expanded` / `selected` / `checked`. It supports the full keymap with type-ahead, and checks with axe in CI.
- **Fast**: built-in virtualization; each row re-renders only when its own state changes. Tested with 250k nodes.
- **Checkboxes**: `cascade` (tri-state parents) or `independent` (folders are their own entity), plus `getChecked("leaf" | "parent" | "all")`.
- **Lazy loading**: `loadChildren(node)` with loading and error states.
- **Drag and drop**: pointer based, with mouse, pen and touch long-press, auto-scroll and auto-expand. Alt + ↑/↓ reorders from the keyboard.
- **Flexible**: render your own label, icon and row actions. The tree also works as a navigation sidebar. The same item can appear in several folders.

## Install

```bash
npm i @super-tree-view/react
```

Prefer to own the component code? Copy it into your project with the shadcn CLI (it still uses `@super-tree-view/react` for the logic):

```bash
npx shadcn add https://neigebaie.github.io/super-tree-view/r/tree-view.json
```

Or download [`tree-view.tsx`](https://neigebaie.github.io/super-tree-view/r/tree-view.tsx) and [`tree.css`](https://neigebaie.github.io/super-tree-view/r/tree.css) directly.

## Quick start

```tsx
import { Tree } from "@super-tree-view/react";
import "@super-tree-view/react/tree.css";

const data = [
  {
    id: "src",
    name: "src",
    children: [
      { id: "app", name: "app.tsx" },
      { id: "lib", name: "lib", children: [{ id: "utils", name: "utils.ts" }] },
    ],
  },
  { id: "readme", name: "README.md" },
];

export function Files() {
  return <Tree data={data} aria-label="Files" style={{ height: 400 }} />;
}
```

> **Give the tree a height** (or `max-height`). Virtualization needs a scroll container. For small trees and menus, pass `virtual={false}` to render every row; they all end up in the server HTML.

Works in Next.js App Router as is: the package ships with `"use client"`, so you can render `<Tree data={…} />` from a Server Component (see [`examples/next-app`](examples/next-app)).

## Using the instance

`useTree` returns the headless instance; `TreeView` renders it. Use this split when you need to call methods from outside the tree.

```tsx
import { TreeView, useTree } from "@super-tree-view/react";

function Picker() {
  const tree = useTree({ data, checkMode: "cascade", defaultChecked: ["lib"] });
  return (
    <>
      <button onClick={() => tree.expandAll()}>Expand all</button>
      <p>{tree.getChecked("parent").map((n) => n.label).join(", ")}</p>
      <TreeView tree={tree} aria-label="Files" style={{ height: 400 }} />
    </>
  );
}
```

For full control of the markup, build on `useTree` + `useTreeVirtualizer` + `tree.getRowAttrs(node)`. [`tree.tsx`](packages/react/src/tree.tsx) is about 300 lines and shows the whole recipe.

## Your data

No particular shape is required. The defaults read `id`, `name` and `children`; pass accessors for anything else:

```tsx
<Tree
  data={files}
  getId={(f) => f.path}
  getLabel={(f) => f.path.split("/").pop()!}
  getChildren={(f) => f.entries}
/>
```

State lives **outside** your data, so you don't need a `checked` field on your items. Expansion, selection and checks are each either uncontrolled (`defaultExpanded`, `defaultSelected`, `defaultChecked`) or controlled (`expanded` + `onExpandedChange`, and so on). They all use arrays of keys.

### The same item in several folders

By default an item's key is its id, so ids must be unique. With `keyBy="path"`, keys follow the ancestry (`"science/physics/momentum"`). The same item object can then live in several folders, each with its own state. Every node knows its `parent` and `path`, so callbacks always tell you which folder was used.

## Features

### Checkboxes

```tsx
<Tree data={data} checkMode="cascade" defaultChecked={["physics"]} onCheckedChange={setChecked} />
```

- `cascade`: checking a folder checks everything below it, and parents show `mixed`. `onCheckedChange` receives the checked leaves.
- `independent`: every node, folders included, is checked on its own.
- `tree.getChecked("parent")` returns the top-most fully checked nodes, `"leaf"` the leaves and `"all"` everything.
- `isCheckable(item)` and `isDisabled(item)` control which nodes take part. Disabled nodes are left out of the cascade.

### Selection

`selectionMode` takes `"none"`, `"single"` (the default) or `"multiple"`.

| Gesture | Effect |
|---|---|
| Click | Select |
| Ctrl / ⌘ click | Toggle |
| Shift click | Select a range |
| Shift + ↑/↓ | Extend the selection |
| Ctrl + A | Select all |

`selectionFollowsFocus` moves the selection with the arrow keys.

### Keyboard

| Key | Action |
|---|---|
| ↑ ↓, Page Up / Down, Home / End | Move focus |
| → | Open folder, then go to its first child |
| ← | Close folder, then go to the parent |
| Enter | `onActivate(node)` (default: toggle folder) |
| Space | Toggle check, or select |
| `*` | Expand all siblings |
| a–z | Type-ahead (repeat a letter to cycle) |
| Alt + ↑ / ↓ | Reorder (when `onMove` is set) |
| Esc | Cancel drag / clear selection |

Add your own shortcuts with `onKeyDown={(event, node) => …}`. Call `event.preventDefault()` to skip the built-in handling.

### Search

```tsx
<Tree data={data} filter={query} />
```

A string matches labels without regard to case, and matches are wrapped in `<mark>`. You can also pass a predicate `(node) => boolean` (memoize it). The tree shows matches and their ancestors, and opens those ancestors. Folders that match can still be opened to see what's inside. Clearing the search restores the user's own expansion.

### Lazy loading

```tsx
<Tree
  data={roots}
  hasChildren={(item) => item.isDir}
  loadChildren={async (node) => (await fetch(`/api/ls?path=${node.key}`)).json()}
/>
```

- Opening a folder loads it. While it loads, the row has `data-loading` and `aria-busy`.
- A failed load closes the folder, sets `data-error` and calls `onLoadError`; opening it again retries.
- A check on a folder that isn't loaded yet carries over to its children when they arrive.
- If you'd rather keep children in your own state, skip `loadChildren`: update `data` from `onExpandedChange`.

### Drag and drop

```tsx
import { moveItems, Tree } from "@super-tree-view/react";

<Tree data={data} onMove={(event) => setData((d) => moveItems(d, event))} />;
```

Setting `onMove` turns drag and drop on.
- Rows drop before, after or inside folders. Dragging a selected row drags the whole selection.
- Hovering a closed folder opens it, and dragging near the edges scrolls.
- On touch, a long press starts the drag.

`moveItems` applies the move immutably and keeps untouched subtrees as they are. `canDrag(node)` and `canDrop({ sources, target, position })` restrict what can move where. There are pointer-free alternatives: Alt + ↑/↓, and `tree.move(keys, targetKey, "before" | "after" | "inside")` for "Move to…" actions.

### Custom rendering and row actions

```tsx
<TreeView
  tree={tree}
  renderIcon={({ node, state }) => (state.folder ? <FolderIcon open={state.expanded} /> : <FileIcon />)}
  renderItem={({ node }) => <span title={node.path.map((p) => p.label).join(" / ")}>{node.label}</span>}
  renderActions={({ node }) => (
    <button tabIndex={-1} aria-label={`Delete ${node.label}`} onClick={() => remove(node.key)}>
      🗑
    </button>
  )}
  onKeyDown={(e, node) => e.key === "Delete" && remove(node.key)}
/>
```

Clicks on buttons, links and inputs inside a row don't select it. Rows are named by their label only, so screen readers don't read your actions as part of the row's name. Keep action buttons out of the tab order (`tabIndex={-1}`) and offer a keyboard shortcut. That keeps the tree a single tab stop, as the ARIA pattern expects.

### Context menu

```tsx
<Tree
  data={data}
  onContextMenu={(node, event) => {
    event.preventDefault();
    openMenu({ x: event.clientX, y: event.clientY, node }); // your menu component
  }}
/>
```

### Navigation sidebar

```tsx
<Tree
  data={pages}
  virtual={false}
  guides={false}
  renderIcon={null}
  expandOnClick
  selected={[currentPage]}
  onSelectedChange={([key]) => key && router.push(`/docs/${key}`)}
/>
```

## Styling

`tree.css` is plain CSS inside `@layer stv`, so your styles and Tailwind utilities override it without `!important`. Its colors derive from `currentColor`, so it adapts to light and dark themes. Restyle it with variables:

| Variable | Default |
|---|---|
| `--stv-row-height`, `--stv-indent` | set from `rowHeight` / `indent` props (32px / 16px) |
| `--stv-accent`, `--stv-accent-fg` | `#2563eb`, `#fff` (checkboxes, focus ring, drop line) |
| `--stv-hover`, `--stv-selected` | translucent tints |
| `--stv-guide`, `--stv-muted`, `--stv-mark`, `--stv-radius` | indent guides, icons, search highlight, corners |

Rows expose their state as data attributes: `data-selected`, `data-expanded`, `data-checked="true|false|mixed"`, `data-folder`, `data-depth`, `data-disabled`, `data-loading`, `data-error`, `data-match`, `data-dragging` and `data-drop="before|after|inside"`. You can style them with plain CSS or with Tailwind:

```tsx
<TreeView tree={tree} classNames={{ row: "data-[selected]:bg-accent data-[selected]:text-accent-foreground" }} />
```

Parts: `root`, `row`, `toggle`, `checkbox`, `icon`, `label`, `actions`. The shadcn registry item maps the variables to your theme tokens (`--primary`, `--accent`, `--border`…).

## API

### Options (`<Tree>` props and `useTree(options)`)

| Option | Type | Default |
|---|---|---|
| `data` | `T[]` | required |
| `getId` / `getLabel` / `getChildren` | accessors | `item.id` / `item.name` / `item.children` |
| `hasChildren` | `(item) => boolean` | folders = items with a `children` array |
| `isDisabled` / `isSelectable` / `isCheckable` | `(item) => boolean` | |
| `keyBy` | `"id" \| "path"` | `"id"` |
| `selectionMode` | `"none" \| "single" \| "multiple"` | `"single"` |
| `selectionFollowsFocus`, `expandOnClick` | `boolean` | `false` |
| `checkMode` | `"none" \| "cascade" \| "independent"` | `"none"` |
| `expanded` / `defaultExpanded` / `onExpandedChange` | `string[]`, `(keys, tree) => void` | |
| `selected` / `defaultSelected` / `onSelectedChange` | same | |
| `checked` / `defaultChecked` / `onCheckedChange` | same | |
| `filter` | `string \| (node) => boolean` | |
| `loadChildren` / `onLoadError` | `(node) => Promise<T[]>` | |
| `onActivate` | `(node) => void` | toggle folder |
| `onMove` / `canDrag` / `canDrop` | see drag and drop | |
| `dir` | `"ltr" \| "rtl"` | `"ltr"` |

### View props (`<Tree>` and `<TreeView tree={…}>`)

`rowHeight` (32), `indent` (16), `virtual` (true), `overscan` (8), `initialRowCount` (30, rows rendered before measuring and on the server), `guides` (true), `highlight` (true), `className`, `style`, `classNames`, `aria-label`, `aria-labelledby`, `renderItem`, `renderIcon` (`null` hides icons), `renderActions`, `onContextMenu`, `onKeyDown`.

### Instance

```ts
tree.getNode(key) · getRoots() · getVisibleNodes() · getVisibleIndex(key) · getRowState(node) · getRowAttrs(node)
tree.toggle(key) · expand(key) · collapse(key) · expandAll() · collapseAll() · setExpanded(keys) · isExpanded(key)
tree.select(key, { toggle?, range? }) · selectAll() · clearSelection() · setSelected(keys) · getSelected() · isSelected(key)
tree.toggleCheck(key) · setCheck(key, bool) · setChecked(keys) · getChecked(strategy?) · getCheckState(key)
tree.focus(key) · getFocusedKey() · handleKeyDown(event) · activate(key)
tree.loadChildren(key) · invalidateChildren(key?) · isLoading(key) · isMatch(key)
tree.move(keys, target, position) · startDrag(key) · updateDrop(index, ratio) · drop() · cancelDrag()
tree.subscribe(listener) · getVersion() · setOptions(options)
```

A `TreeNode` has `key`, `id`, `item`, `label`, `parent`, `children`, `depth`, `index`, `isFolder` and `path`.

## Performance

Measured by the [demo's benchmark page](https://neigebaie.github.io/super-tree-view/#large) on a desktop in Chromium, with 101,100 nodes, timing the headless core alone:

| Operation | Time |
|---|---|
| Index + first rows | 7.7 ms |
| Expand all (101k visible rows) | 2.9 ms |
| Check everything (cascade) | 8.1 ms |
| Toggle one leaf (incremental update) | 0.8 ms |
| Filter by text | 7.4 ms |

About 25 rows are in the DOM at any time. How it stays fast:
- **Indexing:** the tree is indexed once, iteratively.
- **Flat rows:** visible rows form a flat array, which is what makes virtualization simple.
- **Tri-state:** each folder's state is an O(1) lookup, and a toggle only updates the subtree and its ancestors.
- **Events:** one delegated handler serves all rows.

## FAQ

**Why not `<details>` / `<summary>`?** They're great for a static disclosure list. But they can't do tri-state checkboxes, virtualization, range selection or drag and drop. They also don't expose tree semantics or the tree keymap to assistive technology. With `virtual={false}`, super-tree-view still renders plain, server-side HTML.

**Why not Radix, Motion or Lucide?** A tree doesn't need them. The chevron animation is a CSS transition, icons are inline SVG, and the core uses the DOM nowhere.

**Vue? Angular?** The core is framework-agnostic on purpose. Vue (a composable and `<Tree>` with slots) and Angular (signals and `<stv-tree>` with templates) adapters are next.

## Migrating from shadcn-ui-tree-view

1. `npm uninstall framer-motion @radix-ui/react-context-menu @radix-ui/react-collapsible @radix-ui/react-hover-card` (if nothing else uses them), then `npm i @super-tree-view/react`.
2. Your data works as is: `{ id, name, children }` is the default shape. Move `checked: true` flags into `defaultChecked={[…ids]}`.
3. Map the props:

| shadcn-ui-tree-view | super-tree-view |
|---|---|
| `showCheckboxes` | `checkMode="cascade"` |
| `onCheckChange(item, checked)` | `onCheckedChange(keys, tree)` |
| `iconMap` / `getIcon` | `renderIcon={({ node }) => iconMap[node.item.type]}` |
| `menuItems` | `onContextMenu` + your menu, or `renderActions` |
| `onSelectionChange` | `selectionMode="multiple"` + `onSelectedChange` |

The search bar and "expand all" buttons are now yours to render: pass `filter={query}` and call `tree.expandAll()`.

## Development

```bash
pnpm install
pnpm dev          # playground with hot reload on the package sources
pnpm test         # unit tests (core + React)
pnpm test:e2e     # Playwright: keyboard, drag and drop, lazy loading, virtualization, axe
pnpm build && pnpm size
```

Releases use [changesets](https://github.com/changesets/changesets): run `pnpm changeset` and describe your change.

## License

MIT © neigebaie
