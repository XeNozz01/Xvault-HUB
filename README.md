# Xvault HUB

Repo ini berisi dua proyek:

## 1. `main.lua` — XvaultHUB UI library (Roblox)
Script UI “Premium HUB” bergaya draggable window dengan gradien ungu (TweenService, CoreGui, `syn.protect_gui`).
Tidak diubah oleh pekerjaan lain di repo ini.

## 2. `web/` — Website & dasbor server SA-MP
Situs lengkap San Andreas Multiplayer: beranda, tentang, kualitas layanan, sistem gamemode yang tersedia,
IP address & cara join, ranking, berita, aturan/whitelist, toko — plus **dasbor player** dan **dasbor admin**
dengan API JSON + status live (SSE). Berjalan tanpa database dan tanpa CDN.

```bash
cd web && npm install && npm start      # http://localhost:3000
```

Login demo: `Bagas_Wijaya / xvault` (player) · `admin / xvault123` (admin).
Dokumentasi lengkap: [`web/README.md`](web/README.md).
