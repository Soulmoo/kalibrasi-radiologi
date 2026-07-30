"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/lib/templates";

export type AksiState = { error?: string; ok?: boolean; tersimpanPada?: string };

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

/** Langkah 1 wizard: pilih alat + tanggal uji, lalu masuk ke form parameter. */
export async function buatLaporan(_prev: AksiState, fd: FormData): Promise<AksiState> {
  const user = await requireUser();

  const alatRadiologiId = teks(fd, "alatRadiologiId");
  if (!alatRadiologiId) return { error: "Alat radiologi wajib dipilih" };

  const alat = await prisma.alatRadiologi.findUnique({
    where: { id: alatRadiologiId },
  });
  if (!alat) return { error: "Alat radiologi tidak ditemukan" };

  const template = getTemplate(alat.jenisAlat);
  if (!template) return { error: "Template untuk jenis alat ini belum tersedia" };

  const tanggalUji = tanggal(fd, "tanggalUji") ?? new Date();

  const laporan = await prisma.laporan.create({
    data: {
      jenisAlat: alat.jenisAlat,
      nomorLaporan: teks(fd, "nomorLaporan"),
      nomorOrder: teks(fd, "nomorOrder"),
      instansiId: alat.instansiId,
      alatRadiologiId: alat.id,
      userId: user.id,
      tanggalUji,
      lokasiUji: teks(fd, "lokasiUji") ?? alat.lokasiUnit,
      metodeKerja: template.metodeKerjaDefault,
      konfigurasiSnapshot: alat.konfigurasi,
      hasilUji: "{}",
      rekomendasi: template.rekomendasiDefault,
      status: "draft",
    },
  });

  revalidatePath("/laporan");
  redirect(`/laporan/${laporan.id}`);
}

export async function simpanLaporan(_prev: AksiState, fd: FormData): Promise<AksiState> {
  const user = await requireUser();
  const id = teks(fd, "id");
  if (!id) return { error: "Laporan tidak dikenali" };

  const laporan = await prisma.laporan.findUnique({ where: { id } });
  if (!laporan) return { error: "Laporan tidak ditemukan" };

  // Hasil uji dikirim sebagai satu payload JSON dari form klien.
  let hasilUji = laporan.hasilUji;
  const raw = fd.get("hasilUji");
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      JSON.parse(raw);
      hasilUji = raw;
    } catch {
      return { error: "Data hasil uji tidak terbaca. Coba muat ulang halaman." };
    }
  }

  const alatUkurIds = fd.getAll("alatUkurId").map(String).filter(Boolean);

  await prisma.$transaction([
    prisma.laporan.update({
      where: { id },
      data: {
        nomorLaporan: teks(fd, "nomorLaporan"),
        nomorOrder: teks(fd, "nomorOrder"),
        tanggalUji: tanggal(fd, "tanggalUji") ?? laporan.tanggalUji,
        tanggalTerbit: tanggal(fd, "tanggalTerbit"),
        lokasiUji: teks(fd, "lokasiUji"),
        metodeKerja: teks(fd, "metodeKerja"),
        kesimpulan: teks(fd, "kesimpulan"),
        catatan: teks(fd, "catatan"),
        rekomendasi: teks(fd, "rekomendasi"),
        status: teks(fd, "status") === "selesai" ? "selesai" : "draft",
        hasilUji,
        // laporan selalu tertaut ke Fismed yang terakhir mengerjakannya,
        // karena namanya yang tercetak di kolom tanda tangan
        userId: user.id,
      },
    }),
    prisma.laporanAlatUkur.deleteMany({ where: { laporanId: id } }),
    prisma.laporanAlatUkur.createMany({
      data: alatUkurIds.map((alatUkurId, urutan) => ({
        laporanId: id,
        alatUkurId,
        urutan,
      })),
    }),
  ]);

  revalidatePath(`/laporan/${id}`);
  revalidatePath("/laporan");
  return { ok: true, tersimpanPada: new Date().toISOString() };
}

export async function hapusLaporan(fd: FormData) {
  await requireUser();
  const id = String(fd.get("id") ?? "");
  await prisma.laporan.delete({ where: { id } });
  revalidatePath("/laporan");
  redirect("/laporan");
}
