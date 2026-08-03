"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bolehUbah, filterMilikPengguna } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/lib/templates";

export type AksiState = {
  error?: string;
  ok?: boolean;
  tersimpanPada?: string;
  /** status laporan sesudah penyimpanan, dipakai form untuk menukar tombolnya */
  status?: string;
};

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
  if (!bolehUbah(user, alat.createdById)) {
    return { error: "Alat radiologi ini bukan milik Anda" };
  }

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
  // Baca-saja untuk siapa pun selain pemiliknya, termasuk admin & master: isi
  // laporan adalah hasil pengukuran Fismed yang mengerjakannya.
  if (!bolehUbah(user, laporan.userId)) {
    return { error: "Laporan ini milik Fismed lain dan hanya bisa dibuka baca-saja." };
  }

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

  // Menandai laporan "selesai" ITULAH tindakan menandatanganinya: tanda tangan
  // Fismed disalin dari profil ke laporan dan dibekukan di sana, sejajar dengan
  // konfigurasiSnapshot. Mengganti tanda tangan di Profil setelahnya tidak
  // mengubah laporan yang sudah selesai.
  //
  // bolehUbah() di atas menjamin penyimpan = pemilik laporan, jadi tidak pernah
  // ada keraguan siapa yang menandatangani.
  // Status tidak datang dari dropdown melainkan dari TOMBOL mana yang ditekan
  // (name="status" pada tombol submit, lihat form.tsx). Nilai yang tidak
  // dikenali berarti tombolnya tidak ikut terkirim — status lama dipertahankan,
  // supaya penyimpanan biasa tidak pernah diam-diam membatalkan laporan yang
  // sudah selesai beserta tanda tangannya.
  const statusMasuk = teks(fd, "status");
  const status =
    statusMasuk === "selesai"
      ? "selesai"
      : statusMasuk === "draft"
        ? "draft"
        : laporan.status;
  let tandaTanganSnapshot: string | null | undefined;
  if (status === "draft") {
    // Dikembalikan ke draf = mencabut tanda tangan. Ini juga satu-satunya cara
    // menandatangani ulang dengan tanda tangan yang baru: draf → simpan →
    // selesai → simpan.
    tandaTanganSnapshot = null;
  } else if (!laporan.tandaTanganSnapshot) {
    // Syarat "masih kosong" menutup dua hal sekaligus: penyimpanan biasa pada
    // laporan yang sudah selesai tidak diam-diam menandatangani ulang, dan
    // Fismed yang menandai selesai dulu baru mengunggah tanda tangan tetap
    // mendapatkannya pada penyimpanan berikutnya.
    const profil = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tandaTanganGambar: true },
    });
    // Tetap null kalau Fismed belum punya tanda tangan — lembar cetak jatuh ke
    // ruang kosong untuk ditandatangani basah, seperti sebelum fitur ini ada.
    tandaTanganSnapshot = profil?.tandaTanganGambar ?? null;
  }

  // Alat ukur yang boleh ditautkan adalah milik pemilik laporan. Divalidasi
  // ulang di server supaya request langsung tidak bisa menautkan alat ukur
  // milik Fismed lain.
  const dimintaIds = fd.getAll("alatUkurId").map(String).filter(Boolean);
  const alatUkurIds = (
    await prisma.alatUkur.findMany({
      where: { ...filterMilikPengguna(laporan.userId), id: { in: dimintaIds } },
      select: { id: true },
    })
  ).map((a) => a.id);

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
        status,
        hasilUji,
        // `undefined` = kolom tidak disentuh (laporan selesai yang sudah
        // bertanda tangan, disimpan ulang).
        tandaTanganSnapshot,
        // Kepemilikan laporan tidak dipindahkan saat disunting — nama Fismed
        // pembuatnya tetap yang tercetak di kolom tanda tangan, dan laporan
        // tidak berpindah dari daftar miliknya ketika akun master membukanya.
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
  return { ok: true, tersimpanPada: new Date().toISOString(), status };
}

export async function hapusLaporan(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const ada = await prisma.laporan.findUnique({ where: { id } });
  if (!ada || !bolehUbah(user, ada.userId)) redirect("/laporan");

  await prisma.laporan.delete({ where: { id } });
  revalidatePath("/laporan");
  redirect("/laporan");
}
