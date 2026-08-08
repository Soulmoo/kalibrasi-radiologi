import {
  fmt,
  hvlMinimum,
  kesalahanRelatif,
  koefisienLinier,
  koefisienVariansi,
  num,
  perMas,
  persenSID,
  rerata,
} from "@/lib/calc";
import type { Angka } from "@/lib/calc";
import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import type { Baris, Template, Verdict } from "./types";

/**
 * Radiografi Mobile / Pesawat Sinar-X Umum.
 *
 * Dokumen sumber BPAFK memakai format "Uji Kesesuaian", namun sesuai keputusan
 * produk (PRD 2 & 5.2) modalitas ini diperlakukan sebagai KALIBRASI: parameter
 * ujinya sama persis, tetapi judul, tujuan, dan seluruh label dokumen memakai
 * istilah kalibrasi. Tidak ada jenis dokumen "Uji Kesesuaian" di aplikasi ini.
 */

const lolosJika = (ok: boolean | null): Verdict =>
  ok === null ? "na" : ok ? "lolos" : "tidak-lolos";

/**
 * Selisih lapangan kolimasi per sumbu:
 *     Δ = lapangan berkas sinar-X (terukur) − lapangan kolimasi (eksak)
 * mengikuti konvensi tanda (terukur − set) di PRD Lampiran A.1.1. Verdict
 * memakai |Δ|, jadi arah tandanya tidak mengubah lolos/tidak lolos.
 *
 * Sebelum kolom eksak/terukur ada, Fismed mengetik Δ langsung ke kolom
 * `selisih`. Nilai lama itu tetap dipakai selama kedua kolom baru belum terisi:
 * laporan yang sudah disimpan permanen tidak bisa disunting lagi untuk mengisi
 * kolom baru, sehingga tanpa cadangan ini hasil dan verdict laporan yang sudah
 * ditandatangani akan berubah menjadi "-" / "Tidak dilakukan".
 */
function selisihLapangan(b: Baris): Angka {
  const eksak = num(b.eksak);
  const terukur = num(b.terukur);
  if (eksak === null || terukur === null) return num(b.selisih);
  return terukur - eksak;
}

export const radiografiMobile: Template = {
  key: "radiografi-mobile",
  nama: "Radiografi Mobile / Umum",
  namaAlat: "Pesawat Sinar-X Radiografi Mobile",
  judulLaporan: "PESAWAT SINAR-X RADIOGRAFI MOBILE",
  metodeKerjaDefault: "MK-PRUK-02-rev-07",
  kodeLHU: "LHU-PRUK-02-rev-07",
  catatanLingkup:
    "Parameter uji modalitas ini diadaptasi dari metode uji kesesuaian, namun " +
    "laporan yang dihasilkan berstatus laporan hasil kalibrasi internal. " +
    "Parameter yang tidak diuji cukup dikosongkan atau diisi tanda hubung.",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: [
    {
      id: "insert-tube",
      judul: "Tabung Insersi (Insert Tube)",
      fields: [
        { key: "it_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "it_model", label: "Model/Tipe", jenis: "text" },
        { key: "it_seri", label: "No. Seri", jenis: "text" },
        { key: "it_tahun", label: "Tahun Produksi", jenis: "text" },
        { key: "it_focal", label: "Ukuran Focal Spot", jenis: "text", placeholder: "kecil 0.3 mm / besar 1.0 mm" },
        { key: "it_kapasitas", label: "Kapasitas Maksimum", jenis: "text", placeholder: "- mA pada 150 kVp" },
      ],
    },
    {
      id: "tube-housing",
      judul: "Wadah Tabung Sinar-X (Tube Housing)",
      fields: [
        { key: "th_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "th_model", label: "Model/Tipe", jenis: "text" },
        { key: "th_seri", label: "No. Seri", jenis: "text" },
        { key: "th_tahun", label: "Tahun Produksi", jenis: "text" },
        { key: "th_filter", label: "Filter Bawaan", jenis: "text", placeholder: "1.3 mmAl pada 75 kVp" },
        { key: "th_penanda", label: "Penanda Titik Fokus", jenis: "pilihan", opsi: ["ada", "tidak ada"] },
      ],
    },
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
          opsi: ["1 pulsa", "2 pulsa", "capasitor disc", "6/12 pulsa", "Med/HF"],
        },
        { key: "gen_kapasitas", label: "Kapasitas Maksimum", jenis: "text", placeholder: "125 kVp / 400 mA / 2.5 s" },
        { key: "gen_maKontinu", label: "mA Kontinu", jenis: "text" },
        { key: "gen_alarm", label: "Alarm Penyinaran", jenis: "multi", opsi: ["audio", "visual"] },
        { key: "gen_tombol", label: "Tombol Penyinaran", jenis: "pilihan", opsi: ["panel", "kabel", "di luar ruangan"] },
      ],
    },
    {
      id: "unit",
      judul: "Unit",
      fields: [
        { key: "unit_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "unit_model", label: "Model/Tipe", jenis: "text" },
        { key: "unit_seri", label: "No. Seri", jenis: "text" },
        { key: "unit_tahun", label: "Tahun Produksi", jenis: "text" },
      ],
    },
    {
      id: "kolimator",
      judul: "Kolimator Berkas Cahaya (LBC)",
      fields: [
        { key: "lbc_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "lbc_model", label: "Model/Tipe", jenis: "text" },
        { key: "lbc_seri", label: "No. Seri", jenis: "text" },
        { key: "lbc_filter", label: "Filter Bawaan", jenis: "text", satuan: "mmAl" },
        { key: "lbc_sidMin", label: "SID Minimum", jenis: "text", satuan: "cm" },
      ],
    },
    {
      id: "mode",
      judul: "Mode Penyinaran & Pencitraan",
      fields: [
        { key: "aec", label: "AEC", jenis: "pilihan", opsi: ["tersedia", "digunakan", "tidak tersedia"] },
        { key: "settingMa", label: "Setting mA, S", jenis: "pilihan", opsi: ["mAs", "mA/s"] },
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
          id: "kolimasi-selisih",
          judul: "Selisih Lapangan Kolimasi dengan Lapangan Berkas Sinar-X",
          catatan:
            "Isi ukuran lapangan kolimasi (nilai eksak yang diatur) dan lapangan berkas " +
            "sinar-X (hasil ukur) pada tiap sumbu; selisih dan Δ terhadap SID dihitung sistem.",
          metaFields: [{ key: "sid", label: "SID", satuan: "cm", jenis: "number", lebar: "10rem" }],
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Sumbu", jenis: "label", lebar: "18%" },
            { key: "eksak", label: "Lapangan Kolimasi (eksak)", satuan: "cm", jenis: "number" },
            { key: "terukur", label: "Lapangan Sinar-X (terukur)", satuan: "cm", jenis: "number" },
            {
              key: "selisih",
              label: "Selisih (Δ)",
              satuan: "cm",
              jenis: "hitung",
              desimal: 2,
              hitung: (b) => selisihLapangan(b),
            },
            {
              key: "persen",
              label: "Δ terhadap SID",
              satuan: "%",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b, ctx) => persenSID(selisihLapangan(b), num(ctx.meta.sid)),
            },
          ],
          baris: [
            { key: "x", label: "Sumbu X (ΔX)" },
            { key: "y", label: "Sumbu Y (ΔY)" },
          ],
          toleransi: "Δ ≤ 2 % SID",
          evaluasi: (b, ctx) => {
            const p = persenSID(selisihLapangan(b), num(ctx.meta.sid));
            return lolosJika(p === null ? null : Math.abs(p) <= 2);
          },
        },
        {
          id: "kolimasi-alignment",
          judul: "Ketepatan Berkas (Alignment) Obyek",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Parameter", jenis: "label", lebar: "40%" },
            { key: "theta", label: "Hasil Uji (θ)", satuan: "derajat", jenis: "number" },
          ],
          baris: [{ key: "theta", label: "Ketegaklurusan berkas sinar-X" }],
          toleransi: "θ ≤ 3°",
          evaluasi: (b) => {
            const v = num(b.theta);
            return lolosJika(v === null ? null : Math.abs(v) <= 3);
          },
        },
        {
          id: "kolimasi-iluminasi",
          judul: "Iluminasi Lampu Kolimator",
          modeBaris: "tetap",
          kolom: [
            { key: "sdd", label: "SDD", satuan: "cm", jenis: "number" },
            { key: "iluminasi", label: "Rerata Iluminasi", satuan: "lux", jenis: "number" },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.6 lux" },
          ],
          baris: [{ key: "ilum", label: "Iluminasi" }],
          toleransi: "Ilum ≥ 100 lux",
          evaluasi: (b) => {
            const v = num(b.iluminasi);
            return lolosJika(v === null ? null : v >= 100);
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
            { key: "kvpTerukur", label: "Bacaan Terukur", satuan: "kVp", jenis: "number" },
            {
              key: "e",
              label: "Kesalahan Relatif (e)",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet)),
            },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.3" },
            { key: "dosis", label: "Dosis", satuan: "mGy", jenis: "number" },
          ],
          toleransi: "e ≤ ± 10 %",
          evaluasi: (b) => {
            const e = kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet));
            return lolosJika(e === null ? null : Math.abs(e) <= 10);
          },
        },
        {
          id: "akurasi-waktu",
          judul: "Akurasi Waktu Penyinaran",
          catatan:
            "Toleransi mengikuti lama penyinaran: t ≥ 100 ms memakai e ≤ ±10 %, " +
            "t < 100 ms pada generator HF memakai ≤ ±(10 % + 1) ms.",
          metaFields: [
            { key: "setMa", label: "Set mA", jenis: "number" },
            { key: "setKv", label: "Set kV", jenis: "number" },
          ],
          modeBaris: "dinamis",
          barisAwalDinamis: 5,
          barisBaru: { sSet: "", msTerukur: "", ketidakpastian: "" },
          kolom: [
            { key: "sSet", label: "Setting waktu", satuan: "s", jenis: "number" },
            { key: "msTerukur", label: "Bacaan Terukur", satuan: "ms", jenis: "number" },
            {
              key: "e",
              label: "Kesalahan Relatif (e)",
              jenis: "hitung",
              desimal: 1,
              akhiran: " %",
              hitung: (b) => {
                const set = num(b.sSet);
                return kesalahanRelatif(num(b.msTerukur), set === null ? null : set * 1000);
              },
            },
            {
              key: "devMs",
              label: "Deviasi",
              satuan: "ms",
              jenis: "hitung",
              desimal: 1,
              hitung: (b) => {
                const set = num(b.sSet);
                const uk = num(b.msTerukur);
                if (set === null || uk === null) return null;
                return uk - set * 1000;
              },
            },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.0%" },
          ],
          toleransi: (b) => {
            const set = num(b.sSet);
            if (set === null) return "e ≤ ± 10 %";
            return set * 1000 >= 100 ? "e ≤ ± 10 %" : "≤ ± (10 % + 1) ms";
          },
          evaluasi: (b) => {
            const set = num(b.sSet);
            const uk = num(b.msTerukur);
            if (set === null || uk === null) return "na";
            const setMs = set * 1000;
            if (setMs >= 100) {
              const e = kesalahanRelatif(uk, setMs);
              return lolosJika(e === null ? null : Math.abs(e) <= 10);
            }
            return lolosJika(Math.abs(uk - setMs) <= 0.1 * setMs + 1);
          },
        },
        {
          id: "linearitas",
          judul: "Linearitas Keluaran Radiasi",
          catatan:
            "Isi minimal dua stasiun mA/mAs berdekatan. CL = |X₂ − X₁| / (X₂ + X₁) " +
            "dihitung dari keluaran ternormalisasi (mGy/mAs) terbesar dan terkecil.",
          metaFields: [
            { key: "fokus", label: "Fokus", jenis: "text", placeholder: "Besar / Kecil" },
            { key: "kv", label: "Setting kV", jenis: "number" },
          ],
          modeBaris: "dinamis",
          barisAwalDinamis: 4,
          barisBaru: { ma: "", mas: "", dosis: "" },
          tanpaEvaluasi: true,
          kolom: [
            { key: "ma", label: "Setting mA", jenis: "number" },
            { key: "mas", label: "mAs", jenis: "number" },
            { key: "dosis", label: "Dosis terukur", satuan: "mGy", jenis: "number" },
            {
              key: "keluaran",
              label: "Keluaran ternormalisasi",
              satuan: "mGy/mAs",
              jenis: "hitung",
              desimal: 4,
              hitung: (b) => perMas(num(b.dosis), num(b.mas)),
            },
          ],
          ringkasanBlok: (ctx) => {
            const keluaran = ctx.rows.map((r) => perMas(num(r.dosis), num(r.mas)));
            const cl = koefisienLinier(keluaran);
            const rata = rerata(keluaran);
            return [
              { label: "Rerata keluaran radiasi", nilai: `${fmt(rata, 4)} mGy/mAs` },
              {
                label: "Koefisien Linier (CL)",
                nilai: fmt(cl, 3),
                toleransi: "CL ≤ 0.1",
                verdict: lolosJika(cl === null ? null : cl <= 0.1),
              },
            ];
          },
        },
        {
          id: "reprodusibilitas",
          judul: "Reprodusibilitas",
          catatan:
            "Lakukan penyinaran berulang (3–5 kali) pada setting yang sama. " +
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
              desimal: 3,
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
            { key: "output", label: "Keluaran radiasi (mGy)" },
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
            "Nilai HVL dibaca langsung dari multimeter sinar-X (PRD A.1.5). " +
            "Batas minimum terisi otomatis dari tabel BAPETEN sesuai kVp — " +
            "kosongkan kolom batas untuk memakai nilai otomatis, atau isi manual untuk menimpanya.",
          modeBaris: "dinamis",
          barisAwalDinamis: 2,
          barisBaru: { kv: "", hvl: "", batas: "", ketidakpastian: "" },
          kolom: [
            { key: "kv", label: "Setting kV", jenis: "number" },
            { key: "hvl", label: "Nilai HVL", satuan: "mmAl", jenis: "number" },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.00%" },
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
        {
          id: "kebocoran",
          judul: "Kebocoran Wadah Tabung",
          catatan:
            "Input manual sesuai rekomendasi PRD Lampiran A.1.6 — rumus ekstrapolasi " +
            "belum divalidasi, dan parameter ini sering tidak dilakukan. Kosongkan bila tidak diuji.",
          modeBaris: "tetap",
          kolom: [
            { key: "_label", label: "Parameter", jenis: "label", lebar: "34%" },
            { key: "hasil", label: "Hasil Uji", satuan: "mGy/jam", jenis: "number" },
            { key: "kondisi", label: "Kondisi Uji", jenis: "text", placeholder: "kVp & mA maksimum, jarak 100 cm" },
          ],
          baris: [{ key: "bocor", label: "Kebocoran wadah tabung" }],
          toleransi: "≤ 1 mGy dalam 1 jam",
          evaluasi: (b) => {
            const v = num(b.hasil);
            return lolosJika(v === null ? null : v <= 1);
          },
        },
      ],
    },

    {
      id: "dosis",
      judul: "C. Informasi Dosis Pasien",
      blok: [
        {
          id: "dosis-pasien",
          judul: "Informasi Dosis Pasien",
          catatan: "Tabel informatif — tidak dievaluasi lolos/tidak lolos.",
          modeBaris: "dinamis",
          barisAwalDinamis: 2,
          barisBaru: { objek: "", kvp: "", mas: "", jarak: "", kerma: "", ketidakpastian: "" },
          tanpaEvaluasi: true,
          kolom: [
            { key: "objek", label: "Objek", jenis: "text", placeholder: "Thorax" },
            { key: "kvp", label: "kVp Uji", jenis: "number" },
            { key: "mas", label: "mAs Uji", jenis: "number" },
            { key: "jarak", label: "Jarak Fokus–Detektor", satuan: "cm", jenis: "number" },
            { key: "kerma", label: "Hasil Ukur Kerma", satuan: "mGy", jenis: "number" },
            { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 1.7" },
          ],
        },
      ],
    },
  ],
};
