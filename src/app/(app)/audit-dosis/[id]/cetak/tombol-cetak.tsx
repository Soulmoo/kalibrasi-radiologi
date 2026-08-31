"use client";

export function TombolCetak() {
  return (
    <button type="button" onClick={() => window.print()} className="tombol tombol-utama">
      Cetak / Simpan sebagai PDF
    </button>
  );
}
