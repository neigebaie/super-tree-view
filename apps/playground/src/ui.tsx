import { FileIcon, FolderIcon, type RowRenderProps } from "@super-tree-view/react";
import type { ReactNode } from "react";
import type { Item } from "./data";

export function Demo({
  title,
  intro,
  asked,
  children,
  aside,
}: {
  title: string;
  intro: ReactNode;
  /** The Reddit comment this demo answers. */
  asked?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="demo" aria-labelledby="demo-title">
      <header className="demo-header">
        <h2 id="demo-title">{title}</h2>
        <p>{intro}</p>
        {asked && (
          <blockquote>
            <span>Asked on Reddit:</span> “{asked}”
          </blockquote>
        )}
      </header>
      <div className={aside ? "demo-body with-aside" : "demo-body"}>
        <div className="demo-main">{children}</div>
        {aside && <aside className="demo-aside">{aside}</aside>}
      </div>
    </section>
  );
}

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#0ea5e9",
  json: "#d97706",
  md: "#64748b",
  css: "#a855f7",
  svg: "#16a34a",
};

export const fileIcon = ({ node, state }: RowRenderProps<Item>) => {
  if (state.folder) return <FolderIcon open={state.expanded} />;
  const ext = node.label.split(".").pop() ?? "";
  return (
    <span style={{ display: "inline-flex", color: EXT_COLORS[ext] }}>
      <FileIcon />
    </span>
  );
};

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const TrashIcon = () => (
  <Svg>
    <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.1c.1.8.7 1.4 1.5 1.4h3.6c.8 0 1.4-.6 1.5-1.4L12 4" />
  </Svg>
);

export const UpIcon = () => (
  <Svg>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </Svg>
);

export const DownIcon = () => (
  <Svg>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </Svg>
);
