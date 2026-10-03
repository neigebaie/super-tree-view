import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@super-tree-view/react/tree.css";

export const metadata: Metadata = { title: "super-tree-view + Next.js" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "40px auto" }}>
        {children}
      </body>
    </html>
  );
}
