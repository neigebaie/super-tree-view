import { afterEach, describe, expect, it, vi } from "vitest";
import { createTree, type TreeInstance } from "../src";
import { data, type Item } from "./fixture";

const tree = (opts: Partial<Parameters<typeof createTree<Item>>[0]> = {}) =>
  createTree<Item>({ data, ...opts });

const press = (t: TreeInstance<Item>, key: string, mods: Record<string, boolean> = {}) =>
  t.handleKeyDown({ key, ...mods });

afterEach(() => {
  vi.useRealTimers();
});

describe("keyboard (WAI-ARIA tree pattern)", () => {
  it("moves focus with arrows, Home and End", () => {
    const t = tree({ defaultExpanded: ["science"] });
    expect(t.getFocusedKey()).toBe("science");
    expect(press(t, "ArrowDown")).toBe(true);
    expect(t.getFocusedKey()).toBe("physics");
    press(t, "End");
    expect(t.getFocusedKey()).toBe("math");
    press(t, "ArrowDown");
    expect(t.getFocusedKey()).toBe("math");
    press(t, "Home");
    expect(t.getFocusedKey()).toBe("science");
    expect(t.getRowAttrs(t.getNode("science")!).tabIndex).toBe(0);
    expect(t.getRowAttrs(t.getNode("math")!).tabIndex).toBe(-1);
  });

  it("ArrowRight opens, then enters; ArrowLeft closes, then goes to the parent", () => {
    const t = tree();
    press(t, "ArrowRight");
    expect(t.isExpanded("science")).toBe(true);
    expect(t.getFocusedKey()).toBe("science");
    press(t, "ArrowRight");
    expect(t.getFocusedKey()).toBe("physics");
    press(t, "ArrowLeft");
    expect(t.getFocusedKey()).toBe("science");
    press(t, "ArrowLeft");
    expect(t.isExpanded("science")).toBe(false);
    expect(press(t, "ArrowLeft")).toBe(false);
  });

  it("returns false for ArrowRight on a leaf", () => {
    const t = tree({ defaultExpanded: ["science", "physics", "mechanics"] });
    t.focus("newton1");
    expect(press(t, "ArrowRight")).toBe(false);
  });

  it("swaps horizontal arrows in rtl", () => {
    const t = tree({ dir: "rtl" });
    press(t, "ArrowLeft");
    expect(t.isExpanded("science")).toBe(true);
  });

  it("Enter activates, defaulting to a toggle", () => {
    const t = tree();
    press(t, "Enter");
    expect(t.isExpanded("science")).toBe(true);
    const onActivate = vi.fn();
    const t2 = tree({ onActivate });
    press(t2, "Enter");
    expect(onActivate).toHaveBeenCalledWith(t2.getNode("science"));
    expect(t2.isExpanded("science")).toBe(false);
  });

  it("Space checks in check mode and selects otherwise", () => {
    const t = tree({ checkMode: "cascade" });
    press(t, " ");
    expect(t.getCheckState("science")).toBe(true);
    const t2 = tree();
    press(t2, " ");
    expect(t2.isSelected("science")).toBe(true);
  });

  it("* expands all siblings", () => {
    const t = tree();
    press(t, "*");
    expect(t.isExpanded("science")).toBe(true);
    expect(t.isExpanded("math")).toBe(true);
  });

  it("Shift+arrows extend the selection, Ctrl+A selects all, Escape clears", () => {
    const t = tree({ selectionMode: "multiple", defaultExpanded: ["science"] });
    press(t, "ArrowDown", { shiftKey: true });
    press(t, "ArrowDown", { shiftKey: true });
    expect(t.getSelected().map((n) => n.key)).toEqual(["science", "physics", "chemistry"]);
    press(t, "ArrowUp", { shiftKey: true });
    expect(t.getSelected().map((n) => n.key)).toEqual(["science", "physics"]);
    press(t, "a", { ctrlKey: true });
    expect(t.getSelected()).toHaveLength(4);
    expect(press(t, "Escape")).toBe(true);
    expect(t.getSelected()).toHaveLength(0);
    expect(press(t, "Escape")).toBe(false);
  });

  it("can move the selection with the focus", () => {
    const t = tree({ selectionFollowsFocus: true });
    press(t, "ArrowDown");
    expect(t.isSelected("math")).toBe(true);
  });

  it("typeahead jumps by label prefix and cycles on repeated letters", () => {
    vi.useFakeTimers();
    const t = tree({ defaultExpanded: ["science", "physics", "mechanics"] });
    press(t, "n");
    expect(t.getFocusedKey()).toBe("newton1");
    press(t, "n");
    expect(t.getFocusedKey()).toBe("newton2");
    vi.advanceTimersByTime(600);
    press(t, "m");
    expect(t.getFocusedKey()).toBe("math");
    press(t, "e");
    expect(t.getFocusedKey()).toBe("mechanics");
    vi.advanceTimersByTime(600);
    press(t, "c");
    expect(t.getFocusedKey()).toBe("momentum");
  });

  it("falls back to the nearest visible ancestor when the focused node is hidden", () => {
    const t = tree({ defaultExpanded: ["science", "physics"] });
    t.focus("thermo");
    t.collapse("science");
    expect(t.getFocusedKey()).toBe("science");
  });

  it("reorders with Alt + Up / Down when drag and drop is enabled", () => {
    const onMove = vi.fn();
    const t = tree({ onMove, defaultExpanded: ["science"] });
    t.focus("chemistry");
    expect(press(t, "ArrowUp", { altKey: true })).toBe(true);
    expect(onMove.mock.calls[0]![0]).toMatchObject({ position: "before", index: 0 });
    expect(onMove.mock.calls[0]![0].target.key).toBe("physics");
    press(t, "ArrowDown", { altKey: true });
    expect(onMove).toHaveBeenCalledOnce();
  });

  it("pages by the given size", () => {
    const t = tree();
    t.expandAll();
    t.handleKeyDown({ key: "PageDown" }, 5);
    expect(t.getVisibleIndex(t.getFocusedKey()!)).toBe(5);
  });
});
