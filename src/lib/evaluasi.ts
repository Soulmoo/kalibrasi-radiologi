import { fmt } from "@/lib/calc";
import type {
  Baris,
  Blok,
  HasilUji,
  KonteksHitung,
  RingkasanItem,
  Template,
  Verdict,
} from "@/lib/templates/types";
import { blokKosong, labelBaris, teksToleransi } from "@/lib/templates/types";

export type SelTerhitung = {
  key: string;
  teks: string;
};

export type BarisTerhitung = {
  baris: Baris;
  label: string;
  sel: Record<string, string>;
  toleransi: string;
  verdict: Verdict | null;
};

export type BlokTerhitung = {
  blok: Blok;
  meta: Record<string, string>;
  baris: BarisTerhitung[];
  ringkasan: RingkasanItem[];
};

/** Teks tampilan satu sel: input apa adanya, atau hasil hitung yang diformat. */
export function nilaiSel(kolomKey: string, b: BarisTerhitung): string {
  return b.sel[kolomKey] ?? "-";
}

export function hitungBlok(blok: Blok, hasil: HasilUji): BlokTerhitung {
  const state = hasil[blok.id] ?? blokKosong(blok);
  const ctx: KonteksHitung = { meta: state.meta, rows: state.rows, all: hasil };

  const baris: BarisTerhitung[] = state.rows.map((r) => {
    const sel: Record<string, string> = {};
    for (const k of blok.kolom) {
      if (k.jenis === "label") {
        sel[k.key] = labelBaris(blok, r);
      } else if (k.jenis === "hitung") {
        if (k.hitungTeks) {
          sel[k.key] = k.hitungTeks(r, ctx);
        } else {
          const v = k.hitung ? k.hitung(r, ctx) : null;
          sel[k.key] = v === null ? "-" : `${fmt(v, k.desimal)}${k.akhiran ?? ""}`;
        }
      } else {
        const raw = (r[k.key] ?? "").trim();
        sel[k.key] = raw === "" ? "-" : raw;
      }
    }
    return {
      baris: r,
      label: labelBaris(blok, r),
      sel,
      toleransi: teksToleransi(blok, r, ctx),
      verdict: blok.tanpaEvaluasi || !blok.evaluasi ? null : blok.evaluasi(r, ctx),
    };
  });

  return {
    blok,
    meta: state.meta,
    baris,
    ringkasan: blok.ringkasanBlok ? blok.ringkasanBlok(ctx) : [],
  };
}

export type Rekap = {
  lolos: number;
  tidakLolos: number;
  tidakDiuji: number;
  /** parameter yang gagal, untuk ditampilkan sebagai peringatan */
  daftarGagal: string[];
};

export function rekapLaporan(template: Template, hasil: HasilUji): Rekap {
  const rekap: Rekap = { lolos: 0, tidakLolos: 0, tidakDiuji: 0, daftarGagal: [] };

  for (const seksi of template.seksi) {
    for (const blok of seksi.blok) {
      const t = hitungBlok(blok, hasil);

      for (const b of t.baris) {
        if (b.verdict === null) continue;
        if (b.verdict === "lolos") rekap.lolos++;
        else if (b.verdict === "tidak-lolos") {
          rekap.tidakLolos++;
          rekap.daftarGagal.push(`${blok.judul}${b.label ? ` — ${b.label}` : ""}`);
        } else rekap.tidakDiuji++;
      }

      for (const r of t.ringkasan) {
        if (!r.verdict) continue;
        if (r.verdict === "lolos") rekap.lolos++;
        else if (r.verdict === "tidak-lolos") {
          rekap.tidakLolos++;
          rekap.daftarGagal.push(`${blok.judul} — ${r.label}`);
        } else rekap.tidakDiuji++;
      }
    }
  }

  return rekap;
}

/**
 * Draf kesimpulan otomatis (PRD alur kerja langkah 8). Tetap bisa disunting
 * bebas oleh Fismed sebelum diekspor.
 */
export function draftKesimpulan(template: Template, hasil: HasilUji): string {
  const r = rekapLaporan(template, hasil);
  const subjek = template.namaAlat;

  if (r.lolos === 0 && r.tidakLolos === 0) {
    return `Belum ada parameter ${subjek} yang terisi.`;
  }
  if (r.tidakLolos === 0) {
    return `${subjek} dinyatakan Laik Pakai untuk parameter uji di atas.`;
  }
  return (
    `${subjek} dinyatakan Tidak Laik Pakai karena ${r.tidakLolos} parameter ` +
    `tidak memenuhi nilai lolos uji: ${r.daftarGagal.join("; ")}.`
  );
}
