"use client";

import { Tree } from "@super-tree-view/react";
import { useState } from "react";
import type { Item } from "./data";

export function FileTree({ data }: { data: Item[] }) {
  const [checked, setChecked] = useState<string[]>(["app/page.tsx"]);
  return (
    <>
      <Tree<Item>
        data={data}
        aria-label="Checkable files"
        checkMode="cascade"
        checked={checked}
        onCheckedChange={setChecked}
        defaultExpanded={["app"]}
        style={{ height: 200 }}
      />
      <p>Checked: {checked.join(", ") || "nothing"}</p>
    </>
  );
}
