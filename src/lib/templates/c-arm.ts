import { fmt, num } from "@/lib/calc";
import { REKOMENDASI_DEFAULT, seksiKondisiLingkungan } from "./common";
import {
  konfigurasiFluoroskopi,
  lolosJika,
  seksiDosisFluoroskopi,
  seksiGeneratorFluoroskopi,
  seksiKolimasiFluoroskopi,
  seksiPencitraanFluoroskopi,
} from "./fluoroskopi";
import type { Seksi, Template } from "./types";

/**
 * Pesawat Sinar-X C-Arm — mengikuti LHU-PRUK-05, sama seperti Angiografi.
 *
 * Dokumen sumber BPAFK memakai format uji kesesuaian; di aplikasi ini modalitas
 * ini diperlakukan sebagai KALIBRASI dengan parameter uji yang sama (PRD 5.2).
 *
 * Blok tambahan di seksi E mengikuti daftar parameter khas C-Arm pada PRD 6.2
 * (waktu fluoroskopik maksimum, laju dosis input II, kualitas citra monitor).
 * Parameter-parameter ini bertingkat keyakinan sedang di PRD Lampiran A.3.3 dan
 * A.3.4 — nilainya dibaca dari test tool, dan batas lolos ujinya diisi manual
 * mengikuti tabel acuan yang berlaku. Seluruh blok ini opsional: kalau tidak
 * diisi, blok tidak ikut tercetak di laporan.
 */

function seksiTambahanCArm(): Seksi {
  return {
    id: "c-arm-tambahan",
    judul: "E. Parameter Tambahan C-Arm",
    blok: [
      {
        id: "waktu-fluoro-maks",
        judul: "Waktu Fluoroskopik Maksimum",
        catatan:
          "Waktu penyinaran fluoroskopi berkelanjutan sebelum pewaktu memutus/memberi " +
          "peringatan. Isi kolom batas sesuai acuan yang dipakai — batas tidak dipatok sistem.",
        modeBaris: "tetap",
        opsional: true,
        kolom: [
          { key: "_label", label: "Parameter", jenis: "label", lebar: "40%" },
          { key: "hasil", label: "Hasil Uji", satuan: "menit", jenis: "number" },
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text" },
          {
            key: "batas",
            label: "Batas maksimum",
            satuan: "menit",
            jenis: "number",
            hanyaForm: true,
          },
        ],
        baris: [{ key: "waktu", label: "Waktu fluoroskopik maksimum", awal: { batas: "10" } }],
        toleransi: (b) => {
          const batas = num(b.batas);
          return batas === null ? "sesuai acuan" : `≤ ${fmt(batas, 0)} menit`;
        },
        evaluasi: (b) => {
          const v = num(b.hasil);
          const batas = num(b.batas);
          if (v === null || batas === null) return "na";
          return lolosJika(v <= batas);
        },
      },
      {
        id: "laju-dosis-ii",
        judul: "Laju Dosis Input Image Intensifier",
        catatan:
          "Diukur langsung di depan II. Batas berjenjang menurut diameter II/FOV — " +
          "acuan yang lazim dipakai: ≤ 60 μGy/menit untuk FOV 23 cm, ≤ 90 μGy/menit " +
          "untuk FOV 14–23 cm, ≤ 120 μGy/menit untuk FOV 11–14 cm (PRD A.3.3, tingkat " +
          "keyakinan sedang — sesuaikan dengan tabel acuan yang berlaku).",
        modeBaris: "dinamis",
        barisAwalDinamis: 3,
        opsional: true,
        barisBaru: { fov: "", laju: "", ketidakpastian: "", batas: "" },
        kolom: [
          { key: "fov", label: "Diameter II / FOV", satuan: "cm", jenis: "number" },
          { key: "laju", label: "Laju Dosis Input", satuan: "μGy/menit", jenis: "number" },
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text" },
          {
            key: "batas",
            label: "Batas maksimum",
            satuan: "μGy/menit",
            jenis: "number",
            hanyaForm: true,
          },
        ],
        toleransi: (b) => {
          const batas = num(b.batas);
          return batas === null ? "sesuai tabel acuan" : `≤ ${fmt(batas, 0)} μGy/menit`;
        },
        evaluasi: (b) => {
          const v = num(b.laju);
          const batas = num(b.batas);
          if (v === null || batas === null) return "na";
          return lolosJika(v <= batas);
        },
      },
      {
        id: "kontras-rendah",
        judul: "Kualitas Citra Monitor — Ambang Kontras Rendah",
        catatan:
          "Dibaca dari test tool (Leeds Test Object atau setara): persentase kontras " +
          "terkecil yang masih terdeteksi. Pembacaan visual, bukan hasil kalkulasi.",
        modeBaris: "dinamis",
        barisAwalDinamis: 2,
        opsional: true,
        barisBaru: { fov: "", ambang: "", batas: "" },
        kolom: [
          { key: "fov", label: "FOV", satuan: "cm", jenis: "number" },
          { key: "ambang", label: "Ambang Kontras Rendah", satuan: "%", jenis: "number" },
          { key: "batas", label: "Batas maksimum", satuan: "%", jenis: "number", hanyaForm: true },
        ],
        toleransi: (b) => {
          const batas = num(b.batas);
          return batas === null ? "sesuai acuan" : `≤ ${fmt(batas, 1)} %`;
        },
        evaluasi: (b) => {
          const v = num(b.ambang);
          const batas = num(b.batas);
          if (v === null || batas === null) return "na";
          return lolosJika(v <= batas);
        },
      },
      {
        id: "resolusi-spasial",
        judul: "Kualitas Citra Monitor — Resolusi Spasial",
        catatan:
          "Dibaca dari test tool pola garis (line pairs), bertingkat sesuai ukuran FOV.",
        modeBaris: "dinamis",
        barisAwalDinamis: 2,
        opsional: true,
        barisBaru: { fov: "", resolusi: "", batas: "" },
        kolom: [
          { key: "fov", label: "FOV", satuan: "cm", jenis: "number" },
          { key: "resolusi", label: "Resolusi Spasial", satuan: "lp/mm", jenis: "number" },
          { key: "batas", label: "Batas minimum", satuan: "lp/mm", jenis: "number", hanyaForm: true },
        ],
        toleransi: (b) => {
          const batas = num(b.batas);
          return batas === null ? "sesuai acuan" : `≥ ${fmt(batas, 1)} lp/mm`;
        },
        evaluasi: (b) => {
          const v = num(b.resolusi);
          const batas = num(b.batas);
          if (v === null || batas === null) return "na";
          return lolosJika(v >= batas);
        },
      },
      {
        id: "distorsi-mesh",
        judul: "Kualitas Citra Monitor — Distorsi Bentuk Jaring",
        catatan: "Penilaian visual terhadap pola jaring (mesh) pada test tool.",
        modeBaris: "tetap",
        opsional: true,
        kolom: [
          { key: "_label", label: "Parameter", jenis: "label", lebar: "44%" },
          {
            key: "hasil",
            label: "Hasil Uji",
            jenis: "text",
            placeholder: "tidak terlihat distorsi / terlihat distorsi",
          },
        ],
        baris: [{ key: "distorsi", label: "Distorsi bentuk jaring" }],
        toleransi: "tidak terlihat distorsi",
        evaluasi: (b) => {
          const s = (b.hasil ?? "").trim().toLowerCase();
          if (s === "" || s === "-") return "na";
          return lolosJika(s.includes("tidak"));
        },
      },
    ],
  };
}

export const cArm: Template = {
  key: "c-arm",
  nama: "C-Arm",
  namaAlat: "Pesawat Sinar-X C-Arm",
  judulLaporan: "PESAWAT SINAR-X C-ARM",
  metodeKerjaDefault: "MK-PRUK-05-rev-04",
  kodeLHU: "LHU-PRUK-05-rev-04",
  catatanLingkup:
    "Parameter uji modalitas ini diadaptasi dari metode uji kesesuaian, namun " +
    "laporan yang dihasilkan berstatus laporan hasil kalibrasi internal. " +
    "Parameter yang tidak diuji cukup dikosongkan atau diisi tanda hubung.",
  rekomendasiDefault: REKOMENDASI_DEFAULT,

  konfigurasi: konfigurasiFluoroskopi(),

  seksi: [
    seksiKondisiLingkungan(),
    seksiKolimasiFluoroskopi(),
    seksiDosisFluoroskopi(),
    seksiPencitraanFluoroskopi(),
    seksiGeneratorFluoroskopi(),
    seksiTambahanCArm(),
  ],
};
