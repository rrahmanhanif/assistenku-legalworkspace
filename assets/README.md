## Firebase Configuration

Salin file berikut:
assets/firebase-config.sample.js → assets/firebase-config.js

Isi dengan konfigurasi Firebase project Anda
(Project Settings → General → SDK setup and configuration).

# Assistenku Legal Workspace (Passwordless Login + Registry Seeds)

Repositori ini menyiapkan alur login berbasis nomor dokumen (IPL/Addendum untuk Client, SPL/Quotation untuk Mitra, email khusus untuk Admin) tanpa input OTP manual. Email link dikirim via Firebase hanya bila validasi registry sukses.

## Alur login ringkas
- **Admin**: masukkan email `kontakassistenku@gmail.com` → kirim tautan → klik tautan → masuk portal Admin.
- **Client**: masukkan email + nomor dokumen IPL/Addendum yang telah didaftarkan Admin → validasi registry → kirim tautan → klik tautan → masuk portal Client sesuai scope dokumen.
- **Mitra**: masukkan email + nomor dokumen SPL/Quotation yang telah didaftarkan Admin → validasi registry → kirim tautan → klik tautan → masuk portal Mitra sesuai scope dokumen.
- Tidak ada input OTP manual. Context login disimpan (role, docType, docNumber) dan dipakai saat auto-redirect portal.

## Endpoint validasi (dev sample)
- `POST /api/auth/request-link` memeriksa kecocokan email & docNumber terhadap seed registry (`documents/seed/registry.json`).
- Respon berhasil menyertakan `docType` yang dipakai untuk membangun continue URL Firebase.
- Implementasi ini bersifat sample/dev; produksi tetap perlu verifikasi Firebase ID token + Supabase service role di backend sebelum mengirim email link.

## Seed data contoh
Semua berada di `documents/seed/`:
- `registry.json` — admin utama + contoh registry IPL/Addendum/SPL/Quotation.
- `overtime-policy.json` — contoh policy lembur untuk scope SPL & Quotation.
- `overtime-requests.json` — contoh pengajuan lembur (PENDING/APPROVED).
- `holidays-cache.json` — contoh hasil sinkron kalender libur.

## Field mapping templates
- `documents/templates/_fields.json` memetakan tipe dokumen ke file template (tidak mengubah isi legal) dan daftar field yang diisi Admin/Mitra.
- Template asli tetap berada di `documents/templates/*.html` tanpa perubahan teks legal.

## Rencana operasional (ringkas)
1. Admin registrasi dokumen (isi fields sesuai `_fields.json`) dan menyimpan nomor dokumen yang dipakai login.
2. Pengguna portal menggunakan email-link login sesuai registry di atas.
3. Setelah login, portal membaca session (`iplAccess`) untuk menentukan scope docType/docNumber.
4. API server-side wajib memverifikasi Firebase ID token, membatasi akses berdasarkan scope, serta mencatat audit log untuk seluruh aksi (registrasi dokumen, login, submit LDL, approve/reject, tanda tangan, export PDF, lembur, sinkron hari libur).

## Catatan keamanan
- Jangan menambahkan authorized domain selain `legalworkspace.assistenku.com` dan domain dev yang valid.
- Continue URL Firebase dibangun dengan base URL yang dikonfigurasi (lihat `apps/shared/firebase.js`).
- Semua operasi sensitif (registry check final, audit log, CRUD Supabase) harus dilakukan di backend; file ini hanya contoh alur UI.
