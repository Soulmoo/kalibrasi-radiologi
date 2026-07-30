import type { Angka } from "@/lib/calc";

/**
 * Skema template parameter uji per jenis alat.
 *
 * Sesuai PRD bagian 8: template disimpan sebagai skema terkonfigurasi, bukan
 * hard-code di komponen form/PDF. Satu file template per modalitas; form,
 * kalkulasi, evaluasi pass/fail, dan layout PDF semuanya dibangkitkan dari
 * skema yang sama.
 */

export type Verdict = "lolos" | "tidak-lolos" | "na";

/** Nilai satu sel: selalu disimpan sebagai string agar "-" tetap bisa ditulis bebas. */
export type SelValue = string;

export type Baris = Record<string, SelValue> & { _key: string };

export type BlokState = {
  meta: Record<string, SelValue>;
  rows: Baris[];
};

/** Seluruh hasil uji satu laporan: { [blokId]: BlokState } */
export type HasilUji = Record<string, BlokState>;

export type KonteksHitung = {
  /** state blok yang sedang dihitung */
  meta: Record<string, SelValue>;
  rows: Baris[];
  /** seluruh hasil uji laporan, untuk rumus yang butuh nilai dari blok lain */
  all: HasilUji;
};

export type Kolom = {
  key: string;
  label: string;
  /** satuan ditampilkan kecil di bawah label */
  satuan?: string;
  /** 'number'/'text' = diisi Fismed, 'hitung' = dihitung sistem, 'label' = teks dari definisi baris */
  jenis: "number" | "text" | "hitung" | "label";
  /**
   * Jumlah angka di belakang koma untuk kolom hitung ini, mengikuti ketelitian
   * yang lazim dipakai untuk parameter tersebut di dokumen BPAFK. Kalau tidak
   * diisi, dipakai DESIMAL_TAMPILAN di src/lib/calc.ts sebagai default.
   */
  desimal?: number;
  /** akhiran yang ditempel di hasil hitung, mis. "%" */
  akhiran?: string;
  lebar?: string;
  placeholder?: string;
  /** kolom bantu yang hanya muncul di form, tidak ikut tercetak di laporan PDF */
  hanyaForm?: boolean;
  hitung?: (baris: Baris, ctx: KonteksHitung) => Angka;
  /** teks bebas hasil hitung (dipakai kalau hasilnya bukan angka) */
  hitungTeks?: (baris: Baris, ctx: KonteksHitung) => string;
};

export type MetaField = {
  key: string;
  label: string;
  satuan?: string;
  jenis?: "number" | "text";
  placeholder?: string;
  lebar?: string;
};

export type DefinisiBaris = {
  key: string;
  label?: string;
  /** nilai awal per kolom */
  awal?: Record<string, SelValue>;
};

/** Hasil hitung tingkat blok (mis. CL & CV yang dihitung dari seluruh baris). */
export type RingkasanItem = {
  label: string;
  nilai: string;
  toleransi?: string;
  verdict?: Verdict;
};

export type Blok = {
  id: string;
  judul: string;
  /** keterangan kecil di bawah judul */
  catatan?: string;
  /** field setting di atas tabel, mis. "kV: 70", "Fokus: Besar" */
  metaFields?: MetaField[];
  kolom: Kolom[];
  /** 'tetap' = baris sudah ditentukan template; 'dinamis' = Fismed bisa tambah/hapus baris */
  modeBaris: "tetap" | "dinamis";
  baris?: DefinisiBaris[];
  /** template baris baru untuk modeBaris 'dinamis' */
  barisBaru?: Record<string, SelValue>;
  barisAwalDinamis?: number;
  /** teks nilai lolos uji; bisa dinamis mengikuti isi baris */
  toleransi?: string | ((baris: Baris, ctx: KonteksHitung) => string);
  /** evaluasi pass/fail per baris. Kembalikan "na" untuk parameter tidak diuji. */
  evaluasi?: (baris: Baris, ctx: KonteksHitung) => Verdict;
  /** hasil hitung tingkat blok, ditampilkan di bawah tabel (mis. CL, CV) */
  ringkasanBlok?: (ctx: KonteksHitung) => RingkasanItem[];
  /** kalau true, kolom toleransi & keterangan tidak ditampilkan (tabel informatif saja) */
  tanpaEvaluasi?: boolean;
  /** blok alat bantu: disembunyikan dari laporan cetak kalau seluruh selnya kosong */
  opsional?: boolean;
};

export type Seksi = {
  id: string;
  judul: string;
  blok: Blok[];
};

/* ---------- Data konfigurasi alat (per modalitas) ---------- */

export type KonfField = {
  key: string;
  label: string;
  jenis: "text" | "pilihan" | "multi";
  opsi?: string[];
  satuan?: string;
  placeholder?: string;
};

export type KonfGrup = {
  id: string;
  judul: string;
  fields: KonfField[];
};

export type Template = {
  key: string;
  /** nama pendek untuk menu */
  nama: string;
  /** judul di halaman hasil pengujian, mis. "PESAWAT SINAR-X CT-SCAN" */
  judulLaporan: string;
  /** label "Nama Alat" di halaman sertifikat */
  namaAlat: string;
  metodeKerjaDefault: string;
  kodeLHU: string;
  /** catatan khusus yang tampil di form (mis. penegasan lingkup kalibrasi) */
  catatanLingkup?: string;
  konfigurasi: KonfGrup[];
  seksi: Seksi[];
  rekomendasiDefault: string;
};

/* ---------- Util ---------- */

export function blokKosong(blok: Blok): BlokState {
  const meta: Record<string, SelValue> = {};
  for (const f of blok.metaFields ?? []) meta[f.key] = "";

  let rows: Baris[] = [];
  if (blok.modeBaris === "tetap") {
    rows = (blok.baris ?? []).map((b) => ({ _key: b.key, ...(b.awal ?? {}) }));
  } else {
    const n = blok.barisAwalDinamis ?? 3;
    rows = Array.from({ length: n }, (_, i) => ({
      _key: `r${i + 1}`,
      ...(blok.barisBaru ?? {}),
    }));
  }
  return { meta, rows };
}

export function hasilUjiKosong(t: Template): HasilUji {
  const out: HasilUji = {};
  for (const s of t.seksi) for (const b of s.blok) out[b.id] = blokKosong(b);
  return out;
}

/** Gabungkan state tersimpan dengan struktur template terbaru (template bisa berubah). */
export function normalisasiHasil(t: Template, tersimpan: unknown): HasilUji {
  const dasar = hasilUjiKosong(t);
  if (!tersimpan || typeof tersimpan !== "object") return dasar;
  const s = tersimpan as HasilUji;
  for (const [id, blok] of Object.entries(dasar)) {
    const ada = s[id];
    if (!ada) continue;
    blok.meta = { ...blok.meta, ...(ada.meta ?? {}) };
    if (Array.isArray(ada.rows) && ada.rows.length > 0) {
      const def = cariBlok(t, id);
      if (def?.modeBaris === "dinamis") {
        blok.rows = ada.rows.map((r, i) => ({ ...r, _key: r._key ?? `r${i + 1}` }));
      } else {
        blok.rows = blok.rows.map((r) => {
          const cocok = ada.rows.find((x) => x._key === r._key);
          return cocok ? { ...r, ...cocok, _key: r._key } : r;
        });
      }
    }
  }
  return dasar;
}

export function cariBlok(t: Template, blokId: string): Blok | undefined {
  for (const s of t.seksi) {
    const b = s.blok.find((x) => x.id === blokId);
    if (b) return b;
  }
  return undefined;
}

export function labelBaris(blok: Blok, baris: Baris): string {
  if (blok.modeBaris === "tetap") {
    return blok.baris?.find((b) => b.key === baris._key)?.label ?? "";
  }
  return "";
}

export function teksToleransi(
  blok: Blok,
  baris: Baris,
  ctx: KonteksHitung,
): string {
  if (!blok.toleransi) return "";
  return typeof blok.toleransi === "function"
    ? blok.toleransi(baris, ctx)
    : blok.toleransi;
}

export function labelVerdict(v: Verdict): string {
  return v === "lolos" ? "Lolos" : v === "tidak-lolos" ? "Tidak Lolos" : "Tidak dilakukan";
}
