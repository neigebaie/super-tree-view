import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@super-tree-view/react/tree.css";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
