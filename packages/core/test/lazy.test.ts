import { describe, expect, it, vi } from "vitest";
import { createTree } from "../src";
import { keys } from "./fixture";

interface Entry {
  id: string;
  name: string;
  dir?: boolean;
  children?: Entry[];
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const fs: Record<string, Entry[]> = {
  src: [
    { id: "src/lib", name: "lib", dir: true },
    { id: "src/index.ts", name: "index.ts" },
  ],
  "src/lib": [{ id: "src/lib/a.ts", name: "a.ts" }],
};

const lazyTree = (opts = {}) =>
  createTree<Entry>({
    data: [{ id: "src", name: "src", dir: true }],
    hasChildren: (e) => !!e.dir,
    loadChildren: vi.fn(async (n) => fs[n.key] ?? []),
    ...opts,
  });

describe("lazy loading", () => {
  it("loads children on expand and exposes the loading state", async () => {
    const t = lazyTree();
    expect(t.getNode("src")!.isFolder).toBe(true);
    expect(t.getNode("src")!.children).toBeNull();
    t.expand("src");
    expect(t.isLoading("src")).toBe(true);
    expect(t.getRowAttrs(t.getNode("src")!)["aria-busy"]).toBe("true");
    await flush();
    expect(t.isLoading("src")).toBe(false);
    expect(keys(t.getVisibleNodes())).toEqual(["src", "src/lib", "src/index.ts"]);
  });

  it("loads initially expanded folders", async () => {
    const loadChildren = vi.fn(async (n: { key: string }) => fs[n.key] ?? []);
    const t = lazyTree({ defaultExpanded: ["src", "src/lib"], loadChildren });
    t.getVisibleNodes();
    await flush();
    t.getVisibleNodes();
    await flush();
    expect(keys(t.getVisibleNodes())).toEqual(["src", "src/lib", "src/lib/a.ts", "src/index.ts"]);
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it("collapses and flags errors, then retries on the next expand", async () => {
    const onLoadError = vi.fn();
    let fail = true;
    const t = lazyTree({
      onLoadError,
      loadChildren: async () => {
        if (fail) throw new Error("offline");
        return fs.src!;
      },
    });
    t.expand("src");
    await flush();
    expect(onLoadError).toHaveBeenCalledOnce();
    expect(t.isExpanded("src")).toBe(false);
    expect(t.getRowState(t.getNode("src")!).error).toBe(true);
    fail = false;
    t.expand("src");
    await flush();
    expect(t.getRowState(t.getNode("src")!).error).toBe(false);
    expect(t.getVisibleNodes()).toHaveLength(3);
  });

  it("passes a check on an unloaded folder down to its loaded children", async () => {
    const t = lazyTree({ checkMode: "cascade" });
    t.toggleCheck("src");
    expect(t.getCheckState("src")).toBe(true);
    t.expand("src");
    await flush();
    expect(t.getCheckState("src/index.ts")).toBe(true);
    expect(t.getCheckState("src")).toBe(true);
    t.toggleCheck("src/index.ts");
    expect(t.getCheckState("src")).toBe("mixed");
  });

  it("drops the cache on invalidate", async () => {
    const t = lazyTree();
    t.expand("src");
    await flush();
    t.invalidateChildren("src");
    expect(t.getNode("src")!.children).toBeNull();
  });
});
