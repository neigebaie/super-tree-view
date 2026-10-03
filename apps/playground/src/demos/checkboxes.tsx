import { type CheckedStrategy, type CheckMode, TreeView, useTree } from "@super-tree-view/react";
import { useState } from "react";
import { type Item, science } from "../data";
import { Demo } from "../ui";

function CheckTree({ mode }: { mode: Exclude<CheckMode, "none"> }) {
  const [strategy, setStrategy] = useState<CheckedStrategy>("parent");
  const tree = useTree<Item>({
    data: science,
    checkMode: mode,
    selectionMode: "none",
    defaultChecked: ["mechanics", "eigen"],
    defaultExpanded: ["science", "physics", "math", "algebra"],
  });
  const checked = tree.getChecked(strategy);

  return (
    <div className="demo-body with-aside">
      <div className="demo-main">
        <div className="toolbar">
          <button type="button" onClick={() => tree.setChecked(tree.getRoots().map((n) => n.key))}>
            Check all
          </button>
          <button type="button" onClick={() => tree.setChecked([])}>
            Uncheck all
          </button>
        </div>
        <TreeView
          tree={tree}
          aria-label="Topics"
          className="panel"
          virtual={false}
          renderIcon={null}
        />
      </div>
      <aside className="demo-aside">
        <h3>
          <label htmlFor="strategy">getChecked(</label>
          <select
            id="strategy"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as CheckedStrategy)}
          >
            <option value="parent">"parent"</option>
            <option value="leaf">"leaf"</option>
            <option value="all">"all"</option>
          </select>
          )
        </h3>
        <pre className="output" data-testid="checked-output">
          {JSON.stringify(
            checked.map((n) => n.id),
            null,
            2,
          )}
        </pre>
      </aside>
    </div>
  );
}

export function CheckboxesDemo() {
  const [mode, setMode] = useState<"cascade" | "independent">("cascade");
  return (
    <Demo
      title="Tri-state checkboxes"
      intro={
        <>
          In <code>cascade</code> mode, checking a folder checks everything below it and folders
          show a mixed state. In <code>independent</code> mode each folder is its own entity. Check
          state lives outside your data, and <code>defaultChecked</code> sets the initial checks.
        </>
      }
      asked="Allow the folder nodes to be just a group or an individual entity"
    >
      <fieldset className="segmented">
        <legend>Check mode</legend>
        {(["cascade", "independent"] as const).map((m) => (
          <label key={m}>
            <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
            {m}
          </label>
        ))}
      </fieldset>
      <CheckTree key={mode} mode={mode} />
    </Demo>
  );
}
