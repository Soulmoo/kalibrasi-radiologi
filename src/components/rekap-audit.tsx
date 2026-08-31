import { TabelGulir } from "@/components/field";
import {
  type GrupAudit,
  MIN_PASIEN,
  type Situasi,
  labelSituasi,
  tindakLanjutSituasi,
} from "@/lib/audit-dosis";
import { fmt } from "@/lib/calc";
import { labelKelompokUsia } from "@/lib/tpdi";

/**
 * Warna lencana situasi.
 *
 * SENGAJA BUKAN merah/hijau. TPD adalah indikator optimisasi, bukan nilai batas
 * — "lebih tinggi" bukan kegagalan dan "hampir sama" bukan kelulusan. Pedoman
 * Teknis butir 3.3.3–3.3.5 mewajibkan reviu untuk ketiga situasi. Skema
 * merah/hijau akan membuat Fismed membacanya sebagai lolos/gagal dan
 * mengabaikan dua situasi yang lain.
 */
function warnaSituasi(s: Situasi): string {
  if (s === "lebih-tinggi") return "bg-amber-100 text-amber-900";
  if (s === "lebih-rendah") return "bg-sky-100 text-sky-900";
  return "bg-slate-100 text-slate-800";
}

function Angka({
  nilai,
  satuan,
  besaran,
  desimal,
}: {
  nilai: number | null;
  satuan?: string;
  besaran?: string;
  desimal: number;
}) {
  return (
    <>
      <span className="block">
        {fmt(nilai, desimal)}
        {satuan ? ` ${satuan}` : ""}
      </span>
      {besaran && <span className="block text-xs text-[var(--muted)]">{besaran}</span>}
    </>
  );
}

export function RekapAuditTabel({
  grup,
  desimal = 3,
}: {
  grup: GrupAudit[];
  /** ketelitian tampilan; CT pakai 1 desimal, radiografi 3 karena nilainya kecil */
  desimal?: number;
}) {
  if (grup.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
        Belum ada grup yang bisa dihitung. Satu baris pasien baru ikut terhitung kalau
        jenis pemeriksaan dan umurnya sudah terisi.
      </p>
    );
  }

  return (
    <TabelGulir>
      <table className="tabel-data">
        <thead>
          <tr>
            <th>Jenis Pemeriksaan</th>
            <th>Kelompok Umur</th>
            <th>n</th>
            <th>Nilai Tipikal (median)</th>
            <th>TPD Lokal (Q3)</th>
            <th>TPD Nasional</th>
            <th>Simpangan</th>
            <th>Situasi</th>
          </tr>
        </thead>
        <tbody>
          {grup.map((g) => (
            <tr key={`${g.pemeriksaan}|${g.usia}`}>
              <td className="font-medium">{g.pemeriksaan}</td>
              <td>{labelKelompokUsia(g.usia)}</td>
              <td>
                <span className="block">{g.n}</span>
                {!g.cukupSampel && (
                  <span className="block text-xs text-amber-700">
                    &lt; {MIN_PASIEN}, belum cukup
                  </span>
                )}
              </td>
              <td>
                <Angka
                  nilai={g.nilaiTipikal}
                  satuan={g.tpdi?.satuan}
                  besaran={g.tpdi?.besaran}
                  desimal={desimal}
                />
                {g.tpdiSekunder && (
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {fmt(g.nilaiTipikalSekunder, desimal)} {g.tpdiSekunder.satuan} (
                    {g.tpdiSekunder.besaran})
                  </span>
                )}
              </td>
              <td>
                <Angka nilai={g.tpdLokal} satuan={g.tpdi?.satuan} desimal={desimal} />
              </td>
              <td>
                {g.tpdi ? (
                  <>
                    <span className="block">
                      {g.tpdi.nilai} {g.tpdi.satuan}
                    </span>
                    {g.tpdiSekunder && (
                      <span className="block text-xs text-[var(--muted)]">
                        {g.tpdiSekunder.nilai} {g.tpdiSekunder.satuan}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-[var(--muted)]">
                    Belum ada TPDI untuk kombinasi ini
                  </span>
                )}
              </td>
              <td>{g.selisihPersen === null ? "-" : `${fmt(g.selisihPersen, 1)} %`}</td>
              <td>
                {g.situasi ? (
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${warnaSituasi(g.situasi)}`}
                  >
                    {labelSituasi(g.situasi)}
                  </span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelGulir>
  );
}

/**
 * Daftar tindak lanjut per situasi yang muncul di audit ini.
 *
 * Ditampilkan supaya kewajiban reviu tidak terbaca sebagai opsional — termasuk
 * untuk grup yang dosisnya justru lebih rendah dari TPD nasional.
 */
export function TindakLanjutAudit({ grup }: { grup: GrupAudit[] }) {
  const situasi = Array.from(
    new Set(grup.map((g) => g.situasi).filter((s): s is Situasi => s !== null)),
  );
  if (situasi.length === 0) return null;

  return (
    <div className="space-y-2">
      {situasi.map((s) => (
        <p key={s} className="text-sm">
          <strong>{labelSituasi(s)}:</strong>{" "}
          <span className="text-[var(--muted)]">{tindakLanjutSituasi(s)}</span>
        </p>
      ))}
    </div>
  );
}
