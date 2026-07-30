import type { Seksi } from "./types";

/**
 * Uji Kondisi Lingkungan — muncul konsisten di semua jenis alat (PRD 6.2).
 * Nilai ketidakpastian diinput manual mengikuti pembacaan alat ukur.
 */
export function seksiKondisiLingkungan(): Seksi {
  return {
    id: "lingkungan",
    judul: "Uji Kondisi Lingkungan",
    blok: [
      {
        id: "kondisi-lingkungan",
        judul: "Uji Kondisi Lingkungan",
        modeBaris: "tetap",
        tanpaEvaluasi: true,
        kolom: [
          { key: "_label", label: "Parameter", jenis: "label", lebar: "34%" },
          { key: "hasil", label: "Hasil Ukur", jenis: "number" },
          { key: "satuan", label: "Satuan", jenis: "text", lebar: "14%" },
          {
            key: "ketidakpastian",
            label: "Ketidakpastian Pengukuran",
            jenis: "text",
            placeholder: "± 0.0",
          },
        ],
        baris: [
          { key: "suhu", label: "Suhu Udara", awal: { satuan: "ᴼC" } },
          { key: "kelembaban", label: "Kelembaban Udara", awal: { satuan: "% RH" } },
          { key: "tekanan", label: "Tekanan Udara", awal: { satuan: "mb" } },
        ],
      },
    ],
  };
}

/** Grup konfigurasi yang sama persis di beberapa modalitas. */
export const KONF_SISTEM_PENCITRAAN = {
  id: "pencitraan",
  judul: "Sistem Pencitraan",
  fields: [
    {
      key: "sistemPencitraan",
      label: "Sistem Pencitraan",
      jenis: "pilihan" as const,
      opsi: ["CR", "DR", "Film"],
    },
  ],
};

export const REKOMENDASI_DEFAULT =
  "Harap melakukan kalibrasi ulang setiap tahun sekali.\n(Permenkes No. 54 tahun 2015 tentang pengujian dan kalibrasi alat kesehatan)";

export const KETERANGAN_KETIDAKPASTIAN =
  "Ketidakpastian pengukuran dilaporkan pada tingkat kepercayaan 95 % dengan faktor cakupan k = 2.";
