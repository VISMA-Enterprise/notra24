import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notra 24 — Leitstelle",
  description: "24/7 Notdienst-Leitstelle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
