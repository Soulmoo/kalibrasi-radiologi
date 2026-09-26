"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { keluar } from "@/app/actions/auth";
import { BIDANG, getBidang, rute } from "@/lib/bidang";

/**
 * Tab utama: Dashboard, lalu satu tab per bidang (lihat src/lib/bidang.ts).
 * Sub-tab hanya dirender untuk bidang yang sedang dibuka — bidang dibaca dari
 * segmen pertama URL, jadi Dashboard dan Profil tidak punya baris sub-tab.
 */
const DASHBOARD = { href: "/dashboard", label: "Dashboard" };

function aktifDi(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

function bidangAktif(path: string) {
  return getBidang(path.split("/")[1]);
}

/** Deretan tab mendatar — hanya untuk layar lebar. */
export function NavUtama() {
  const path = usePathname();
  const aktif = bidangAktif(path);

  const utama = [
    { href: DASHBOARD.href, label: DASHBOARD.label, nyala: aktifDi(path, DASHBOARD.href) },
    ...BIDANG.map((b) => ({
      href: rute(b.key, b.menu[0].sub),
      label: b.nama,
      nyala: aktif?.key === b.key,
    })),
  ];

  return (
    <nav className="hidden md:block">
      <ul className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4">
        {utama.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className={`-mb-px block border-b-2 px-3 py-2 text-sm ${
                m.nyala
                  ? "border-[var(--brand)] font-medium text-[var(--brand)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {m.label}
            </Link>
          </li>
        ))}
      </ul>

      {aktif && (
        <div className="border-t border-[var(--border)] bg-[var(--brand-soft)]">
          <ul className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-1.5">
            {aktif.menu.map((m) => {
              const href = rute(aktif.key, m.sub);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block rounded px-3 py-1 text-sm ${
                      aktifDi(path, href)
                        ? "bg-white font-medium text-[var(--brand)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {m.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}

/**
 * Menu HP: tombol tiga garis di kiri, membuka kolom geser dari sisi kiri.
 *
 * Menggantikan deretan tab yang digulir mendatar. Selain memakan tinggi layar,
 * susunan lama menaruh tombol Keluar di pojok kanan header yang sempit, tepat
 * di atas deretan tab — sangat mudah tertekan tanpa sengaja saat menjangkau
 * tab, dan Fismed langsung terlempar ke halaman masuk. Di sini Keluar
 * dipisahkan ke dasar kolom, jauh dari daftar menu.
 */
export function MenuMobile({ nama, email }: { nama: string; email: string }) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);

  // Kunci gulir halaman di belakang kolom, dan Esc untuk menutup.
  useEffect(() => {
    if (!buka) return;
    const asal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = asal;
      document.removeEventListener("keydown", onKey);
    };
  }, [buka]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setBuka(true)}
        aria-label="Buka menu"
        aria-expanded={buka}
        className="tombol tombol-sekunder shrink-0 px-2.5"
      >
        <IkonGaris />
      </button>

      {buka && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBuka(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu utama"
            className="flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--brand)]">
                  Kalibrasi Alat Radiasi Medis
                </p>
                <p className="truncate text-xs text-[var(--muted)]">{nama}</p>
                <p className="truncate text-xs text-[var(--muted)]">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => setBuka(false)}
                aria-label="Tutup menu"
                className="shrink-0 rounded px-2 py-1 text-xl leading-none text-[var(--muted)] hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Kolomnya ditutup lewat onClick di tautannya — kejadian yang
                memicu perpindahan halaman sekaligus yang menutup menu. */}
            <nav className="flex-1 overflow-y-auto p-2">
              <TautanDrawer
                href={DASHBOARD.href}
                label={DASHBOARD.label}
                nyala={aktifDi(path, DASHBOARD.href)}
                tutup={() => setBuka(false)}
              />
              {BIDANG.map((b) => (
                <div key={b.key} className="mt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {b.nama}
                  </p>
                  <ul className="space-y-1">
                    {b.menu.map((m) => {
                      const href = rute(b.key, m.sub);
                      return (
                        <li key={href}>
                          <TautanDrawer
                            href={href}
                            label={m.label}
                            nyala={aktifDi(path, href)}
                            tutup={() => setBuka(false)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <TautanDrawer
                  href="/profil"
                  label="Profil"
                  nyala={aktifDi(path, "/profil")}
                  tutup={() => setBuka(false)}
                />
              </div>
            </nav>

            {/* Keluar sengaja dipisah garis di dasar kolom — bukan bertetangga
                dengan menu yang sering ditekan. */}
            <div className="border-t border-[var(--border)] p-3">
              <form action={keluar}>
                <button type="submit" className="tombol tombol-sekunder w-full">
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TautanDrawer({
  href,
  label,
  nyala,
  tutup,
}: {
  href: string;
  label: string;
  nyala: boolean;
  tutup: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={tutup}
      className={`block rounded px-3 py-2.5 text-sm ${
        nyala
          ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
          : "text-[var(--foreground)] hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

function IkonGaris() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}
