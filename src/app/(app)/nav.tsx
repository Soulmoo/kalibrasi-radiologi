"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/laporan", label: "Laporan" },
  { href: "/instansi", label: "Instansi / Klien" },
  { href: "/alat", label: "Alat Radiologi" },
  { href: "/alat-ukur", label: "Registry Alat Ukur" },
];

export function NavUtama() {
  const path = usePathname();

  return (
    <nav className="mx-auto max-w-7xl px-4">
      <ul className="flex flex-wrap gap-1">
        {MENU.map((m) => {
          const aktif = path === m.href || path.startsWith(`${m.href}/`);
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                className={`-mb-px block border-b-2 px-3 py-2 text-sm ${
                  aktif
                    ? "border-[var(--brand)] font-medium text-[var(--brand)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
