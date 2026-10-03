import { describe, expect, it, vi } from "vitest";
import { createTree, type TreeOptions } from "../src";
import { data, type Item, keys } from "./fixture";

const tree = (opts: Partial<Parameters<typeof createTree<Item>>[0]> = {}) =>
  createTree<Item>({ data, ...opts });

describe("index", () => {
  it("indexes nodes with depth, parent, sibling index and path", () => {
    const t = tree();
    const n = t.getNode("newton2")!;
    expect(n.depth).toBe(3);
    expect(n.index).toBe(1);
    expect(n.parent?.key).toBe("mechanics");
    expect(n.label).toBe("Newton's Second Law");
    expect(keys(n.path)).toEqual(["science", "physics", "mechanics", "newton2"]);
    expect(n.isFolder).toBe(false);
    expect(t.getNode("mechanics")!.isFolder).toBe(true);
  });

  it("supports the same item in several folders with keyBy: path", () => {
    const shared: Item = { id: "momentum", name: "Momentum", type: "item" };
    const dup: Item[] = [
      { id: "a", name: "A", type: "f", children: [shared] },
      { id: "b", name: "B", type: "f", children: [shared] },
    ];
    const t = createTree<Item>({ data: dup, keyBy: "path", defaultExpanded: ["a", "b"] });
    expect(keys(t.getVisibleNodes())).toEqual(["a", "a/momentum", "b", "b/momentum"]);
    expect(t.getNode("b/momentum")!.parent?.id).toBe("b");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const byId = createTree<Item>({ data: dup, defaultExpanded: ["a", "b"] });
    expect(keys(byId.getVisibleNodes())).toEqual(["a", "momentum", "b"]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("handles very deep trees without recursion", () => {
    const root: Item = { id: "0", name: "0", type: "f", children: [] };
    let cur = root;
    for (let i = 1; i < 20_000; i++) {
      const next: Item = { id: String(i), name: String(i), type: "f", children: [] };
      cur.children = [next];
      cur = next;
    }
    const t = createTree<Item>({ data: [root] });
    t.expandAll();
    expect(t.getVisibleNodes()).toHaveLength(20_000);
    expect(t.getNode("19999")!.depth).toBe(19_999);
  });

  it("accepts custom accessors", () => {
    interface File {
      path: string;
      files?: File[];
    }
    const t = createTree<File>({
      data: [{ path: "src", files: [{ path: "src/a.ts" }] }],
      getId: (i) => i.path,
      getLabel: (i) => i.path.split("/").pop()!,
      getChildren: (i) => i.files,
      defaultExpanded: ["src"],
    });
    expect(t.getVisibleNodes().map((n) => n.label)).toEqual(["src", "a.ts"]);
  });
});

describe("expansion", () => {
  it("toggles folders and flattens visible rows with ARIA positions", () => {
    const t = tree();
    expect(keys(t.getVisibleNodes())).toEqual(["science", "math"]);
    t.toggle("science");
    expect(keys(t.getVisibleNodes())).toEqual(["science", "physics", "chemistry", "math"]);
    const chem = t.getRowState(t.getNode("chemistry")!);
    expect(chem).toMatchObject({ index: 2, level: 2, posinset: 2, setsize: 2, expanded: false });
    expect(t.getRowAttrs(t.getNode("science")!)).toMatchObject({
      role: "treeitem",
      "aria-expanded": "true",
      "aria-level": 1,
      "data-expanded": "",
    });
    expect(t.getRowAttrs(t.getNode("math")!)["aria-expanded"]).toBe("false");
    t.toggle("science");
    expect(keys(t.getVisibleNodes())).toEqual(["science", "math"]);
  });

  it("expands and collapses everything", () => {
    const t = tree();
    t.expandAll();
    expect(t.getVisibleNodes()).toHaveLength(28);
    t.collapseAll();
    expect(t.getVisibleNodes()).toHaveLength(2);
  });

  it("works controlled: emits changes and renders the prop", () => {
    const onExpandedChange = vi.fn();
    const opts = { data, expanded: [] as string[], onExpandedChange };
    const t = createTree<Item>(opts);
    t.expand("math");
    expect(onExpandedChange).toHaveBeenCalledWith(["math"], t);
    expect(t.getVisibleNodes()).toHaveLength(2);
    t.setOptions({ ...opts, expanded: onExpandedChange.mock.calls[0]![0] });
    expect(keys(t.getVisibleNodes())).toEqual(["science", "math", "algebra"]);
  });

  it("notifies subscribers and bumps the version", () => {
    const t = tree();
    const listener = vi.fn();
    const unsubscribe = t.subscribe(listener);
    const v = t.getVersion();
    t.expand("science");
    expect(listener).toHaveBeenCalledOnce();
    expect(t.getVersion()).toBe(v + 1);
    unsubscribe();
    t.collapse("science");
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("selection", () => {
  it("selects a single node and toggles with modifiers", () => {
    const onSelectedChange = vi.fn();
    const t = tree({ onSelectedChange });
    t.select("science");
    t.select("math");
    expect(t.getSelected().map((n) => n.key)).toEqual(["math"]);
    t.select("math", { toggle: true });
    expect(t.getSelected()).toEqual([]);
    expect(onSelectedChange).toHaveBeenLastCalledWith([], t);
  });

  it("toggles and selects ranges from the anchor in multiple mode", () => {
    const t = tree({ selectionMode: "multiple", defaultExpanded: ["science", "physics"] });
    t.select("physics");
    t.select("math", { range: true });
    expect(keys(t.getSelected())).toEqual(["physics", "mechanics", "thermo", "chemistry", "math"]);
    t.select("thermo", { toggle: true });
    expect(keys(t.getSelected())).toEqual(["physics", "mechanics", "chemistry", "math"]);
    // The anchor moved to thermo.
    t.select("science", { range: true });
    expect(keys(t.getSelected())).toEqual(["science", "physics", "mechanics", "thermo"]);
  });

  it("skips disabled and unselectable nodes", () => {
    const t = tree({
      selectionMode: "multiple",
      defaultExpanded: ["science"],
      isDisabled: (i) => i.id === "physics",
      isSelectable: (i) => i.id !== "chemistry",
    });
    t.select("physics");
    expect(t.getSelected()).toEqual([]);
    t.select("science");
    t.select("math", { range: true });
    expect(keys(t.getSelected())).toEqual(["science", "math"]);
    expect(t.getRowAttrs(t.getNode("physics")!)["aria-disabled"]).toBe("true");
  });

  it("selects all visible nodes and clears", () => {
    const t = tree({ selectionMode: "multiple", defaultExpanded: ["math"] });
    t.selectAll();
    expect(keys(t.getSelected())).toEqual(["science", "math", "algebra"]);
    t.clearSelection();
    expect(t.getSelected()).toEqual([]);
  });

  it("does nothing in none mode", () => {
    const t = tree({ selectionMode: "none" });
    t.select("math");
    expect(t.getSelected()).toEqual([]);
    expect(t.getRowAttrs(t.getNode("math")!)["aria-selected"]).toBeUndefined();
  });
});

describe("checkboxes (cascade)", () => {
  const cascade = (opts: Partial<TreeOptions<Item>> = {}) =>
    tree({ checkMode: "cascade", ...opts });

  it("derives tri-state parents from leaves", () => {
    const t = cascade();
    t.toggleCheck("newton1");
    expect(t.getCheckState("newton1")).toBe(true);
    expect(t.getCheckState("mechanics")).toBe("mixed");
    expect(t.getCheckState("science")).toBe("mixed");
    expect(t.getCheckState("math")).toBe(false);
    for (const k of ["newton2", "newton3", "momentum"]) t.toggleCheck(k);
    expect(t.getCheckState("mechanics")).toBe(true);
    expect(t.getCheckState("physics")).toBe("mixed");
    expect(t.getRowAttrs(t.getNode("physics")!)["aria-checked"]).toBe("mixed");
  });

  it("checks a whole subtree and emits leaf keys", () => {
    const onCheckedChange = vi.fn();
    const t = cascade({ onCheckedChange });
    t.toggleCheck("physics");
    expect(onCheckedChange.mock.calls[0]![0].sort()).toEqual(
      ["newton1", "newton2", "newton3", "momentum", "thermo1", "thermo2", "entropy"].sort(),
    );
    expect(t.getCheckState("physics")).toBe(true);
    expect(t.getCheckState("science")).toBe("mixed");
    t.toggleCheck("science");
    expect(t.getCheckState("science")).toBe(true);
    expect(keys(t.getChecked("parent"))).toEqual(["science"]);
    t.toggleCheck("science");
    expect(t.getChecked()).toEqual([]);
  });

  it("normalizes folder keys in defaultChecked and supports strategies", () => {
    const t = cascade({ defaultChecked: ["mechanics", "eigen"] });
    expect(t.getCheckState("newton3")).toBe(true);
    expect(keys(t.getChecked("leaf"))).toEqual([
      "newton1",
      "newton2",
      "newton3",
      "momentum",
      "eigen",
    ]);
    expect(keys(t.getChecked("parent"))).toEqual(["mechanics", "eigen"]);
    expect(keys(t.getChecked("all"))).toEqual([
      "mechanics",
      "newton1",
      "newton2",
      "newton3",
      "momentum",
      "eigen",
    ]);
  });

  it("leaves disabled nodes out of the cascade", () => {
    const t = cascade({ isDisabled: (i) => i.id === "newton1" });
    t.toggleCheck("mechanics");
    expect(t.getCheckState("newton1")).toBe(false);
    expect(t.getCheckState("mechanics")).toBe(true);
    t.toggleCheck("newton1");
    expect(t.getCheckState("newton1")).toBe(false);
  });

  it("round-trips through a controlled `checked` prop", () => {
    let checked: string[] = [];
    const opts = () => ({
      data,
      checkMode: "cascade" as const,
      checked,
      onCheckedChange: (next: string[]) => {
        checked = next;
      },
    });
    const t = createTree<Item>(opts());
    t.toggleCheck("organic");
    // Not applied until the parent passes the new value back.
    expect(t.getCheckState("organic")).toBe(false);
    t.setOptions(opts());
    expect(t.getCheckState("organic")).toBe(true);
    expect(t.getCheckState("chemistry")).toBe(true);
    t.toggleCheck("alkanes");
    t.setOptions(opts());
    expect(t.getCheckState("chemistry")).toBe("mixed");
    // A rejected change keeps the old state.
    t.toggleCheck("alkenes");
    expect(t.getCheckState("alkenes")).toBe(true);
  });
});

describe("checkboxes (independent)", () => {
  it("treats folders as their own entity", () => {
    const t = tree({ checkMode: "independent" });
    t.toggleCheck("physics");
    expect(t.getCheckState("physics")).toBe(true);
    expect(t.getCheckState("mechanics")).toBe(false);
    t.toggleCheck("newton1");
    expect(keys(t.getChecked())).toEqual(["physics", "newton1"]);
    expect(keys(t.getChecked("parent"))).toEqual(["physics"]);
  });

  it("respects isCheckable", () => {
    const t = tree({ checkMode: "independent", isCheckable: (i) => i.type === "item" });
    t.toggleCheck("physics");
    expect(t.getCheckState("physics")).toBe(false);
    expect(t.getRowState(t.getNode("physics")!).checkable).toBe(false);
  });
});

describe("filter", () => {
  it("shows matches and their ancestors, force-expanded", () => {
    const t = tree({ filter: "LAW" });
    expect(keys(t.getVisibleNodes())).toEqual([
      "science",
      "physics",
      "mechanics",
      "newton1",
      "newton2",
      "newton3",
      "thermo",
      "thermo1",
      "thermo2",
    ]);
    expect(t.isMatch("newton1")).toBe(true);
    expect(t.isMatch("physics")).toBe(false);
    expect(t.getRowState(t.getNode("newton1")!).setsize).toBe(3);
  });

  it("lets a matched folder be opened to show its content", () => {
    const t = tree({ filter: "physics" });
    expect(keys(t.getVisibleNodes())).toEqual(["science", "physics"]);
    t.expand("physics");
    expect(keys(t.getVisibleNodes())).toEqual(["science", "physics", "mechanics", "thermo"]);
  });

  it("restores the user's expansion when cleared and keeps toggles local", () => {
    const onExpandedChange = vi.fn();
    const opts = { data, defaultExpanded: ["math"], onExpandedChange };
    const t = createTree<Item>({ ...opts, filter: "entropy" });
    t.collapse("science");
    expect(keys(t.getVisibleNodes())).toEqual(["science"]);
    expect(onExpandedChange).not.toHaveBeenCalled();
    t.setOptions({ ...opts, filter: "" });
    expect(keys(t.getVisibleNodes())).toEqual(["science", "math", "algebra"]);
    t.setOptions({ ...opts, filter: "entropy" });
    expect(t.getVisibleNodes()).toHaveLength(4);
  });

  it("accepts a predicate", () => {
    const pred = (n: { item: Item }) => n.item.type === "store";
    const t = tree({ filter: pred });
    expect(keys(t.getVisibleNodes())).toEqual([
      "science",
      "physics",
      "chemistry",
      "math",
      "algebra",
    ]);
  });
});
