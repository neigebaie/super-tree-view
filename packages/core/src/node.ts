import type { Key, TreeNode } from "./types";

export class Node<T> implements TreeNode<T> {
  children: Node<T>[] | null = null;
  /** Pre-order position after the last descendant: the subtree is `list[ord..end)`. */
  end: number;
  /** Visible index, valid while `visV` matches the current visible pass. */
  vis = -1;
  visV = -1;
  lower?: string;

  constructor(
    readonly key: Key,
    readonly id: string,
    readonly item: T,
    readonly label: string,
    readonly parent: Node<T> | null,
    readonly depth: number,
    readonly index: number,
    readonly ord: number,
    readonly isFolder: boolean,
  ) {
    this.end = ord + 1;
  }

  get path(): Node<T>[] {
    const path: Node<T>[] = [];
    for (let n: Node<T> | null = this; n; n = n.parent) path.push(n);
    return path.reverse();
  }
}

/** Lower-cased label, computed once (filter and typeahead). */
export function lowerLabel(n: Node<unknown>): string {
  if (n.lower === undefined) n.lower = n.label.toLowerCase();
  return n.lower;
}

export interface Accessors<T> {
  getId: (item: T) => string | number;
  getLabel: (item: T) => string;
  getChildren: (item: T) => readonly T[] | null | undefined;
  hasChildren?: ((item: T) => boolean) | undefined;
}

export interface Index<T> {
  map: Map<Key, Node<T>>;
  /** Every node in pre-order. */
  list: Node<T>[];
  roots: Node<T>[];
}

interface Frame<T> {
  items: readonly T[];
  parent: Node<T> | null;
  i: number;
  out: Node<T>[];
}

/** One iterative O(n) pass: no recursion, so deep trees cannot overflow the stack. */
export function buildIndex<T>(
  data: readonly T[],
  acc: Accessors<T>,
  loaded: ReadonlyMap<Key, readonly T[]>,
  byPath: boolean,
): Index<T> {
  const map = new Map<Key, Node<T>>();
  const list: Node<T>[] = [];
  const roots: Node<T>[] = [];
  const stack: Frame<T>[] = [{ items: data, parent: null, i: 0, out: roots }];
  let duplicate: Key | undefined;

  while (stack.length) {
    const f = stack[stack.length - 1]!;
    if (f.i >= f.items.length) {
      stack.pop();
      if (f.parent) f.parent.end = list.length;
      continue;
    }
    const index = f.i++;
    const item = f.items[index]!;
    const id = String(acc.getId(item));
    const key = byPath && f.parent ? `${f.parent.key}/${id}` : id;
    if (map.has(key)) {
      duplicate ??= key;
      continue;
    }
    const kids = acc.getChildren(item) ?? loaded.get(key);
    const node = new Node(
      key,
      id,
      item,
      String(acc.getLabel(item) ?? ""),
      f.parent,
      f.parent ? f.parent.depth + 1 : 0,
      f.out.length,
      list.length,
      kids != null || acc.hasChildren?.(item) === true,
    );
    map.set(key, node);
    list.push(node);
    f.out.push(node);
    if (kids) {
      node.children = [];
      if (kids.length) stack.push({ items: kids, parent: node, i: 0, out: node.children });
    }
  }

  if (duplicate !== undefined) {
    console.warn(`[super-tree-view] Duplicate key "${duplicate}" skipped. See keyBy: "path".`);
  }
  return { map, list, roots };
}
