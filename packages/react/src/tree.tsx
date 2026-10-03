import {
  type DefaultItem,
  type RowState,
  splitHighlight,
  type TreeInstance,
  type TreeNode,
  type TreeOptions,
} from "@super-tree-view/core";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  type ReactNode,
  useId,
  useRef,
} from "react";
import { useDragAndDrop } from "./use-drag-and-drop";
import { useTree, useTreeSubscription } from "./use-tree";
import { useIsoLayoutEffect, useTreeVirtualizer } from "./use-tree-virtualizer";

export interface RowRenderProps<T> {
  node: TreeNode<T>;
  item: T;
  state: RowState;
  tree: TreeInstance<T>;
}

export type TreePart = "root" | "row" | "toggle" | "checkbox" | "icon" | "label" | "actions";

export interface TreeViewProps<T> {
  tree: TreeInstance<T>;
  /** Fixed row height in px. Default: 32. */
  rowHeight?: number;
  /** Indentation per level in px. Default: 16. */
  indent?: number;
  /** Render only the rows in view. Needs a height on the tree. Default: true. */
  virtual?: boolean;
  overscan?: number;
  initialRowCount?: number;
  /** Vertical indent guides. Default: true. */
  guides?: boolean;
  /** Wrap filter matches in `<mark>`. Default: true. */
  highlight?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  classNames?: Partial<Record<TreePart, string>>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Replaces the label. */
  renderItem?: (row: RowRenderProps<T>) => ReactNode;
  /** `null` hides icons. Default: folder / file icons. */
  renderIcon?: ((row: RowRenderProps<T>) => ReactNode) | null;
  /** Trailing content such as buttons; clicks inside it do not select the row. */
  renderActions?: (row: RowRenderProps<T>) => ReactNode;
  /** Right click on a row (the row is selected first). Render your own menu. */
  onContextMenu?: (node: TreeNode<T>, event: MouseEvent) => void;
  /** Runs before the built-in keymap; call `event.preventDefault()` to skip it (e.g. Delete, F2). */
  onKeyDown?: (event: KeyboardEvent, node: TreeNode<T>) => void;
}

export type TreeProps<T = DefaultItem> = TreeOptions<T> & Omit<TreeViewProps<T>, "tree">;

/** Ready-to-use tree. Use `useTree` + `TreeView` to call instance methods from outside. */
export function Tree<T = DefaultItem>(props: TreeProps<T>) {
  const tree = useTree<T>(props);
  return <TreeView {...props} tree={tree} />;
}

const INTERACTIVE = "button, a, input, textarea, select, [contenteditable], [data-stv-ignore]";
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

export function TreeView<T>({
  tree,
  rowHeight = 32,
  indent = 16,
  virtual = true,
  overscan,
  initialRowCount,
  guides = true,
  highlight = true,
  id,
  className,
  style,
  classNames,
  renderItem,
  renderIcon,
  renderActions,
  onContextMenu,
  onKeyDown: onRowKeyDown,
  ...aria
}: TreeViewProps<T>) {
  useTreeSubscription(tree);
  const v = useTreeVirtualizer(tree, { rowHeight, overscan, enabled: virtual, initialRowCount });
  const dnd = useDragAndDrop(tree, v.ref, rowHeight);
  const moveFocus = useRef(false);
  const labelId = useId();

  // After keyboard navigation, scroll the focused row into view and move DOM focus to it.
  useIsoLayoutEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const key = tree.getFocusedKey();
    const i = key == null ? -1 : tree.getVisibleIndex(key);
    if (virtual) v.scrollToIndex(i);
    const el = v.ref.current?.querySelector<HTMLElement>(`[data-stv-index="${i}"]`);
    if (el && document.activeElement !== el) el.focus({ preventScroll: virtual });
  });

  /** The row an event belongs to, unless it comes from interactive content inside the row. */
  const rowOf = (e: { target: EventTarget }) => {
    const target = e.target as Element;
    const row = target.closest?.<HTMLElement>("[data-stv-key]");
    if (!row || !v.ref.current?.contains(row)) return null;
    const hit = target.closest(INTERACTIVE);
    return hit && hit !== row && row.contains(hit) ? null : row;
  };

  const onClick = (e: MouseEvent) => {
    if (dnd.consumeClick()) return;
    const key = rowOf(e)?.dataset.stvKey;
    const node = key == null ? undefined : tree.getNode(key);
    if (!node) return;
    tree.focus(node.key);
    const part = (e.target as Element).closest("[data-stv-part]")?.getAttribute("data-stv-part");
    if (part === "toggle") return tree.toggle(node.key);
    if (part === "checkbox") return tree.toggleCheck(node.key);
    const mod = e.ctrlKey || e.metaKey;
    tree.select(node.key, { toggle: mod, range: e.shiftKey });
    if (tree.options.expandOnClick && node.isFolder && !mod && !e.shiftKey) tree.toggle(node.key);
  };

  const onDoubleClick = (e: MouseEvent) => {
    const key = rowOf(e)?.dataset.stvKey;
    if (key == null || (e.target as Element).closest("[data-stv-part]")) return;
    if (tree.options.onActivate || !tree.options.expandOnClick) tree.activate(key);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key = rowOf(e)?.dataset.stvKey;
    const node = key == null ? undefined : tree.getNode(key);
    if (!node) return;
    onRowKeyDown?.(e, node);
    if (e.defaultPrevented) return;
    const before = tree.getVersion();
    const pageSize = Math.max(1, Math.floor((v.ref.current?.clientHeight ?? 0) / rowHeight) - 1);
    if (tree.handleKeyDown(e, pageSize)) {
      e.preventDefault();
      if (tree.getVersion() !== before) moveFocus.current = true;
    }
  };

  const handleContextMenu =
    onContextMenu &&
    ((e: MouseEvent) => {
      const key = rowOf(e)?.dataset.stvKey;
      const node = key == null ? undefined : tree.getNode(key);
      if (!node) return;
      if (!tree.isSelected(node.key)) tree.select(node.key);
      tree.focus(node.key);
      onContextMenu(node, e);
    });

  const drag = tree.getDragState();
  const filter = tree.options.filter;
  const query = highlight && typeof filter === "string" ? filter : null;

  return (
    <div
      {...tree.getTreeAttrs()}
      role="tree"
      {...aria}
      ref={v.ref}
      id={id}
      className={cx("stv-tree", className, classNames?.root)}
      style={
        {
          "--stv-row-height": `${rowHeight}px`,
          "--stv-indent": `${indent}px`,
          ...style,
        } as CSSProperties
      }
      data-virtual={virtual ? "" : undefined}
      data-guides={guides ? "" : undefined}
      data-dragging={drag ? "" : undefined}
      onScroll={virtual ? v.onScroll : undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onContextMenu={handleContextMenu}
      {...dnd.handlers}
    >
      <div
        role="none"
        className="stv-inner"
        style={virtual ? { height: v.totalHeight } : undefined}
      >
        {v.rows.map(({ node, top, index }) => (
          <Row
            key={node.key}
            tree={tree}
            node={node}
            labelId={`${labelId}-${index}`}
            state={tree.getRowState(node)}
            top={virtual ? top : undefined}
            query={query}
            classNames={classNames}
            renderItem={renderItem}
            renderIcon={renderIcon}
            renderActions={renderActions}
          />
        ))}
      </div>
      {drag && (
        <div ref={dnd.previewRef} className="stv-drag-preview" aria-hidden="true">
          {drag.keys.length > 1 ? `${drag.keys.length} items` : tree.getNode(drag.keys[0]!)?.label}
        </div>
      )}
    </div>
  );
}

interface RowProps<T> {
  tree: TreeInstance<T>;
  node: TreeNode<T>;
  /** Names the row by its label only, not by its actions. */
  labelId: string;
  state: RowState;
  top: number | undefined;
  query: string | null;
  classNames: TreeViewProps<T>["classNames"];
  renderItem: TreeViewProps<T>["renderItem"];
  renderIcon: TreeViewProps<T>["renderIcon"];
  renderActions: TreeViewProps<T>["renderActions"];
}

function RowImpl<T>({
  tree,
  node,
  labelId,
  state,
  top,
  query,
  classNames,
  renderItem,
  renderIcon,
  renderActions,
}: RowProps<T>) {
  const row: RowRenderProps<T> = { node, item: node.item, state, tree };
  const style = { "--stv-depth": node.depth } as CSSProperties;
  if (top !== undefined) style.transform = `translateY(${top}px)`;
  return (
    <div
      {...tree.getRowAttrs(node, state)}
      role="treeitem"
      tabIndex={state.focused ? 0 : -1}
      aria-labelledby={labelId}
      className={cx("stv-row", classNames?.row)}
      style={style}
    >
      <span
        className={cx("stv-toggle", classNames?.toggle)}
        data-stv-part={state.folder ? "toggle" : undefined}
        aria-hidden="true"
      >
        {state.loading ? <span className="stv-spinner" /> : state.folder && <ChevronIcon />}
      </span>
      {state.checkable && (
        <span
          className={cx("stv-checkbox", classNames?.checkbox)}
          data-stv-part="checkbox"
          aria-hidden="true"
        >
          {state.checked === "mixed" ? <DashIcon /> : state.checked && <CheckIcon />}
        </span>
      )}
      {renderIcon !== null && (
        <span className={cx("stv-icon", classNames?.icon)} aria-hidden="true">
          {(renderIcon ?? defaultIcon)(row)}
        </span>
      )}
      <span id={labelId} className={cx("stv-label", classNames?.label)}>
        {renderItem ? (
          renderItem(row)
        ) : (
          <Highlight text={node.label} query={state.match ? query : null} />
        )}
      </span>
      {renderActions && (
        <span className={cx("stv-actions", classNames?.actions)}>{renderActions(row)}</span>
      )}
    </div>
  );
}

// Rows re-render only when their own state changes: cost scales with the window, not the tree.
const sameRow = (a: RowProps<unknown>, b: RowProps<unknown>) => {
  for (const k of Object.keys(a) as (keyof RowProps<unknown>)[]) {
    if (k !== "state" && a[k] !== b[k]) return false;
  }
  for (const k of Object.keys(a.state) as (keyof RowState)[]) {
    if (a.state[k] !== b.state[k]) return false;
  }
  return true;
};

const Row = memo(RowImpl, sameRow) as typeof RowImpl;

function Highlight({ text, query }: { text: string; query: string | null }) {
  if (!query) return text;
  return splitHighlight(text, query).map((part, i) =>
    part.match ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: parts have no identity
      <mark key={i} className="stv-mark">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

const Svg = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const ChevronIcon = () => (
  <Svg size={14}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </Svg>
);

const CheckIcon = () => (
  <Svg size={12}>
    <path d="m3 8.5 3.2 3L13 4.5" strokeWidth={2} />
  </Svg>
);

const DashIcon = () => (
  <Svg size={12}>
    <path d="M4 8h8" strokeWidth={2} />
  </Svg>
);

export const FolderIcon = ({ open = false }: { open?: boolean }) => (
  <Svg>
    {open ? (
      <path d="M2 12V4.5C2 3.7 2.7 3 3.5 3h2.6l1.5 1.5h3.9c.8 0 1.5.7 1.5 1.5v1M2 12l1.6-4.2c.2-.5.6-.8 1.2-.8h9.1c.5 0 .9.5.7 1l-1.4 3.8c-.2.7-.8 1.2-1.6 1.2H3c-.6 0-1-.4-1-1Z" />
    ) : (
      <path d="M2 4.5C2 3.7 2.7 3 3.5 3h2.6l1.5 1.5h4.9c.8 0 1.5.7 1.5 1.5v5.5c0 .8-.7 1.5-1.5 1.5h-9c-.8 0-1.5-.7-1.5-1.5Z" />
    )}
  </Svg>
);

export const FileIcon = () => (
  <Svg>
    <path d="M9 2H4.5C3.7 2 3 2.7 3 3.5v9c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5V6L9 2Z" />
    <path d="M9 2v4h4" />
  </Svg>
);

const defaultIcon = ({ state }: { state: RowState }) =>
  state.folder ? <FolderIcon open={state.expanded} /> : <FileIcon />;
