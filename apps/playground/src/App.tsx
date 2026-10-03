import { type ComponentType, useEffect, useState } from "react";
import { BenchmarkDemo } from "./demos/benchmark";
import { CheckboxesDemo } from "./demos/checkboxes";
import { DndDemo } from "./demos/dnd";
import { DuplicatesDemo } from "./demos/duplicates";
import { FilesDemo } from "./demos/files";
import { LazyDemo } from "./demos/lazy";
import { NavDemo } from "./demos/nav";

const DEMOS: { id: string; label: string; Component: ComponentType }[] = [
  { id: "files", label: "File explorer", Component: FilesDemo },
  { id: "checkboxes", label: "Checkboxes", Component: CheckboxesDemo },
  { id: "lazy", label: "Lazy loading", Component: LazyDemo },
  { id: "dnd", label: "Drag and drop", Component: DndDemo },
  { id: "large", label: "100k nodes", Component: BenchmarkDemo },
  { id: "nav", label: "Navigation", Component: NavDemo },
  { id: "duplicates", label: "Duplicates", Component: DuplicatesDemo },
];

const REGISTRY = "https://neigebaie.github.io/super-tree-view/r/tree-view.json";
const fromHash = () => {
  const id = window.location.hash.slice(1);
  return DEMOS.some((d) => d.id === id) ? id : "files";
};

export function App() {
  const [active, setActive] = useState(fromHash);
  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const demo = DEMOS.find((d) => d.id === active)!;

  return (
    <>
      <header className="hero">
        <h1>super-tree-view</h1>
        <p className="tagline">
          A slim, accessible, virtualized tree view. Headless core, adapters for React (Vue and
          Angular next), and a default theme in plain CSS.
        </p>
        <ul className="badges" aria-label="Highlights">
          <li>
            <strong>0</strong> runtime dependencies
          </li>
          <li>
            <strong>≈ 9 kB</strong> core + React, min + brotli
          </li>
          <li>
            <strong>WAI-ARIA</strong> tree pattern
          </li>
          <li>
            <strong>100k+</strong> nodes
          </li>
        </ul>
        <div className="install">
          <code>npm i @super-tree-view/react</code>
          <code>npx shadcn add {REGISTRY}</code>
        </div>
      </header>

      <nav className="tabs" aria-label="Demos">
        {DEMOS.map((d) => (
          <a key={d.id} href={`#${d.id}`} aria-current={d.id === active ? "page" : undefined}>
            {d.label}
          </a>
        ))}
      </nav>

      <main>
        <demo.Component key={demo.id} />
      </main>

      <footer>
        <a href="https://github.com/neigebaie/super-tree-view">GitHub</a>
        <span aria-hidden="true">·</span>
        <a href="https://www.npmjs.com/package/@super-tree-view/react">npm</a>
        <span aria-hidden="true">·</span>
        <span>MIT</span>
      </footer>
    </>
  );
}
