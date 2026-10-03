import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM script without types
import { ejectTreeView } from "../../../scripts/build-registry.mjs";

describe("copy-paste registry", () => {
  it("ejects tree.tsx with public imports only, and it still works", async () => {
    const source: string = await ejectTreeView();
    expect(source.startsWith('"use client";')).toBe(true);
    expect(source).not.toMatch(/from "\.\//);
    expect(source).not.toContain("@super-tree-view/core");
    expect(source.match(/from "@super-tree-view\/react";/g)).toHaveLength(1);

    // Inside the package so the copy resolves react like a user file would.
    const dir = join(dirname(fileURLToPath(import.meta.url)), ".ejected");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "tree-view.tsx").replaceAll("\\", "/");
    writeFileSync(file, source);
    const { Tree } = (await import(/* @vite-ignore */ file)) as { Tree: ComponentType<any> };

    render(<Tree data={[{ id: "a", name: "A", children: [{ id: "b", name: "B" }] }]} />);
    fireEvent.click(document.querySelector("[data-stv-part=toggle]")!);
    expect(screen.getAllByRole("treeitem").map((r) => r.textContent)).toEqual(["A", "B"]);
  });
});
