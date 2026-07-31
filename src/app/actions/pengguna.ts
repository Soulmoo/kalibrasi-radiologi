"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { emailMaster, peranBisaDiatur } from "@/lib/peran";
import { requireUser } from "@/lib/session";

/**
 * Ubah peran akun antara "fismed" dan "admin".
 *
 * Khusus master. Peran "master" sendiri tidak bisa diberikan atau dicabut dari
 * sini — sumbernya environment variable MASTER_EMAILS.
 */
export async function ubahPeran(fd: FormData) {
  const user = await requireUser();
  if (!user.master) redirect("/profil");

  const id = String(fd.get("id") ?? "");
  const peranBaru = String(fd.get("peran") ?? "");

  if (!peranBisaDiatur(peranBaru)) redirect("/profil/fismed?error=peran");
  if (id === user.id) redirect("/profil/fismed?error=diri-sendiri");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/profil/fismed?error=tidak-ada");

  // Master lain tidak bisa diutak-atik dari antarmuka; perannya dipulihkan
  // otomatis saat login, jadi lebih jujur menolak sekarang.
  if (target.peran === "master" || emailMaster(target.email)) {
    redirect("/profil/fismed?error=master");
  }

  await prisma.user.update({ where: { id }, data: { peran: peranBaru } });

  revalidatePath("/profil/fismed");
  redirect("/profil/fismed?ok=peran");
}

/**
 * Hapus akun beserta seluruh datanya. Khusus master.
 *
 * Konfirmasinya satu dialog di daftar Fismed. Penjagaan yang sebenarnya ada di
 * sini, bukan di dialog itu: master tidak bisa menghapus dirinya sendiri maupun
 * master lain, dan aksi ini menolak siapa pun yang bukan master — termasuk bila
 * dipanggil lewat request langsung tanpa melalui tombol di layar.
 *
 * Soal data: laporan milik akun tersebut ikut terhapus. Data master (instansi,
 * alat radiologi, alat ukur) juga terhapus, KECUALI yang masih dipakai laporan
 * Fismed lain — yang seperti itu dialihkan kepemilikannya ke master yang
 * menghapus, supaya laporan Fismed lain tidak ikut rusak.
 */
export async function hapusAkun(fd: FormData) {
  const user = await requireUser();
  if (!user.master) redirect("/profil");

  const id = String(fd.get("id") ?? "");

  if (id === user.id) redirect("/profil/fismed?error=hapus-diri-sendiri");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/profil/fismed?error=tidak-ada");

  if (target.peran === "master" || emailMaster(target.email)) {
    redirect("/profil/fismed?error=hapus-master");
  }

  await prisma.$transaction(async (tx) => {
    // Laporan milik akun ini beserta tautan alat ukurnya.
    await tx.laporan.deleteMany({ where: { userId: id } });

    // Alat radiologi: yang masih dipakai laporan Fismed lain dialihkan,
    // sisanya dihapus.
    const alat = await tx.alatRadiologi.findMany({
      where: { createdById: id },
      select: { id: true, _count: { select: { laporan: true } } },
    });
    await tx.alatRadiologi.updateMany({
      where: { id: { in: alat.filter((a) => a._count.laporan > 0).map((a) => a.id) } },
      data: { createdById: user.id },
    });
    await tx.alatRadiologi.deleteMany({
      where: { id: { in: alat.filter((a) => a._count.laporan === 0).map((a) => a.id) } },
    });

    // Instansi: sama, cek sisa alat dan laporan yang menautnya.
    const instansi = await tx.instansi.findMany({
      where: { createdById: id },
      select: { id: true, _count: { select: { laporan: true, alat: true } } },
    });
    const masihDipakai = (i: (typeof instansi)[number]) =>
      i._count.laporan > 0 || i._count.alat > 0;
    await tx.instansi.updateMany({
      where: { id: { in: instansi.filter(masihDipakai).map((i) => i.id) } },
      data: { createdById: user.id },
    });
    await tx.instansi.deleteMany({
      where: { id: { in: instansi.filter((i) => !masihDipakai(i)).map((i) => i.id) } },
    });

    // Alat ukur: yang masih tertaut ke laporan Fismed lain dialihkan.
    const alatUkur = await tx.alatUkur.findMany({
      where: { createdById: id },
      select: { id: true, _count: { select: { laporan: true } } },
    });
    await tx.alatUkur.updateMany({
      where: {
        id: { in: alatUkur.filter((a) => a._count.laporan > 0).map((a) => a.id) },
      },
      data: { createdById: user.id },
    });
    await tx.alatUkur.deleteMany({
      where: {
        id: { in: alatUkur.filter((a) => a._count.laporan === 0).map((a) => a.id) },
      },
    });

    await tx.user.delete({ where: { id } });
  });

  revalidatePath("/profil/fismed");
  redirect("/profil/fismed?ok=hapus");
}
