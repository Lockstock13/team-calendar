# 📸 Still Photo Team Calendar

> Aplikasi manajemen jadwal & koordinasi tim fotografer — Progressive Web App (PWA) berbasis Next.js + Supabase.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-blue?style=flat-square&logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-ready-purple?style=flat-square)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

---

## ✨ Fitur

### 📅 Kalender
- View bulan & minggu (FullCalendar)
- **Libur nasional Indonesia** otomatis (Nager.Date API)
- **Split event per anggota** — 1 jadwal multi-member = N blok warna berbeda
- Filter per fotografer
- Klik event → detail modal

### 📋 Jadwal (List View)
- Grouped by tanggal
- Update status: Todo → On Going → Selesai
- Edit & hapus inline

### 📊 Dashboard
- Stat hari ini & bulan ini
- **My Schedule** — jadwal bulan ini personal per akun

### 📈 Report
- Laporan bulanan per fotografer
- Export CSV
- Collapsible detail per orang

### 📝 Notes
- **Regular Note** — Markdown support (bold, italic, heading, list, code, dll)
- **Table Note** — spreadsheet sederhana, add/remove row & kolom
- Pin catatan penting
- Kategori: Umum, Keuangan, Password, Lainnya
- Expand full-view modal
- Realtime sync

### 💬 Team Chat
- Group chat realtime seluruh tim
- Bubble chat dengan warna akun
- Unread badge di nav
- Push notif saat ada pesan baru
- Date divider otomatis

### 🔔 Notifikasi
- **PWA Push Notification** ke semua member:
  - Setiap ada jadwal baru/update
  - Setiap pesan chat baru
  - Daily reminder jam 06:00 WIB (semua jadwal hari itu)
- Telegram (personal + group broadcast)
- Email (SMTP)

### 👑 Admin Panel
- Manajemen member: aktifkan, nonaktifkan (kick), hapus permanen
- Ganti role admin/member
- **Test Push Notification** ke semua member

### 👤 Profil
- Edit nama & warna avatar
- Ganti password
- Kelola preferensi notifikasi (Push, Telegram, Email)
- Integrasi Telegram Chat ID

---

## 🚀 Setup & Instalasi

### 1. Clone & Install

```bash
git clone https://github.com/username/team-calendar.git
cd team-calendar
npm install
```

### 2. Buat File `.env.local`

```env
# Supabase (WAJIB)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3030

# Web Push VAPID (untuk PWA Push Notification)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@email.com

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Email SMTP (opsional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password
SMTP_FROM=email@gmail.com

# Cron security (opsional, untuk Vercel cron)
CRON_SECRET=random_secret_string

# Distributed rate limit (opsional, direkomendasikan untuk production multi-instance)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# Health endpoint protection (opsional, direkomendasikan)
HEALTHCHECK_SECRET=your-health-secret
```

### 3. Setup Supabase

Buka **Supabase Dashboard → SQL Editor**, jalankan file:

```
supabase/schema.sql
```

Jika project sudah existing (bukan fresh install), lanjut jalankan:

```
supabase/migrations/2026-03-05-phase3-schema-reliability.sql
```

Checklist validasi setelah apply SQL:

```
docs/SCHEMA_VALIDATION_CHECKLIST.md
```

Lalu set admin pertama:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'email_kamu@gmail.com';
```

### 4. Generate VAPID Keys (untuk Push Notification)

```bash
npx web-push generate-vapid-keys
```

Masukkan hasilnya ke `.env.local`.

### 5. Jalankan

```bash
npm run dev
# Buka http://localhost:3030
```

---

## 📦 Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Isi semua **Environment Variables** dari `.env.local`
4. Deploy — Vercel otomatis baca `vercel.json` untuk cron job daily reminder

---

## 🗄️ Struktur Database

| Tabel | Keterangan |
|---|---|
| `profiles` | Data user: nama, warna, role, preferensi notif, push subscription |
| `tasks` | Jadwal: judul, tanggal, assignees, tipe, status |
| `notes` | Catatan tim: markdown & table type |
| `messages` | Pesan team chat |

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| Calendar | FullCalendar v6 |
| Push Notif | Web Push (VAPID) |
| PWA | Service Worker + Web Manifest |
| Deploy | Vercel |

---

## 📁 Struktur Project

```
app/
├── components/
│   ├── AuthForm.jsx       # Login & register
│   ├── Header.jsx         # Navigasi utama
│   ├── DashboardView.jsx  # Dashboard + My Schedule
│   ├── CalendarView.jsx   # Kalender + libur nasional
│   ├── ListView.jsx       # List semua jadwal
│   ├── TaskForm.jsx       # Form tambah/edit jadwal
│   ├── NotesView.jsx      # Catatan (MD + Table)
│   ├── ReportView.jsx     # Laporan bulanan
│   ├── ChatView.jsx       # Team chat realtime
│   └── PushInit.jsx       # Service worker init
├── api/
│   ├── notify/            # Push notif jadwal → semua member
│   ├── notify-chat/       # Push notif chat → semua member
│   ├── cron/daily-reminder/ # Cron job 06:00 WIB
│   └── admin/delete-member/ # Hapus member permanen
├── admin/                 # Halaman admin panel
├── profile/               # Halaman profil user
└── page.js                # Main app

lib/
├── supabase.js            # Supabase client
├── webpush.js             # Web Push helper
├── email.js               # Nodemailer helper
└── telegram.js            # Telegram Bot helper

supabase/
└── schema.sql             # Full database schema + migrations

public/
├── sw.js                  # Service Worker
└── manifest.json          # PWA manifest
```

---

## 📱 Install sebagai PWA

Di browser mobile (Chrome/Safari):
1. Buka app di browser
2. Tap **"Add to Home Screen"** / **"Install App"**
3. App bisa dipakai seperti native app

---

## 🔒 Environment Variables — Mana yang Wajib?

| Variable | Wajib? | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Untuk hapus member & push broadcast |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅* | Wajib kalau pakai Push Notif |
| `VAPID_PRIVATE_KEY` | ✅* | Wajib kalau pakai Push Notif |
| `TELEGRAM_BOT_TOKEN` | ❌ | Opsional |
| `SMTP_USER` | ❌ | Opsional |
| `UPSTASH_REDIS_REST_URL` | ❌ | Opsional (recommended production) |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | Opsional (recommended production) |
| `HEALTHCHECK_SECRET` | ❌ | Opsional (protect `/api/health/system`) |

Catatan: jika variabel Upstash tidak diisi, app otomatis fallback ke in-memory rate limiter.

---

## 📄 License

MIT — bebas digunakan dan dimodifikasi.

---

## Update & Evaluation Workflow

- Latest update (2026-03-05): Phase 1 continued - UI feedback consistency (confirm dialog + shared toast standardization on key workflows, plus desktop shortcut hint).
- Upgrade phases: `docs/UPGRADE_PHASES.md`
- Update log: `docs/UPDATE_LOG.md`
- Evaluation entrypoint (wajib dibaca dulu sebelum evaluasi): `docs/EVALUATION_ENTRYPOINT.md`
- Notification timezone policy: `docs/NOTIFICATION_TIME_POLICY.md`
- Smoke test checklist: `docs/SMOKE_TEST_CHECKLIST.md`
- Observability baseline: `docs/OBSERVABILITY_BASELINE.md`

> Rule: sebelum evaluasi file/fitur apa pun, baca `docs/EVALUATION_ENTRYPOINT.md` lalu `docs/UPDATE_LOG.md`.

---

<p align="center">Made with ☕ for Still Photo Team</p>
