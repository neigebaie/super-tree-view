import type { MoveEvent, TreeNode } from "./types";

export interface MoveAccessors<T> {
  /** Default: `item.children`. */
  getChildren?: (item: T) => readonly T[] | null | undefined;
  /** Default: `{ ...item, children }`. */
  setChildren?: (item: T, children: T[]) => T;
}

const pathOf = (n: TreeNode<unknown>) => {
  const parts: number[] = [];
  for (let c: TreeNode<unknown> | null = n; c; c = c.parent) parts.push(c.index);
  return parts.reverse().join("/");
};

/**
 * Immutably applies a move event to the data it was computed from. Untouched subtrees keep
 * their identity. Nodes are located by position, so duplicate ids are fine.
 */
export function moveItems<T>(
  data: readonly T[],
  event: MoveEvent<T>,
  acc: MoveAccessors<T> = {},
): T[] {
  const getChildren = acc.getChildren ?? ((item: T) => (item as { children?: T[] }).children);
  const setChildren = acc.setChildren ?? ((item: T, children: T[]) => ({ ...item, children }));
  const sources = new Set(event.sources.map(pathOf));
  const target = event.parent ? pathOf(event.parent) : "";
  const affected = new Set<string>();
  const mark = (n: TreeNode<T> | null) => {
    for (let c = n; c; c = c.parent) affected.add(pathOf(c));
  };
  for (const s of event.sources) mark(s.parent);
  mark(event.parent);
  const moved = event.sources.map((s) => s.item);

  const build = (items: readonly T[], prefix: string): T[] => {
    const out: T[] = [];
    const here = prefix === target;
    items.forEach((item, i) => {
      if (here && i === event.index) out.push(...moved);
      const path = prefix ? `${prefix}/${i}` : String(i);
      if (sources.has(path)) return;
      out.push(affected.has(path) ? setChildren(item, build(getChildren(item) ?? [], path)) : item);
    });
    if (here && event.index >= items.length) out.push(...moved);
    return out;
  };
  return build(data, "");
}
