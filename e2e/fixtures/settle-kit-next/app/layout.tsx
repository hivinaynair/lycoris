import type { ReactNode } from "react";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", maxWidth: 640, margin: "40px auto", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
