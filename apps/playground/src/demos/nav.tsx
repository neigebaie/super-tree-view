import { Tree } from "@super-tree-view/react";
import { useState } from "react";
import { Demo } from "../ui";

interface Page {
  id: string;
  name: string;
  children?: Page[];
}

const docs: Page[] = [
  {
    id: "start",
    name: "Getting started",
    children: [
      { id: "install", name: "Installation" },
      { id: "quick-start", name: "Quick start" },
      { id: "migration", name: "Migrating from shadcn-ui-tree-view" },
    ],
  },
  {
    id: "guides",
    name: "Guides",
    children: [
      { id: "styling", name: "Styling" },
      { id: "checkboxes", name: "Checkboxes" },
      { id: "lazy", name: "Lazy loading" },
      { id: "dnd", name: "Drag and drop" },
      {
        id: "frameworks",
        name: "Frameworks",
        children: [
          { id: "react", name: "React" },
          { id: "vue", name: "Vue (soon)" },
          { id: "angular", name: "Angular (soon)" },
        ],
      },
    ],
  },
  { id: "api", name: "API reference" },
  { id: "faq", name: "FAQ" },
];

export function NavDemo() {
  const [page, setPage] = useState("quick-start");
  return (
    <Demo
      title="Navigation sidebar"
      intro={
        <>
          The same component as a docs sidebar: no icons, no virtualization (every row is in the
          server HTML), <code>expandOnClick</code>, and the selection controlled by your router
          state.
        </>
      }
      asked="Maybe make it customisable so you can use it as a navigation"
    >
      <div className="nav-demo">
        <Tree<Page>
          data={docs}
          aria-label="Documentation"
          className="nav-tree"
          virtual={false}
          guides={false}
          renderIcon={null}
          expandOnClick
          defaultExpanded={["start", "guides"]}
          selected={[page]}
          onSelectedChange={(keys, tree) => {
            const key = keys[0];
            if (key && !tree.getNode(key)?.isFolder) setPage(key);
          }}
          rowHeight={30}
        />
        <article className="nav-page">
          <p className="muted">You are reading</p>
          <h3 data-testid="nav-page">{page}</h3>
        </article>
      </div>
    </Demo>
  );
}
