export interface VirtualRange {
  /** First rendered index. */
  start: number;
  /** One past the last rendered index. */
  end: number;
}

/** Rows to render for a fixed row height. */
export function computeRange(
  count: number,
  rowHeight: number,
  scrollTop: number,
  viewportHeight: number,
  overscan = 8,
): VirtualRange {
  if (count <= 0 || rowHeight <= 0) return { start: 0, end: 0 };
  const first = Math.max(0, Math.floor(scrollTop / rowHeight));
  const visible = Math.ceil(viewportHeight / rowHeight) + 1;
  return {
    start: Math.min(count, Math.max(0, first - overscan)),
    end: Math.min(count, first + visible + overscan),
  };
}

/** The scrollTop that brings `index` into view, or `null` when it already is. */
export function scrollTopFor(
  index: number,
  rowHeight: number,
  scrollTop: number,
  viewportHeight: number,
): number | null {
  const top = index * rowHeight;
  if (top < scrollTop) return top;
  if (top + rowHeight > scrollTop + viewportHeight) return top + rowHeight - viewportHeight;
  return null;
}
