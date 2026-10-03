import { type Index, lowerLabel, type Node } from "./node";
import type { TreeNode } from "./types";

const MATCH = 1;
const ANCESTOR_MATCH = 2;
const DESCENDANT_MATCH = 4;

/** Per-node flags by pre-order position. */
export type FilterFlags = Uint8Array;

export type NormalizedFilter<T> = string | ((node: TreeNode<T>) => boolean) | null;

export function normalizeFilter<T>(
  filter: string | ((node: TreeNode<T>) => boolean) | null | undefined,
): NormalizedFilter<T> {
  if (typeof filter === "function") return filter;
  const q = filter?.trim().toLowerCase();
  return q ? q : null;
}

/**
 * A node is shown when it matches, when an ancestor matches (so a matched folder can still be
 * opened) or when a descendant matches. Only ancestors of matches are force-expanded.
 */
export function computeFilter<T>(index: Index<T>, filter: NormalizedFilter<T>): FilterFlags | null {
  if (filter === null) return null;
  const test = typeof filter === "string" ? (n: Node<T>) => lowerLabel(n).includes(filter) : filter;
  const { list } = index;
  const flags = new Uint8Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const n = list[i]!;
    let f = test(n) ? MATCH : 0;
    if (n.parent && flags[n.parent.ord]! & (MATCH | ANCESTOR_MATCH)) f |= ANCESTOR_MATCH;
    flags[i] = f;
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]!.parent;
    if (p && flags[i]! & (MATCH | DESCENDANT_MATCH)) flags[p.ord]! |= DESCENDANT_MATCH;
  }
  return flags;
}

export const isShown = (flags: FilterFlags, ord: number) => flags[ord] !== 0;
export const isForced = (flags: FilterFlags, ord: number) => (flags[ord]! & DESCENDANT_MATCH) !== 0;
export const isMatched = (flags: FilterFlags, ord: number) => (flags[ord]! & MATCH) !== 0;
