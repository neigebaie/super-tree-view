import { moveItems, TreeView, useTree } from "@super-tree-view/react";
import { useState } from "react";
import { files, type Item, removeItem } from "../data";
import { Demo, fileIcon, TrashIcon } from "../ui";

export function FilesDemo() {
  const [data, setData] = useState(files);
  const [query, setQuery] = useState("");
  const tree = useTree<Item>({
    data,
    filter: query,
    selectionMode: "multiple",
    defaultExpanded: ["src", "src/components"],
    onMove: (e) => setData((d) => moveItems(d, e)),
  });
  const selected = tree.getSelected();

  return (
    <Demo
      title="File explorer"
      intro="Search, multi-select (Shift / Ctrl click, Shift + arrows), drag and drop, indent guides and row actions. Try the keyboard: arrows, Home / End, *, type-ahead, Alt + arrows to reorder and Delete to remove."
      asked="I'm missing an option to add buttons to the right of an element (delete, edit…)"
      aside={
        <>
          <h3>Selection</h3>
          {selected.length ? (
            <ul className="plain">
              {selected.map((n) => (
                <li key={n.key}>
                  <code>{n.path.map((p) => p.label).join(" / ")}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing selected.</p>
          )}
        </>
      }
    >
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search files…"
          aria-label="Search files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" onClick={() => tree.expandAll()}>
          Expand all
        </button>
        <button type="button" onClick={() => tree.collapseAll()}>
          Collapse all
        </button>
      </div>
      <TreeView
        tree={tree}
        aria-label="Project files"
        className="panel"
        style={{ height: 380 }}
        renderIcon={fileIcon}
        onKeyDown={(e, node) => {
          if (e.key === "Delete") setData((d) => removeItem(d, node.key));
        }}
        renderActions={({ node }) => (
          <button
            type="button"
            className="icon-button"
            tabIndex={-1}
            aria-label={`Delete ${node.label}`}
            title="Delete"
            onClick={() => setData((d) => removeItem(d, node.key))}
          >
            <TrashIcon />
          </button>
        )}
      />
    </Demo>
  );
}
