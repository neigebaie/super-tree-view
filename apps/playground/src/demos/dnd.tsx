import { type MoveEvent, moveItems, TreeView, useTree } from "@super-tree-view/react";
import { useState } from "react";
import { type Item, science } from "../data";
import { Demo, DownIcon, UpIcon } from "../ui";

export function DndDemo() {
  const [data, setData] = useState(science);
  const [last, setLast] = useState<MoveEvent<Item> | null>(null);
  const tree = useTree<Item>({
    data,
    selectionMode: "multiple",
    defaultExpanded: ["science", "physics", "mechanics", "thermo"],
    onMove: (e) => {
      setLast(e);
      setData((d) => moveItems(d, e));
    },
  });

  return (
    <Demo
      title="Drag and drop"
      intro={
        <>
          Drag rows (or a multi-selection) before, after or into folders. Hovering a closed folder
          opens it, and dragging near the edges scrolls. On touch, long-press to start. On the
          keyboard, Alt + Up / Down reorders the focused row. The arrow buttons call{" "}
          <code>tree.move()</code>, a single-pointer alternative (WCAG 2.5.7).{" "}
          <code>moveItems()</code> applies the move to your data immutably.
        </>
      }
      asked="Does it have drag and drop? It's something tree libraries rarely have, yet users always expect it."
      aside={
        <>
          <h3>Last move</h3>
          {last ? (
            <pre className="output" data-testid="move-output">
              {JSON.stringify(
                {
                  sources: last.sources.map((s) => s.id),
                  position: last.position,
                  target: last.target.id,
                  parent: last.parent?.id ?? null,
                  index: last.index,
                },
                null,
                2,
              )}
            </pre>
          ) : (
            <p className="muted">Drag something.</p>
          )}
        </>
      }
    >
      <TreeView
        tree={tree}
        aria-label="Sortable topics"
        className="panel"
        style={{ height: 380 }}
        renderActions={({ node }) => {
          const siblings = node.parent ? node.parent.children! : tree.getRoots();
          const prev = siblings[node.index - 1];
          const next = siblings[node.index + 1];
          return (
            <>
              <button
                type="button"
                className="icon-button"
                tabIndex={-1}
                aria-label={`Move ${node.label} up`}
                disabled={!prev}
                onClick={() => prev && tree.move([node.key], prev.key, "before")}
              >
                <UpIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                tabIndex={-1}
                aria-label={`Move ${node.label} down`}
                disabled={!next}
                onClick={() => next && tree.move([node.key], next.key, "after")}
              >
                <DownIcon />
              </button>
            </>
          );
        }}
      />
    </Demo>
  );
}
