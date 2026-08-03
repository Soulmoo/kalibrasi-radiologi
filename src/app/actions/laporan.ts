"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bolehUbah, filterMilikPengguna } from "@/lib/akses";
import {
  PESAN_BUTUH_TTD,
  PESAN_TERKUNCI,
  STATUS_DRAF,
  STATUS_PERMANEN,
  terkunci,
} from "@/lib/laporan";
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

  // Laporan yang sudah disimpan permanen tidak bisa disunting lagi oleh siapa
  // pun. Inilah inti fitur ini: hasil pengukuran yang sudah ditandatangani
  // tidak boleh bisa diubah belakangan, supaya angkanya tidak bisa dirapikan
  // setelah laporan terbit.
  //
  // Penjagaannya WAJIB ada di sini, bukan cuma di halaman: server action bisa
  // dipanggil lewat request langsung tanpa melalui tombol di layar, jadi
  // menyembunyikan form saja tidak mengunci apa pun.
  if (terkunci(laporan.status)) return { error: PESAN_TERKUNCI };

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

  // Status ditentukan TOMBOL mana yang ditekan (name="status" pada tombol
  // submit, lihat form.tsx), bukan dropdown. Kalau tidak dikenali, laporan
  // tetap draf — arah yang aman, karena satu-satunya perpindahan yang tidak
  // bisa dibatalkan adalah draf → permanen.
  const mintaPermanen = teks(fd, "status") === STATUS_PERMANEN;
  const status = mintaPermanen ? STATUS_PERMANEN : STATUS_DRAF;

  // Menyimpan permanen ITULAH tindakan menandatangani: tanda tangan Fismed
  // disalin dari profil lalu dibekukan di laporan, sejajar dengan
  // konfigurasiSnapshot. bolehUbah() di atas menjamin penyimpan = pemilik
  // laporan, jadi tidak pernah ada keraguan siapa yang menandatangani.
  let tandaTanganSnapshot: string | undefined;
  if (mintaPermanen) {
    const profil = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tandaTanganGambar: true },
    });
    // Tanpa tanda tangan, laporan akan terkunci selamanya dalam keadaan tidak
    // bertanda tangan dan tidak mungkin diperbaiki. Jadi dihentikan di sini.
    if (!profil?.tandaTanganGambar) return { error: PESAN_BUTUH_TTD };
    tandaTanganSnapshot = profil.tandaTanganGambar;
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
        // `undefined` saat menyimpan draf = kolom tidak disentuh.
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

  // Menyimpan draf sengaja TIDAK berpindah halaman — form laporan panjang, dan
  // Fismed biasanya menyimpan berkali-kali sambil terus mengisi. Menyimpan
  // permanen sebaliknya: halamannya harus berganti ke tampilan terkunci, jadi
  // di jalur itu redirect dipakai supaya tidak bergantung pada revalidate saja.
  if (mintaPermanen) redirect(`/laporan/${id}`);
  return { ok: true, tersimpanPada: new Date().toISOString() };
}

/**
 * Hapus laporan.
 *
 * Laporan draf boleh dihapus pemiliknya. Laporan yang sudah disimpan permanen
 * HANYA boleh dihapus master — kalau pemiliknya masih bisa menghapus lalu
 * membuat ulang, penguncian cuma formalitas dan angkanya tetap bisa
 * "dirapikan" setelah laporan terbit.
 */
export async function hapusLaporan(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");

  const ada = await prisma.laporan.findUnique({ where: { id } });
  if (!ada) redirect("/laporan");

  const bolehHapus = terkunci(ada.status)
    ? user.master
    : bolehUbah(user, ada.userId);
  if (!bolehHapus) redirect(`/laporan?error=terkunci`);

  await prisma.laporan.delete({ where: { id } });
  revalidatePath("/laporan");
  redirect("/laporan");
}
