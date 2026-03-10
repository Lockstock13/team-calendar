# Equipment Feature Implementation Plan

## Overview
Menambahkan fitur manajemen alat (equipment) yang dapat ditautkan kepada setiap fotografer pada saat penugasan (add task).

## Database Schema (Supabase)
### 1. `equipment` (Table Baru)
- `id` (uuid, PK)
- `name` (text) - Nama alat (contoh: Sony A7 IV, Lensa 24-70mm)
- `category` (text) - Kategori (Kamera, Lensa, Lighting, Drone, dll)
- `status` (text) - Status alat (Tersedia, Dipinjam, Rusak)
- `created_at` (timestamp)

### 2. `task_equipment` (Table Baru)
- `id` (uuid, PK)
- `task_id` (uuid, FK ke table tasks, cascade delete)
- `equipment_id` (uuid, FK ke table equipment)
- `user_id` (uuid, FK ke table users) - Fotografer yang dipinjamkan/menggunakan alat ini pada task tersebut.
- `created_at` (timestamp)

## Frontend Changes
### 1. Halaman Equipment (Sync with another page)
- **Path:** `/app/equipment/page.jsx`
- **Tujuan:** Halaman CRUD (Create, Read, Update, Delete) untuk daftar alat-alat/equipment yang dimiliki studio.
- Menyinkronkan daftar ini supaya bisa dipilih di halaman task.

### 2. Form Tambah/Edit Task (`/app/components/TaskForm.jsx`)
- Modifikasi bagian "Assignees" (Anggota).
- Saat seorang fotografer dipilih, akan muncul opsi dropdown/modal kecil untuk menambahkan "Pilih Alat/Equipment" untuk fotografer tersebut dari tabel `equipment`.
- Data `equipment` ditarik dan difilter agar alat yang sudah digunakan di waktu (tanggal) yang sama tidak double-book (opsional, sebagai validasi).
- State diupdate untuk menyimpan `equipment_ids` per `user_id`.

### 3. Detail Task (`/app/components/TaskDetailModal.jsx`)
- Pada modal detail jadwal, di sebelah nama masing-masing fotografer/anggota akan ditampilkan list nama alat yang mereka gunakan.

## Backend/API Changes (Next.js & Supabase)
- **POST /api/tasks (atau hooks terkait)**: Setelah task berhasil disimpan, lakukan instert ke tabel `task_equipment` untuk menautkan `task_id`, `equipment_id`, dan `user_id`.
- **GET /api/tasks**: Relasikan (JOIN) query agar data equipment yang dibawa tiap user ter-fetch dan bisa dirender di kalender/dashboard.

---

> Rencana ini akan dibuatkan file artifact `implementation_plan.md` lengkap untuk di-review terlebih dahulu.
