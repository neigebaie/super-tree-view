import type { Index, Node } from "./node";
import type { CheckState, Key } from "./types";

/**
 * Cascade bookkeeping. A "unit" is a checkable, enabled node without loaded children
 * (a leaf, an empty folder or a lazy folder not loaded yet). Folders derive their state
 * from how many units below them are checked, so every lookup is O(1).
 */
export interface Units {
  unit: Uint8Array;
  /** Units in each subtree, by pre-order position. */
  units: Int32Array;
}

export interface CheckIndex {
  /** Normalized checked keys: units, plus keys the cascade cannot expand. */
  set: Set<Key>;
  /** Checked units in each subtree. */
  counts: Int32Array;
}

export function countUnits<T>(index: Index<T>, isUnit: (n: Node<T>) => boolean): Units {
  const { list } = index;
  const unit = new Uint8Array(list.length);
  const units = new Int32Array(list.length);
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i]!;
    if (isUnit(n)) {
      unit[i] = 1;
      units[i]! += 1;
    }
    if (n.parent) units[n.parent.ord]! += units[i]!;
  }
  return { unit, units };
}

export function buildCheckIndex<T>(index: Index<T>, u: Units, raw: ReadonlySet<Key>): CheckIndex {
  const { list, map } = index;
  const set = new Set<Key>();
  for (const key of raw) {
    const n = map.get(key);
    // Unknown keys may belong to lazy children that are not loaded yet: keep them.
    if (!n || u.unit[n.ord] || !u.units[n.ord]) {
      set.add(key);
      continue;
    }
    for (let i = n.ord; i < n.end; i++) if (u.unit[i]) set.add(list[i]!.key);
  }
  const counts = new Int32Array(list.length);
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i]!;
    if (u.unit[i] && set.has(n.key)) counts[i]! += 1;
    if (n.parent) counts[n.parent.ord]! += counts[i]!;
  }
  return { set, counts };
}

export function cascadeState<T>(u: Units, ci: CheckIndex, n: Node<T>): CheckState {
  const total = u.units[n.ord]!;
  if (u.unit[n.ord] || !total) return ci.set.has(n.key);
  const c = ci.counts[n.ord]!;
  return c === 0 ? false : c === total ? true : "mixed";
}

/** O(subtree + depth): update the subtree, then push the delta up the ancestors. */
export function toggleCascade<T>(
  index: Index<T>,
  u: Units,
  ci: CheckIndex,
  n: Node<T>,
  value: boolean,
): CheckIndex {
  const set = new Set(ci.set);
  const counts = ci.counts.slice();
  if (!u.units[n.ord]) {
    if (value) set.add(n.key);
    else set.delete(n.key);
    return { set, counts };
  }
  let delta = 0;
  for (let i = n.ord; i < n.end; i++) {
    if (u.unit[i]) {
      const key = index.list[i]!.key;
      const had = set.has(key);
      if (value && !had) {
        set.add(key);
        delta++;
      } else if (!value && had) {
        set.delete(key);
        delta--;
      }
    }
    counts[i] = value ? u.units[i]! : 0;
  }
  if (!u.unit[n.ord]) set.delete(n.key);
  for (let p = n.parent; p; p = p.parent) counts[p.ord]! += delta;
  return { set, counts };
}
