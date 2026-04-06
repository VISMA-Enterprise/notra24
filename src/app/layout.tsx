import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notra 24 — Notdienst-Leitstelle",
  description: "24/7 Notdienst-Leitstelle für ältere Menschen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
