import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { type RowRenderProps, Tree, TreeView, useTree } from "../src";

interface Item {
  id: string;
  name: string;
  children?: Item[];
}

const data: Item[] = [
  {
    id: "src",
    name: "src",
    children: [
      { id: "app", name: "app.tsx" },
      { id: "lib", name: "lib", children: [{ id: "utils", name: "utils.ts" }] },
    ],
  },
  { id: "readme", name: "README.md" },
  { id: "pkg", name: "package.json" },
];

const rows = () => screen.getAllByRole("treeitem");
const row = (name: string) => screen.getByRole("treeitem", { name: new RegExp(name) });
const labels = () => rows().map((r) => r.textContent);

describe("<Tree>", () => {
  it("renders an ARIA tree with a single tab stop", () => {
    render(<Tree data={data} aria-label="Files" />);
    expect(screen.getByRole("tree", { name: "Files" })).toBeTruthy();
    expect(labels()).toEqual(["src", "README.md", "package.json"]);
    const src = row("src");
    expect(src.getAttribute("aria-level")).toBe("1");
    expect(src.getAttribute("aria-expanded")).toBe("false");
    expect(src.getAttribute("aria-setsize")).toBe("3");
    expect(rows().filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });

  it("expands with the chevron and selects with clicks", () => {
    const onSelectedChange = vi.fn();
    render(<Tree data={data} selectionMode="multiple" onSelectedChange={onSelectedChange} />);
    fireEvent.click(row("src").querySelector("[data-stv-part=toggle]")!);
    expect(labels()).toEqual(["src", "app.tsx", "lib", "README.md", "package.json"]);
    expect(onSelectedChange).not.toHaveBeenCalled();

    fireEvent.click(row("app"));
    fireEvent.click(row("README"), { shiftKey: true });
    expect(onSelectedChange).toHaveBeenLastCalledWith(["app", "lib", "readme"], expect.anything());
    fireEvent.click(row("lib"), { ctrlKey: true });
    expect(row("lib").getAttribute("aria-selected")).toBe("false");
    expect(row("app").getAttribute("aria-selected")).toBe("true");
  });

  it("moves DOM focus with the keyboard", () => {
    render(<Tree data={data} />);
    act(() => row("src").focus());
    fireEvent.keyDown(row("src"), { key: "ArrowRight" });
    expect(row("src").getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(row("src"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(row("app"));
    expect(row("app").tabIndex).toBe(0);
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(row("package"));
    fireEvent.keyDown(document.activeElement!, { key: "s" });
    expect(document.activeElement).toBe(row("src"));
  });

  it("cascades checkbox clicks with a mixed parent state", () => {
    const onCheckedChange = vi.fn();
    render(
      <Tree
        data={data}
        checkMode="cascade"
        defaultExpanded={["src"]}
        onCheckedChange={onCheckedChange}
      />,
    );
    fireEvent.click(row("app").querySelector("[data-stv-part=checkbox]")!);
    expect(row("app").getAttribute("aria-checked")).toBe("true");
    expect(row("src").getAttribute("aria-checked")).toBe("mixed");
    expect(row("app").getAttribute("aria-selected")).toBe("false");
    fireEvent.click(row("src").querySelector("[data-stv-part=checkbox]")!);
    expect(row("src").getAttribute("aria-checked")).toBe("true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(["app", "utils"], expect.anything());
  });

  it("highlights filter matches", () => {
    render(<Tree data={data} filter="util" />);
    expect(labels()).toEqual(["src", "lib", "utils.ts"]);
    expect(row("utils").querySelector("mark")?.textContent).toBe("util");
  });

  it("keeps clicks on row actions away from selection", () => {
    const remove = vi.fn();
    render(
      <Tree
        data={data}
        renderActions={({ node }) => (
          <button type="button" onClick={() => remove(node.key)}>
            Delete
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    expect(remove).toHaveBeenCalledWith("readme");
    expect(row("README").getAttribute("aria-selected")).toBe("false");
    // The row is named by its label, not by its actions.
    expect(screen.getByRole("treeitem", { name: "README.md" })).toBeTruthy();
  });

  it("runs custom shortcuts before the built-in keymap", () => {
    const onKeyDown = vi.fn((e: { key: string; preventDefault(): void }, _node: unknown) => {
      if (e.key === "ArrowDown") e.preventDefault();
    });
    render(<Tree data={data} onKeyDown={onKeyDown} />);
    act(() => row("src").focus());
    fireEvent.keyDown(row("src"), { key: "ArrowDown" });
    expect(onKeyDown.mock.calls[0]![1]).toMatchObject({ key: "src" });
    expect(document.activeElement).toBe(row("src"));
  });

  it("renders a window of rows for large trees", () => {
    const big: Item[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `n${i}`,
      name: `Node ${i}`,
    }));
    render(<Tree data={big} rowHeight={24} />);
    expect(rows().length).toBeLessThan(50);
    expect((screen.getByRole("tree").firstElementChild as HTMLElement).style.height).toBe(
      "240000px",
    );
  });

  it("only re-renders rows whose state changed", () => {
    const big: Item[] = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
    const renders = new Map<string, number>();
    const renderItem = ({ node }: RowRenderProps<Item>) => {
      renders.set(node.key, (renders.get(node.key) ?? 0) + 1);
      return node.label;
    };
    render(<Tree data={big} renderItem={renderItem} />);
    renders.clear();
    act(() => rows()[0]!.focus());
    fireEvent.keyDown(rows()[0]!, { key: "ArrowDown" });
    expect([...renders.keys()].sort()).toEqual(["n0", "n1"]);
  });

  it("server-renders the first rows", () => {
    const html = renderToString(<Tree data={data} aria-label="Files" />);
    expect(html).toContain('role="tree"');
    expect(html).toContain("README.md");
  });
});

describe("useTree + <TreeView>", () => {
  it("exposes the instance for external controls", () => {
    function Demo() {
      const tree = useTree({ data, checkMode: "cascade" });
      return (
        <>
          <button type="button" onClick={() => tree.expandAll()}>
            Expand all
          </button>
          <output>{tree.getChecked().length} checked</output>
          <TreeView tree={tree} virtual={false} renderIcon={null} />
        </>
      );
    }
    render(<Demo />);
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(rows()).toHaveLength(6);
    fireEvent.click(row("lib").querySelector("[data-stv-part=checkbox]")!);
    expect(screen.getByText("1 checked")).toBeTruthy();
    expect(document.querySelector(".stv-icon")).toBeNull();
  });
});
