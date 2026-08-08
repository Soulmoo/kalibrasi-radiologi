/**
 * Data contoh untuk mencoba aplikasi.
 *
 * Angka diambil dari dua dokumen referensi BPAFK Surabaya (Radiografi Mobile
 * I/UK/B-01 dan CT-Scan I/PK/C-01) agar hasil kalkulasi sistem bisa langsung
 * dibandingkan dengan angka di dokumen aslinya (PRD Fase 0 — validasi rumus).
 *
 * Jalankan: npm run db:seed
 * Akun contoh: fismed@contoh.local / kalibrasi123
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const tgl = (s: string) => new Date(`${s}T00:00:00`);

async function main() {
  const email = "fismed@contoh.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nama: "Sayyid Al Hakim",
      gelar: "S.Si",
      passwordHash: await hash("kalibrasi123", 10),
    },
  });

  // Bersihkan data contoh lama supaya seed bisa dijalankan berulang.
  const lama = await prisma.instansi.findFirst({
    where: { namaInstansi: "PT. Affinity Health Indonesia" },
  });
  if (lama) {
    await prisma.laporan.deleteMany({ where: { instansiId: lama.id } });
    await prisma.alatRadiologi.deleteMany({ where: { instansiId: lama.id } });
    await prisma.instansi.delete({ where: { id: lama.id } });
  }

  const instansi = await prisma.instansi.create({
    data: {
      namaInstansi: "PT. Affinity Health Indonesia",
      namaFasilitas: "RS Premier Surabaya",
      identitasPemilik: "Swasta",
      alamat: "Jalan Nginden Intan Barat Blok B",
      kota: "Surabaya",
      provinsi: "Jawa Timur",
      telepon: "031 - 5993211",
      email: "rspremier.surabaya@ramsayhealth.co.id",
      nib: "8120018132183",
      nomorIzinPesawat: "07235.384.3.250725",
      namaPPR: "Nabilla Widya Wardhani",
      noSIB: "459436.223.20.270225",
      createdById: user.id,
    },
  });

  /* ---------------- Registry alat ukur ---------------- */

  const alatUkurData = [
    { nama: "Collimator Test Tool", merek: "RMI", modelTipe: "161B", noSeri: "161B-9602" },
    { nama: "Beam Alignment Test Tool", merek: "RMI", modelTipe: "162A", noSeri: "162A-8166" },
    {
      nama: "Thermohygrobarometer",
      merek: "Greisinger",
      modelTipe: "GFTB-200",
      noSeri: "34907002",
      masaKalibrasiSampai: tgl("2026-01-14"),
    },
    {
      nama: "Multimeter X-Ray",
      merek: "RTI",
      modelTipe: "Piranha",
      noSeri: "Cb2-10111168",
      tertelusurKe: "SWEDAC",
      masaKalibrasiSampai: tgl("2026-08-12"),
    },
    { nama: "CTDI Head Phantom", merek: "Leeds Test Object", modelTipe: "TO CTDI Head", noSeri: "5512H4" },
    { nama: "Quality Image Phantom", merek: "GE" },
    {
      nama: "Multimeter X-Ray Raysafe",
      merek: "Raysafe",
      modelTipe: "X2 R/F",
      noSeri: "267108",
      tertelusurKe: "SWEDAC",
      masaKalibrasiSampai: tgl("2027-04-15"),
    },
    {
      nama: "Detektor Pensil",
      merek: "Raysafe",
      modelTipe: "X2 CT",
      noSeri: "269543",
      tertelusurKe: "SWEDAC",
      masaKalibrasiSampai: tgl("2027-04-15"),
    },
    { nama: "Meteran", merek: "ATS", modelTipe: "5m", noSeri: "5m" },
    { nama: "Penggaris", merek: "PEC Tools" },
    { nama: "Scalling Errors (M1) Test Tool", merek: "Leeds Test Object" },
    { nama: "Slab Phantom Abdomen", merek: "Cirs" },
    { nama: "Phantom Image ACR", merek: "CIRS" },
    {
      nama: "Multimeter X-Ray Piranha",
      merek: "RTI",
      modelTipe: "Piranha",
      noSeri: "Cb2-10111195",
      tertelusurKe: "SWEDAC",
      masaKalibrasiSampai: tgl("2026-05-17"),
    },
    {
      nama: "Dose Probe",
      merek: "RTI",
      modelTipe: "Piranha",
      noSeri: "1010090",
      tertelusurKe: "SWEDAC",
      masaKalibrasiSampai: tgl("2026-08-14"),
    },
  ];

  const alatUkur: Record<string, string> = {};
  for (const a of alatUkurData) {
    const ada = await prisma.alatUkur.findFirst({ where: { nama: a.nama } });
    const rec = ada
      ? await prisma.alatUkur.update({ where: { id: ada.id }, data: a })
      : await prisma.alatUkur.create({ data: { ...a, createdById: user.id } });
    alatUkur[a.nama] = rec.id;
  }

  /* ---------------- Alat: Radiografi Mobile ---------------- */

  const mobile = await prisma.alatRadiologi.create({
    data: {
      instansiId: instansi.id,
      jenisAlat: "radiografi-mobile",
      namaAlat: "MobileDiagnost wDR — R. Cito Bed",
      lokasiUnit: "R. Cito Bed",
      merk: "PHILIPS",
      model: "MobileDiagnost wDR",
      noSeri: "21410041",
      tahunProduksi: "2020",
      createdById: user.id,
      konfigurasi: JSON.stringify({
        it_merk: "Canon",
        it_model: "E7865",
        it_seri: "0L0507",
        it_tahun: "2020",
        it_focal: "kecil 0.3 mm / besar 1.0 mm",
        it_kapasitas: "- mA pada 150 kVp",
        th_merk: "Canon",
        th_model: "E7865X",
        th_seri: "20L1289",
        th_tahun: "2020",
        th_filter: "1.3 mmAl pada 75 kVp",
        th_penanda: "ada",
        gen_merk: "PHILIPS",
        gen_model: "MobileDiagnost wDR",
        gen_seri: "21410041",
        gen_tahun: "2020",
        gen_tipe: "Med/HF",
        gen_kapasitas: "125 kVp / 400 mA / 2.5 s",
        gen_maKontinu: "4.0 mA",
        gen_alarm: ["audio", "visual"],
        gen_tombol: "kabel",
        unit_merk: "PHILIPS",
        unit_model: "MobileDiagnost wDR",
        unit_seri: "21410041",
        unit_tahun: "2020",
        lbc_merk: "Ralco",
        lbc_model: "R 221/A DHHS",
        lbc_seri: "2022102",
        lbc_filter: "2.0",
        lbc_sidMin: "30",
        aec: "tidak tersedia",
        settingMa: "mA/s",
        sistemPencitraan: "DR",
      }),
    },
  });

  const hasilMobile = {
    "kondisi-lingkungan": {
      meta: {},
      rows: [
        { _key: "suhu", hasil: "23.20", satuan: "ᴼC", ketidakpastian: "± 0.0" },
        { _key: "kelembaban", hasil: "56.40", satuan: "% RH", ketidakpastian: "± 0.0" },
        { _key: "tekanan", hasil: "1005.00", satuan: "mb", ketidakpastian: "± 0.0" },
      ],
    },
    "kolimasi-selisih": {
      meta: { sid: "100" },
      rows: [
        { _key: "x", eksak: "24.0", terukur: "25.2" },
        { _key: "y", eksak: "30.0", terukur: "31.5" },
      ],
    },
    "kolimasi-alignment": { meta: {}, rows: [{ _key: "theta", theta: "1.9" }] },
    "kolimasi-iluminasi": {
      meta: {},
      rows: [{ _key: "ilum", sdd: "100", iluminasi: "210", ketidakpastian: "± 0.6 lux" }],
    },
    "akurasi-tegangan": {
      meta: { setMa: "200", setS: "0.1" },
      rows: [
        { _key: "r1", kvpSet: "50", kvpTerukur: "48.2", ketidakpastian: "± 0.3", dosis: "0.23" },
        { _key: "r2", kvpSet: "60", kvpTerukur: "58.4", ketidakpastian: "± 0.3", dosis: "0.37" },
        { _key: "r3", kvpSet: "70", kvpTerukur: "68.6", ketidakpastian: "± 0.4", dosis: "0.53" },
        { _key: "r4", kvpSet: "80", kvpTerukur: "78.6", ketidakpastian: "± 0.9", dosis: "0.71" },
        { _key: "r5", kvpSet: "90", kvpTerukur: "89.8", ketidakpastian: "± 1.5", dosis: "0.91" },
        { _key: "r6", kvpSet: "100", kvpTerukur: "99.1", ketidakpastian: "± 2.2", dosis: "1.11" },
      ],
    },
    "akurasi-waktu": {
      meta: { setMa: "100", setKv: "70" },
      rows: [
        { _key: "r1", sSet: "0.05", msTerukur: "49.7", ketidakpastian: "± 0.0%" },
        { _key: "r2", sSet: "0.1", msTerukur: "99.4", ketidakpastian: "± 0.0%" },
        { _key: "r3", sSet: "0.2", msTerukur: "199.7", ketidakpastian: "± 0.0%" },
        { _key: "r4", sSet: "0.4", msTerukur: "399.5", ketidakpastian: "± 0.0%" },
        { _key: "r5", sSet: "0.5", msTerukur: "499.4", ketidakpastian: "± 0.0%" },
      ],
    },
    linearitas: {
      meta: { fokus: "Besar", kv: "70" },
      rows: [
        { _key: "r1", ma: "100", mas: "10", dosis: "0.26" },
        { _key: "r2", ma: "200", mas: "20", dosis: "0.53" },
        { _key: "r3", ma: "400", mas: "40", dosis: "1.05" },
      ],
    },
    reprodusibilitas: {
      meta: { kv: "70", s: "0.1", ma: "200" },
      rows: [
        { _key: "kvp", m1: "68.65", m2: "68.72", m3: "68.75", m4: "68.71", m5: "68.72" },
        { _key: "waktu", m1: "0.0998", m2: "0.1000", m3: "0.1002", m4: "0.1000", m5: "0.0999" },
        { _key: "output", m1: "0.529", m2: "0.530", m3: "0.531", m4: "0.530", m5: "0.531" },
      ],
    },
    hvl: {
      meta: {},
      rows: [
        { _key: "r1", kv: "70", hvl: "2.90", batas: "", ketidakpastian: "± 0.00%" },
        { _key: "r2", kv: "80", hvl: "3.37", batas: "", ketidakpastian: "± 0.00%" },
      ],
    },
    kebocoran: { meta: {}, rows: [{ _key: "bocor", hasil: "", kondisi: "Tidak dilakukan" }] },
    "dosis-pasien": {
      meta: {},
      rows: [
        { _key: "r1", objek: "Thorax", kvp: "53", mas: "10", jarak: "100", kerma: "0.09", ketidakpastian: "± 1.7" },
        { _key: "r2", objek: "Abdomen", kvp: "73", mas: "20", jarak: "100", kerma: "0.77", ketidakpastian: "± 1.7" },
      ],
    },
  };

  const laporanMobile = await prisma.laporan.create({
    data: {
      jenisAlat: "radiografi-mobile",
      nomorLaporan: "I/PK/B-01/VIII/25",
      nomorOrder: "E-138 PRUK",
      instansiId: instansi.id,
      alatRadiologiId: mobile.id,
      userId: user.id,
      tanggalUji: tgl("2025-08-11"),
      tanggalTerbit: tgl("2025-08-22"),
      lokasiUji: "R. Cito Bed",
      metodeKerja: "MK-PRUK-02-rev-07",
      konfigurasiSnapshot: mobile.konfigurasi,
      hasilUji: JSON.stringify(hasilMobile),
      kesimpulan:
        "Pesawat Sinar-X Radiografi Mobile dinyatakan Laik Pakai untuk parameter uji di atas.",
      catatan: "-",
      rekomendasi:
        "Harap melakukan kalibrasi ulang setiap tahun sekali.\n(Permenkes No. 54 tahun 2015 tentang pengujian dan kalibrasi alat kesehatan)",
      status: "selesai",
    },
  });

  await prisma.laporanAlatUkur.createMany({
    data: [
      "Collimator Test Tool",
      "Beam Alignment Test Tool",
      "Thermohygrobarometer",
      "Multimeter X-Ray",
    ].map((n, urutan) => ({
      laporanId: laporanMobile.id,
      alatUkurId: alatUkur[n],
      urutan,
    })),
  });

  /* ---------------- Alat: CT-Scan ---------------- */

  const ct = await prisma.alatRadiologi.create({
    data: {
      instansiId: instansi.id,
      jenisAlat: "ct-scan",
      namaAlat: "GE Revolution Apex — Ruang CT-Scan",
      lokasiUnit: "Ruang CT-Scan",
      merk: "GE",
      model: "Revolution Apex",
      noSeri: "REV2A2200095CN",
      createdById: user.id,
      konfigurasi: JSON.stringify({
        sc_merk: "GE",
        sc_model: "Revolution Apex",
        sc_seri: "REV2A2200095CN",
        sc_tipe: "rotasi/translasi",
        sc_matrik: "512 x 512",
        sc_detektor: "solid",
        sc_spiral: "ya",
        gen_merk: "GE",
        gen_model: "5590000-20",
        gen_seri: "REV2A2200095CN",
        gen_pulsa: "HF",
        gen_kapasitas: "140 kVp / 440 mA / 1 s",
        gen_alarm: ["audio", "visual"],
        th_merk: "GE",
        th_model: "Quantix 160 (5723000)",
        th_seri: "85855GM5",
        th_filter: "3.9",
        it_merk: "GE",
        it_model: "Quantix 160 (5723500)",
        it_seri: "249677GI6",
        it_kapasitas: "140 kV",
      }),
    },
  });

  const hasilCt = {
    "kondisi-lingkungan": {
      meta: {},
      rows: [
        { _key: "suhu", hasil: "22.00", satuan: "ᴼC", ketidakpastian: "± 0.0" },
        { _key: "kelembaban", hasil: "55.00", satuan: "% RH", ketidakpastian: "± 0.0" },
        { _key: "tekanan", hasil: "", satuan: "mb", ketidakpastian: "-" },
      ],
    },
    "akurasi-tegangan": {
      meta: { setMa: "80", setS: "" },
      rows: [
        { _key: "r1", kvpSet: "80", kvpTerukur: "80.0", ketidakpastian: "± 1.3 %" },
        { _key: "r2", kvpSet: "100", kvpTerukur: "100.9", ketidakpastian: "± 1.3 %" },
        { _key: "r3", kvpSet: "120", kvpTerukur: "120.7", ketidakpastian: "± 1.3 %" },
        { _key: "r4", kvpSet: "140", kvpTerukur: "140.2", ketidakpastian: "± 1.3 %" },
      ],
    },
    "keluaran-akurasi": {
      meta: {},
      rows: [
        {
          _key: "r1",
          kvp: "120",
          tebalIrisan: "5",
          dosis: "71.40",
          mas: "200",
          ketidakpastian: "± 2.6 %",
          batas: "45",
        },
      ],
    },
    "keluaran-linieritas": {
      meta: { kv: "120", s: "1" },
      rows: [
        { _key: "r1", mas: "100", dosis: "35.70" },
        { _key: "r2", mas: "200", dosis: "71.40" },
        { _key: "r3", mas: "300", dosis: "107.10" },
      ],
    },
    "keluaran-reprodusibilitas": {
      meta: { kv: "120", ma: "200", s: "1.0" },
      rows: [
        { _key: "output", m1: "71.30", m2: "71.40", m3: "71.45", m4: "71.38", m5: "71.42" },
      ],
    },
    hvl: {
      meta: {},
      rows: [{ _key: "r1", kv: "120", hvl: "7.34", batas: "3.8", ketidakpastian: "± 3.40 %" }],
    },
    "ctdi-pengukuran": {
      meta: { pitch: "1" },
      rows: [
        { _key: "pusat", nilai: "" },
        { _key: "tepi12", nilai: "" },
        { _key: "tepi3", nilai: "" },
        { _key: "tepi6", nilai: "" },
        { _key: "tepi9", nilai: "" },
      ],
    },
    "ctdi-deviasi": {
      meta: {},
      rows: [
        {
          _key: "r1",
          protokol: "Dosimetri Kepala Rutin",
          kv: "120",
          mas: "200",
          s: "1",
          tebalIrisan: "5",
          jumlahImage: "1",
          consul: "45.69",
          terukur: "48.05",
        },
      ],
    },
    "kualitas-citra-roi": {
      meta: { kv: "120", mas: "300", tebalIrisan: "5" },
      rows: [
        { _key: "pusat", ct: "-0.10", noise: "4.30" },
        { _key: "atas", ct: "1.54", noise: "4.20" },
        { _key: "bawah", ct: "0.85", noise: "4.35" },
        { _key: "kiri", ct: "-0.62", noise: "4.60" },
        { _key: "kanan", ct: "1.10", noise: "4.30" },
      ],
    },
  };

  const laporanCt = await prisma.laporan.create({
    data: {
      jenisAlat: "ct-scan",
      nomorLaporan: "I/PK/C-01/VIII/25",
      nomorOrder: "E-138 PRUK",
      instansiId: instansi.id,
      alatRadiologiId: ct.id,
      userId: user.id,
      tanggalUji: tgl("2025-08-11"),
      tanggalTerbit: tgl("2025-08-22"),
      lokasiUji: "Ruang CT-Scan",
      metodeKerja: "MK-PRUK-06-rev-05",
      konfigurasiSnapshot: ct.konfigurasi,
      hasilUji: JSON.stringify(hasilCt),
      kesimpulan: "Pesawat Sinar-X CT-Scan dinyatakan Laik Pakai untuk parameter uji di atas.",
      catatan: "-",
      rekomendasi:
        "Harap melakukan kalibrasi ulang setiap tahun sekali.\n(Permenkes No. 54 tahun 2015 tentang pengujian dan kalibrasi alat kesehatan)",
      status: "selesai",
    },
  });

  await prisma.laporanAlatUkur.createMany({
    data: [
      "CTDI Head Phantom",
      "Quality Image Phantom",
      "Thermohygrobarometer",
      "Multimeter X-Ray Raysafe",
      "Detektor Pensil",
    ].map((n, urutan) => ({ laporanId: laporanCt.id, alatUkurId: alatUkur[n], urutan })),
  });

  /* ---------------- Helper untuk 4 modalitas berikutnya ---------------- */

  async function buatLaporan(opts: {
    jenisAlat: string;
    namaAlat: string;
    lokasiUnit: string;
    merk: string;
    model: string;
    noSeri: string;
    tahunProduksi?: string;
    konfigurasi: Record<string, string | string[]>;
    nomorLaporan: string;
    tanggalUji: string;
    metodeKerja: string;
    hasilUji: unknown;
    kesimpulan: string;
    alatUkurDipakai: string[];
  }) {
    const alat = await prisma.alatRadiologi.create({
      data: {
        instansiId: instansi.id,
        jenisAlat: opts.jenisAlat,
        namaAlat: opts.namaAlat,
        lokasiUnit: opts.lokasiUnit,
        merk: opts.merk,
        model: opts.model,
        noSeri: opts.noSeri,
        tahunProduksi: opts.tahunProduksi ?? null,
        createdById: user.id,
        konfigurasi: JSON.stringify(opts.konfigurasi),
      },
    });

    const laporan = await prisma.laporan.create({
      data: {
        jenisAlat: opts.jenisAlat,
        nomorLaporan: opts.nomorLaporan,
        nomorOrder: "E-138 PRUK",
        instansiId: instansi.id,
        alatRadiologiId: alat.id,
        userId: user.id,
        tanggalUji: tgl(opts.tanggalUji),
        tanggalTerbit: tgl("2025-08-22"),
        lokasiUji: opts.lokasiUnit,
        metodeKerja: opts.metodeKerja,
        konfigurasiSnapshot: alat.konfigurasi,
        hasilUji: JSON.stringify(opts.hasilUji),
        kesimpulan: opts.kesimpulan,
        catatan: "-",
        rekomendasi:
          "Harap melakukan kalibrasi ulang setiap tahun sekali.\n(Permenkes No. 54 tahun 2015 tentang pengujian dan kalibrasi alat kesehatan)",
        status: "selesai",
      },
    });

    await prisma.laporanAlatUkur.createMany({
      data: opts.alatUkurDipakai
        .filter((n) => alatUkur[n])
        .map((n, urutan) => ({ laporanId: laporan.id, alatUkurId: alatUkur[n], urutan })),
    });
  }

  const lingkungan = (suhu: string, rh: string, tekanan: string) => ({
    meta: {},
    rows: [
      { _key: "suhu", hasil: suhu, satuan: "ᴼC", ketidakpastian: "± 0.0" },
      { _key: "kelembaban", hasil: rh, satuan: "% RH", ketidakpastian: "± 0.0" },
      { _key: "tekanan", hasil: tekanan, satuan: "mb", ketidakpastian: tekanan ? "± 0.0" : "-" },
    ],
  });

  /* ---------------- Gigi Panoramic & Cephalometric ---------------- */

  await buatLaporan({
    jenisAlat: "gigi-panoramic-cephalometric",
    namaAlat: "Planmeca ProMax 3D — R. Panoramic",
    lokasiUnit: "R. Panoramic",
    merk: "Planmeca OY",
    model: "ProMax 3D",
    noSeri: "TPXV7218967",
    tahunProduksi: "2023",
    nomorLaporan: "I/PK/D-01/VIII/25",
    tanggalUji: "2025-08-11",
    metodeKerja: "MK-PRUK-04-rev-06",
    konfigurasi: {
      gen_merk: "Planmeca OY",
      gen_model: "ProMax 3D",
      gen_seri: "TPXV7218967",
      gen_tahun: "2023",
      gen_tipe: "Med/HF",
      gen_kapasitas: "84 kVp / 16 mA / 10.5 s",
      gen_alarm: ["audio", "visual"],
      gen_tombol: "dengan kabel",
      gen_waktu: "timer elektronik",
      gen_suplai: "suplai terkoreksi",
      th_merk: "Planmeca OY",
      th_model: "Promax 3D",
      th_seri: "KPP19111954",
      th_filter: "2.5",
      th_focal: "diberi tanda",
      it_merk: "Canon (Planmeca)",
      it_model: "D-054SB",
      it_seri: "3E14050",
      it_focal: "0.5",
      it_kvpMax: "84",
      sistemPencitraan: "DR",
    },
    kesimpulan:
      "Pesawat Sinar-X Gigi Panoramic & Cephalometric dinyatakan Laik Pakai untuk parameter uji di atas.",
    alatUkurDipakai: ["Thermohygrobarometer", "Meteran", "Multimeter X-Ray Piranha", "Penggaris"],
    hasilUji: {
      "kondisi-lingkungan": lingkungan("19.10", "57.30", "1001.00"),
      "ceph-dimensi": {
        meta: {},
        rows: [
          { _key: "berkas", sisi1: "5.30", sisi2: "288.90" },
          { _key: "reseptor", sisi1: "6.00", sisi2: "292.00" },
        ],
      },
      "ceph-ssd": { meta: {}, rows: [{ _key: "ssd", ssd: "155" }] },
      "pano-dimensi": {
        meta: {},
        rows: [
          { _key: "berkasPasien", sisi1: "4.20", sisi2: "123.00" },
          { _key: "slit", sisi1: "6.00", sisi2: "146.00" },
          { _key: "berkasFilm", sisi1: "", sisi2: "99.70" },
          { _key: "film", sisi1: "", sisi2: "146.00" },
        ],
      },
      "kombinasi-interlock": { meta: {}, rows: [{ _key: "interlock", hasil: "Tersedia" }] },
      "akurasi-tegangan": {
        meta: { setMa: "8", setS: "10.5" },
        rows: [
          { _key: "r1", kvpSet: "60", kvpTerukur: "58.00", ketidakpastian: "± 0.30", dosis: "1.19" },
          { _key: "r2", kvpSet: "65", kvpTerukur: "62.60", ketidakpastian: "± 0.30", dosis: "1.44" },
          { _key: "r3", kvpSet: "70", kvpTerukur: "68.40", ketidakpastian: "± 0.40", dosis: "1.71" },
          { _key: "r4", kvpSet: "75", kvpTerukur: "73.20", ketidakpastian: "± 0.80", dosis: "1.99" },
          { _key: "r5", kvpSet: "80", kvpTerukur: "77.80", ketidakpastian: "± 0.90", dosis: "2.28" },
          { _key: "r6", kvpSet: "84", kvpTerukur: "81.40", ketidakpastian: "± 0.90", dosis: "2.53" },
        ],
      },
      "akurasi-waktu": {
        meta: { setMa: "8", setKv: "70" },
        rows: [{ _key: "r1", sSet: "10.5", sTerukur: "10.52", ketidakpastian: "± 0.00 %" }],
      },
      reprodusibilitas: {
        meta: { kv: "70", s: "10.5", ma: "8" },
        rows: [
          { _key: "kvp", m1: "68.15", m2: "68.18", m3: "68.20", m4: "68.19", m5: "68.18" },
          { _key: "waktu", m1: "10.52", m2: "10.52", m3: "10.53", m4: "10.52", m5: "10.52" },
          { _key: "dosis", m1: "1.71", m2: "1.71", m3: "1.72", m4: "1.71", m5: "1.71" },
        ],
      },
      hvl: {
        meta: {},
        rows: [
          { _key: "r1", kv: "70", hvl: "3.01", batas: "", ketidakpastian: "± 0.00 %" },
          { _key: "r2", kv: "80", hvl: "3.50", batas: "", ketidakpastian: "± 0.00 %" },
        ],
      },
    },
  });

  /* ---------------- Angiografi / Cath Lab ---------------- */

  const konfFluoro = (o: Record<string, string | string[]>) => ({
    gen_alarm: [],
    ...o,
  });

  await buatLaporan({
    jenisAlat: "angiografi",
    namaAlat: "GE Innova — R. Cathlab 2",
    lokasiUnit: "R. Cathlab 2",
    merk: "GE",
    model: "innova",
    noSeri: "216489GI5",
    tahunProduksi: "2012",
    nomorLaporan: "I/PK/F-03/VIII/25",
    tanggalUji: "2025-08-11",
    metodeKerja: "MK-PRUK-05-rev-04",
    konfigurasi: konfFluoro({
      jenisPesawat: "stasioner",
      stasioner: "tabung di bawah",
      focalMeja: "400",
      sid: "700",
      gen_merk: "GE",
      gen_model: "innova",
      gen_tahun: "2012",
      gen_tipe: "med/HF",
      gen_kapasitasF: "125 kVp / Auto mA",
      th_merk: "GE",
      th_model: "2216500-2",
      th_seri: "118961CX2",
      th_filter: "1",
      th_focal: "diberi tanda",
      it_merk: "GE",
      it_model: "2216450",
      it_seri: "216489GI5",
      it_focal: "0.3-0.6-1.0",
      it_kvpMax: "125",
      lbc_merk: "GE",
      lbc_model: "5245319",
      lbc_seri: "13319",
      lbc_sidVariasi: "tersedia",
      ir_jenis: "Detektor DR",
      ir_merk: "GE",
      ir_model: "AF DSA 01 II",
      ir_ukuran: "30",
      fitur: ["mode pulsa", "penahan citra akhir", "kamera cine", "akuisisi digital"],
      sistemPencitraan: "DR",
    }),
    kesimpulan: "Pesawat Sinar-X Angiografi dinyatakan Laik Pakai untuk parameter uji di atas.",
    alatUkurDipakai: [
      "Scalling Errors (M1) Test Tool",
      "Meteran",
      "Slab Phantom Abdomen",
      "Thermohygrobarometer",
      "Multimeter X-Ray Piranha",
      "Dose Probe",
      "Penggaris",
    ],
    hasilUji: {
      "kondisi-lingkungan": lingkungan("20.00", "55.00", "1001.00"),
      "kolimasi-ii": {
        meta: { sid: "100" },
        rows: [{ _key: "selisih", oII: "30.00", oBerkas: "29.02", ketidakpastian: "± 0.10" }],
      },
      "kolimasi-monitor": {
        meta: { sid: "100" },
        rows: [{ _key: "pusat", jarak: "0.20", ketidakpastian: "± 0.10" }],
      },
      "laju-dosis-kulit": {
        meta: {},
        rows: [
          { _key: "normal", kv: "120", ma: "5.90", laju: "44.06", ketidakpastian: "± 1.70 %" },
          { _key: "tinggi", kv: "120", ma: "10.20", laju: "92.14", ketidakpastian: "± 1.70 %" },
          { _key: "tipikal", kv: "80", ma: "0.90", laju: "1.56", ketidakpastian: "± 1.70 %" },
        ],
      },
      "lapangan-monitor": {
        meta: { sid: "100" },
        rows: [{ _key: "selisih", xray: "29.00", display: "28.80", ketidakpastian: "± 0.10" }],
      },
      "akurasi-tegangan": {
        meta: { setS: "auto" },
        rows: [
          { _key: "r1", setMa: "0.10", kvpSet: "72", kvpTerukur: "71.80", ketidakpastian: "± 0.40" },
          { _key: "r2", setMa: "0.70", kvpSet: "79", kvpTerukur: "79.40", ketidakpastian: "± 0.40" },
          { _key: "r3", setMa: "4.50", kvpSet: "81", kvpTerukur: "81.90", ketidakpastian: "± 0.40" },
          { _key: "r4", setMa: "5.70", kvpSet: "84", kvpTerukur: "84.00", ketidakpastian: "± 0.90" },
          { _key: "r5", setMa: "13.70", kvpSet: "88", kvpTerukur: "88.90", ketidakpastian: "± 1.50" },
          { _key: "r6", setMa: "5.90", kvpSet: "120", kvpTerukur: "121.50", ketidakpastian: "± 2.70" },
        ],
      },
      hvl: {
        meta: {},
        rows: [
          { _key: "r1", kv: "70", hvl: "6.52", batas: "", ketidakpastian: "± 0.00 %" },
          { _key: "r2", kv: "80", hvl: "6.55", batas: "", ketidakpastian: "± 0.00 %" },
        ],
      },
    },
  });

  /* ---------------- C-Arm ---------------- */

  await buatLaporan({
    jenisAlat: "c-arm",
    namaAlat: "Ziehm Vision RFD 3D — R. OK",
    lokasiUnit: "R. OK",
    merk: "Ziehm Imaging",
    model: "Ziehm Vision RFD 3D",
    noSeri: "23039",
    tahunProduksi: "2021",
    nomorLaporan: "I/PK/F-01/VIII/25",
    tanggalUji: "2025-08-11",
    metodeKerja: "MK-PRUK-05-rev-04",
    konfigurasi: konfFluoro({
      jenisPesawat: "mobile",
      mobile: "C-arm",
      sid: "700",
      ssd: "200",
      gen_merk: "Ziehm Imaging",
      gen_model: "Ziehm Vision RFD 3D",
      gen_seri: "23039",
      gen_tahun: "2021",
      gen_tipe: "med/HF",
      gen_kapasitasF: "120 kVp / 62.5 mA",
      gen_jumlahTabung: "1",
      gen_alarm: ["audio", "visual"],
      gen_tombol: "dengan tangan",
      th_merk: "Ziehm Imaging",
      th_model: "RAD-15",
      th_seri: "53870",
      th_filter: "4.3",
      th_focal: "diberi tanda",
      it_merk: "Ziehm Imaging",
      it_model: "RAD-15",
      it_seri: "40994-1S",
      it_focal: "0.3/0.6",
      it_kvpMax: "120",
      ir_jenis: "Detektor DR",
      ir_merk: "Ziehm Imaging",
      ir_model: "FPD 12 inch x 12 inch",
      ir_ukuran: "30.48",
      fitur: ["mode pulsa", "penahan citra akhir"],
      sistemPencitraan: "DR",
    }),
    kesimpulan: "Pesawat Sinar-X C-Arm dinyatakan Laik Pakai untuk parameter uji di atas.",
    alatUkurDipakai: [
      "Scalling Errors (M1) Test Tool",
      "Meteran",
      "Slab Phantom Abdomen",
      "Thermohygrobarometer",
      "Multimeter X-Ray Piranha",
      "Dose Probe",
      "Penggaris",
    ],
    hasilUji: {
      "kondisi-lingkungan": lingkungan("20.00", "55.00", "1001.00"),
      "kolimasi-ii": {
        meta: { sid: "111" },
        rows: [{ _key: "selisih", oII: "30.50", oBerkas: "30.67", ketidakpastian: "± 0.10" }],
      },
      "kolimasi-monitor": {
        meta: { sid: "111" },
        rows: [{ _key: "pusat", jarak: "0.10", ketidakpastian: "± 0.10" }],
      },
      "laju-dosis-kulit": {
        meta: {},
        rows: [
          { _key: "normal", kv: "120", ma: "8.80", laju: "25.46", ketidakpastian: "± 1.70 %" },
          { _key: "tinggi", kv: "120", ma: "62.50", laju: "86.04", ketidakpastian: "± 1.70 %" },
          { _key: "tipikal", kv: "66", ma: "8.80", laju: "3.48", ketidakpastian: "± 1.70 %" },
        ],
      },
      "lapangan-monitor": {
        meta: { sid: "111" },
        rows: [{ _key: "selisih", xray: "30.70", display: "30.20", ketidakpastian: "± 0.10" }],
      },
      "akurasi-tegangan": {
        meta: { setS: "auto" },
        rows: [
          { _key: "r1", setMa: "4", kvpSet: "60", kvpTerukur: "60.10", ketidakpastian: "± 0.30" },
          { _key: "r2", setMa: "4", kvpSet: "70", kvpTerukur: "71.10", ketidakpastian: "± 0.40" },
          { _key: "r3", setMa: "4", kvpSet: "80", kvpTerukur: "78.60", ketidakpastian: "± 0.40" },
          { _key: "r4", setMa: "4", kvpSet: "90", kvpTerukur: "88.90", ketidakpastian: "± 1.00" },
          { _key: "r5", setMa: "4", kvpSet: "100", kvpTerukur: "98.70", ketidakpastian: "± 1.60" },
          { _key: "r6", setMa: "4", kvpSet: "120", kvpTerukur: "119.50", ketidakpastian: "± 2.60" },
        ],
      },
      hvl: {
        meta: {},
        rows: [
          { _key: "r1", kv: "70", hvl: "2.69", batas: "", ketidakpastian: "± 0.00 %" },
          { _key: "r2", kv: "80", hvl: "5.31", batas: "", ketidakpastian: "± 0.00 %" },
        ],
      },
    },
  });

  /* ---------------- MRI ---------------- */

  await buatLaporan({
    jenisAlat: "mri",
    namaAlat: "Philips Ingenia 3T — Ruang MRI",
    lokasiUnit: "Ruang MRI (Radiologi pusat)",
    merk: "Philips",
    model: "INGENIA",
    noSeri: "-",
    nomorLaporan: "I/PK/MRI-01/VIII/25",
    tanggalUji: "2025-08-12",
    metodeKerja: "MK-PRUK-10-rev-02",
    konfigurasi: {
      merk: "Philips",
      model: "INGENIA",
      seri: "-",
      medan: "3",
    },
    kesimpulan: "Pesawat MRI dinyatakan Laik Pakai untuk parameter uji di atas.",
    alatUkurDipakai: ["Thermohygrobarometer", "Penggaris", "Phantom Image ACR"],
    hasilUji: {
      "kondisi-lingkungan": lingkungan("", "", ""),
      "setting-pesawat": {
        meta: {},
        rows: [
          { _key: "tr", t1: "500 ms", t2: "2000 ms" },
          { _key: "te", t1: "20 ms", t2: "80 ms" },
          { _key: "tebal", t1: "5 mm", t2: "5 mm" },
          { _key: "fov", t1: "25.6 cm", t2: "25.6 cm" },
          { _key: "nex", t1: "1", t2: "1" },
          { _key: "matrik", t1: "256 x 256", t2: "256 x 256" },
          { _key: "coil", t1: "Head", t2: "Head" },
        ],
      },
      "akurasi-geometrik": {
        meta: {},
        rows: [
          { _key: "t1", titik: "Diameter", terukur: "19.00", sebenarnya: "19.00" },
          { _key: "t2", titik: "Diameter", terukur: "19.00", sebenarnya: "19.00" },
        ],
      },
      "resolusi-spasial": {
        meta: {},
        rows: [
          { _key: "t1", hasil: "1.00", batas: "1.0" },
          { _key: "t2", hasil: "0.90", batas: "1.0" },
        ],
      },
      snr: {
        meta: {},
        rows: [
          { _key: "t1", sinyal: "1664.82", derau: "2.92", tebal: "5" },
          { _key: "t2", sinyal: "1937.00", derau: "1.30", tebal: "5" },
        ],
      },
      "keseragaman-citra": {
        meta: {},
        rows: [
          { _key: "t1", maks: "2094", min: "1456", batas: "82" },
          { _key: "t2", maks: "2254", min: "1687", batas: "82" },
        ],
      },
      "low-contrast": {
        meta: {},
        rows: [
          { _key: "t1", b11: "10", b10: "10", b9: "9", b8: "8", batas: "37" },
          { _key: "t2", b11: "10", b10: "10", b9: "9", b8: "8", batas: "37" },
        ],
      },
      "posisi-irisan": {
        meta: {},
        rows: [
          { _key: "t1", kiri: "0.00", kanan: "2.50" },
          { _key: "t2", kiri: "0.00", kanan: "2.50" },
        ],
      },
      "tebal-irisan": {
        meta: {},
        rows: [
          { _key: "t1", bawah: "46.30", atas: "52.80", nominal: "5", toleransiMm: "0.7" },
          { _key: "t2", bawah: "46.60", atas: "54.30", nominal: "5", toleransiMm: "0.7" },
        ],
      },
      ghosting: {
        meta: {},
        rows: [
          {
            _key: "t1",
            fantom: "1664.82",
            atas: "0.5211",
            bawah: "2.406",
            kanan: "18.58",
            kiri: "9.188",
          },
          {
            _key: "t2",
            fantom: "1937.00",
            atas: "2.113",
            bawah: "1.868",
            kanan: "22.30",
            kiri: "16.57",
          },
        ],
      },
    },
  });

  console.log("Seed selesai.");
  console.log(`Akun contoh: ${email} / kalibrasi123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
