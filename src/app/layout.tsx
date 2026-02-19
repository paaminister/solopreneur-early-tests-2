import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LKR Kirjanpito - Demo",
  description: "Accounting platform for Finnish solopreneur doctors (demo scaffold)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <Nav />
        <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
