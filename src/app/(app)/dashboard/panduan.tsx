"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

/**
 * Panduan singkat aplikasi, muncul di Dashboard.
 *
 * Tampil sekali di awal tiap sesi masuk, bukan cuma untuk pengguna baru:
 * alur kerjanya berlapis (instansi → alat → alat ukur → laporan → simpan
 * permanen) dan langkah terakhirnya tidak bisa dibatalkan, jadi pengingatnya
 * tetap berguna bagi Fismed yang sudah lama memakai.
 *
 * Yang berubah setelah tanda tangan terpasang hanyalah blok "pasang tanda
 * tangan dulu" — sisanya tetap ditampilkan.
 */

/**
 * Dua penanda, sesuai dua cara menutup panduan:
 *
 * - "Mengerti" → sessionStorage, hilang begitu sesi browser berakhir, jadi
 *   panduannya muncul lagi pada login berikutnya.
 * - "Jangan tampilkan lagi" → localStorage, bertahan sampai Fismed sendiri
 *   membersihkan data browsernya.
 *
 * Keduanya dibedakan per pengguna supaya berganti akun di tab yang sama tidak
 * ikut membawa keputusan akun sebelumnya.
 */
const kunciSesi = (userId: string) => `kalibrasi:panduan:${userId}`;
const kunciPermanen = (userId: string) => `kalibrasi:panduan-nonaktif:${userId}`;

function berlangganan(ubah: () => void) {
  window.addEventListener("storage", ubah);
  return () => window.removeEventListener("storage", ubah);
}

/**
 * Snapshot server sengaja "sudah ditutup" supaya HTML dari server sama persis
 * dengan render pertama di klien — kalau tidak, dialognya sempat berkedip dan
 * hidrasinya tidak cocok.
 */
const bacaServer = () => true;

export function PanduanAwal({
  userId,
  punyaTandaTangan,
}: {
  userId: string;
  punyaTandaTangan: boolean;
}) {
  const sudahDitutup = useSyncExternalStore(
    berlangganan,
    () =>
      sessionStorage.getItem(kunciSesi(userId)) === "1" ||
      localStorage.getItem(kunciPermanen(userId)) === "1",
    bacaServer,
  );
  const [ditutupSekarang, setDitutupSekarang] = useState(false);

  function tutup(selamanya = false) {
    if (selamanya) localStorage.setItem(kunciPermanen(userId), "1");
    sessionStorage.setItem(kunciSesi(userId), "1");
    setDitutupSekarang(true);
  }

  if (sudahDitutup || ditutupSekarang) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-panduan-awal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) tutup();
      }}
    >
      <div className="kartu max-h-[85vh] w-full max-w-xl overflow-y-auto p-5 text-left">
        <h2 id="judul-panduan-awal" className="text-base font-semibold">
          Panduan singkat
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Alat bantu kerja untuk fisikawan medis: Anda memasukkan hasil ukur, sistem
          menghitung parameter turunannya, menilai lolos/tidak lolos, lalu menyusunnya
          menjadi laporan siap cetak.
        </p>

        {/* Hanya blok ini yang hilang begitu tanda tangan terpasang. */}
        {!punyaTandaTangan && (
          <div className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-3">
            <p className="text-sm font-semibold text-amber-900">
              Langkah pertama: pasang tanda tangan Anda
            </p>
            <p className="mt-1 text-sm text-amber-900">
              Tanda tangan dibubuhkan saat laporan disimpan permanen, dan laporan yang
              sudah permanen <strong>tidak bisa diubah lagi</strong> — termasuk untuk
              menambahkan tanda tangan yang terlewat. Karena itu tanda tangan harus
              dipasang lebih dulu.
            </p>
            {/* Harus () => tutup(), bukan tutup: onClick meneruskan objek event
                sebagai argumen pertama, dan objek itu truthy — panduannya akan
                dimatikan selamanya padahal Fismed cuma menuju halaman Profil. */}
            <Link
              href="/profil"
              onClick={() => tutup()}
              className="tombol tombol-utama mt-3"
            >
              Pasang tanda tangan sekarang
            </Link>
          </div>
        )}

        <h3 className="mt-5 text-sm font-semibold">Alur kerjanya</h3>
        <ol className="mt-2 space-y-2 text-sm">
          <Langkah no={1} judul="Daftarkan instansi / klien">
            Data rumah sakit atau fasilitas yang alatnya dikalibrasi, di menu{" "}
            <strong>Instansi / Klien</strong>.
          </Langkah>
          <Langkah no={2} judul="Daftarkan alat radiologi">
            Pilih modalitasnya (Radiografi Mobile, CT-Scan, Gigi, Angiografi, C-Arm, MRI).
            Parameter uji dan rumusnya otomatis mengikuti modalitas yang dipilih.
          </Langkah>
          <Langkah no={3} judul="Isi registry alat ukur">
            Alat ukur yang Anda pakai beserta masa kalibrasinya, untuk dicantumkan di
            laporan.
          </Langkah>
          <Langkah no={4} judul="Buat laporan & isi hasil ukur">
            Cukup masukkan angka bacaan alat. Nilai turunan, koefisien, dan verdict
            lolos/tidak lolos dihitung sendiri oleh sistem.
          </Langkah>
          <Langkah no={5} judul="Simpan Draf sesering mungkin">
            Selama masih draf, laporan bebas disunting dan dicetak tanpa tanda tangan.
          </Langkah>
          <Langkah no={6} judul="Simpan Permanen bila sudah yakin">
            Laporan ditandatangani lalu dikunci selamanya — tidak bisa disunting siapa pun
            setelahnya. Lakukan hanya setelah seluruh isian diperiksa.
          </Langkah>
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => tutup(true)}
            className="tombol tombol-sekunder"
          >
            Jangan tampilkan lagi
          </button>
          <button type="button" onClick={() => tutup()} className="tombol tombol-utama">
            Mengerti
          </button>
        </div>
        <p className="mt-2 text-right text-xs text-[var(--muted)]">
          &ldquo;Mengerti&rdquo; menutup panduan untuk sesi ini saja — panduannya muncul
          lagi saat Anda masuk berikutnya.
        </p>
      </div>
    </div>
  );
}

function Langkah({
  no,
  judul,
  children,
}: {
  no: number;
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand)]">
        {no}
      </span>
      <span>
        <strong className="block">{judul}</strong>
        <span className="text-[var(--muted)]">{children}</span>
      </span>
    </li>
  );
}
