import {
  computeRange,
  scrollTopFor,
  type TreeInstance,
  type TreeNode,
} from "@super-tree-view/core";
import { type UIEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface VirtualizerOptions {
  /** Fixed row height in px. Default: 32. */
  rowHeight?: number;
  /** Extra rows rendered above and below the viewport. Default: 8. */
  overscan?: number;
  /** `false` renders every visible row. Default: true. */
  enabled?: boolean;
  /** Rows rendered before the viewport is measured (and on the server). Default: 30. */
  initialRowCount?: number;
}

export interface VirtualRow<T> {
  node: TreeNode<T>;
  index: number;
  /** Offset from the top of the scroll content, in px. */
  top: number;
}

export function useTreeVirtualizer<T>(
  tree: TreeInstance<T>,
  { rowHeight = 32, overscan = 8, enabled = true, initialRowCount = 30 }: VirtualizerOptions = {},
) {
  const ref = useRef<HTMLDivElement>(null);
  const [first, setFirst] = useState(0);
  const [height, setHeight] = useState(0);
  const nodes = tree.getVisibleNodes();
  const count = nodes.length;
  const totalHeight = count * rowHeight;

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  const warned = useRef(false);
  useEffect(() => {
    if (enabled && !warned.current && count > 1000 && height > 0 && height >= totalHeight) {
      warned.current = true;
      console.warn(
        "[super-tree-view] No height set: every row renders. Give the tree a height to virtualize.",
      );
    }
  }, [enabled, count, height, totalHeight]);

  // Storing the first row index (not scrollTop) lets React skip renders within a row.
  const onScroll = useCallback(
    (e: UIEvent<HTMLElement>) => setFirst(Math.floor(e.currentTarget.scrollTop / rowHeight)),
    [rowHeight],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = ref.current;
      if (!el || index < 0) return;
      const top = scrollTopFor(index, rowHeight, el.scrollTop, el.clientHeight);
      if (top !== null) el.scrollTop = top;
    },
    [rowHeight],
  );

  const { start, end } = enabled
    ? computeRange(
        count,
        rowHeight,
        first * rowHeight,
        height || initialRowCount * rowHeight,
        overscan,
      )
    : { start: 0, end: count };
  const rows: VirtualRow<T>[] = [];
  for (let i = start; i < end; i++) rows.push({ node: nodes[i]!, index: i, top: i * rowHeight });
  // Keep the tab stop mounted so roving focus survives scrolling.
  const focusedKey = tree.getFocusedKey();
  const fi = focusedKey == null ? -1 : tree.getVisibleIndex(focusedKey);
  if (fi >= 0 && (fi < start || fi >= end))
    rows.push({ node: nodes[fi]!, index: fi, top: fi * rowHeight });

  return { ref, onScroll, rows, totalHeight, scrollToIndex };
}
