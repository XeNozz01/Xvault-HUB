# ⬢ Xvault HUB — Website & Dasbor Server SA-MP

Website lengkap untuk server **San Andreas Multiplayer (SA-MP)**: halaman publik (beranda, tentang, kualitas,
sistem tersedia, IP & cara join, ranking, berita, aturan/whitelist, toko) plus **Dasbor Player** dan
**Dasbor Admin** yang benar-benar berfungsi, dengan API JSON + SSE (status live tiap 3 detik).

> Semua data adalah **simulasi deterministik** (seeded) yang dibuat agar struktur situs terasa nyata.
> Tidak ada database eksternal, tidak ada pembayaran, dan tidak ada data pribadi yang dikirim ke luar.

---

## 1. Menjalankan

```bash
cd web
npm install
npm start            # → http://localhost:3000
# development (auto-reload saat file server berubah):
npm run dev
# port lain:
PORT=8080 npm start
```

Pratinjau Arena memakai port **3000** dan bind `0.0.0.0`.

### Akun demo

| Peran | Username | Password | Menuju |
|---|---|---|---|
| Player | `Bagas_Wijaya` | `xvault` | `/dashboard` |
| Admin (lvl 5) | `admin` | `xvault123` | `/admin` |
| Moderator (lvl 3) | `moderator` | `xvault123` | `/admin` |

Di halaman `/login` ada tombol “akun demo” untuk mengisi otomatis. Register juga bisa (langsung masuk sebagai
akun demo, tanpa menyimpan apa pun).

## 2. Halaman

| Rute | Isi |
|---|---|
| `/` | Beranda: hero, status live 4 server, keunggulan, preview sistem, leaderboard, berita, FAQ |
| `/tentang` | Sejarah, prinsip, timeline, struktur tim, angka komunitas, grafik 30 hari |
| `/kualitas` | Skor kualitas, 6 pilar, uptime 30 hari, latency per wilayah, hardware, insiden, SLA, konsol live |
| `/sistem` | 39 sistem gamemode dalam 6 kategori + status Stabil/Beta + cheat-sheet perintah |
| `/connect` | IP address (`play.xvaulthub.id:7777/7878/7979/8080`), tabel live, port/firewall, troubleshoot |
| `/ranking` | Leaderboard (10 kolom, sortir, cari, filter faction/online, paginasi) + kartu pemain |
| `/aturan` | 10 aturan + panduan & form whitelist + prosedur banding + FAQ |
| `/toko` | Paket RC, item/VIP, metode bayar, vote rewards |
| `/news` | Patch note & event dengan filter kategori + pencarian |
| `/staff` | Tim, jam moderasi, kanal kontak, lowongan |
| `/login` | Login/registrasi (HMAC token, 12 jam) |
| `/dashboard` | Dasbor player: 9 bagian (lihat bawah) |
| `/admin` | Dasbor admin: 11 bagian (lihat bawah) |

### Dasbor Player (`/dashboard`)
Ringkasan · Statistik · Profil & Keamanan · Inventaris · Kendaraan & Aset · Dompet & Top-up (invoice + QR
demo, redeem kode, ekspor CSV) · Whitelist & Faction · Tiket & Banding (buat + balas, tersimpan di server) ·
Pengaturan (preferensi, ganti password, ekspor JSON, keluar).

### Dasbor Admin (`/admin`)
Ringkasan (KPI + grafik + donut + konsol) · Live Server (kapasitas & kontrol per node) · Konsol & Proses
(exec `/announce`, `/restart`, `/status`, `/lookup`, `/serverinfo`, filter level log) · Manajemen Pemain
(cari, filter, pilih massal, kick/ban/mute/freeze/warn/sita/koreksi uang) · Sanksi & Banding (flag XGuard,
terima/tolak banding) · Antrean Tiket (balas, tugaskan, selesaikan) · Review Whitelist (skor per aspek,
setujui/tolak, auto-approve ≥ 80) · Ekonomi (sirkulasi, arus kas, 10 rekening terbesar, harga pasar, audit) ·
Pengumuman (broadcast → SSE ke semua klien + riwayat) · Log Audit (cari + ekspor JSON) · Konfigurasi
(slot, tickrate, XGuard, toggle, backup, zona berbahaya).

Aksi admin **benar-benar mengubah state di memori server**: setelah ban, daftar pemain & log audit berubah,
dan tetap begitu sampai server di-restart.

## 3. Struktur

```
web/
├─ server/
│  ├─ index.js       Express app: rute halaman, 30+ endpoint JSON, SSE, auth HMAC, state demo
│  └─ data.js        Data engine (seeded): 240 pemain, 4 server, 12 faction, kualitas, sistem, tiket, log…
├─ public/
│  ├─ *.html         13 halaman statis (tanpa framework, tanpa build step)
│  └─ assets/
│     ├─ css/        theme.css (token+komponen) · site.css (halaman publik) · dash.css (shell dasbor)
│     ├─ js/         core.js (layout, ikon, API client, toast/modal, SSE) · charts.js (grafik SVG sendiri)
│     │              site.js (halaman publik) · dash.js (dasbor player) · admin.js (dasbor admin)
│     ├─ img/        4 ilustrasi (hero, RP, gangwar, peta) — dibuat untuk proyek ini
│     └─ fonts/      Chakra Petch + Outfit (woff2 lokal, tanpa CDN)
└─ test/
   ├─ api.js         32 uji integrasi HTTP (auth, sanksi, tiket, whitelist, broadcast, konsol, SSE, 404)
   └─ smoke.js       uji render tiap halaman di jsdom + klik semua view & modal (menangkap error JS)
```

Tanpa CSS/JS eksternal sama sekali — semua aset dilayani dari repo, jadi situs tetap jalan di jaringan tertutup.

## 4. API

```
GET  /api/health /api/config /api/overview /api/servers /api/live /api/quality
GET  /api/systems /api/rules /api/news /api/factions /api/store /api/vote /api/staff
GET  /api/leaderboard?sort=&q=&faction=&mode=&page=&per=     GET /api/players/:name
GET  /api/stream                       → SSE: tick tiap 3 dtk (online, ping, log, runtime)
POST /api/auth/login · GET /api/auth/me · GET /api/me/profile · POST /api/me/tickets · POST /api/me/topup
GET  /api/admin/{overview,players,logs,tickets,whitelist,economy,console,broadcasts}   (perlu role admin)
POST /api/admin/players/:id/action · /api/admin/players/bulk · /api/admin/tickets/:id/reply
     /api/admin/whitelist/:id/decision · /api/admin/broadcast · /api/admin/console/exec
```

`Authorization: Bearer <token>`. Token ditandatangani HMAC-SHA256 dengan `SECRET` (env) dan kedaluwarsa 12 jam.

## 5. Menghubungkan ke server SA-MP asli

Struktur sudah dipisah supaya penggantian data cuma perlu di satu lapis:

1. **Ganti sumber data** di `server/data.js` — fungsi `build*()` / `liveCounts()` jadi query MySQL/SQLite
   gamemode (kolom `players`, `factions`, `bans`, `vehicles`, `houses`, `logs`) atau panggil RPC dari pawn.
2. **Status online**: query SA-MP (`samp-query`/`serverbrowser`) tiap 10–30 detik, isi `liveCounts()`.
3. **Aksi admin**: `POST /api/admin/players/:id/action` tinggal diteruskan ke RCON gamemode
   (`/akick`, `/aban`, `/afreeze`) lewat HTTP plugin/AMP, pertahankan `logAdmin()` untuk audit trail.
4. **Pentan-pentan produksi**: ganti token dengan cookie `httpOnly` + SameSite, hash password dengan
   argon2id, pasang rate-limit & CSRF, validasi input (mis. whitelist), HTTPS di belakang nginx, dan
   simpan log audit di DB append-only.

## 6. Pengujian

```bash
npm start &        # server harus hidup
npm test           # uji API (32 kasus)
npm run test:ui    # uji render semua halaman + klik view/modal di jsdom
npm run test:all
```

## 7. Catatan hukum & merek

GTA: San Andreas adalah milik Rockstar Games; SA-MP adalah proyek open-source komunitas. Xvault HUB di sini
adalah **proyek demo/fan-made** dan tidak berafiliasi. Aset visual pada repo ini dibuat khusus (bukan
cuplikan game asli), dan konten toko/status “VIP” hanya simulasi.
