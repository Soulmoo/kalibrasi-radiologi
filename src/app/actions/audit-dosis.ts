"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bolehLihat, bolehUbah } from "@/lib/akses";
import {
  PESAN_AUDIT_TERKUNCI,
  STATUS_DRAF,
  STATUS_PERMANEN,
  type ParameterAudit,
  modalitasAuditDariJenisAlat,
  terkunciAudit,
  titikKeluaranDariHasil,
} from "@/lib/audit-dosis";
import { BSF_RADIOGRAFI_UMUM, JARAK_UKUR_BAKU_CM, num, regresiPangkat } from "@/lib/calc";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type AksiState = { error?: string; ok?: boolean; tersimpanPada?: string };

// Helper validasi FormData sengaja diduplikasi per berkas aksi, mengikuti
// konvensi yang sudah dipakai actions/laporan.ts dan actions/pengguna.ts.
function teks(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function tanggal(fd: FormData, key: string): Date | null {
  const s = teks(fd, key);
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function angka(fd: FormData, key: string): number | null {
  return num(teks(fd, key));
}

/**
 * Buat audit dosis baru.
 *
 * Untuk Jalur B (estimasi), regresi keluaran tabung dihitung SEKARANG lalu
 * dibekukan ke kolom `parameter`. Alasannya sama dengan konfigurasiSnapshot di
 * Laporan: kalibrasi ulang alat di kemudian hari tidak boleh diam-diam menulis
 * ulang dosis pasien yang sudah diaudit.
 */
export async function buatAudit(_prev: AksiState, fd: FormData): Promise<AksiState> {
  const user = await requireUser();

  const alatRadiologiId = teks(fd, "alatRadiologiId");
  if (!alatRadiologiId) return { error: "Alat radiologi wajib dipilih" };

  const alat = await prisma.alatRadiologi.findUnique({ where: { id: alatRadiologiId } });
  if (!alat) return { error: "Alat radiologi tidak ditemukan" };
  if (!bolehUbah(user, alat.createdById)) {
    return { error: "Alat radiologi ini bukan milik Anda" };
  }

  const modalitas = modalitasAuditDariJenisAlat(alat.jenisAlat);
  if (!modalitas) {
    return {
      error:
        "TPDI nasional baru tersedia untuk radiografi umum/mobile dan CT-Scan (Kepka 1211/K/V/2021). Modalitas alat ini belum bisa diaudit.",
    };
  }

  const periodeMulai = tanggal(fd, "periodeMulai");
  const periodeSelesai = tanggal(fd, "periodeSelesai");
  if (!periodeMulai || !periodeSelesai) return { error: "Periode audit wajib diisi" };
  if (periodeSelesai < periodeMulai) {
    return { error: "Akhir periode tidak boleh mendahului awal periode" };
  }

  // CT-Scan selalu membaca CTDIvol/DLP dari konsol; tidak ada jalur estimasi
  // dari keluaran tabung untuk modalitas ini (Pedoman Teknis butir 3.2.4.2).
  const metode =
    modalitas === "ct-scan"
      ? "indikator"
      : teks(fd, "metode") === "estimasi"
        ? "estimasi"
        : "indikator";

  const parameter: ParameterAudit = {
    regresi: null,
    jarakUkur: angka(fd, "jarakUkur") ?? JARAK_UKUR_BAKU_CM,
    bsf: angka(fd, "bsf") ?? BSF_RADIOGRAFI_UMUM,
    jarakFokusMeja: angka(fd, "jarakFokusMeja") ?? undefined,
  };

  let laporanSumberId: string | null = null;

  if (metode === "estimasi") {
    laporanSumberId = teks(fd, "laporanSumberId");
    if (!laporanSumberId) {
      return { error: "Pilih laporan kalibrasi sumber data keluaran radiasi" };
    }

    const sumber = await prisma.laporan.findUnique({ where: { id: laporanSumberId } });
    if (!sumber) return { error: "Laporan sumber tidak ditemukan" };
    // Dibatasi ke laporan yang boleh dibuka pengguna ini, supaya request
    // langsung tidak bisa menarik data uji milik Fismed lain.
    if (!bolehLihat(user, sumber.userId)) return { error: "Laporan sumber tidak ditemukan" };

    const titik = titikKeluaranDariHasil(parseJson<Record<string, unknown>>(sumber.hasilUji, {}));
    const regresi = regresiPangkat(titik);
    if (!regresi) {
      return {
        error:
          "Laporan sumber belum punya data keluaran radiasi yang cukup. Blok Akurasi Tegangan Tabung harus terisi Set mA, Set s, dan kolom Dosis pada minimal dua nilai kVp yang berbeda.",
      };
    }
    parameter.regresi = regresi;
  }

  const audit = await prisma.auditDosis.create({
    data: {
      userId: user.id,
      instansiId: alat.instansiId,
      alatRadiologiId: alat.id,
      modalitas,
      periodeMulai,
      periodeSelesai,
      metode,
      laporanSumberId,
      parameter: JSON.stringify(parameter),
      dataPasien: "[]",
      status: STATUS_DRAF,
    },
  });

  revalidatePath("/audit-dosis");
  redirect(`/audit-dosis/${audit.id}`);
}

/**
 * Simpan isi audit.
 *
 * Sama bentuknya dengan simpanLaporan: seluruh array pasien dikirim sebagai
 * satu payload JSON, dan menyimpan draf sengaja tidak berpindah halaman karena
 * formnya panjang dan diisi berkali-kali. Penguncian draf → permanen juga
 * ditentukan tombol submit, bukan aksi terpisah.
 */
export async function simpanAudit(_prev: AksiState, fd: FormData): Promise<AksiState> {
  const user = await requireUser();
  const id = teks(fd, "id");
  if (!id) return { error: "Audit tidak dikenali" };

  const audit = await prisma.auditDosis.findUnique({ where: { id } });
  if (!audit) return { error: "Audit tidak ditemukan" };
  if (!bolehUbah(user, audit.userId)) {
    return { error: "Audit ini milik Fismed lain dan hanya bisa dibuka baca-saja." };
  }

  // Penjagaan WAJIB di sini, bukan cuma menyembunyikan form: server action bisa
  // dipanggil lewat request langsung tanpa melalui tombol di layar.
  if (terkunciAudit(audit.status)) return { error: PESAN_AUDIT_TERKUNCI };

  let dataPasien = audit.dataPasien;
  const raw = fd.get("dataPasien");
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const v = JSON.parse(raw);
      if (!Array.isArray(v)) throw new Error("bukan array");
      dataPasien = raw;
    } catch {
      return { error: "Data pasien tidak terbaca. Coba muat ulang halaman." };
    }
  }

  // Status ditentukan tombol mana yang ditekan, bukan dropdown. Kalau tidak
  // dikenali, audit tetap draf — arah yang aman, karena draf → permanen tidak
  // bisa dibatalkan.
  const mintaPermanen = teks(fd, "status") === STATUS_PERMANEN;

  await prisma.auditDosis.update({
    where: { id },
    data: {
      periodeMulai: tanggal(fd, "periodeMulai") ?? audit.periodeMulai,
      periodeSelesai: tanggal(fd, "periodeSelesai") ?? audit.periodeSelesai,
      catatan: teks(fd, "catatan"),
      dataPasien,
      status: mintaPermanen ? STATUS_PERMANEN : STATUS_DRAF,
    },
  });

  revalidatePath(`/audit-dosis/${id}`);
  revalidatePath("/audit-dosis");

  if (mintaPermanen) redirect(`/audit-dosis/${id}`);
  return { ok: true, tersimpanPada: new Date().toISOString() };
}

/**
 * Hapus audit.
 *
 * Sejajar hapusLaporan: audit draf boleh dihapus pemiliknya, audit yang sudah
 * disimpan permanen hanya boleh dihapus master — kalau pemiliknya bisa
 * menghapus lalu membuat ulang, penguncian tidak mengunci apa pun.
 */
export async function hapusAudit(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const ada = await prisma.auditDosis.findUnique({ where: { id } });
  if (!ada) redirect("/audit-dosis");

  const bolehHapus = terkunciAudit(ada.status) ? user.master : bolehUbah(user, ada.userId);
  if (!bolehHapus) redirect("/audit-dosis?error=terkunci");

  await prisma.auditDosis.delete({ where: { id } });
  revalidatePath("/audit-dosis");
  redirect("/audit-dosis?ok=hapus");
}

/**
 * Hapus identitas pasien, sisakan angkanya.
 *
 * Yang dilaporkan ke BAPETEN adalah nilai tipikal per grup, bukan daftar
 * pasien — jadi begitu audit selesai, identitas sudah tidak dibutuhkan lagi.
 * Umur dan berat badan sengaja DIPERTAHANKAN karena keduanya menentukan
 * pengelompokan; menghapusnya akan mengubah nilai tipikal yang sudah dikunci.
 *
 * Hanya untuk audit yang sudah permanen: selama masih draf, angkanya belum
 * final dan Fismed masih mungkin perlu menelusuri balik ke rekam pemeriksaan.
 */
export async function hapusIdentitasPasien(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const audit = await prisma.auditDosis.findUnique({ where: { id } });
  if (!audit) redirect("/audit-dosis");
  if (!bolehUbah(user, audit.userId)) redirect(`/audit-dosis/${id}?error=bukan-milik`);
  if (!terkunciAudit(audit.status)) redirect(`/audit-dosis/${id}?error=belum-permanen`);

  const rows = parseJson<Array<Record<string, string>>>(audit.dataPasien, []);
  const bersih = rows.map((r) => ({ ...r, kodePasien: "", nama: "", jenisKelamin: "" }));

  await prisma.auditDosis.update({
    where: { id },
    data: { dataPasien: JSON.stringify(bersih) },
  });

  revalidatePath(`/audit-dosis/${id}`);
  redirect(`/audit-dosis/${id}?ok=identitas-dihapus`);
}
