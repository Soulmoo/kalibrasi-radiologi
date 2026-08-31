/**
 * Definisi kolom tabel data pasien.
 *
 * Kolomnya berubah mengikuti percabangan Pedoman Teknis butir 3.2.4.1:
 * Jalur A memakai angka yang ditampilkan pesawat, Jalur B memakai faktor
 * eksposi yang diolah lewat regresi keluaran tabung. Dipisah ke berkas
 * tersendiri supaya form (klien) dan tampilan baca-saja (server) memakai
 * definisi yang sama persis.
 */

import type { HasilBaris } from "@/lib/audit-dosis";
import type { Angka } from "@/lib/calc";
import type { ModalitasAudit } from "@/lib/tpdi";

export type KolomPasien = {
  key: string;
  label: string;
  satuan?: string;
  jenis: "text" | "number" | "pilihan" | "hitung";
  opsi?: string[];
  /** hanya untuk jenis "hitung" */
  hitung?: (h: HasilBaris) => Angka;
  desimal?: number;
  /** kolom identitas pasien — tidak pernah ikut tercetak di lembar hasil */
  identitas?: boolean;
};

/**
 * Kolom identitas & pengelompokan.
 *
 * `umur` wajib karena menentukan kelompok umur survei, dan `beratBadan` ikut
 * direkam karena Pedoman Teknis butir 2.2.2.15 menyebut standardisasi berat
 * badan ikut memengaruhi penetapan TPD.
 */
const KOLOM_IDENTITAS: KolomPasien[] = [
  { key: "kodePasien", label: "Kode Pasien", jenis: "text", identitas: true },
  { key: "nama", label: "Nama Pasien", jenis: "text", identitas: true },
  {
    key: "jenisKelamin",
    label: "Jenis Kelamin",
    jenis: "pilihan",
    opsi: ["L", "P"],
    identitas: true,
  },
  { key: "umur", label: "Umur", satuan: "tahun", jenis: "number" },
  { key: "beratBadan", label: "Berat Badan", satuan: "kg", jenis: "number" },
  { key: "jenisPemeriksaan", label: "Jenis Pemeriksaan", jenis: "pilihan" },
];

export function kolomPasien(
  modalitas: ModalitasAudit,
  metode: "indikator" | "estimasi",
): KolomPasien[] {
  if (modalitas === "ct-scan") {
    return [
      ...KOLOM_IDENTITAS,
      {
        key: "dosisIndikator",
        label: "CTDIvol",
        satuan: "mGy — rerata serial",
        jenis: "number",
      },
      { key: "dlp", label: "DLP", satuan: "mGy.cm — total serial", jenis: "number" },
    ];
  }

  if (metode === "indikator") {
    return [
      ...KOLOM_IDENTITAS,
      {
        key: "dosisIndikator",
        label: "ESAK / Skin Dose",
        satuan: "mGy — dari konsol",
        jenis: "number",
      },
      {
        key: "inak",
        label: "INAK",
        satuan: "mGy",
        jenis: "hitung",
        hitung: (h) => h.inak,
        desimal: 3,
      },
    ];
  }

  // Jalur B — estimasi dari keluaran radiasi.
  return [
    ...KOLOM_IDENTITAS,
    { key: "kv", label: "kV", jenis: "number" },
    { key: "mas", label: "mAs", jenis: "number" },
    { key: "tebalPasien", label: "Tebal Pasien", satuan: "cm", jenis: "number" },
    { key: "fsd", label: "FSD", satuan: "cm", jenis: "number" },
    {
      key: "keluaran",
      label: "Y(kV)",
      satuan: "mGy/mAs",
      jenis: "hitung",
      hitung: (h) => h.keluaran,
      desimal: 4,
    },
    {
      key: "inak",
      label: "INAK",
      satuan: "mGy",
      jenis: "hitung",
      hitung: (h) => h.inak,
      desimal: 3,
    },
    {
      key: "esak",
      label: "ESAK",
      satuan: "mGy",
      jenis: "hitung",
      hitung: (h) => h.esak,
      desimal: 3,
    },
  ];
}
