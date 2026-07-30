"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Tab "Fismed" hanya tampil untuk admin. */
export function TabProfil({ admin }: { admin: boolean }) {
  const path = usePathname();

  const tab = [
    { href: "/profil", label: "Profil" },
    ...(admin ? [{ href: "/profil/fismed", label: "Fismed" }] : []),
  ];

  return (
    <nav className="border-b border-[var(--border)]">
      <ul className="flex gap-1">
        {tab.map((t) => {
          const aktif =
            t.href === "/profil" ? path === "/profil" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`-mb-px block border-b-2 px-4 py-2 text-sm ${
                  aktif
                    ? "border-[var(--brand)] font-medium text-[var(--brand)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
