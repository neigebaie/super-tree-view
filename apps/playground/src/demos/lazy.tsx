import { Tree, type TreeNode } from "@super-tree-view/react";
import { useState } from "react";
import { Demo } from "../ui";

interface Entry {
  id: string;
  name: string;
  dir?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const failedOnce = new Set<string>();

/** A fake remote file system: every folder has 3 sub-folders and 4 files. */
async function fetchChildren(node: TreeNode<Entry>): Promise<Entry[]> {
  await sleep(400 + Math.random() * 500);
  if (node.label === "flaky" && !failedOnce.has(node.key)) {
    failedOnce.add(node.key);
    throw new Error("Network error");
  }
  const base = node.key;
  return [
    ...["assets", "docs", "flaky"].map((n) => ({ id: `${base}/${n}`, name: n, dir: true })),
    ...["index.ts", "readme.md", "config.json", "data.csv"].map((n) => ({
      id: `${base}/${n}`,
      name: n,
    })),
  ];
}

const roots: Entry[] = [
  { id: "drive", name: "drive", dir: true },
  { id: "photos", name: "photos", dir: true },
];

export function LazyDemo() {
  const [log, setLog] = useState<string[]>([]);
  return (
    <Demo
      title="Lazy loading"
      intro={
        <>
          Folders load their children when opened, with a loading state and <code>aria-busy</code>.
          Folders named <code>flaky</code> fail on the first try: the error collapses them, and
          opening them again retries. A check on an unloaded folder is passed down to its children
          once they arrive.
        </>
      }
      asked="Lazy data loading is something many of these lack"
      aside={
        <>
          <h3>Requests</h3>
          <ul className="plain log" data-testid="lazy-log">
            {log.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
              <li key={i}>{l}</li>
            ))}
          </ul>
        </>
      }
    >
      <Tree<Entry>
        data={roots}
        aria-label="Remote drive"
        className="panel"
        style={{ height: 380 }}
        checkMode="cascade"
        hasChildren={(e) => !!e.dir}
        loadChildren={async (node) => {
          setLog((l) => [...l, `GET /${node.key}`]);
          try {
            return await fetchChildren(node);
          } catch (e) {
            setLog((l) => [...l, `✗ /${node.key}: ${(e as Error).message}`]);
            throw e;
          }
        }}
      />
    </Demo>
  );
}
