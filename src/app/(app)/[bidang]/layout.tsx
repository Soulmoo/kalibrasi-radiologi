import { pastikanBidang } from "@/lib/bidang";

/**
 * Segmen bidang (`/radiologi`, `/radioterapi`). Segmen yang tidak dikenal
 * langsung 404 di sini, jadi halaman di bawahnya boleh menganggap bidangnya
 * sah — meski tiap halaman tetap memanggil pastikanBidang() untuk mendapat
 * objeknya, karena layout tidak bisa meneruskan data ke page.
 */
export default async function LayoutBidang({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bidang: string }>;
}) {
  pastikanBidang((await params).bidang);
  return children;
}
