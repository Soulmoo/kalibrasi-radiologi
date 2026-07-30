"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Ubah peran akun lain antara "fismed" dan "admin".
 *
 * Hanya admin yang boleh, dan seorang admin tidak bisa mengubah perannya
 * sendiri — supaya tidak ada yang tidak sengaja menurunkan dirinya lalu
 * kehilangan akses.
 */
export async function ubahPeran(fd: FormData) {
  const user = await requireUser();
  if (!user.admin) redirect("/profil");

  const id = String(fd.get("id") ?? "");
  const peranBaru = String(fd.get("peran") ?? "");

  if (peranBaru !== "fismed" && peranBaru !== "admin") {
    redirect("/profil/fismed?error=peran");
  }
  if (id === user.id) {
    redirect("/profil/fismed?error=diri-sendiri");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/profil/fismed?error=tidak-ada");

  await prisma.user.update({ where: { id }, data: { peran: peranBaru } });

  revalidatePath("/profil/fismed");
  redirect("/profil/fismed?ok=peran");
}
