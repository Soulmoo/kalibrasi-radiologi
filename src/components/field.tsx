import type { ReactNode } from "react";

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  petunjuk,
  children,
}: {
  label: string;
  name?: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  petunjuk?: string;
  children?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children ?? (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          required={required}
          placeholder={placeholder}
          className="input-dasar"
        />
      )}
      {petunjuk && <span className="mt-1 block text-xs text-[var(--muted)]">{petunjuk}</span>}
    </label>
  );
}

export function PesanError({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {pesan}
    </p>
  );
}

export function JudulHalaman({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold">{judul}</h1>
        {keterangan && <p className="mt-0.5 text-sm text-[var(--muted)]">{keterangan}</p>}
      </div>
      {aksi}
    </div>
  );
}

export function KosongPesan({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">{children}</p>
  );
}
