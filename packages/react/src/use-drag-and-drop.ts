import type { TreeInstance } from "@super-tree-view/core";
import { type PointerEvent, type RefObject, useCallback, useEffect, useRef } from "react";

const THRESHOLD = 4;
const LONG_PRESS = 350;
const EDGE = 32;
const EXPAND_DELAY = 600;
const NO_DRAG =
  "[data-stv-part], button, a, input, textarea, select, [contenteditable], [data-stv-ignore]";

interface Gesture {
  id: number;
  key: string;
  x: number;
  y: number;
  px: number;
  py: number;
  touch: boolean;
  active: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Pointer-based drag and drop for a fixed-row-height tree: mouse and pen drag after a few
 * pixels, touch after a long press. Includes auto-scroll and auto-expand.
 */
export function useDragAndDrop<T>(
  tree: TreeInstance<T>,
  scrollRef: RefObject<HTMLDivElement | null>,
  rowHeight: number,
) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const preview = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const expandTimer = useRef<{ key: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const enabled = !!tree.options.onMove;

  const place = (x: number, y: number) => {
    if (preview.current) preview.current.style.transform = `translate(${x + 14}px, ${y + 10}px)`;
  };

  const scheduleExpand = (key: string | null) => {
    if (expandTimer.current?.key === key) return;
    if (expandTimer.current) clearTimeout(expandTimer.current.timer);
    expandTimer.current = key
      ? {
          key,
          timer: setTimeout(() => {
            expandTimer.current = null;
            tree.expand(key);
          }, EXPAND_DELAY),
        }
      : null;
  };

  const update = () => {
    const g = gesture.current;
    const el = scrollRef.current;
    if (!g?.active || !el) return;
    const inner = el.firstElementChild as HTMLElement | null;
    const y = g.py - el.getBoundingClientRect().top + el.scrollTop - (inner?.offsetTop ?? 0);
    const at = Math.floor(y / rowHeight);
    tree.updateDrop(at, y / rowHeight - at);
    place(g.px, g.py);
    const target = tree.getDragState()?.target;
    scheduleExpand(
      target?.position === "inside" && !tree.isExpanded(target.key) ? target.key : null,
    );
  };

  const autoScroll = () => {
    const g = gesture.current;
    const el = scrollRef.current;
    if (!g?.active || !el) return;
    const { top, bottom } = el.getBoundingClientRect();
    const dy =
      g.py < top + EDGE ? g.py - top - EDGE : g.py > bottom - EDGE ? g.py - bottom + EDGE : 0;
    if (dy) {
      el.scrollTop += Math.max(-20, Math.min(20, dy / 2));
      update();
    }
    frame.current = requestAnimationFrame(autoScroll);
  };

  const end = () => {
    const g = gesture.current;
    if (g?.timer) clearTimeout(g.timer);
    scheduleExpand(null);
    cancelAnimationFrame(frame.current);
    if (g?.active) {
      try {
        scrollRef.current?.releasePointerCapture(g.id);
      } catch {}
    }
    gesture.current = null;
  };

  const start = () => {
    const g = gesture.current;
    if (!g || !tree.startDrag(g.key)) return end();
    g.active = true;
    try {
      scrollRef.current?.setPointerCapture(g.id);
    } catch {}
    frame.current = requestAnimationFrame(autoScroll);
    update();
  };

  const onPointerDown = (e: PointerEvent) => {
    suppressClick.current = false;
    if (e.button !== 0) return;
    const target = e.target as Element;
    const row = target.closest<HTMLElement>("[data-stv-key]");
    if (!row || target.closest(NO_DRAG)) return;
    const g: Gesture = {
      id: e.pointerId,
      key: row.dataset.stvKey!,
      x: e.clientX,
      y: e.clientY,
      px: e.clientX,
      py: e.clientY,
      touch: e.pointerType === "touch",
      active: false,
    };
    if (g.touch) g.timer = setTimeout(start, LONG_PRESS);
    gesture.current = g;
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    g.px = e.clientX;
    g.py = e.clientY;
    if (g.active) return update();
    if (Math.hypot(g.px - g.x, g.py - g.y) < THRESHOLD) return;
    // Moving before the long press fires means the user is scrolling.
    if (g.touch) end();
    else start();
  };

  const onPointerUp = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    if (g.active) {
      suppressClick.current = true;
      tree.drop();
    }
    end();
  };

  const onPointerCancel = () => {
    if (gesture.current?.active) tree.cancelDrag();
    end();
  };

  // Block native touch scrolling while a long-press drag is active.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    const block = (ev: TouchEvent) => {
      if (gesture.current?.active) ev.preventDefault();
    };
    el.addEventListener("touchmove", block, { passive: false });
    return () => el.removeEventListener("touchmove", block);
  }, [enabled, scrollRef]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup on unmount only
  useEffect(() => end, []);

  const previewRef = useCallback((el: HTMLDivElement | null) => {
    preview.current = el;
    const g = gesture.current;
    if (el && g) el.style.transform = `translate(${g.px + 14}px, ${g.py + 10}px)`;
  }, []);

  return {
    handlers: enabled ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } : {},
    previewRef,
    /** True once after a drag, so the click that ends it is ignored. */
    consumeClick: () => {
      const v = suppressClick.current;
      suppressClick.current = false;
      return v;
    },
  };
}
