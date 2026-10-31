import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

// Geist Sans ships as local .woff2 files inside the `geist` package and is loaded
// through next/font, so builds are network-independent and no runtime font
// request can 404. GeistSans.variable exposes `--font-geist-sans` and covers
// weights 100–900 (the UI uses 400/500/600/700).
export const metadata: Metadata = {
  title: "Uplift — Every student. A brighter future.",
  description:
    "A human-first student success workspace. Spot early warning signs, understand student risk, and turn insight into meaningful support.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={GeistSans.variable}>{children}</body>
    </html>
  );
}
