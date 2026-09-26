import { pastikanMenu } from "@/lib/bidang";

/**
 * Audit dosis hanya tersedia di bidang yang mencantumkannya di menunya
 * (saat ini Radiologi) — `/radioterapi/audit-dosis/...` langsung 404. Cukup
 * dijaga di sini; aksi server-nya sendiri tidak bergantung pada URL.
 */
export default async function LayoutAuditDosis({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bidang: string }>;
}) {
  pastikanMenu((await params).bidang, "/audit-dosis");
  return children;
}
