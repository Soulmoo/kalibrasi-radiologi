"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LEBAR_TTD_MAKS,
  PESAN_TTD_TIDAK_VALID,
  TTD_HAPUS,
  tandaTanganValid,
} from "@/lib/tanda-tangan";

type Mode = "unggah" | "gambar";

/**
 * Ukuran kanvas gambar di layar. Perbandingannya dibuat mirip kotak tanda
 * tangan di lembar cetak (70 mm × 20 mm) supaya yang digambar Fismed di sini
 * proporsinya sama dengan yang nanti tercetak.
 */
const KANVAS_LEBAR = 480;
const KANVAS_TINGGI = 160;

/**
 * Kecilkan gambar apa pun ke lebar maksimum, lalu keluarkan sebagai PNG data
 * URL. Dipakai jalur unggah maupun jalur kanvas supaya keduanya menghasilkan
 * bentuk data yang persis sama — server tidak perlu tahu asalnya dari mana.
 */
function keDataUrl(
  sumber: CanvasImageSource,
  lebarAsli: number,
  tinggiAsli: number,
): string | null {
  if (!lebarAsli || !tinggiAsli) return null;
  const skala = Math.min(1, LEBAR_TTD_MAKS / lebarAsli);
  const kanvas = document.createElement("canvas");
  kanvas.width = Math.max(1, Math.round(lebarAsli * skala));
  kanvas.height = Math.max(1, Math.round(tinggiAsli * skala));
  const ctx = kanvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(sumber, 0, 0, kanvas.width, kanvas.height);
  return kanvas.toDataURL("image/png");
}

export function InputTandaTangan({ awal }: { awal: string | null }) {
  // Nilai yang dikirim ke server: "" = tidak diubah, "hapus" = kosongkan,
  // selain itu data URL pengganti. Pola satu hidden input ini sama dengan cara
  // form laporan mengirim hasilUji.
  const [nilai, setNilai] = useState("");
  const [pratinjau, setPratinjau] = useState<string | null>(awal);
  const [mode, setMode] = useState<Mode>("unggah");
  const [galat, setGalat] = useState<string | null>(null);

  const kanvasRef = useRef<HTMLCanvasElement | null>(null);
  const berkasRef = useRef<HTMLInputElement | null>(null);
  const menggambarRef = useRef(false);
  const adaCoretanRef = useRef(false);

  const pakai = useCallback((dataUrl: string | null) => {
    if (!dataUrl || !tandaTanganValid(dataUrl)) {
      setGalat(PESAN_TTD_TIDAK_VALID);
      return;
    }
    setGalat(null);
    setNilai(dataUrl);
    setPratinjau(dataUrl);
  }, []);

  /* ---------------- Jalur unggah ---------------- */

  function saatPilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    if (!/^image\/(png|jpeg)$/.test(berkas.type)) {
      setGalat("Format harus PNG atau JPG.");
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(berkas);
    const img = new Image();
    img.onload = () => {
      pakai(keDataUrl(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setGalat(PESAN_TTD_TIDAK_VALID);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = "";
  }

  /* ---------------- Jalur kanvas ---------------- */

  // Kanvas disiapkan ulang tiap kali tab gambar dibuka. Ukuran penyimpanannya
  // dikalikan devicePixelRatio supaya coretan tidak pecah di layar HiDPI,
  // sementara ukuran tampilnya tetap dipatok CSS.
  useEffect(() => {
    if (mode !== "gambar") return;
    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    kanvas.width = KANVAS_LEBAR * dpr;
    kanvas.height = KANVAS_TINGGI * dpr;

    const ctx = kanvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#101828";
    adaCoretanRef.current = false;
  }, [mode]);

  function titik(e: React.PointerEvent<HTMLCanvasElement>) {
    const kotak = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - kotak.left) / kotak.width) * KANVAS_LEBAR,
      y: ((e.clientY - kotak.top) / kotak.height) * KANVAS_TINGGI,
    };
  }

  function mulaiCoret(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = kanvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    menggambarRef.current = true;
    const p = titik(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function lanjutCoret(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!menggambarRef.current) return;
    const ctx = kanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = titik(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    adaCoretanRef.current = true;
  }

  function selesaiCoret() {
    menggambarRef.current = false;
  }

  function bersihkanKanvas() {
    const kanvas = kanvasRef.current;
    const ctx = kanvas?.getContext("2d");
    if (!kanvas || !ctx) return;
    ctx.clearRect(0, 0, kanvas.width, kanvas.height);
    adaCoretanRef.current = false;
  }

  function pakaiCoretan() {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;
    if (!adaCoretanRef.current) {
      setGalat("Belum ada coretan pada kotak gambar.");
      return;
    }
    pakai(keDataUrl(kanvas, kanvas.width, kanvas.height));
  }

  /* ---------------- Hapus ---------------- */

  function hapus() {
    setGalat(null);
    setNilai(TTD_HAPUS);
    setPratinjau(null);
    if (berkasRef.current) berkasRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="tandaTangan" value={nilai} />

      <div>
        <span className="mb-1 block text-sm font-medium">Tanda Tangan</span>
        <span className="block text-xs text-[var(--muted)]">
          Dipakai pada laporan yang ditandai <strong>Selesai</strong>. Laporan yang sudah
          selesai tetap memakai tanda tangan saat itu — untuk menggantinya, kembalikan
          laporan ke Draf lalu selesaikan lagi.
        </span>
      </div>

      {/* Pratinjau memakai latar putih & garis seperti kolom tanda tangan di lembar
          cetak, supaya Fismed tahu persis bentuk yang akan tercetak. */}
      <div className="rounded border border-[var(--border)] bg-white p-3">
        {pratinjau ? (
          <div className="w-[70mm] max-w-full">
            <div className="flex h-[20mm] items-end justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- sumbernya data URL, bukan aset yang bisa dioptimalkan next/image */}
              <img
                src={pratinjau}
                alt="Pratinjau tanda tangan"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="border-t border-[#333] pt-1 text-xs font-bold">
              Nama Fisikawan Medis
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            Belum ada tanda tangan. Laporan akan dicetak dengan ruang kosong untuk
            ditandatangani manual.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("unggah")}
          className={`tombol ${mode === "unggah" ? "tombol-utama" : "tombol-sekunder"}`}
        >
          Unggah berkas
        </button>
        <button
          type="button"
          onClick={() => setMode("gambar")}
          className={`tombol ${mode === "gambar" ? "tombol-utama" : "tombol-sekunder"}`}
        >
          Gambar di sini
        </button>
        {pratinjau && (
          <button type="button" onClick={hapus} className="tombol tombol-bahaya">
            Hapus tanda tangan
          </button>
        )}
      </div>

      {mode === "unggah" ? (
        <div className="space-y-1">
          <input
            ref={berkasRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={saatPilihBerkas}
            className="input-dasar"
          />
          <p className="text-xs text-[var(--muted)]">
            Foto atau hasil pindai tanda tangan di kertas putih. PNG dengan latar
            transparan memberi hasil paling rapi. Gambar otomatis dikecilkan sebelum
            disimpan.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <canvas
            ref={kanvasRef}
            onPointerDown={mulaiCoret}
            onPointerMove={lanjutCoret}
            onPointerUp={selesaiCoret}
            onPointerLeave={selesaiCoret}
            onPointerCancel={selesaiCoret}
            style={{
              width: KANVAS_LEBAR,
              height: KANVAS_TINGGI,
              // Tanpa ini, menggambar dengan jari di HP justru menggulir halaman.
              touchAction: "none",
            }}
            className="max-w-full cursor-crosshair rounded border border-dashed border-[var(--border)] bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={pakaiCoretan} className="tombol tombol-sekunder">
              Pakai gambar ini
            </button>
            <button type="button" onClick={bersihkanKanvas} className="tombol tombol-sekunder">
              Ulangi
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Gambar dengan mouse, atau dengan jari kalau memakai HP/tablet. Tekan
            &ldquo;Pakai gambar ini&rdquo; dulu, lalu Simpan Profil.
          </p>
        </div>
      )}

      {galat && <p className="text-sm text-red-700">{galat}</p>}
    </div>
  );
}
