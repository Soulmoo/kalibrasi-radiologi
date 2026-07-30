import {
  fmt,
  hvlMinimum,
  kesalahanRelatif,
  koefisienVariansi,
  num,
  rerata,
} from "@/lib/calc";
import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import type { Baris, Template, Verdict } from "./types";

/** Pesawat Sinar-X Gigi Panoramic & Cephalometric — mengikuti LHU-PRUK-04. */

const lolosJika = (ok: boolean | null): Verdict =>
  ok === null ? "na" : ok ? "lolos" : "tidak-lolos";

/**
 * Bandingkan dimensi berkas sinar-X terhadap dimensi pembatasnya (reseptor
 * citra, slit kolimator, atau film). Lolos bila kedua sisi berkas tidak
 * melebihi pembatas. PRD A.4.1
 */
function bandingDimensi(
  rows: Baris[],
  keyBerkas: string,
  keyPembatas: string,
): Verdict {
  const berkas = rows.find((r) => r._key === keyBerkas);
  const pembatas = rows.find((r) => r._key === keyPembatas);
  // Bandingkan hanya sisi yang kedua nilainya terisi — pada beberapa laporan
  // hanya satu sisi yang diukur (dokumen contoh Panoramic menulis "-" untuk
  // sisi lainnya).
  const pasangan = (["sisi1", "sisi2"] as const)
    .map((k) => [num(berkas?.[k]), num(pembatas?.[k])] as const)
    .filter(([b, p]) => b !== null && p !== null);

  if (pasangan.length === 0) return "na";
  return lolosJika(pasangan.every(([b, p]) => b! <= p!));
}

function teksDimensi(rows: Baris[], key: string): string {
  const r = rows.find((x) => x._key === key);
  const a = num(r?.sisi1);
  const b = num(r?.sisi2);
  if (a === null && b === null) return "-";
  return `${fmt(a, 1)} × ${fmt(b, 1)} mm²`;
}

const KOLOM_DIMENSI = [
  { key: "_label", label: "Parameter", jenis: "label" as const, lebar: "44%" },
  { key: "sisi1", label: "Sisi 1", satuan: "mm", jenis: "number" as const },
  { key: "sisi2", label: "Sisi 2", satuan: "mm", jenis: "number" as const },
];

export const gigi: Template = {
  key: "gigi-panoramic-cephalometric",
  nama: "Gigi Panoramic & Cephalometric",
  namaAlat: "Pesawat Sinar-X Gigi Panoramic & Cephalometric",
  judulLaporan: "PESAWAT SINAR-X GIGI PANORAMIC & CEPHALOMETRIC",
  metodeKerjaDefault: "MK-PRUK-04-rev-06",
  kodeLHU: "LHU-PRUK-04-rev-06",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: [
    {
      id: "generator",
      judul: "Generator dan Panel Kendali Sinar-X",
      fields: [
        { key: "gen_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "gen_model", label: "Model/Tipe", jenis: "text" },
        { key: "gen_seri", label: "No. Seri", jenis: "text" },
        { key: "gen_tahun", label: "Tahun Produksi", jenis: "text" },
        {
          key: "gen_tipe",
          label: "Tipe Generator",
          jenis: "pilihan",
          opsi: ["1 pulsa", "2 pulsa", "potensial konstan", "6/12 pulsa", "Med/HF"],
        },
        { key: "gen_kapasitas", label: "Kapasitas Maksimum", jenis: "text", placeholder: "84 kVp / 16 mA / 10.5 s" },
        { key: "gen_alarm", label: "Alarm Penyinaran", jenis: "multi", opsi: ["audio", "visual"] },
        {
          key: "gen_tombol",
          label: "Tombol Penyinaran",
          jenis: "pilihan",
          opsi: ["deadman", "dengan kabel", "ada tombol lain ≤ 2 m"],
        },
        {
          key: "gen_waktu",
          label: "Waktu Penyinaran",
          jenis: "pilihan",
          opsi: ["timer elektronik", "tidak mungkin t = 0"],
        },
        {
          key: "gen_suplai",
          label: "Suplai Tegangan",
          jenis: "pilihan",
          opsi: ["tidak ada", "suplai terkoreksi", "low volt (LV) terkoreksi"],
        },
      ],
    },
    {
      id: "tube-housing",
      judul: "Wadah Tabung Sinar-X (Tube Housing)",
      fields: [
        { key: "th_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "th_model", label: "Model/Tipe", jenis: "text" },
        { key: "th_seri", label: "No. Seri", jenis: "text" },
        { key: "th_filter", label: "Filter Bawaan", jenis: "text", satuan: "mmAl" },
        { key: "th_focal", label: "Posisi Focal Spot", jenis: "pilihan", opsi: ["diberi tanda", "tidak diberi tanda"] },
      ],
    },
    {
      id: "insert-tube",
      judul: "Tabung Insersi (Insert Tube)",
      fields: [
        { key: "it_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "it_model", label: "Model/Tipe", jenis: "text" },
        { key: "it_seri", label: "No. Seri", jenis: "text" },
        { key: "it_focal", label: "Ukuran Focal Spot", jenis: "text", satuan: "mm" },
        { key: "it_kvpMax", label: "kVp Maksimum", jenis: "text" },
      ],
    },
    {
      id: "pencitraan",
      judul: "Sistem Pencitraan",
      fields: [
        { key: "sistemPencitraan", label: "Sistem Pencitraan", jenis: "pilihan", opsi: ["CR", "DR", "Film"] },
      ],
    },
  ],

  seksi: [
    seksiKondisiLingkungan(),

    {
      id: "kolimasi",
      judul: "A. Kolimasi Berkas Cahaya",
      blok: [
        {
          id: "ceph-dimensi",
          judul: "Pesawat Cephalometric (Non-LBC) — Dimensi Berkas Sinar-X",
          catatan:
            "Isi kedua sisi lapangan (panjang × lebar) untuk berkas sinar-X dan reseptor citra. " +
            "Lolos bila kedua sisi berkas tidak melebihi dimensi reseptor citra.",
          modeBaris: "tetap",
          tanpaEvaluasi: true,
          kolom: KOLOM_DIMENSI,
          baris: [
            { key: "berkas", label: "Dimensi berkas sinar-X" },
            { key: "reseptor", label: "Dimensi reseptor citra" },
          ],
          ringkasanBlok: (ctx) => [
            {
              label: "Kesesuaian berkas sinar-X terhadap reseptor citra",
              nilai: `${teksDimensi(ctx.rows, "berkas")} vs ${teksDimensi(ctx.rows, "reseptor")}`,
              toleransi: "dimensi berkas ≤ dimensi reseptor citra",
              verdict: bandingDimensi(ctx.rows, "berkas", "reseptor"),
            },
          ],
        },
        {
          id: "ceph-ssd",
          judul: "Pesawat Cephalometric — SSD",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Parameter", jenis: "label", lebar: "44%" },
            { key: "ssd", label: "Hasil Uji", satuan: "cm", jenis: "number" },
          ],
          baris: [{ key: "ssd", label: "Source to Surface Distance (SSD)" }],
          toleransi: "SSD ≥ 150 cm",
          evaluasi: (b) => {
            const v = num(b.ssd);
            return lolosJika(v === null ? null : v >= 150);
          },
        },
        {
          id: "pano-dimensi",
          judul: "Pesawat Panoramic — Dimensi Berkas Sinar-X",
          catatan:
            "Dua perbandingan: berkas pada sisi pasien terhadap slit kolimator, dan " +
            "berkas pada sisi film terhadap dimensi film/reseptor citra.",
          modeBaris: "tetap",
          tanpaEvaluasi: true,
          kolom: KOLOM_DIMENSI,
          baris: [
            { key: "berkasPasien", label: "Dimensi berkas sinar-X (sisi pasien)" },
            { key: "slit", label: "Dimensi slit kolimator" },
            { key: "berkasFilm", label: "Dimensi berkas sinar-X (sisi film)" },
            { key: "film", label: "Dimensi film / reseptor citra" },
          ],
          ringkasanBlok: (ctx) => [
            {
              label: "Berkas sinar-X sisi pasien terhadap slit kolimator",
              nilai: `${teksDimensi(ctx.rows, "berkasPasien")} vs ${teksDimensi(ctx.rows, "slit")}`,
              toleransi: "dimensi berkas ≤ dimensi slit",
              verdict: bandingDimensi(ctx.rows, "berkasPasien", "slit"),
            },
            {
              label: "Berkas sinar-X sisi film terhadap reseptor citra",
              nilai: `${teksDimensi(ctx.rows, "berkasFilm")} vs ${teksDimensi(ctx.rows, "film")}`,
              toleransi: "dimensi berkas ≤ dimensi reseptor citra",
              verdict: bandingDimensi(ctx.rows, "berkasFilm", "film"),
            },
          ],
        },
        {
          id: "kombinasi-interlock",
          judul: "Kombinasi Pesawat Panoramic dan Cephalometric",
          catatan:
            "Penyesuaian area kolimasi berkas sinar-X pada pesawat panoramic terhadap " +
            "variasi area target pada image receptor dari pesawat cephalometric.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Parameter", jenis: "label", lebar: "50%" },
            {
              key: "hasil",
              label: "Hasil Uji",
              jenis: "text",
              placeholder: "Tersedia / Tidak tersedia",
            },
          ],
          baris: [{ key: "interlock", label: "Interlock penyesuaian area kolimasi" }],
          toleransi: "Tersedia interlock",
          evaluasi: (b) => {
            const s = (b.hasil ?? "").trim().toLowerCase();
            if (s === "" || s === "-") return "na";
            return lolosJika(s.includes("tersedia") && !s.includes("tidak"));
          },
        },
      ],
    },

    {
      id: "generator",
      judul: "B. Generator dan Tabung Sinar-X",
      blok: [
        {
          id: "akurasi-tegangan",
          judul: "Akurasi Tegangan Tabung",
          metaFields: [
            { key: "setMa", label: "Set mA", jenis: "number" },
            { key: "setS", label: "Set s", jenis: "number" },
          ],
          modeBaris: "dinamis",
          barisAwalDinamis: 6,
          barisBaru: { kvpSet: "", kvpTerukur: "", ketidakpastian: "", dosis: "" },
          kolom: [
            { key: "kvpSet", label: "Setting kVp", jenis: "number" },
            { key: "kvpTerukur", label: "Bacaan Rerata", satuan: "kVp", jenis: "number" },
            {
              key: "e",
              label: "Kesalahan Relatif (e)",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet)),
            },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.30" },
            { key: "dosis", label: "Dosis", satuan: "mGy", jenis: "number" },
          ],
          toleransi: "e ≤ ± 6 %",
          evaluasi: (b) => {
            const e = kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet));
            return lolosJika(e === null ? null : Math.abs(e) <= 6);
          },
        },
        {
          id: "akurasi-waktu",
          judul: "Akurasi Waktu Penyinaran",
          metaFields: [
            { key: "setMa", label: "Set mA", jenis: "number" },
            { key: "setKv", label: "Set kV", jenis: "number" },
          ],
          modeBaris: "dinamis",
          barisAwalDinamis: 1,
          barisBaru: { sSet: "", sTerukur: "", ketidakpastian: "" },
          kolom: [
            { key: "sSet", label: "Setting waktu", satuan: "s", jenis: "number" },
            { key: "sTerukur", label: "Bacaan Rerata", satuan: "s", jenis: "number" },
            {
              key: "e",
              label: "Kesalahan Relatif (e)",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => kesalahanRelatif(num(b.sTerukur), num(b.sSet)),
            },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.00 %" },
          ],
          toleransi: "e ≤ ± 10 %",
          evaluasi: (b) => {
            const e = kesalahanRelatif(num(b.sTerukur), num(b.sSet));
            return lolosJika(e === null ? null : Math.abs(e) <= 10);
          },
        },
        {
          id: "reprodusibilitas",
          judul: "Reprodusibilitas",
          catatan:
            "Penyinaran berulang (3–5 kali) pada setting yang sama. " +
            "CV = (Xmaks − Xmin) / (Xmaks + Xmin).",
          metaFields: [
            { key: "kv", label: "Setting kV", jenis: "number" },
            { key: "s", label: "Setting s", jenis: "number" },
            { key: "ma", label: "Setting mA", jenis: "number" },
          ],
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Parameter", jenis: "label", lebar: "22%" },
            { key: "m1", label: "1", jenis: "number" },
            { key: "m2", label: "2", jenis: "number" },
            { key: "m3", label: "3", jenis: "number" },
            { key: "m4", label: "4", jenis: "number" },
            { key: "m5", label: "5", jenis: "number" },
            {
              key: "rerata",
              label: "Rerata",
              jenis: "hitung",
              desimal: 2,
              hitung: (b) => rerata([b.m1, b.m2, b.m3, b.m4, b.m5]),
            },
            {
              key: "cv",
              label: "CV",
              jenis: "hitung",
              desimal: 3,
              hitung: (b) => koefisienVariansi([b.m1, b.m2, b.m3, b.m4, b.m5]),
            },
          ],
          baris: [
            { key: "kvp", label: "Tegangan puncak (kVp)" },
            { key: "waktu", label: "Waktu penyinaran (s)" },
            { key: "dosis", label: "Dosis (mGy)" },
          ],
          toleransi: "CV ≤ 0.05",
          evaluasi: (b) => {
            const cv = koefisienVariansi([b.m1, b.m2, b.m3, b.m4, b.m5]);
            return lolosJika(cv === null ? null : cv <= 0.05);
          },
        },
        {
          id: "hvl",
          judul: "Kualitas Berkas Sinar-X (HVL)",
          catatan:
            "Nilai HVL dibaca langsung dari multimeter sinar-X. Batas minimum terisi " +
            "otomatis dari tabel BAPETEN sesuai kVp — isi kolom batas untuk menimpanya.",
          modeBaris: "dinamis",
          barisAwalDinamis: 2,
          barisBaru: { kv: "", hvl: "", batas: "", ketidakpastian: "" },
          kolom: [
            { key: "kv", label: "Setting kVp", jenis: "number" },
            { key: "hvl", label: "Nilai HVL", satuan: "mmAl", jenis: "number" },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.00 %" },
            {
              key: "batas",
              label: "Batas minimum (opsional)",
              satuan: "mmAl",
              jenis: "number",
              placeholder: "otomatis",
              hanyaForm: true,
            },
          ],
          toleransi: (b) => {
            const batas = num(b.batas) ?? hvlMinimum(num(b.kv));
            return batas === null ? "HVL ≥ tabel BAPETEN" : `HVL ≥ ${fmt(batas, 1)} mmAl`;
          },
          evaluasi: (b) => {
            const v = num(b.hvl);
            const batas = num(b.batas) ?? hvlMinimum(num(b.kv));
            if (v === null || batas === null) return "na";
            return lolosJika(v >= batas);
          },
        },
      ],
    },
  ],
};
