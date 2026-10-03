import { buildCheckIndex, cascadeState, countUnits, toggleCascade } from "./checks";
import {
  computeFilter,
  type FilterFlags,
  isForced,
  isMatched,
  type NormalizedFilter,
  normalizeFilter,
} from "./filter";
import { buildIndex, lowerLabel, type Node } from "./node";
import type {
  Attrs,
  CheckedStrategy,
  CheckState,
  DefaultItem,
  DragState,
  DropPosition,
  Key,
  KeyInput,
  RowState,
  TreeInstance,
  TreeOptions,
} from "./types";
import { computeVisible } from "./visible";

const HANDLERS = {
  expanded: "onExpandedChange",
  selected: "onSelectedChange",
  checked: "onCheckedChange",
} as const;

const TYPEAHEAD_MS = 500;

/** Recomputes only when a dependency changes identity. */
function memo<D extends unknown[], R>(deps: () => [...D], compute: (deps: NoInfer<D>) => R) {
  let last: D | undefined;
  let value: R;
  return {
    get(): R {
      const d = deps();
      if (!last || d.some((x, i) => !Object.is(x, last![i]))) {
        value = compute(d);
        last = d;
      }
      return value;
    },
    prime(d: D, v: R) {
      last = d;
      value = v;
    },
  };
}

const sameSet = (a: ReadonlySet<Key>, b: ReadonlySet<Key>) => {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
};

const flag = (b: boolean) => (b ? "" : undefined);

export function createTree<T = DefaultItem>(initial: TreeOptions<T>): TreeInstance<T> {
  let o = initial;
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = () => {
    version++;
    for (const l of listeners) l();
  };

  /** Controlled when the option is set, otherwise internal. Changes always go through `on*Change`. */
  const slice = (name: keyof typeof HANDLERS, init: readonly Key[] | undefined) => {
    let internal = new Set<Key>(init);
    let emittedArr: readonly Key[] | undefined;
    let emittedSet = internal;
    let cacheArr: readonly Key[] | undefined;
    let cacheSet = internal;
    return {
      get(): Set<Key> {
        const v = o[name];
        if (v === undefined) return internal;
        if (v === emittedArr) return emittedSet;
        if (v !== cacheArr) {
          cacheArr = v;
          cacheSet = new Set(v);
        }
        return cacheSet;
      },
      set(next: Set<Key>) {
        const arr = [...next];
        emittedArr = arr;
        emittedSet = next;
        if (o[name] === undefined) internal = next;
        o[HANDLERS[name]]?.(arr, api);
        emit();
      },
    };
  };

  const expanded = slice("expanded", initial.defaultExpanded);
  const selected = slice("selected", initial.defaultSelected);
  const checked = slice("checked", initial.defaultChecked);

  let focused: Key | null = null;
  let anchor: Key | null = null;
  const loading = new Set<Key>();
  const errors = new Set<Key>();
  const queued = new Set<Key>();
  const loaded = new Map<Key, readonly T[]>();
  let lazyV = 0;
  let overrides = new Map<Key, boolean>();
  let overridesV = 0;
  let lastFilter: NormalizedFilter<T> = null;
  let drag: DragState = null;
  let dragSet = new Set<Key>();
  let typed = "";
  let typedAt = 0;
  let visV = 0;

  const index = memo(
    () => [o.data, o.keyBy, lazyV],
    () =>
      buildIndex(
        o.data,
        {
          getId: o.getId ?? ((item: any) => item.id),
          getLabel: o.getLabel ?? ((item: any) => item.name),
          getChildren: o.getChildren ?? ((item: any) => item.children),
          hasChildren: o.hasChildren,
        },
        loaded,
        o.keyBy === "path",
      ),
  );

  const filter = memo(
    () => [index.get(), normalizeFilter(o.filter)],
    ([idx, f]) => {
      // A new query starts from the user's own expansion again.
      if (f !== lastFilter) {
        lastFilter = f;
        overrides = new Map();
        overridesV++;
      }
      return computeFilter(idx, f);
    },
  );

  const isExp = (n: Node<T>, exp: ReadonlySet<Key>, flags: FilterFlags | null) => {
    if (flags) {
      const ov = overrides.get(n.key);
      if (ov !== undefined) return ov;
      if (isForced(flags, n.ord)) return true;
    }
    return exp.has(n.key);
  };

  const visible = memo(
    () => [index.get(), expanded.get(), filter.get(), overridesV],
    ([idx, exp, flags]) => {
      const vis = computeVisible(idx, (n) => isExp(n, exp, flags), flags, ++visV);
      if (o.loadChildren) {
        for (const n of vis.nodes)
          if (n.isFolder && !n.children && isExp(n, exp, flags)) schedule(n.key);
      }
      return vis;
    },
  );

  const checkMode = () => o.checkMode ?? "none";
  const selectionMode = () => o.selectionMode ?? "single";
  const disabled = (n: Node<T>) => o.isDisabled?.(n.item) ?? false;
  const checkable = (n: Node<T>) => checkMode() !== "none" && (o.isCheckable?.(n.item) ?? true);
  const selectable = (n: Node<T>) => !disabled(n) && (o.isSelectable?.(n.item) ?? true);

  const units = memo(
    () => [index.get(), o.checkMode],
    ([idx]) => countUnits(idx, (n) => checkable(n) && !disabled(n) && !n.children?.length),
  );
  const checks = memo(
    () => [index.get(), units.get(), checked.get()],
    ([idx, u, raw]) => buildCheckIndex(idx, u, raw),
  );

  const node = (key: Key) => index.get().map.get(key);
  const visIndex = (n: Node<T>) => {
    const v = visible.get().v;
    return n.visV === v ? n.vis : -1;
  };
  const isExpandedNode = (n: Node<T>) => isExp(n, expanded.get(), filter.get());

  const getFocusedKey = (): Key | null => {
    const vis = visible.get();
    if (!vis.nodes.length) return null;
    let n = focused == null ? undefined : node(focused);
    while (n && visIndex(n) < 0) n = n.parent ?? undefined;
    return (n ?? vis.nodes[0]!).key;
  };

  const focus = (key: Key) => {
    if (focused !== key) {
      focused = key;
      emit();
    }
  };

  // --- expansion -----------------------------------------------------------

  const setExpMany = (nodes: Node<T>[], value: boolean) => {
    const flags = filter.get();
    const exp = expanded.get();
    const changed = nodes.filter((n) => n.isFolder && isExp(n, exp, flags) !== value);
    if (changed.length) {
      if (flags) {
        for (const n of changed) overrides.set(n.key, value);
        overridesV++;
        emit();
      } else {
        const next = new Set(exp);
        for (const n of changed) {
          if (value) next.add(n.key);
          else next.delete(n.key);
        }
        expanded.set(next);
      }
    }
    if (value && o.loadChildren) {
      for (const n of nodes) {
        if (n.isFolder && !n.children) {
          errors.delete(n.key);
          void load(n.key);
        }
      }
    }
  };
  const setExp = (key: Key, value: boolean) => {
    const n = node(key);
    if (n) setExpMany([n], value);
  };

  // --- lazy loading --------------------------------------------------------

  const schedule = (key: Key) => {
    if (loading.has(key) || errors.has(key) || queued.has(key)) return;
    queued.add(key);
    queueMicrotask(() => {
      queued.delete(key);
      void load(key);
    });
  };

  const load = async (key: Key) => {
    const n = node(key);
    if (!n || !o.loadChildren || loading.has(key)) return;
    loading.add(key);
    errors.delete(key);
    emit();
    try {
      const items = await o.loadChildren(n);
      loaded.set(key, items);
      lazyV++;
    } catch (error) {
      errors.add(key);
      o.onLoadError?.(n, error);
    }
    loading.delete(key);
    if (errors.has(key)) setExp(key, false);
    emit();
  };

  // --- selection -----------------------------------------------------------

  const getSelected = () => {
    const sel = selected.get();
    return sel.size ? index.get().list.filter((n) => sel.has(n.key)) : [];
  };

  const select = (key: Key, opts: { toggle?: boolean; range?: boolean } = {}) => {
    const n = node(key);
    const mode = selectionMode();
    if (!n || mode === "none" || !selectable(n)) return;
    const cur = selected.get();
    let next: Set<Key>;
    const ib = visIndex(n);
    if (mode === "multiple" && opts.range && ib >= 0) {
      const vis = visible.get().nodes;
      const a = anchor == null ? undefined : node(anchor);
      const ia = a ? visIndex(a) : -1;
      const from = ia < 0 ? ib : ia;
      next = opts.toggle ? new Set(cur) : new Set();
      for (let i = Math.min(from, ib); i <= Math.max(from, ib); i++) {
        const v = vis[i]!;
        if (selectable(v)) next.add(v.key);
      }
      if (ia < 0) anchor = key;
    } else if (opts.toggle) {
      next = mode === "multiple" ? new Set(cur) : new Set(cur.has(key) ? [] : [key]);
      if (mode === "multiple") {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      }
      anchor = key;
    } else {
      next = new Set([key]);
      anchor = key;
    }
    if (!sameSet(cur, next)) selected.set(next);
  };

  const clearSelection = () => {
    if (selected.get().size) selected.set(new Set());
  };

  // --- checks --------------------------------------------------------------

  const checkState = (n: Node<T>): CheckState => {
    const mode = checkMode();
    if (mode === "none" || !checkable(n)) return false;
    if (mode === "independent") return checked.get().has(n.key);
    return cascadeState(units.get(), checks.get(), n);
  };

  const setCheck = (key: Key, value: boolean) => {
    const n = node(key);
    const mode = checkMode();
    if (!n || mode === "none" || !checkable(n) || disabled(n)) return;
    if (mode === "independent") {
      const cur = checked.get();
      if (cur.has(key) === value) return;
      const next = new Set(cur);
      if (value) next.add(key);
      else next.delete(key);
      checked.set(next);
      return;
    }
    const idx = index.get();
    const u = units.get();
    const ci = checks.get();
    if (cascadeState(u, ci, n) === value) return;
    const next = toggleCascade(idx, u, ci, n, value);
    checks.prime([idx, u, next.set], next);
    checked.set(next.set);
  };

  const getChecked = (strategy: CheckedStrategy = "leaf") => {
    const mode = checkMode();
    const out: Node<T>[] = [];
    if (mode === "none") return out;
    const { list } = index.get();
    for (let i = 0; i < list.length; i++) {
      const n = list[i]!;
      if (checkState(n) !== true) continue;
      if (strategy === "parent") {
        out.push(n);
        i = n.end - 1;
      } else if (strategy === "all" || mode === "independent" || !n.children?.length) {
        out.push(n);
      }
    }
    return out;
  };

  // --- drag and drop -------------------------------------------------------

  /** Removes keys whose ancestor is also in the list (moving a folder moves its children). */
  const topLevel = (keys: Key[]) => {
    const ks = new Set(keys);
    return keys.filter((k) => {
      const n = node(k);
      if (!n) return false;
      for (let p = n.parent; p; p = p.parent) if (ks.has(p.key)) return false;
      return true;
    });
  };

  const validDrop = (keys: Key[], target: Node<T>, position: DropPosition) => {
    const ks = new Set(keys);
    for (let p: Node<T> | null = target; p; p = p.parent) if (ks.has(p.key)) return false;
    if (position === "inside" && !target.isFolder) return false;
    const sources = keys.map(node).filter((n): n is Node<T> => !!n);
    return o.canDrop?.({ sources, target, position }) ?? true;
  };

  const startDrag = (key: Key) => {
    const n = node(key);
    const can = (x: Node<T>) => !disabled(x) && o.canDrag?.(x) !== false;
    if (!n || !o.onMove || !can(n)) return false;
    const keys =
      selectionMode() === "multiple" && selected.get().has(key)
        ? topLevel(
            getSelected()
              .filter(can)
              .map((s) => s.key),
          )
        : [key];
    dragSet = new Set(keys);
    drag = { keys, target: null };
    emit();
    return true;
  };

  const updateDrop = (at: number, ratio: number) => {
    if (!drag) return;
    const vis = visible.get().nodes;
    let target: Node<T> | undefined;
    let position: DropPosition = "after";
    if (vis.length && at < 0) {
      target = vis[0];
      position = "before";
    } else if (vis.length && at >= vis.length) {
      // Below the last row: after its root-level ancestor.
      target = vis[vis.length - 1]!;
      while (target.parent) target = target.parent;
    } else if (vis.length) {
      const n = vis[at]!;
      target = n;
      if (n.isFolder) position = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
      else position = ratio < 0.5 ? "before" : "after";
      // Just below an expanded folder means "first child".
      const nextRow = vis[at + 1];
      if (position === "after" && nextRow?.parent === n) {
        target = nextRow;
        position = "before";
      }
    }
    const next =
      target && validDrop(drag.keys, target, position) ? { key: target.key, position } : null;
    const cur = drag.target;
    if (cur?.key !== next?.key || cur?.position !== next?.position) {
      drag = { keys: drag.keys, target: next };
      emit();
    }
  };

  const move = (keys: Key[], targetKey: Key, position: DropPosition) => {
    const target = node(targetKey);
    const top = topLevel(keys);
    if (!target || !o.onMove || !top.length || !validDrop(top, target, position)) return false;
    const inside = position === "inside";
    o.onMove({
      sources: top.map((k) => node(k)!),
      target,
      position,
      parent: inside ? target : target.parent,
      index: inside
        ? (target.children?.length ?? 0)
        : target.index + (position === "after" ? 1 : 0),
    });
    if (inside) setExp(target.key, true);
    return true;
  };

  const cancelDrag = () => {
    if (!drag) return;
    drag = null;
    dragSet = new Set();
    emit();
  };

  // --- keyboard ------------------------------------------------------------

  const typeahead = (ch: string, from: number, vis: Node<T>[]) => {
    const now = Date.now();
    typed = now - typedAt > TYPEAHEAD_MS ? ch.toLowerCase() : typed + ch.toLowerCase();
    typedAt = now;
    // Repeating one letter cycles through the nodes starting with it.
    const repeated = [...typed].every((c) => c === typed[0]);
    const q = repeated ? typed[0]! : typed;
    const start = repeated ? from + 1 : from;
    for (let k = 0; k < vis.length; k++) {
      const n = vis[(start + k) % vis.length]!;
      if (lowerLabel(n).startsWith(q)) {
        focus(n.key);
        break;
      }
    }
    return true;
  };

  const activate = (key: Key) => {
    const n = node(key);
    if (!n) return;
    if (o.onActivate) o.onActivate(n);
    else if (n.isFolder) setExp(key, !isExpandedNode(n));
  };

  const toggleCheck = (key: Key) => {
    const n = node(key);
    if (n) setCheck(key, checkState(n) !== true);
  };

  const handleKeyDown = (e: KeyInput, pageSize = 10): boolean => {
    if (e.key === "Escape") {
      if (drag) cancelDrag();
      else if (selectionMode() === "multiple" && selected.get().size) clearSelection();
      else return false;
      return true;
    }
    const vis = visible.get().nodes;
    const curKey = getFocusedKey();
    if (curKey == null) return false;
    const cur = node(curKey)!;
    const i = visIndex(cur);
    const mod = !!(e.ctrlKey || e.metaKey);
    const multi = selectionMode() === "multiple";
    let key = e.key;
    if (o.dir === "rtl" && (key === "ArrowLeft" || key === "ArrowRight")) {
      key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    }

    const moveTo = (j: number, extend = false) => {
      const t = vis[Math.max(0, Math.min(vis.length - 1, j))]!;
      if (extend && multi) {
        if (anchor == null || !node(anchor)) anchor = cur.key;
        focus(t.key);
        select(t.key, { range: true });
      } else {
        focus(t.key);
        if (o.selectionFollowsFocus && !mod) select(t.key);
      }
    };

    // Alt + Up / Down reorders the focused node: the keyboard alternative to dragging.
    if (e.altKey && o.onMove && (key === "ArrowUp" || key === "ArrowDown")) {
      const up = key === "ArrowUp";
      const siblings = cur.parent ? (cur.parent.children as Node<T>[]) : index.get().roots;
      const t = siblings[cur.index + (up ? -1 : 1)];
      if (t) move([cur.key], t.key, up ? "before" : "after");
      return true;
    }

    switch (key) {
      case "ArrowDown":
        moveTo(i + 1, e.shiftKey);
        return true;
      case "ArrowUp":
        moveTo(i - 1, e.shiftKey);
        return true;
      case "PageDown":
        moveTo(i + pageSize, e.shiftKey);
        return true;
      case "PageUp":
        moveTo(i - pageSize, e.shiftKey);
        return true;
      case "Home":
        moveTo(0, e.shiftKey && mod);
        return true;
      case "End":
        moveTo(vis.length - 1, e.shiftKey && mod);
        return true;
      case "ArrowRight":
        if (!cur.isFolder) return false;
        if (!isExpandedNode(cur)) setExp(cur.key, true);
        else if (vis[i + 1]?.parent === cur) moveTo(i + 1);
        return true;
      case "ArrowLeft":
        if (cur.isFolder && isExpandedNode(cur)) setExp(cur.key, false);
        else if (cur.parent) moveTo(visIndex(cur.parent));
        else return false;
        return true;
      case "Enter":
        activate(cur.key);
        return true;
      case " ":
        if (checkable(cur) && !disabled(cur)) toggleCheck(cur.key);
        else if (multi && e.shiftKey) select(cur.key, { range: true });
        else select(cur.key, { toggle: multi || mod });
        return true;
      case "*":
        setExpMany(cur.parent ? (cur.parent.children as Node<T>[]) : index.get().roots, true);
        return true;
    }
    if (mod && key.toLowerCase() === "a") {
      if (!multi) return false;
      api.selectAll();
      return true;
    }
    if (key.length === 1 && !mod && !e.altKey) return typeahead(key, i, vis);
    return false;
  };

  // --- rows ----------------------------------------------------------------

  const rowState = (n: Node<T>): RowState => {
    const vis = visible.get();
    const i = visIndex(n);
    const flags = filter.get();
    const t = drag?.target;
    return {
      index: i,
      level: n.depth + 1,
      posinset: i < 0 ? 0 : vis.posinset[i]!,
      setsize: i < 0 ? 0 : vis.setsize[i]!,
      folder: n.isFolder,
      expanded: n.isFolder && isExp(n, expanded.get(), flags),
      selected: selected.get().has(n.key),
      focused: getFocusedKey() === n.key,
      checkable: checkable(n),
      checked: checkState(n),
      disabled: disabled(n),
      loading: loading.has(n.key),
      error: errors.has(n.key),
      match: !!flags && isMatched(flags, n.ord),
      dragging: dragSet.has(n.key),
      drop: t && t.key === n.key ? t.position : null,
    };
  };

  const api: TreeInstance<T> = {
    get options() {
      return o;
    },
    setOptions(next) {
      o = next;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getVersion: () => version,

    getNode: node,
    getRoots: () => index.get().roots,
    getVisibleNodes: () => visible.get().nodes,
    getVisibleIndex: (key) => {
      const n = node(key);
      return n ? visIndex(n) : -1;
    },
    getRowState: (n) => rowState(n as Node<T>),
    getRowAttrs(n, s = rowState(n as Node<T>)): Attrs {
      return {
        role: "treeitem",
        tabIndex: s.focused ? 0 : -1,
        "aria-level": s.level,
        "aria-posinset": s.posinset,
        "aria-setsize": s.setsize,
        "aria-expanded": s.folder ? String(s.expanded) : undefined,
        "aria-selected": selectionMode() === "none" ? undefined : String(s.selected),
        "aria-checked": s.checkable ? String(s.checked) : undefined,
        "aria-disabled": s.disabled ? "true" : undefined,
        "aria-busy": s.loading ? "true" : undefined,
        "data-stv-key": n.key,
        "data-stv-index": s.index,
        "data-depth": n.depth,
        "data-folder": flag(s.folder),
        "data-expanded": flag(s.expanded),
        "data-selected": flag(s.selected),
        "data-focused": flag(s.focused),
        "data-checked": s.checkable ? String(s.checked) : undefined,
        "data-disabled": flag(s.disabled),
        "data-loading": flag(s.loading),
        "data-error": flag(s.error),
        "data-match": flag(s.match),
        "data-dragging": flag(s.dragging),
        "data-drop": s.drop ?? undefined,
      };
    },
    getTreeAttrs: () => ({
      role: "tree",
      "aria-multiselectable": selectionMode() === "multiple" ? "true" : undefined,
      dir: o.dir,
    }),

    isExpanded: (key) => {
      const n = node(key);
      return !!n && isExpandedNode(n);
    },
    toggle: (key) => {
      const n = node(key);
      if (n) setExp(key, !isExpandedNode(n));
    },
    expand: (key) => setExp(key, true),
    collapse: (key) => setExp(key, false),
    expandAll: () =>
      setExpMany(
        index.get().list.filter((n) => n.children?.length),
        true,
      ),
    collapseAll: () => {
      if (filter.get()) setExpMany(index.get().list, false);
      else if (expanded.get().size) expanded.set(new Set());
    },
    setExpanded: (keys) => expanded.set(new Set(keys)),

    isSelected: (key) => selected.get().has(key),
    select,
    selectAll: () => {
      if (selectionMode() !== "multiple") return;
      const next = new Set(
        visible
          .get()
          .nodes.filter(selectable)
          .map((n) => n.key),
      );
      if (!sameSet(selected.get(), next)) selected.set(next);
    },
    clearSelection,
    setSelected: (keys) => selected.set(new Set(keys)),
    getSelected,

    getCheckState: (key) => {
      const n = node(key);
      return n ? checkState(n) : checked.get().has(key);
    },
    toggleCheck,
    setCheck,
    setChecked: (keys) => checked.set(new Set(keys)),
    getChecked,

    getFocusedKey,
    focus,
    handleKeyDown,
    activate,

    isMatch: (key) => {
      const n = node(key);
      const flags = filter.get();
      return !!n && !!flags && isMatched(flags, n.ord);
    },
    isLoading: (key) => loading.has(key),
    loadChildren: load,
    invalidateChildren: (key) => {
      if (key === undefined) loaded.clear();
      else loaded.delete(key);
      lazyV++;
      emit();
    },

    getDragState: () => drag,
    startDrag,
    updateDrop,
    drop: () => {
      const d = drag;
      if (!d) return;
      cancelDrag();
      if (d.target) move(d.keys, d.target.key, d.target.position);
    },
    cancelDrag,
    move,
  };
  return api;
}
