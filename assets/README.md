# LegalWorkspace (Assistenku)

Implementasi login passwordless berbasis nomor dokumen dengan verifikasi registry Supabase, audit log append-only, serta skeleton API operasional (auth, overtime, sinkron libur nasional). Semua operasi sensitif dipaksa melalui service role Supabase dan verifikasi Firebase ID Token.

## Arsitektur singkat
- **Frontend statis** di `/apps/*` menggunakan Firebase Email Link untuk sign-in.
- **API serverless** di `/api/*` memverifikasi Firebase ID Token via `firebase-admin`, mengecek registry Supabase, dan mencatat audit.
- **Database**: Supabase Postgres dengan tabel registry, doc_instances, overtime, holidays, audit_logs.
- **PDF export**: memakai mesin yang sudah ada `/api/pdf.js` dan `/documents/render.js` (akses dibatasi via header token + doc_number).

## Alur end-to-end
1. **Admin** mendaftarkan dokumen (registry) menggunakan Supabase service role key. Email admin hanya `kontakassistenku@gmail.com`.
2. **Portal Login** (`/apps/login`):
   - Pengguna mengisi email + nomor dokumen sesuai role (Client = IPL/Addendum, Mitra = SPL/Quotation). Admin cukup email.
   - Frontend memanggil `POST /api/auth/request-link` untuk validasi registry → jika lolos, Firebase mengirim email link.
3. **Verifikasi server**:
   - Setelah klik tautan email, frontend memanggil `GET /api/auth/me` dengan Bearer ID token + `x-doc-number` untuk mendapatkan role/scope yang diverifikasi backend.
4. **Lifecycle dokumen** (kerangka):
   - Doc instance tersimpan di tabel `doc_instances` dengan status/version/hash/scope.
   - Mitra mengisi LDL, upload foto, submit → status `LOCKED_BY_SYSTEM` (backend menolak edit setelah kunci).
   - Client melihat LDL + foto, approve/reject, tanda tangan → rekam pada tabel `approvals` & `signatures`.
   - PDF diekspor via `GET /api/pdf` dengan akses diverifikasi server-side dan mencantumkan doc_number/status/hash/timestamp.
5. **Lembur & Hari libur**:
   - Admin men-set kebijakan lembur via `POST /api/overtime/policy/upsert`.
   - Mitra mengajukan lembur (`POST /api/overtime/request`), Client memutuskan (`POST /api/overtime/decision`).
   - Sinkron hari libur dari Google Calendar via `POST /api/holidays/sync`, tersaji untuk validasi kebijakan.

## Menjalankan lokal
1. Pastikan env berikut tersedia: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_API_KEY`.
2. Salin `assets/firebase-config.sample.js` ke `assets/firebase-config.js` dan isi kredensial Firebase web.
3. Jalankan dev server (misal `vercel dev` atau static server) lalu buka `/apps/login`.

## Endpoint aktif
- `POST /api/auth/request-link` — validasi registry sebelum kirim email link.
- `GET /api/auth/me` — verifikasi ID token + scope dokumen.
- `GET /api/holidays` — daftar cache hari libur (admin only).
- `POST /api/holidays/sync` — sinkron Google Calendar ke cache + audit.
- `GET /api/overtime/policy` — ambil kebijakan lembur (admin).
- `POST /api/overtime/policy/upsert` — set kebijakan lembur (admin).
- `POST /api/overtime/request` — ajukan lembur (mitra).
- `POST /api/overtime/decision` — approve/reject lembur (client).
- `GET /api/overtime/list` — daftar lembur (role-aware).

## Supabase migration (SQL)
Lihat `supabase/migrations/2024-legalworkspace.sql` untuk definisi tabel + RLS. Seed development disediakan di `supabase/dev-seed.sql` (jangan jalankan di produksi).
