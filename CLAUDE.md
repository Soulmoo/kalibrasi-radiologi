# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Internal work tool for medical physicists (Fismed) calibrating radiology equipment: they
enter raw measurements, the app calculates derived parameters and pass/fail verdicts, and
exports a print-ready PDF report with a Fismed signature block. This produces internal
working reports, not official BAPETEN/BPAFK-legal certificates. Implements
`PRD_Aplikasi_Kalibrasi_Radiologi.md` (v0.5) — most in-repo comments and docs cite specific
PRD sections, so behavior that looks arbitrary usually isn't.

**The PRD itself is not in this repo** and never has been (nor is it gitignored) — every
`PRD bagian N` / `Lampiran A` citation points at a document only the user has. Don't go
hunting for the file. The in-repo stand-ins are `README.md`'s "Validasi Rumus" section
(per-modality comparison of every formula against the six BPAFK reference documents,
including the parameters deliberately left un-calculated) and the doc comments on the
functions themselves. If a decision hinges on what a PRD section actually says, ask.

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
for `DATABASE_URL`, `AUTH_SECRET`, `MASTER_EMAILS`, and the optional
`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.

Run only **one** dev server at a time. Two of them share the same `.next` directory and
corrupt each other's generated types; the symptom is `tsc` failing inside
`.next/dev/types/routes.d.ts` with syntax errors that have nothing to do with your code.
`rm -rf .next` fixes it. Same cause if the IDE flags a Prisma field that `tsc` accepts —
there, restart the TS server, since VS Code doesn't watch `node_modules` for the
regenerated client after a schema change.

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

Test mobile layout with Chrome DevTools' device toolbar or a real phone on the LAN — **not**
an in-editor mobile preview. Those render the app in a cross-origin webview, and the
session cookie is `SameSite=Lax`, so client-side navigations arrive without it and every
tab click bounces to `/masuk`. It reads exactly like a random-logout bug but is an artifact
of the preview tool; the server is fine. Never "fix" it by switching the cookie to
`SameSite=None` — that is the app's CSRF protection.

### Data model (`prisma/schema.prisma`)

`User` → `Instansi` (client/institution) → `AlatRadiologi` (equipment registry, `jenisAlat`
is the template key, `konfigurasi` is a per-modality JSON blob) → `Laporan` (report;
`hasilUji` JSON follows the owning template's schema, `konfigurasiSnapshot` freezes the
equipment config at report time so later profile edits don't rewrite history). `AlatUkur`
(measurement-instrument registry) relates to `Laporan` many-to-many via `LaporanAlatUkur`.

Several doc comments in `schema.prisma` predate the ownership model below and are now
wrong — `Instansi` is *not* "shared lintas Fismed", and `peran` has three values, not two.
`src/lib/akses.ts` and `src/lib/peran.ts` are the truth; fix the comment if you touch the
model, but never take it as spec.

**Every JSON column is a Postgres `String`, not Prisma's `Json` type** (`konfigurasi`,
`konfigurasiSnapshot`, `hasilUji`). Always read through `parseJson()` (`src/lib/json.ts`),
which swallows parse errors and falls back — a corrupt blob must degrade to an empty form,
never crash a Fismed's report page — and write with `JSON.stringify`. Queries can't filter
or index inside these; do it in TypeScript after parsing.

`User.tandaTanganGambar` holds the Fismed's signature as a PNG data URL, and
`Laporan.tandaTanganSnapshot` freezes a copy of it the moment a report is marked `selesai` —
that transition *is* the act of signing, so drafts print unsigned and changing your signature
never rewrites reports already finished. Re-signing means going back to draft and finishing
again. There is no status dropdown: `status` is carried by the `name="status"` on whichever
submit button was pressed ("Selesaikan Laporan" / "Kembalikan ke Draf"), while "Simpan
Laporan" submits the status already in force. `simpanLaporan` therefore falls back to the
stored status when the field is missing — never to `"draft"`, which would silently unsign a
finished report. It is a deliberately **uncertified** electronic signature: a certified one (BSrE,
Privy, VIDA) embeds a cryptographic certificate into the PDF, which the browser print dialog
cannot do and which would contradict the report's own "bukan sertifikat resmi" status.
Validation for both columns lives in `src/lib/tanda-tangan.ts` — whitelist PNG/JPEG data URLs
only. The value arrives from the client and is rendered into `<img src>`, so an SVG data URL
there would be a script-injection vector; never loosen that regex into a blacklist.

Nothing computed is ever stored. `Laporan.hasilUji` holds only what Fismed typed (all cells
as strings, so a literal `"-"` stays writable); every derived value, verdict, and summary is
recomputed from the template on each render. The report form posts the whole `hasilUji`
object as one JSON string form field and `simpanLaporan` only checks that it parses.

`normalisasiHasil()` (`templates/types.ts`) merges stored JSON onto the *current* template's
shape on every read, which is why editing a template doesn't break existing reports: unknown
block ids are dropped, missing ones fill in empty, `modeBaris: "tetap"` rows match by `_key`
while `"dinamis"` rows are taken wholesale. The flip side — renaming a `Blok.id`, a fixed
row `key`, or a `Kolom.key` silently orphans data already saved under the old name. Treat
those three as a data migration, not a rename.

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

Two guards in `src/auth.ts` look like dead weight but are load-bearing:
- A custom `logger` downgrades `JWTSessionError` to a single `console.warn`. That error
  means the session cookie can't be decrypted — routine after an `AUTH_SECRET` change, and
  it heals on the next sign-in. It repeats on *every* request because `auth()` runs in
  Server Components, which can't write cookies, so Auth.js never gets to clear the bad
  cookie. Everything else still goes to `console.error`.
- The jwt callback's Prisma work sits in a `try/catch` that returns the existing token.
  Auth.js invokes that callback inside its own `try/catch`, so anything thrown there
  discards the session cookie — one transient Neon connection blip would log a Fismed out
  mid-form and lose unsaved measurements. `return null` (which does kill the session) is
  reserved for the query *succeeding* and finding no row, i.e. the account was deleted.

The jwt callback copies profile fields onto the token, but **never put
`tandaTanganGambar` there.** The session cookie caps at ~4 KB; a base64 PNG blows past it and
the cookie is silently truncated, which logs every Fismed out with no usable error. Pages
that need the image read it from Prisma directly — `profil/page.tsx` does exactly that even
though it already has the session.

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

Deleting an account (`hapusAkun`, `src/app/actions/pengguna.ts`) is not a cascade. Inside
one transaction it drops the account's own reports, then for each instansi / alat radiologi
/ alat ukur checks whether another Fismed's report still references it: still-referenced
rows are **reassigned to the deleting master**, only unreferenced ones are deleted. Foreign
keys can't express that, so any new owned model needs its own branch here or account
deletion starts breaking other people's reports.

This intentionally overrides the original PRD §4 assumption that master data is shared
across all Fismed.

### Server action conventions (`src/app/actions/`)

Two shapes, and which one a function uses is a UI decision, not a style choice:
- `(prevState, FormData) => Promise<AksiState>` — form saves, driven by `useActionState`.
  Failures `return { error: "..." }` so the message renders in place next to the form and
  the Fismed's typing survives. Success ends in `redirect()`, except `simpanLaporan`, which
  returns `{ ok, tersimpanPada }` so the long report form can save without navigating away.
- `(FormData) => Promise<void>` — deletes and role changes, fired from plain submit buttons.
  These have nowhere to render a message, so they signal by `redirect("/path?error=<kode>")`
  / `?ok=<kode>` and the destination page renders the code.

Neither shape throws for expected failures. Validation is hand-rolled `teks()`/`tanggal()`
FormData helpers, duplicated per file on purpose; zod appears only in `actions/auth.ts`
(register, sign-in, profile). Access checks belong at the top of every action — see the
three layers above.

`masukGoogle()` is the one action that must **not** be wrapped in try/catch: `signIn`
completes by throwing its redirect to Google, so swallowing it leaves the user staring at a
page that did nothing. Google-side failures come back through `pages.error` in
`src/auth.ts`. The credentials actions pass `redirect: false` and catch only `AuthError` —
anything else rethrows, for the same reason.

### Deploying, and the Google OAuth redirect URI

Vercel's environment variables are a separate store from the gitignored `.env` — nothing in
`.env` ever reaches production. Adding or changing one there does **not** affect running
deployments either; it is injected at build time, so a redeploy is required.

Google matches the redirect URI character for character. Production is
`https://kalibrasi-radiologi.vercel.app/api/auth/callback/google`, and that exact string
must be registered under **Authorized redirect URIs** (not JavaScript origins). Preview
deployment URLs carry a per-deploy hash and therefore change on every push, so Google
sign-in can never work on a preview — use email + password there.

To read the redirect URI the app actually sends instead of guessing at a
`redirect_uri_mismatch`, POST a csrfToken to `/api/auth/signin/google` and pull
`redirect_uri` out of the `Location` header:

```bash
CSRF=$(curl -s -c /tmp/c.txt "$BASE/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
curl -s -i -b /tmp/c.txt -X POST "$BASE/api/auth/signin/google" -d "csrfToken=$CSRF" \
  | grep -i '^location:' | grep -o 'redirect_uri=[^&]*'
```

`/api/auth/providers` is the quickest check of whether Google is configured at all in a
given environment — if it lists only `credentials`, the env vars are missing there.

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
