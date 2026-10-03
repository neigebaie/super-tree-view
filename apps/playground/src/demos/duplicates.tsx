import { TreeView, useTree } from "@super-tree-view/react";
import { type Item, science } from "../data";
import { Demo } from "../ui";

const momentum: Item = { id: "momentum", name: "Conservation of Momentum" };
const entropy: Item = { id: "entropy", name: "Entropy" };

// The same item objects appear in several folders.
const data: Item[] = [
  ...science.slice(0, 1),
  {
    id: "exam",
    name: "Exam prep",
    children: [
      { id: "week1", name: "Week 1", children: [momentum, entropy] },
      { id: "week2", name: "Week 2", children: [momentum] },
    ],
  },
];

export function DuplicatesDemo() {
  const tree = useTree<Item>({
    data,
    keyBy: "path",
    selectionMode: "multiple",
    defaultExpanded: [
      "science",
      "science/physics",
      "science/physics/mechanics",
      "exam",
      "exam/week1",
      "exam/week2",
    ],
  });
  const selected = tree.getSelected();

  return (
    <Demo
      title="Same item, several folders"
      intro={
        <>
          With <code>keyBy: "path"</code>, nodes are keyed by their ancestry, so one item object can
          live in several folders with its own selection and expansion. Every node knows its{" "}
          <code>parent</code> and <code>path</code>, so you always know which folder was used.
        </>
      }
      asked="I don't see a way to identify which folder the selected item lives in"
      aside={
        <>
          <h3>Selected</h3>
          {selected.length ? (
            <ul className="plain" data-testid="dup-output">
              {selected.map((n) => (
                <li key={n.key}>
                  <code>{n.key}</code>
                  <br />
                  <span className="muted">{n.path.map((p) => p.label).join(" → ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Select both "Conservation of Momentum" rows.</p>
          )}
        </>
      }
    >
      <TreeView
        tree={tree}
        aria-label="Courses"
        className="panel"
        style={{ height: 380 }}
        renderIcon={null}
      />
    </Demo>
  );
}
