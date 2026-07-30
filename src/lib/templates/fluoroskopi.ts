import {
  fmt,
  hvlMinimum,
  kesalahanRelatif,
  num,
  persenSID,
  selisihPersenSID,
} from "@/lib/calc";
import type { KonfGrup, Seksi, Verdict } from "./types";

/**
 * Bagian yang sama antara Angiografi/Cath Lab dan C-Arm — keduanya memakai
 * metode kerja MK-PRUK-05 dan struktur laporan yang identik pada dokumen
 * sumber. C-Arm menambahkan blok khusus di file templatenya sendiri.
 */

export const lolosJika = (ok: boolean | null): Verdict =>
  ok === null ? "na" : ok ? "lolos" : "tidak-lolos";

export function konfigurasiFluoroskopi(): KonfGrup[] {
  return [
    {
      id: "pesawat",
      judul: "Konfigurasi Pesawat",
      fields: [
        { key: "jenisPesawat", label: "Jenis Pesawat", jenis: "pilihan", opsi: ["stasioner", "mobile"] },
        { key: "stasioner", label: "Pesawat Stasioner", jenis: "pilihan", opsi: ["tabung di atas", "tabung di bawah"] },
        { key: "mobile", label: "Pesawat Mobile", jenis: "pilihan", opsi: ["C-arm", "U-arm"] },
        { key: "focalMeja", label: "Focal Spot – Permukaan Meja", jenis: "text", satuan: "mm" },
        { key: "sid", label: "SID", jenis: "text", satuan: "mm" },
        { key: "ssd", label: "SSD (tebal pasien 30 cm)", jenis: "text", satuan: "mm" },
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
          opsi: ["1 pulsa", "2 pulsa", "6/12 pulsa", "med/HF"],
        },
        { key: "gen_kapasitasF", label: "Kapasitas Maksimum (Fluoroskopi)", jenis: "text", placeholder: "120 kVp / 62.5 mA" },
        { key: "gen_kapasitasR", label: "Kapasitas Maksimum (Radiografi)", jenis: "text", placeholder: "- kVp / - mAs" },
        { key: "gen_jumlahTabung", label: "Jumlah Tabung", jenis: "text" },
        { key: "gen_alarm", label: "Alarm Penyinaran", jenis: "multi", opsi: ["audio", "visual"] },
        { key: "gen_tombol", label: "Tombol Penyinaran", jenis: "pilihan", opsi: ["deadman", "dengan tangan"] },
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
      id: "kolimator",
      judul: "Kolimator Berkas Cahaya (LBC)",
      fields: [
        { key: "lbc_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "lbc_model", label: "Model/Tipe", jenis: "text" },
        { key: "lbc_seri", label: "No. Seri", jenis: "text" },
        { key: "lbc_filter", label: "Filter Ekuivalen", jenis: "text" },
        { key: "lbc_ganda", label: "Kolimator Ganda", jenis: "pilihan", opsi: ["tersedia", "tidak tersedia"] },
        { key: "lbc_sidVariasi", label: "SID Bervariasi", jenis: "pilihan", opsi: ["tersedia", "tidak tersedia"] },
      ],
    },
    {
      id: "image-receptor",
      judul: "Tabung Image Receptor",
      fields: [
        { key: "ir_jenis", label: "Jenis Receptor", jenis: "pilihan", opsi: ["Penguat Citra (II)", "Detektor DR"] },
        { key: "ir_merk", label: "Pabrikan/Merk", jenis: "text" },
        { key: "ir_model", label: "Model/Tipe", jenis: "text" },
        { key: "ir_ukuran", label: "Ukuran Lapangan", jenis: "text", satuan: "cm" },
        { key: "ir_grid", label: "Grid", jenis: "text", placeholder: "rasio / fokus / resolusi line/cm" },
      ],
    },
    {
      id: "pencitraan-fluoro",
      judul: "Sistem Pencitraan Fluoroskopi",
      fields: [
        {
          key: "fitur",
          label: "Fitur yang Tersedia",
          jenis: "multi",
          opsi: ["mode pulsa", "penahan citra akhir", "kamera cine", "akuisisi digital"],
        },
        { key: "sistemPencitraan", label: "Sistem Pencitraan", jenis: "pilihan", opsi: ["CR", "DR", "Film"] },
      ],
    },
  ];
}

/** A. Kolimasi Berkas Cahaya + C. Sistem Pencitraan Fluoroskopik. PRD A.3.1 */
export function seksiKolimasiFluoroskopi(): Seksi {
  return {
    id: "kolimasi",
    judul: "A. Kolimasi Berkas Cahaya",
    blok: [
      {
        id: "kolimasi-ii",
        judul:
          "Selisih Tepi Lapangan Berkas Sinar-X dengan Tepi Lapangan Permukaan II Maksimum",
        catatan: "Δ (%) = (Ø berkas sinar-X − Ø II) / SID × 100, diukur pada SID maksimum.",
        metaFields: [{ key: "sid", label: "SID", satuan: "cm", jenis: "number", lebar: "10rem" }],
        modeBaris: "tetap",
        kolom: [
          { key: "_label", label: "Parameter", jenis: "label", lebar: "34%" },
          { key: "oII", label: "Ø II", satuan: "cm", jenis: "number" },
          { key: "oBerkas", label: "Ø Berkas Sinar-X", satuan: "cm", jenis: "number" },
          {
            key: "delta",
            label: "Δ",
            satuan: "%",
            jenis: "hitung",
            desimal: 1,
            akhiran: " %",
            hitung: (b, ctx) =>
              selisihPersenSID(num(b.oBerkas), num(b.oII), num(ctx.meta.sid)),
          },
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.10" },
        ],
        baris: [{ key: "selisih", label: "Selisih tepi lapangan (Δ)" }],
        toleransi: "Δ ≤ 1.5 % SID",
        evaluasi: (b, ctx) => {
          const d = selisihPersenSID(num(b.oBerkas), num(b.oII), num(ctx.meta.sid));
          return lolosJika(d === null ? null : Math.abs(d) <= 1.5);
        },
      },
      {
        id: "kolimasi-monitor",
        judul: "Jarak Pusat Citra di Monitor dengan Pusat II",
        metaFields: [{ key: "sid", label: "SID", satuan: "cm", jenis: "number", lebar: "10rem" }],
        modeBaris: "tetap",
        kolom: [
          { key: "_label", label: "Parameter", jenis: "label", lebar: "40%" },
          { key: "jarak", label: "Hasil Uji", satuan: "cm", jenis: "number" },
          {
            key: "delta",
            label: "Δ",
            satuan: "%",
            jenis: "hitung",
            desimal: 1,
            akhiran: " %",
            hitung: (b, ctx) => persenSID(num(b.jarak), num(ctx.meta.sid)),
          },
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.10" },
        ],
        baris: [{ key: "pusat", label: "Penyimpangan pusat citra di monitor (Δ)" }],
        toleransi: "Δ ≤ 1 % SID",
        evaluasi: (b, ctx) => {
          const d = persenSID(num(b.jarak), num(ctx.meta.sid));
          return lolosJika(d === null ? null : Math.abs(d) <= 1);
        },
      },
    ],
  };
}

/** B. Informasi Dosis Pasien — laju dosis permukaan kulit. PRD A.3.2 */
export function seksiDosisFluoroskopi(): Seksi {
  const BATAS: Record<string, number> = {
    normal: 50,
    tinggi: 100,
    tipikal: 17,
  };

  return {
    id: "dosis",
    judul: "B. Informasi Dosis Pasien",
    blok: [
      {
        id: "laju-dosis-kulit",
        judul: "Laju Dosis Permukaan Kulit",
        catatan:
          "Pembacaan langsung dosimeter dengan slab phantom pada posisi pasien — " +
          "sistem hanya mengevaluasi terhadap batas, tidak menghitung.",
        modeBaris: "tetap",
        kolom: [
          { key: "_label", label: "Mode", jenis: "label", lebar: "30%" },
          { key: "kv", label: "kV", jenis: "number" },
          { key: "ma", label: "mA", jenis: "number" },
          { key: "laju", label: "Laju Dosis", satuan: "mGy/menit", jenis: "number" },
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 1.70 %" },
        ],
        baris: [
          { key: "normal", label: "Laju dosis maks — mode dosis normal" },
          { key: "tinggi", label: "Laju dosis maks — mode dosis tinggi" },
          { key: "tipikal", label: "Laju dosis tipikal pasien" },
        ],
        toleransi: (b) => {
          const batas = BATAS[b._key];
          const nama = b._key === "tipikal" ? "D tipikal" : "D maks";
          return batas ? `${nama} ≤ ${batas} mGy/menit` : "-";
        },
        evaluasi: (b) => {
          const v = num(b.laju);
          const batas = BATAS[b._key];
          if (v === null || batas === undefined) return "na";
          return lolosJika(v <= batas);
        },
      },
    ],
  };
}

/** C. Sistem Pencitraan Fluoroskopik — kesesuaian lapangan berkas dengan monitor. */
export function seksiPencitraanFluoroskopi(): Seksi {
  return {
    id: "pencitraan",
    judul: "C. Sistem Pencitraan Fluoroskopik",
    blok: [
      {
        id: "lapangan-monitor",
        judul: "Kesesuaian Lapangan Berkas dengan Monitor",
        metaFields: [{ key: "sid", label: "SID", satuan: "cm", jenis: "number", lebar: "10rem" }],
        modeBaris: "tetap",
        kolom: [
          { key: "_label", label: "Parameter", jenis: "label", lebar: "32%" },
          { key: "xray", label: "Ø Lapangan X-Ray", satuan: "cm", jenis: "number" },
          { key: "display", label: "Ø Display", satuan: "cm", jenis: "number" },
          {
            key: "delta",
            label: "Δ",
            satuan: "%",
            jenis: "hitung",
            desimal: 1,
            akhiran: " %",
            hitung: (b, ctx) =>
              selisihPersenSID(num(b.xray), num(b.display), num(ctx.meta.sid)),
          },
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.10" },
        ],
        baris: [{ key: "selisih", label: "Selisih area sinar-X dengan display (Δ)" }],
        toleransi: "Δ ≤ ± 1.5 %",
        evaluasi: (b, ctx) => {
          const d = selisihPersenSID(num(b.xray), num(b.display), num(ctx.meta.sid));
          return lolosJika(d === null ? null : Math.abs(d) <= 1.5);
        },
      },
    ],
  };
}

/** D. Generator dan Tabung Sinar-X — akurasi tegangan multi-titik + HVL. */
export function seksiGeneratorFluoroskopi(): Seksi {
  return {
    id: "generator",
    judul: "D. Generator dan Tabung Sinar-X",
    blok: [
      {
        id: "akurasi-tegangan",
        judul: "Akurasi Tegangan Tabung",
        catatan:
          "Pada mode fluoroskopi mA umumnya mengikuti pengaturan otomatis, " +
          "sehingga mA dicatat per titik pengukuran.",
        metaFields: [{ key: "setS", label: "Set s", jenis: "text", placeholder: "auto" }],
        modeBaris: "dinamis",
        barisAwalDinamis: 6,
        barisBaru: { setMa: "", kvpSet: "", kvpTerukur: "", ketidakpastian: "" },
        kolom: [
          { key: "setMa", label: "Set mA", jenis: "number" },
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
          { key: "ketidakpastian", label: "Ketidakpastian Pengukuran", jenis: "text", placeholder: "± 0.40" },
        ],
        toleransi: "e ≤ ± 10 %",
        evaluasi: (b) => {
          const e = kesalahanRelatif(num(b.kvpTerukur), num(b.kvpSet));
          return lolosJika(e === null ? null : Math.abs(e) <= 10);
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
          { key: "kv", label: "Setting kV", jenis: "number" },
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
  };
}
