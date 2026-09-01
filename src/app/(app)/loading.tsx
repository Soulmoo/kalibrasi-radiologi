/**
 * Rangka sementara untuk seluruh halaman di grup `(app)`.
 *
 * Semua halaman di sini dinamis (memanggil `requireUser()`), jadi Next tidak
 * bisa menyiapkannya lebih dulu saat tautan disorot — tiap klik menu harus
 * menunggu server selesai membaca sesi dan datanya. Tanpa berkas ini browser
 * diam tanpa tanda apa pun selama penantian itu, dan aplikasinya terasa
 * menggantung padahal sedang bekerja. Dengan `loading.tsx`, Next langsung
 * menukar isi halaman ke rangka ini begitu tautan diklik.
 *
 * Sengaja hanya satu berkas di pangkal grup: semua rute anak yang tidak punya
 * `loading.tsx` sendiri ikut memakainya.
 */
export default function Memuat() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-56 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-3 w-72 animate-pulse rounded bg-[var(--border)]" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded bg-[var(--border)]" />
      </div>

      <div className="kartu overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--border)]" />
        </div>
        <div className="space-y-3 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-[var(--border)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
