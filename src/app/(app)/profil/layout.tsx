import { requireUser } from "@/lib/session";
import { TabProfil } from "./tab";

export default async function LayoutProfil({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">
          {user.nama}
          {user.gelar ? `, ${user.gelar}` : ""}
          {user.admin && (
            <span className="ml-2 rounded bg-[var(--brand-soft)] px-2 py-0.5 align-middle text-xs font-medium text-[var(--brand)]">
              Admin
            </span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{user.email}</p>
      </div>

      <TabProfil admin={user.admin} />

      <div className="pt-5">{children}</div>
    </div>
  );
}
