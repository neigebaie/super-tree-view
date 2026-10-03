import { type FilterFlags, isShown } from "./filter";
import type { Index, Node } from "./node";

export interface Visible<T> {
  nodes: Node<T>[];
  posinset: number[];
  setsize: number[];
  /** Pass id, stamped on nodes so `node.vis` lookups are O(1). */
  v: number;
}

interface Frame<T> {
  list: Node<T>[];
  i: number;
}

/** Flattens the expanded part of the tree into rows: the basis for virtualization. */
export function computeVisible<T>(
  index: Index<T>,
  isExpanded: (n: Node<T>) => boolean,
  flags: FilterFlags | null,
  v: number,
): Visible<T> {
  const nodes: Node<T>[] = [];
  const posinset: number[] = [];
  const setsize: number[] = [];
  const shown = (list: Node<T>[]) => (flags ? list.filter((n) => isShown(flags, n.ord)) : list);
  const stack: Frame<T>[] = [{ list: shown(index.roots), i: 0 }];

  while (stack.length) {
    const f = stack[stack.length - 1]!;
    if (f.i >= f.list.length) {
      stack.pop();
      continue;
    }
    const n = f.list[f.i++]!;
    n.vis = nodes.length;
    n.visV = v;
    nodes.push(n);
    posinset.push(f.i);
    setsize.push(f.list.length);
    if (n.children?.length && isExpanded(n)) {
      const kids = shown(n.children);
      if (kids.length) stack.push({ list: kids, i: 0 });
    }
  }
  return { nodes, posinset, setsize, v };
}
