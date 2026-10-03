import { createTree, TreeView, useTree } from "@super-tree-view/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { countNodes, generateTree, type Item } from "../data";
import { Demo } from "../ui";

const SIZES = {
  "10k": [10, 10, 100],
  "100k": [100, 10, 100],
  "250k": [50, 50, 100],
} as const;
type Size = keyof typeof SIZES;

interface Timing {
  label: string;
  ms: number;
}

const time = (label: string, fn: () => void): Timing => {
  const t0 = performance.now();
  fn();
  return { label, ms: performance.now() - t0 };
};

/** Measures the headless core alone, outside React. */
function measure(data: Item[]): Timing[] {
  const t = createTree<Item>({ data, checkMode: "cascade", selectionMode: "multiple" });
  return [
    time("Index + first visible rows", () => t.getVisibleNodes()),
    time("Expand all", () => {
      t.expandAll();
      t.getVisibleNodes();
    }),
    time("Check everything (cascade)", () => {
      t.setChecked(t.getRoots().map((r) => r.key));
      t.getCheckState(t.getRoots()[0]!.key);
    }),
    time("Toggle one leaf (incremental)", () => {
      const leaf = t.getVisibleNodes()[3]!;
      t.toggleCheck(leaf.key);
      t.getCheckState(t.getRoots()[0]!.key);
    }),
    time('Filter "item 7.3"', () => {
      t.setOptions({ ...t.options, filter: "item 7.3" });
      t.getVisibleNodes();
    }),
    time("Select all visible", () => t.selectAll()),
  ];
}

export function BenchmarkDemo() {
  const [size, setSize] = useState<Size>("100k");
  const data = useMemo(() => {
    const [folders, groups, leaves] = SIZES[size];
    return generateTree(folders, groups, leaves);
  }, [size]);
  const total = useMemo(() => countNodes(data), [data]);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [domRows, setDomRows] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const tree = useTree<Item>({ data, checkMode: "cascade", selectionMode: "multiple" });

  useEffect(() => {
    tree.expandAll();
    setTimings(measure(data));
  }, [data, tree]);

  // Count the rows actually in the DOM while scrolling.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setDomRows(panel.current?.querySelectorAll(".stv-row").length ?? 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Demo
      title="Large trees"
      intro="Only the rows in view are rendered, and rows re-render only when their own state changes. The timings below measure the headless core on this device, outside React."
      asked="You need virtualisation very badly: past 400-500 nodes the page becomes very slow"
      aside={
        <>
          <h3>Core timings</h3>
          <table className="timings" data-testid="timings">
            <tbody>
              {timings.map((t) => (
                <tr key={t.label}>
                  <th scope="row">{t.label}</th>
                  <td>{t.ms.toFixed(1)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      }
    >
      <div className="toolbar">
        <fieldset className="segmented">
          <legend>Nodes</legend>
          {(Object.keys(SIZES) as Size[]).map((s) => (
            <label key={s}>
              <input type="radio" name="size" checked={size === s} onChange={() => setSize(s)} />
              {s}
            </label>
          ))}
        </fieldset>
        <span className="stat" data-testid="bench-stats">
          {total.toLocaleString("en-US")} nodes ·{" "}
          {tree.getVisibleNodes().length.toLocaleString("en-US")} visible ·{" "}
          <strong>{domRows}</strong> in the DOM
        </span>
      </div>
      <div ref={panel}>
        <TreeView
          key={size}
          tree={tree}
          aria-label="Generated tree"
          className="panel"
          style={{ height: 420 }}
          rowHeight={28}
          renderIcon={null}
        />
      </div>
    </Demo>
  );
}
