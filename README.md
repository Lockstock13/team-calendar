# 🚀 Team Workspace & Calendar (White-Label Ready)

> Aplikasi manajemen jadwal & koordinasi tim yang dirancang khusus untuk mudah di-**self-host**! Sangat cocok untuk pengguna yang ingin mengelola datanya sendiri menggunakan akun **Supabase** gratis, maupun di-deploy pada **STB (Set Top Box) bekas** yang di-*tunneling* ke VPS.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-blue?style=flat-square&logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-ready-purple?style=flat-square)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

---

## ✨ Fitur Utama

### 🎨 White-Label & Kustomisasi (🔥 BARU!)
- **Ubah Nama & Logo**: Sesuaikan identitas aplikasi langsung dari panel Admin tanpa menyentuh kode.
- **Tema Warna Dinamis**: Pilih *Primary Color* favoritmu, dan seluruh tombol/UI aplikasi akan otomatis menyesuaikan!
- **Asset Storage**: Logo yang diunggah otomatis disimpan aman di *Supabase Storage* khusus.

### 📅 Kalender & Jadwal
- View bulan & minggu interaktif (FullCalendar).
- **Libur nasional Indonesia** otomatis via Nager.Date API.
- **Split event per anggota** — 1 jadwal multi-member = baris warna-warni yang berbeda.
- Filter per orang, klik event untuk detail.
- **List View**: Jadwal dikelompokkan per tanggal dengan tombol *update status* (Todo → On Going → Selesai).

### 📝 Notes & Kolaborasi
- **Regular Note** — Catatan berformat Markdown (bold, list, code, dll).
- **Table Note** — Format *spreadsheet* mini, cocok untuk *tracker* sederhana.
- Pin catatan, filter berdasarkan 4 kategori (Umum, Keuangan, Password, Lainnya).
- *Realtime sync* & diamankan dengan Row Level Security (RLS).

### 💬 Team Chat Realtime
- Group chat untuk seluruh tim dengan pembatas tanggal (*date divider*) otomatis.
- Tampilan gelembung obrolan lengkap dengan badge *unread*.
- *Push Notif* instan ketika ada pesan masuk.

### 🔔 Sistem Notifikasi Lengkap
- **PWA Push Notification**: Anggota akan menerima notif web di HP/Laptop tiap ada pesan atau jadwal baru.
- **Daily Reminder**: Otomatis jalan jam 06:00 pagi merangkum jadwal hari itu.
- Mendukung integrasi opsional via **Telegram Bot** & **Email (SMTP)**.

### 👑 Keamanan & Admin Panel
- **Manajemen Member**: Kick, aktifkan ulang, atau hapus permanen data login.
- **Role Permission**: Tunjuk member sebagai Admin atau kembalikan jadi Member biasa.
- Celah keamanan ditutup level infrastruktur via **Supabase SQL Triggers**.
- Tombol **Test Push Notification** untuk menguji sistem siaga member.

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
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Web Push VAPID (untuk PWA Push Notification)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@email.com

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 3. Setup Database Supabase

Buka **Supabase Dashboard → SQL Editor**, jalankan file-file berikut *secara berurutan*:

1. `supabase/schema.sql` — Bikin semua fondasi tabel utama.
2. `supabase/rls-notes.sql` — Mengamankan tabel notes.
3. `supabase/security-patch.sql` — Mencegah hacker ngubah role jadi Admin via browser.
4. `supabase/app-settings.sql` — Menyiapkan tabel dan bucket folder gambar untuk White-label kustomisasi logo.

Lalu set akun pertamamu (setelah registrasi) menjadi admin:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'email_kamu@gmail.com';
```

### 4. Generate VAPID Keys (Opsional, untuk Push Notification)

```bash
npx web-push generate-vapid-keys
```
Masukkan hasilnya ke dalam file `.env.local`.

### 5. Jalankan Aplikasi

```bash
npm run dev
# Buka http://localhost:3000
```

---

## 📦 Deploy (Vercel / VPS / STB Bekas)

Aplikasi ini sangat ringan dan bisa di-*host* di mana saja yang menjalankan Node.js.

### Opsi A: Vercel (Paling Mudah)
1. Push kodingan ini ke GitHub.
2. Import project di [Vercel](https://vercel.com).
3. Salin semua **Environment Variables** dari `.env.local` mu ke sistem Vercel.
4. Deploy! (Vercel akan otomatis mengenali file `vercel.json` untuk menjalankan *cron job daily reminder*).

### Opsi B: Self-Host VPS / STB Bekas (OpenWrt / Armbian)
Punya STB (Set Top Box) bekas Indihome (ZTE/HG680) yang sudah di-root (Armbian) atau VPS murah?
1. Install Node.js v18+ di STB/VPS kamu.
2. Clone repo ini, isi `.env.local`, jalankan `npm install` & `npm run build`.
3. Gunakan **PM2** untuk menjalankan aplikasinya di *background*: `pm2 start npm --name "team-calendar" -- start`
4. Gunakan **Cloudflare Tunnels** (cloudflared) atau Nginx Reverse Proxy (jika pakai VPS) agar aplikasi di STB-mu bisa diakses dari internet publik!

---

## 🗄️ Struktur Database

| Tabel | Keterangan | Setup RLS |
|---|---|---|
| `profiles` | Data user: nama, warna, role, preferensi notif | Terkunci, aman dengan Trigger |
| `tasks` | Jadwal: judul, tanggal, tipe, status assignees | Aman |
| `notes` | Catatan tim: markdown & table type | Aman |
| `messages` | Pesan team chat realtime | Aman |
| `app_settings`| Data kustomisasi (Judul App, Warna, Logo) | Admin Only (Write) |

---

## 📱 Install sebagai Aplikasi Mobile (PWA)

Aplikasi ini tidak butuh diunggah ke PlayStore/AppStore!
1. Buka URL aplikasimu di browser Safari / Google Chrome HP.
2. Klik tombol **Share/Options**.
3. Pilih **"Add to Home Screen"** atau **"Install App"**.
4. Aplikasi siap dipakai dengan nuansa *Native App* lengkap dengan Push Notification.

---

## 📄 Lisensi
Sistem open-source yang sengaja dibuat agar teman-teman dapat belajar *deploy*, mengatur database sendiri (Self-Host), dan memudahkan manajemen tim tanpa biaya langganan aplikasi luar. Bebas pakai!