import { describe, expect, it, vi } from "vitest";
import { createTree, type MoveEvent, moveItems } from "../src";
import { data, type Item, keys } from "./fixture";

const ids = (items: readonly Item[] | undefined) => (items ?? []).map((i) => i.id);
const find = (items: readonly Item[], id: string): Item | undefined => {
  for (const i of items) {
    if (i.id === id) return i;
    const hit = i.children && find(i.children, id);
    if (hit) return hit;
  }
};

const dndTree = (opts: Partial<Parameters<typeof createTree<Item>>[0]> = {}) => {
  const onMove = vi.fn<(e: MoveEvent<Item>) => void>();
  const t = createTree<Item>({
    data,
    onMove,
    defaultExpanded: ["science", "physics", "mechanics"],
    ...opts,
  });
  const row = (key: string) => t.getVisibleIndex(key);
  return { t, onMove, row };
};

describe("drag and drop", () => {
  it("is disabled without onMove", () => {
    const t = createTree<Item>({ data });
    expect(t.startDrag("science")).toBe(false);
  });

  it("computes before / after on leaves and before / inside / after on folders", () => {
    const { t, row } = dndTree();
    t.startDrag("momentum");
    t.updateDrop(row("newton2"), 0.2);
    expect(t.getDragState()!.target).toEqual({ key: "newton2", position: "before" });
    t.updateDrop(row("newton2"), 0.7);
    expect(t.getDragState()!.target).toEqual({ key: "newton2", position: "after" });
    t.updateDrop(row("thermo"), 0.5);
    expect(t.getDragState()!.target).toEqual({ key: "thermo", position: "inside" });
    t.updateDrop(row("thermo"), 0.1);
    expect(t.getDragState()!.target).toEqual({ key: "thermo", position: "before" });
    expect(t.getRowState(t.getNode("thermo")!).drop).toBe("before");
    expect(t.getRowState(t.getNode("momentum")!).dragging).toBe(true);
  });

  it("maps 'after an expanded folder' to its first child", () => {
    const { t, row } = dndTree();
    t.startDrag("math");
    t.updateDrop(row("mechanics"), 0.9);
    expect(t.getDragState()!.target).toEqual({ key: "newton1", position: "before" });
  });

  it("drops below the last row after its root ancestor", () => {
    const { t } = dndTree();
    t.startDrag("newton1");
    t.updateDrop(999, 0.5);
    expect(t.getDragState()!.target).toEqual({ key: "math", position: "after" });
  });

  it("refuses drops into the dragged node or its descendants, and honors canDrop", () => {
    const { t, row } = dndTree({ canDrop: ({ target }) => target.key !== "chemistry" });
    t.startDrag("physics");
    t.updateDrop(row("mechanics"), 0.5);
    expect(t.getDragState()!.target).toBeNull();
    t.updateDrop(row("physics"), 0.1);
    expect(t.getDragState()!.target).toBeNull();
    t.updateDrop(row("chemistry"), 0.5);
    expect(t.getDragState()!.target).toBeNull();
    t.updateDrop(row("math"), 0.5);
    expect(t.getDragState()!.target).toEqual({ key: "math", position: "inside" });
  });

  it("emits a move event on drop and cancels on Escape", () => {
    const { t, onMove, row } = dndTree();
    t.startDrag("newton1");
    t.updateDrop(row("newton3"), 0.9);
    t.drop();
    expect(t.getDragState()).toBeNull();
    const e = onMove.mock.calls[0]![0];
    expect(keys(e.sources)).toEqual(["newton1"]);
    expect(e).toMatchObject({ position: "after", index: 3 });
    expect(e.parent?.key).toBe("mechanics");

    t.startDrag("newton1");
    expect(t.handleKeyDown({ key: "Escape" })).toBe(true);
    expect(t.getDragState()).toBeNull();
  });

  it("drags the whole selection, without nested duplicates", () => {
    const { t, onMove, row } = dndTree({ selectionMode: "multiple" });
    t.select("physics");
    t.select("newton1", { toggle: true });
    t.select("chemistry", { toggle: true });
    t.startDrag("chemistry");
    expect(t.getDragState()!.keys).toEqual(["physics", "chemistry"]);
    t.updateDrop(row("math"), 0.5);
    t.drop();
    expect(keys(onMove.mock.calls[0]![0].sources)).toEqual(["physics", "chemistry"]);
  });

  it("moves through the API for pointer-free alternatives", () => {
    const { t, onMove } = dndTree();
    expect(t.move(["physics"], "mechanics", "inside")).toBe(false);
    expect(t.move(["entropy"], "math", "inside")).toBe(true);
    expect(onMove.mock.calls[0]![0]).toMatchObject({ index: 1, position: "inside" });
    expect(t.isExpanded("math")).toBe(true);
  });
});

describe("moveItems", () => {
  const apply = (source: string[], target: string, position: "before" | "after" | "inside") => {
    let event: MoveEvent<Item> | undefined;
    const t = createTree<Item>({
      data,
      onMove: (e) => {
        event = e;
      },
    });
    t.move(source, target, position);
    return moveItems(data, event!);
  };

  it("reorders within the same parent, down and up", () => {
    expect(ids(find(apply(["newton1"], "newton3", "after"), "mechanics")!.children)).toEqual([
      "newton2",
      "newton3",
      "newton1",
      "momentum",
    ]);
    expect(ids(find(apply(["momentum"], "newton1", "before"), "mechanics")!.children)).toEqual([
      "momentum",
      "newton1",
      "newton2",
      "newton3",
    ]);
  });

  it("moves across folders and into folders", () => {
    const next = apply(["entropy"], "mechanics", "inside");
    expect(ids(find(next, "mechanics")!.children)).toEqual([
      "newton1",
      "newton2",
      "newton3",
      "momentum",
      "entropy",
    ]);
    expect(ids(find(next, "thermo")!.children)).toEqual(["thermo1", "thermo2"]);
  });

  it("moves several nodes at the root level", () => {
    expect(ids(apply(["math"], "science", "before"))).toEqual(["math", "science"]);
    const next = apply(["newton1", "galois"], "chemistry", "after");
    expect(ids(find(next, "science")!.children)).toEqual([
      "physics",
      "chemistry",
      "newton1",
      "galois",
    ]);
    expect(ids(find(next, "abstract")!.children)).toEqual(["groups", "rings", "fields"]);
  });

  it("keeps untouched subtrees and leaves the input intact", () => {
    const next = apply(["newton1"], "newton3", "after");
    expect(next[1]).toBe(data[1]);
    expect(find(next, "chemistry")).toBe(find(data, "chemistry"));
    expect(ids(find(data, "mechanics")!.children)[0]).toBe("newton1");
  });
});
