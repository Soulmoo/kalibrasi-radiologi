import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Ambil sesi Fismed yang login; lempar ke halaman masuk kalau belum login. */
export async function requireUser() {
  const sesi = await auth();
  if (!sesi?.user?.id) redirect("/masuk");
  return sesi.user;
}

export async function getUser() {
  const sesi = await auth();
  return sesi?.user ?? null;
}
