# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Internal work tool for medical physicists (Fismed) calibrating radiology equipment: they
enter raw measurements, the app calculates derived parameters and pass/fail verdicts, and
exports a print-ready PDF report with a Fismed signature block. This produces internal
working reports, not official BAPETEN/BPAFK-legal certificates. Implements
`PRD_Aplikasi_Kalibrasi_Radiologi.md` (v0.5) — most in-repo comments and docs cite specific
PRD sections; when behavior looks arbitrary, check the cited section before changing it.

The UI, code comments, and commit messages are in Indonesian. Match that when editing
existing files.

## Commands

```bash
npm run dev              # start dev server
npm run build             # production build
npm run lint               # eslint
npx tsc --noEmit          # typecheck (no dedicated script — use directly)

npx prisma migrate dev --name <nama>   # create + apply a migration (local)
npm run db:push                          # push schema without a migration (prototyping)
npm run db:seed                          # seed one instansi, 15 alat ukur, 6 full laporan
npm run db:studio                        # Prisma Studio
```

There is no test suite in this repo. `npm run vercel-build` (`prisma generate && prisma
migrate deploy && next build`) is what Vercel runs on deploy — don't run `prisma migrate
deploy` manually against production, it happens automatically at build time.

Requires Postgres (Neon or Vercel Storage) for both local and prod — see `.env.example`
for `DATABASE_URL`, `AUTH_SECRET`, `MASTER_EMAILS`.

## Architecture

### Configurable templates, not hard-coded forms (the core pattern)

Every modalitas (radiography, CT-scan, dental, angiography, C-arm, MRI) is defined as one
schema object in `src/lib/templates/<modalitas>.ts`, typed by `src/lib/templates/types.ts`.
The form UI, auto-calculation, pass/fail evaluation, and PDF layout are all generated from
that schema — there is no per-modality form component or PDF page to write. To add a
modality: create the template file following `ct-scan.ts`'s shape, then register it in
`src/lib/templates/index.ts`.

Key schema concepts (`types.ts`):
- `Template.seksi[].blok[]` — a report is sections of blocks (tables).
- `Blok.modeBaris`: `"tetap"` = rows fixed by the template; `"dinamis"` = Fismed can
  add/remove rows.
- `Kolom.jenis`: `"number"/"text"` = Fismed-entered, `"hitung"` = computed via
  `Kolom.hitung()`, `"label"` = static text from the row definition.
- `Blok.evaluasi()` — per-row pass/fail verdict; `Blok.ringkasanBlok()` — block-level
  derived results (CL, CV, ΔCT, etc.) shown below the table.
- `Kolom.desimal` — display precision is set **per parameter**, matching how each value is
  written in BPAFK reference documents, not a single global rounding rule. See the
  "Jumlah angka di belakang koma" section of `README.md` for why (e.g. CV must show 3
  decimals — `0.001` — or it rounds to a meaningless `0.00`). Values Fismed types in are
  displayed verbatim, never rounded.
- `Kolom.hanyaForm` — helper column, form-only, excluded from the printed PDF.
- `Blok.opsional` — auxiliary block hidden from the PDF when every cell is empty.

Angiography and C-arm share report structure: the common parts live in
`src/lib/templates/fluoroskopi.ts` and both templates call into it; C-arm adds its own
extra parameter section on top.

Runtime flow: `src/lib/evaluasi.ts` (`hitungBlok`, `rekapLaporan`, `draftKesimpulan`) takes
a `Template` + stored `HasilUji` JSON and produces computed cell text + verdicts.
`src/lib/calc.ts` holds every formula plus the BAPETEN HVL lookup table.
`src/components/lembar.tsx` renders the computed result as the print-ready report, reused
by both the on-screen preview and the `/laporan/[id]/cetak` PDF page.

PDF export has no headless-browser dependency: `/laporan/[id]/cetak` renders the report
inside `@page`/`@media print` CSS and the "Cetak / Simpan sebagai PDF" button just invokes
the browser print dialog (destination "Save as PDF", A4, browser header/footer off). This
was a deliberate choice to avoid needing Puppeteer/Chromium on serverless Vercel and to
guarantee the PDF always matches the on-screen layout exactly.

### Layout conventions

Every `<table className="tabel-data">` must sit inside `<TabelGulir>` (from
`src/components/field.tsx`). These tables have many columns and can't fit a phone; the
wrapper scrolls the table alone. Without it you get one of two bugs — an unwrapped table
drags the whole page into horizontal scroll, and an `overflow-hidden` card clips the right
columns so they're unreachable. `.tabel-data` carries a `min-width` so scrolled columns
stay readable rather than collapsing.

The print sheet (`.lembar-halaman`) is deliberately a fixed 210mm — do not make it
responsive, since matching the printed PDF exactly is the whole point of the preview.
`.lembar` scrolls horizontally on screen instead (screen-only; never in `@media print`).

Role badges come from `<LencanaPeran peran={...} />` (`src/components/lencana-peran.tsx`).
Never derive a badge from `user.admin` — that flag is true for admin *and* master.

Navigation splits at `md`: `NavUtama` renders the horizontal tab strip on desktop only,
`MenuMobile` renders a hamburger + left drawer below it (both in `src/app/(app)/nav.tsx`).
Keep **Keluar out of the mobile header** — it previously sat in the cramped top-right
directly above the tab strip, and users logged themselves out by mistapping it while
reaching for a tab. It now lives at the bottom of the drawer, separated by a divider.

### Data model (`prisma/schema.prisma`)

`User` → `Instansi` (client/institution, shared across Fismed) → `AlatRadiologi`
(equipment registry, `jenisAlat` is the template key, `konfigurasi` is a per-modality JSON
blob) → `Laporan` (report; `hasilUji` JSON follows the owning template's schema,
`konfigurasiSnapshot` freezes the equipment config at report time so later profile edits
don't rewrite history). `AlatUkur` (measurement-instrument registry) relates to `Laporan`
many-to-many via `LaporanAlatUkur`.

### Auth & three-role ownership model

Auth.js v5 (`src/auth.ts`), JWT sessions, two providers: credentials (email + bcrypt) and
Google. Every page reads the session via `requireUser()`/`getUser()` in
`src/lib/session.ts`, so adding another provider needs no changes elsewhere.

Google sign-in is **optional and off unless `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are
set** — `googleAktif()` in `src/lib/oauth.ts` gates both provider registration and the
button, so an unconfigured deploy silently falls back to password-only. Accounts are
linked by email (a Google sign-in lands on the existing password account with the same
address, and `update: {}` on the upsert keeps hand-edited nama/gelar/nip). That linking is
only safe because the `signIn` callback rejects anything without
`profile.email_verified === true` — don't relax that check. Google accounts have
`passwordHash === null`, and `authorize()` rejects those so the credentials path can't be
used to attack them.

Three roles in `User.peran`: `fismed` (own data only) < `admin` (can also *read* any
Fismed's reports, via Profil → Fismed) < `master` (can additionally change others' roles
and delete accounts). `master` is **not** grantable in-app — it's synced from the
`MASTER_EMAILS` env var on every login (`src/auth.ts` jwt callback), specifically so the
app owner's access can't be revoked by anyone through the UI. (`ADMIN_EMAILS` is still
read as a legacy fallback name when `MASTER_EMAILS` is unset.)

**Cross-Fismed access is read-only, by design.** Admin/master may open and print another
Fismed's report but never edit it — report contents are that Fismed's personal
measurements (instrument readings, ambient conditions at test time, field notes), so
nobody else has grounds to alter them. `/laporan/[id]` renders `baca.tsx` (computed
result tables) instead of `form.tsx` for non-owners.

Ownership enforcement is three layers, all required (`src/lib/akses.ts`):
1. **Listing** — `filterMilik()`/`filterLaporan()` always scope to the current user's own
   `createdById`/`userId`, even for admins. Dashboards and history lists never mix in
   other Fismed's data.
2. **Single-record access** — `bolehLihat()`/`pastikanBolehLihat()` let admin/master
   *open* someone else's record (entry point: Profil → Fismed only);
   `bolehUbah()`/`pastikanBolehUbah()` grant write access to the owner alone. Records
   outside a user's access return 404, not 403, so existence doesn't leak through error
   differences.
3. **Server actions** — every save/delete in `src/app/actions/*.ts` re-verifies with
   `bolehUbah()`. This is the layer that actually secures things, since actions are
   callable directly, not just via UI buttons — hiding the edit form is not enough.

Two easy-to-miss rules already handled correctly — don't regress them:
- A report's ownership never transfers when edited — the original Fismed's name stays on
  the signature block.
- The `AlatUkur` picker on the report form must use the **report owner's** registry, not
  the viewing user's, so already-recorded instruments aren't wiped on save.

This intentionally overrides the original PRD §4 assumption that master data is shared
across all Fismed.

### Relative sign convention for `kesalahanRelatif()`

BPAFK reference documents are internally inconsistent about sign (C-arm/Angiography/Gigi
use `(measured − set)/set`; CT-Scan/Radiografi Mobile show the opposite sign). This app
standardizes on `e = (measured − set) / set × 100%` per PRD Appendix A.1.1 everywhere. If
asked to "match the document," check whether the discrepancy is this known, intentional
sign convention before treating it as a bug — see README.md's "Validasi Rumus" section for
the full per-modality comparison against reference documents.

Some parameters (HVL, tube-housing leakage, MRI spatial resolution, C-arm mesh distortion,
etc.) are intentionally *not* auto-calculated — they're direct instrument/observational
readings evaluated only against a limit. See README.md for the full list before adding a
formula for one of these.
