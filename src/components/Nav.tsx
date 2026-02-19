"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/receipts", label: "Receipts" },
  { href: "/bank", label: "Bank" },
  { href: "/settlements", label: "Settlements" },
  { href: "/tax", label: "Tax" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-lg mr-4">LKR Kirjanpito</span>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm hover:text-blue-300 transition-colors ${
            pathname === link.href ? "text-blue-400 font-medium" : "text-slate-300"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <span className="ml-auto text-xs text-slate-500">Demo Scaffold v0.1</span>
    </nav>
  );
}
