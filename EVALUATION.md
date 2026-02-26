# 🔍 EVALUASI TEKNIS & DESAIN — Team Calendar Web App

> **Tanggal Review:** 26 Februari 2026  
> **Versi:** v1.0 (feature/admin-customization branch)  
> **Stack:** Next.js 14 + Supabase + Tailwind CSS 3 + PWA

---

## 📊 RINGKASAN SKOR

| Aspek | Skor | Keterangan |
|---|:---:|---|
| **Arsitektur & Struktur Kode** | 7.5/10 | Solid, tapi ada beberapa potensi refactor |
| **Keamanan (Security)** | 8/10 | RLS + Trigger sudah kuat, beberapa titik perlu hardening |
| **UI/UX & Desain** | 7/10 | Desain bersih ala Notion, perlu lebih polish di Dark Mode & konsistensi |
| **Performa & Optimisasi** | 6.5/10 | Belum ada lazy loading, pagination di beberapa tempat belum optimal |
| **Fitur & Kelengkapan** | 8.5/10 | Sangat kaya fitur untuk ukuran MVP |
| **Mobile Experience (PWA)** | 7.5/10 | Navigasi mobile bagus, tapi ada gap UX di beberapa form |
| **Kesiapan Produksi** | 6/10 | Error handling & edge case masih bisa ditingkatkan |
| **Kemudahan Deployment** | 8/10 | Dokumentasi SQL terurut, env jelas |

**Total Rata-Rata: 7.4 / 10 — SOLID MVP, Layak Jual dengan Polishing!** 🚀

---

## 🏗️ BAGIAN 1: ARSITEKTUR & STRUKTUR KODE

### ✅ Yang Sudah Bagus
1. **Pemisahan Concern yang Jelas**: Setiap halaman punya komponen view-nya sendiri (`DashboardView`, `CalendarView`, `ChatView`, dst). Ini memudahkan maintenance.
2. **Global Context Pattern**: `providers.js` sebagai pusat state management (session, tasks, users, appSettings) — efektif dan simple. Tidak over-engineering.
3. **SQL Schema Terstruktur**: File `schema.sql` modular dengan section-section yang jelas (Profiles, Tasks, Triggers, RLS). Tambahan `security-patch.sql`, `rls-notes.sql`, dan `app-settings.sql` menunjukkan pendekatan patch-based migration yang disiplin.
4. **Server-Side API Routes**: Notifikasi ditangani secara server-side (`/api/notify`, `/api/notify-chat`, `/api/admin/delete-member`) — ini benar secara arsitektur karena menyembunyikan credentials dari browser.

### ⚠️ Area Perbaikan

| # | Masalah | Dampak | Prioritas |
|---|---|---|:---:|
| A1 | **`providers.js` terlalu besar (458 baris)** — menangani auth, tasks, users, settings, task CRUD, dan rendering sekaligus | Sulit dibaca/debug untuk kontributor baru | 🟡 Sedang |
| A2 | **Komponen `Avatar` diduplikasi** di 6+ file (`DashboardView`, `CalendarView`, `ListView`, `ChatView`, `ReportView`, `AdminPage`). Seharusnya jadi 1 shared component. | Perubahan styling harus di-copy paste ke 6 tempat | 🟡 Sedang |
| A3 | **`ReportView.jsx` sangat besar (740 baris)** — menggabungkan tabel harian, view per-fotografer, export CSV, dan print view dalam 1 file. | Berat jika diubah, rentan konflik Git | 🟢 Rendah |
| A4 | **Tidak ada Error Boundary** — jika 1 komponen crash, seluruh app berhenti tanpa pesan yang jelas. | Pengalaman user buruk saat crash | 🟡 Sedang |
| A5 | **Inline function `MemberRow` di dalam `AdminPage` render** — ini menghilangkan memoization dan bikin component re-create tiap render | Performa halaman admin bisa lebih baik | 🟢 Rendah |

---

## 🔒 BAGIAN 2: KEAMANAN

### ✅ Yang Sudah Bagus
1. **RLS di semua tabel utama** (`profiles`, `tasks`, `messages`, `notes`, `app_settings`) — setiap query database difilter otomatis.
2. **Trigger `protect_profile_columns`** — mencegah member biasa mengubah `role` atau `is_active` mereka sendiri via client.
3. **Service Role Key disimpan di server** — API routes `/api/admin/delete-member` menggunakan `SUPABASE_SERVICE_ROLE_KEY` untuk operasi admin-only.
4. **`handle_new_user` trigger** pada `auth.users` — profile otomatis dibuat dengan role `member` dan `is_active: true`.

### ⚠️ Area Perbaikan

| # | Masalah | Dampak | Prioritas |
|---|---|---|:---:|
| S1 | **Admin page hanya cek role di client** — endpoint `/api/admin/delete-member` harus juga memvalidasi role admin dari sisi server, bukan percaya `requesterId` dari body request. | Potensi user biasa mengirim request delete manual | 🔴 Tinggi |
| S2 | **Rate limiting tidak ada** di semua API routes (`/api/notify`, `/api/notify-chat`). | Bisa di-abuse untuk spam push notification | 🟡 Sedang |
| S3 | **Chat tidak punya batas panjang pesan** — textarea tidak dibatasi karakter. | Bisa flood database dengan pesan sangat panjang | 🟡 Sedang |
| S4 | **Logo upload tidak dibatasi ukuran file** — hanya cek `file.type.startsWith("image/")`, tapi tidak validasi size (2MB disebutkan di UI tapi tidak di-enforce di kode). | Bisa upload file gambar sangat besar | 🟡 Sedang |
| S5 | **`app_settings` SQL script melakukan `INSERT ... ON CONFLICT DO NOTHING`** — bagus, tapi tidak ada `UNIQUE`-constraint eksplisit di selain `id`. Aman selama hanya 1 row. | Rendah, aman secara desain | 🟢 Rendah |

---

## 🎨 BAGIAN 3: UI/UX & DESAIN

### ✅ Yang Sudah Bagus
1. **Desain Notion-like** yang konsisten — warna netral, tipografi rapi, spacing proporsional.
2. **Micro-interactions**: Hover effects di task rows (chevron muncul), avatar scale, button press scale-95.
3. **Mobile Bottom Navigation** yang well-designed — 6 tab dengan ikon + label, unread badge di Chat.
4. **Toast & Confirm Modal system** — menggantikan `alert()` browser yang jelek, UX jauh lebih premium.
5. **Empty States** yang kreatif — emoji + pesan yang relevan dan mengundang senyuman (contoh: "🌬️ Kosong nih. Bisa nyantai atau ngedit foto kemarin.").
6. **Bilingual support** (ID/EN) di hampir semua komponen.
7. **Glassmorphism** di beberapa UI elemens (Calendar wrap, Chat container).
8. **FullCalendar styling override** yang rapi — pills button, today highlight bulat, weekend/holiday cell tinting.

### ⚠️ Area Perbaikan

| # | Masalah | Dampak | Prioritas |
|---|---|---|:---:|
| D1 | **Dark Mode styling belum sempurna** — banyak `bg-zinc-50`, `bg-blue-50`, `text-zinc-900` yang hard-coded tanpa dark-variant. Contoh: Card di DashboardView, info box di Admin, DateDivider di Chat. | Tampilan tidak enak di Dark Mode | 🔴 Tinggi |
| D2 | **CSS class `bg-background 95`** (dengan spasi) muncul di banyak tempat — ini BUKAN valid Tailwind class. Kemungkinan error typo (seharusnya `bg-background/95`). | CSS yang salah bisa terlihat aneh di browser tertentu | 🔴 Tinggi |
| D3 | **`text-foreground/90/90`** — double opacity modifier tidak valid di Tailwind. Muncul di `DashboardView.jsx`. | Bisa gagal di-parse oleh Tailwind | 🟡 Sedang |
| D4 | **Skeleton Loading belum ada** — saat membuka halaman pertama kali, user hanya lihat spinner. Skeleton UI lebih modern dan memberi feedback visual yang lebih informatif. | Kesan "app loading lambat" padahal sebenarnya normal | 🟡 Sedang |
| D5 | **TaskForm hardcoded Bahasa Indonesia** — `label` seperti "Tipe Jadwal", "Judul", "Catatan", "Tanggal", "Mulai/Selesai", "Fotografer", "Batal", "Simpan", "Menyimpan..." tidak mengikuti `language` context. | Inkonsisten untuk user yang memilih English | 🟡 Sedang |
| D6 | **Admin page Catatan section hardcoded Bahasa Indonesia** — "Member yang di-Kick...", "Tombol Hapus muncul...", "Admin punya akses...". | Tidak ikut bilingual | 🟢 Rendah |
| D7 | **Color picker di Admin sangat minimalis** — hanya native `<input type="color">`. Bisa ditambah preset warna populer (seperti di Profile). | UX bisa lebih elegan | 🟢 Rendah |
| D8 | **Print stylesheet** untuk Report hanya pakai `hidden` toggle, belum ada dedicated `@media print` rules. | Hasil print bisa kurang rapi | 🟢 Rendah |

---

## ⚡ BAGIAN 4: PERFORMA & OPTIMISASI

### ✅ Yang Sudah Bagus
1. **Optimistic UI di Chat** — pesan langsung muncul sebelum server response.
2. **useMemo** digunakan dengan benar di filtering/grouping di `DashboardView`, `CalendarView`, `ReportView`.
3. **Realtime subscriptions** termanajemen (`supabase.removeChannel` di cleanup).
4. **FullCalendar events** di-memoize dengan baik sebelum dikirim ke komponen.

### ⚠️ Area Perbaikan

| # | Masalah | Dampak | Prioritas |
|---|---|---|:---:|
| P1 | **Chat memuat 200 pesan sekaligus** (`limit(200)`) — tidak ada infinite scroll/pagination. | RAM HP bisa tinggi seiring waktu, render lambat | 🟡 Sedang |
| P2 | **Tasks di-fetch ulang setiap kali ada perubahan realtime** (`fetchTasks()` dipanggil di channel listener) — seharusnya bisa upsert langsung dari payload tanpa full re-fetch. | Roundtrip database tidak perlu | 🟡 Sedang |
| P3 | **Notes `limit(count + 1)` pattern** — sudah ada, tapi increment hanya +12. Tidak ada virtualisasi untuk list sangat panjang. | Akan slow setelah 100+ notes | 🟢 Rendah |
| P4 | **Holiday API fetch** terjadi setiap kali CalendarView mount — seharusnya bisa di-cache di localStorage atau via SWR/React Query. | Request API berulang tiap kali buka Kalender | 🟢 Rendah |
| P5 | **`providers.js` menjalankan `fetchSettings()` tanpa error handling** — jika `app_settings` table belum ada (user baru belum jalankan SQL), seluruh app bisa freeze/silent fail. | Critical bootstrap failure tanpa pesan jelas | 🟡 Sedang |

---

## 📱 BAGIAN 5: MOBILE & PWA

### ✅ Yang Sudah Bagus
1. **Service Worker** (`sw.js`) terdaftar dengan update detection.
2. **Web Manifest** lengkap untuk PWA installability (icon-192, icon-512).
3. **Safe area inset** ditangani di CSS (`env(safe-area-inset-bottom)`).
4. **Tap highlight** di-disable untuk feel native.
5. **Mobile-first bottom nav** dengan 6 menu utama.
6. **Modal form (TaskForm) menggunakan `rounded-t-2xl` pattern** — mirip native bottom sheet.

### ⚠️ Area Perbaikan

| # | Masalah | Dampak | Prioritas |
|---|---|---|:---:|
| M1 | **Calendar view di mobile sangat padat** — event text sangat kecil. Belum ada optimasi tampilan khusus mobile (misal: dot-only mode). | Sulit dibaca jadwal di HP | 🟡 Sedang |
| M2 | **Pull-to-refresh tidak ada** — user harus reload manual untuk update data terbaru (selain realtime events). | Terasa kurang native | 🟢 Rendah |
| M3 | **ListView action buttons (Edit/Delete) hanya muncul saat hover** (`opacity-0 group-hover:opacity-100`). Di touchscreen tidak ada hover! | Button pada mobile nyaris tidak bisa diakses kecuali user tahu tap-and-holdnya | 🔴 Tinggi |
| M4 | **Offline support minimal** — SW hanya untuk push notification, belum ada cache strategy untuk halaman/aset statis. | App blank kalau internet mati | 🟡 Sedang |

---

## 🧩 BAGIAN 6: FITUR YANG MASIH KURANG (Feature Gaps)

| # | Fitur | Penjelasan | Nilai Jual |
|---|---|---|:---:|
| F1 | **Search / Filter Global** | Saat ini tidak ada cara untuk mencari jadwal/notes berdasarkan keyword. | ⭐⭐⭐ |
| F2 | **Recurring Tasks (Jadwal Berulang)** | Fotografer sering punya jadwal rutin mingguan/bulanan. Saat ini harus input manual satu per satu. | ⭐⭐⭐ |
| F3 | **Activity Log / Audit Trail** | Tidak ada riwayat "siapa mengubah apa". Penting untuk akuntabilitas tim. | ⭐⭐ |
| F4 | **File Attachment di Task** | Referensi foto, PDF brief, dll belum bisa dilampirkan ke jadwal. | ⭐⭐ |
| F5 | **Multi-language Picker di Auth** | Di halaman login, tidak ada cara mengganti bahasa sebelum masuk. | ⭐ |
| F6 | **User Invitation System** | Admin tidak bisa kirim link invite langsung. User harus register sendiri. | ⭐⭐ |

---

## 🗺️ RENCANA PERBAIKAN (ROADMAP)

### 🔴 Fase 1: Critical Fix (Minggu Ini)
*Prioritas keamanan & bug yang menghalangi kenyamanan pemakaian.*

| # | Task | File Target | Est. |
|---|---|---|:---:|
| 1.1 | Fix CSS typo `bg-background 95` → `bg-background/95` | DashboardView, CalendarView, ChatView, MobileNav | 15 min |
| 1.2 | Fix CSS typo `text-foreground/90/90` → `text-foreground/90` | DashboardView | 5 min |
| 1.3 | Validasi admin role di server-side `/api/admin/delete-member` | `app/api/admin/delete-member/route.js` | 30 min |
| 1.4 | Buat ListView action buttons selalu visible (atau long-press menu) di mobile | `ListView.jsx` | 30 min |
| 1.5 | Enforce file size limit (2MB) pada logo upload | `admin/page.js` | 10 min |
| 1.6 | Tambahkan maxLength pada chat input | `ChatView.jsx` | 5 min |

### 🟡 Fase 2: Polish & Consistency (Minggu Depan)
*Meningkatkan kualitas tampilan, dark mode, dan bilingual.*

| # | Task | File Target | Est. |
|---|---|---|:---:|
| 2.1 | Audit & fix semua Dark Mode styling (bg-zinc-50, bg-blue-50, dsb) | Semua komponen view | 2-3 jam |
| 2.2 | Buat shared `<Avatar>` component, hapus duplikasi | `components/Avatar.jsx`, semua view | 1 jam |
| 2.3 | Bilingual-kan TaskForm (label "Judul", "Tanggal", dll) | `TaskForm.jsx` | 30 min |
| 2.4 | Bilingual-kan Admin info box | `admin/page.js` | 15 min |
| 2.5 | Tambah error handling di `fetchSettings()` agar tidak silent crash | `providers.js` | 15 min |
| 2.6 | Tambah fallback graceful di providers jika `app_settings` table belum di-setup | `providers.js` | 20 min |

### 🟢 Fase 3: Performance & UX Upgrade (Bulan Depan)
*Meningkatkan kecepatan dan kesan profesional.*

| # | Task | File Target | Est. |
|---|---|---|:---:|
| 3.1 | Implementasi chat pagination / infinite scroll | `ChatView.jsx` | 2 jam |
| 3.2 | Skeleton loading screen (gantikan spinner) | Semua halaman utama | 2 jam |
| 3.3 | Cache Holiday API di localStorage | `CalendarView.jsx` | 30 min |
| 3.4 | Implementasi search/filter bar di header | `Header.jsx`, `providers.js` | 2 jam |
| 3.5 | Ubah realtime tasks handler dari full-refetch jadi upsert | `providers.js` | 1 jam |
| 3.6 | Tambah rate limiter middleware di API routes | `app/api/*` | 1 jam |
| 3.7 | Refactor `providers.js` — pisahkan auth, task, dan settings logic | `providers.js` → separate hooks | 2 jam |

### 🔵 Fase 4: Fitur Premium (Opsional / Fase Jual Upgrade)
*Fitur-fitur yang bisa jadi pembeda dari kompetitor.*

| # | Task | Est. |
|---|---|:---:|
| 4.1 | Recurring tasks (jadwal berulang) | 4 jam |
| 4.2 | Activity log / audit trail | 3 jam |
| 4.3 | File attachment pada task | 3 jam |
| 4.4 | Sistem undangan member (invite link) | 2 jam |
| 4.5 | Offline mode (SW cache strategy + Queue) | 4 jam |

---

## 💡 KESIMPULAN

Aplikasi ini sudah **sangat solid untuk ukuran MVP**. Fiturnya lengkap (Kalender, Chat, Notes, Report, Admin, Push Notif, White-label), arsitektur bersih, dan RLS/security sudah di level menengah-ke-atas.

**Kekuatan utama:**
- Fitur lengkap "semua dalam satu".
- Desain clean Notion-like yang tidak membosankan.
- PWA-ready — bisa dipasang layaknya app native.
- White-label ready — nama & warna bisa disesuaikan tanpa coding.

**Kelemahan utama:**
- Dark Mode styling belum tuntas.
- Beberapa CSS typo yang bisa bikin tampilan inconsistent.
- Mobile UX di ListView perlu diperbaiki (action buttons tersembunyi).
- Error handling masih minim di beberapa titik kritis.

**Rekomendasi:** Selesaikan **Fase 1 (Critical Fix)** dulu sebelum aplikasi dijual atau didemonstrasikan ke klien potensial. Fase 2 bisa dilakukan paralel saat testing. Fase 3 & 4 dijadwalkan sebagai iterasi setelah customer feedback pertama masuk.

---

*Dibuat oleh Antigravity AI — Review Partner untuk Team Calendar Project. 🤖*
