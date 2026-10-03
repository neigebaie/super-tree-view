import { Tree } from "@super-tree-view/react";
import { data } from "./data";
import { FileTree } from "./file-tree";

// A Server Component: the tree is server-rendered and hydrated as a client component.
export default function Page() {
  return (
    <main>
      <h1>super-tree-view + Next.js</h1>
      <h2>Rendered from a Server Component</h2>
      <Tree data={data} aria-label="Files" virtual={false} defaultExpanded={["app"]} />
      <h2>Client Component with state</h2>
      <FileTree data={data} />
    </main>
  );
}
