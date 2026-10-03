export type Key = string;
export type CheckState = boolean | "mixed";
export type SelectionMode = "none" | "single" | "multiple";
export type CheckMode = "none" | "cascade" | "independent";
export type DropPosition = "before" | "after" | "inside";
/**
 * What `getChecked` returns in cascade mode:
 * - `leaf`: checked leaves only
 * - `parent`: top-most fully checked nodes (a fully checked folder hides its children)
 * - `all`: every fully checked node, folders included
 */
export type CheckedStrategy = "leaf" | "parent" | "all";

/** Shape the default accessors understand. Use the `get*` options for anything else. */
export interface DefaultItem {
  id: string | number;
  name: string;
  children?: DefaultItem[];
  [key: string]: unknown;
}

export interface TreeNode<T> {
  /** Unique key: the item id, or the id path when `keyBy: "path"`. */
  readonly key: Key;
  readonly id: string;
  readonly item: T;
  readonly label: string;
  readonly parent: TreeNode<T> | null;
  /** 0 for root nodes. */
  readonly depth: number;
  /** Position among its siblings. */
  readonly index: number;
  /** `null` for leaves and for lazy folders that are not loaded yet. */
  readonly children: readonly TreeNode<T>[] | null;
  readonly isFolder: boolean;
  /** Nodes from the root down to this node (inclusive). */
  readonly path: readonly TreeNode<T>[];
}

export interface MoveEvent<T> {
  sources: TreeNode<T>[];
  target: TreeNode<T>;
  position: DropPosition;
  /** Folder that receives the sources (`null` = root level). */
  parent: TreeNode<T> | null;
  /** Insertion index in `parent`'s children, counted before the sources are removed. */
  index: number;
}

export type DragState = {
  keys: Key[];
  target: { key: Key; position: DropPosition } | null;
} | null;

export type ChangeHandler<T> = (keys: Key[], tree: TreeInstance<T>) => void;

export interface TreeOptions<T = DefaultItem> {
  data: readonly T[];
  /** Read once per `data` change. Default: `item.id`. */
  getId?: (item: T) => string | number;
  /** Default: `item.name`. */
  getLabel?: (item: T) => string;
  /** Default: `item.children`. An array (even empty) makes the node a folder. */
  getChildren?: (item: T) => readonly T[] | null | undefined;
  /** Marks folders whose children are not loaded yet (see `loadChildren`). */
  hasChildren?: (item: T) => boolean;
  isDisabled?: (item: T) => boolean;
  isSelectable?: (item: T) => boolean;
  isCheckable?: (item: T) => boolean;
  /** `"path"` keys nodes by their ancestry so the same item can live in several folders. */
  keyBy?: "id" | "path";

  /** Default: `"single"`. */
  selectionMode?: SelectionMode;
  /** Move the selection with the focus when using arrow keys. */
  selectionFollowsFocus?: boolean;
  /** Default: `"none"`. */
  checkMode?: CheckMode;
  /** Toggle folders when their row is clicked. */
  expandOnClick?: boolean;
  dir?: "ltr" | "rtl";

  expanded?: readonly Key[];
  defaultExpanded?: readonly Key[];
  onExpandedChange?: ChangeHandler<T>;
  selected?: readonly Key[];
  defaultSelected?: readonly Key[];
  onSelectedChange?: ChangeHandler<T>;
  checked?: readonly Key[];
  defaultChecked?: readonly Key[];
  onCheckedChange?: ChangeHandler<T>;

  /** Case-insensitive label match, or a predicate (memoize it). */
  filter?: string | ((node: TreeNode<T>) => boolean) | null;
  loadChildren?: (node: TreeNode<T>) => Promise<readonly T[]>;
  onLoadError?: (node: TreeNode<T>, error: unknown) => void;
  /** Enter / double click. Default: toggle folders. */
  onActivate?: (node: TreeNode<T>) => void;

  canDrag?: (node: TreeNode<T>) => boolean;
  canDrop?: (event: {
    sources: TreeNode<T>[];
    target: TreeNode<T>;
    position: DropPosition;
  }) => boolean;
  /** Enables drag and drop. Update your data here (see `moveItems`). */
  onMove?: (event: MoveEvent<T>) => void;
}

export interface RowState {
  index: number;
  level: number;
  posinset: number;
  setsize: number;
  folder: boolean;
  expanded: boolean;
  selected: boolean;
  /** The row is the tree's tab stop. */
  focused: boolean;
  checkable: boolean;
  checked: CheckState;
  disabled: boolean;
  loading: boolean;
  error: boolean;
  match: boolean;
  dragging: boolean;
  drop: DropPosition | null;
}

export type Attrs = Record<string, string | number | undefined>;

export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export interface TreeInstance<T = DefaultItem> {
  options: TreeOptions<T>;
  setOptions(options: TreeOptions<T>): void;
  subscribe(listener: () => void): () => void;
  /** Increments on every state change; use as an external-store snapshot. */
  getVersion(): number;

  getNode(key: Key): TreeNode<T> | undefined;
  getRoots(): readonly TreeNode<T>[];
  getVisibleNodes(): readonly TreeNode<T>[];
  /** -1 when the node is hidden. */
  getVisibleIndex(key: Key): number;
  getRowState(node: TreeNode<T>): RowState;
  getRowAttrs(node: TreeNode<T>, state?: RowState): Attrs;
  getTreeAttrs(): Attrs;

  isExpanded(key: Key): boolean;
  toggle(key: Key): void;
  expand(key: Key): void;
  collapse(key: Key): void;
  expandAll(): void;
  collapseAll(): void;
  setExpanded(keys: Iterable<Key>): void;

  isSelected(key: Key): boolean;
  select(key: Key, opts?: { toggle?: boolean; range?: boolean }): void;
  selectAll(): void;
  clearSelection(): void;
  setSelected(keys: Iterable<Key>): void;
  getSelected(): TreeNode<T>[];

  getCheckState(key: Key): CheckState;
  toggleCheck(key: Key): void;
  setCheck(key: Key, checked: boolean): void;
  setChecked(keys: Iterable<Key>): void;
  getChecked(strategy?: CheckedStrategy): TreeNode<T>[];

  getFocusedKey(): Key | null;
  focus(key: Key): void;
  /** Returns true when the key was handled (call `preventDefault`). */
  handleKeyDown(event: KeyInput, pageSize?: number): boolean;
  activate(key: Key): void;

  isMatch(key: Key): boolean;
  isLoading(key: Key): boolean;
  loadChildren(key: Key): Promise<void>;
  /** Drops cached lazy children (all of them when `key` is omitted). */
  invalidateChildren(key?: Key): void;

  getDragState(): DragState;
  startDrag(key: Key): boolean;
  /** `ratio` is the pointer position inside the row, 0 (top) to 1 (bottom). */
  updateDrop(index: number, ratio: number): void;
  drop(): void;
  cancelDrag(): void;
  move(keys: Key[], target: Key, position: DropPosition): boolean;
}
