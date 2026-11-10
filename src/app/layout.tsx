import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Dealflow",
  description: "Get paid by brands, without chasing.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">Dealflow</a>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/deals/new">New deal</a>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}