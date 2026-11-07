# OpenMontage Mobile 📱🎬

> **Studio Produksi Video Otomatis Berbasis Android** — Terinspirasi dari workflow [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage), dioptimalkan untuk perangkat mobile Android dengan **Rp0 biaya operasional**, tanpa server, tanpa VPS, dan tanpa ketergantungan API berbayar.

[![Deploy to GitHub Pages](https://github.com/anjaydesign/openmontage-mobile/actions/workflows/pages.yml/badge.svg)](https://github.com/anjaydesign/openmontage-mobile/actions/workflows/pages.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blueviolet.svg)](#pwa--instalasi-di-android)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Fitur Utama

1. **Dashboard Proyek Terstruktur**
   - Buat proyek video vertikal (9:16) baru dalam hitungan detik.
   - Manajemen proyek lokal (Buka, Duplikat, Edit, dan Hapus) tersimpan aman di **IndexedDB**.
   - Estimasi durasi dan status kapasitas penyimpanan perangkat.

2. **Script Assistant & Template Lokal (Offline AI/Rule Engine)**
   - Generator naskah promosi produk, video edukasi, storytelling, dan iklan flash sale.
   - **MyRepublic Promotion Studio**: Template khusus untuk sales WiFi MyRepublic dengan kontak WhatsApp, paket kecepatan, dan promo resmi yang 100% dapat diedit pengguna.
   - Generator Hook viral, Call to Action (CTA), judul video, dan caption media sosial dengan hashtag.
   - Konversi 1-klik dari naskah teks menjadi 5 scene storyboard otomatis.

3. **5-Scene Storyboard & Asisten AI Scene**
   - **✨ Bantuan AI Per-Scene**: Tombol aksi cepat di setiap scene: *⚡ Hook Viral*, *🎯 Padatkan (9:16)*, *🛒 Jadikan CTA*, serta dialog perintah AI kustom.
   - **🎨 AI Auto-Style**: Analisis otomatis konten teks untuk menentukan animasi transisi (*Fade, Slide Up, Slide Left, Ken-Burns, Bounce*), ukuran font, dan latar warna kontras yang paling harmonis.
   - **✨ AI 5-Scene Generator**: Cukup ketik 1 topik atau ide produk, AI akan otomatis menyusun 5 scene lengkap (Hook → Masalah → Solusi → Bukti/Promo → CTA) dalam sekejap.
   - **Dual Engine AI (Rp0)**: Berjalan 100% offline secara default tanpa API key, dengan opsi integrasi Google Gemini Cloud AI gratis jika diinginkan pengguna.
   - Upload gambar langsung dari kamera atau galeri HP Android.
   - Format video vertikal 9:16 yang pas untuk TikTok, Instagram Reels, dan YouTube Shorts.
   - Editor visual maksimal 5 scene vertikal 9:16.
   - Upload gambar langsung dari kamera atau galeri HP Android.
   - Pengaturan font, ukuran, warna, posisi teks, dan latar belakang badge kontras.
   - Preset animasi dinamis: *Fade In, Slide Up, Slide Left, Ken-Burns Zoom, dan Bounce Pop*.

4. **Mesin Render Client-Side (Canvas + MediaRecorder)**
   - Render video berformat asli **WebM** langsung pada hardware HP Android.
   - Pilihan resolusi adaptif: **540p (ringan & cepat)**, **720p (HD Reels/TikTok)**, dan **1080p (Full HD)**.
   - Pemantau progres render real-time dengan tombol batal dan pratinjau langsung sebelum diunduh.

5. **Export Center Terpadu**
   - Ekspor Video `.webm`.
   - Ekspor Subtitle `.srt` tersinkronisasi presisi per scene.
   - Ekspor Naskah `.txt` lengkap.
   - Ekspor Storyboard `.json` untuk cadangan data.
   - Generator Caption & Hashtag siap salin untuk Instagram Reels, TikTok, dan Facebook Reels.

6. **100% PWA & Offline Support**
   - Dilengkapi Web App Manifest dan Service Worker.
   - Dapat diinstal ke layar utama HP Android (layaknya aplikasi Play Store).
   - Beroperasi normal tanpa koneksi internet setelah aset aplikasi berhasil dicache.

---

## 🚀 Cara Menjalankan & Menerbitkan

### 1. Buka Langsung Melalui GitHub Pages
Setelah repository ini dipush ke branch `main`, GitHub Actions akan otomatis menerbitkan folder `frontend/` ke GitHub Pages:
```
https://<username-anda>.github.io/openmontage-mobile/
```

### 2. Menjalankan Secara Lokal (Opsional)
Anda cukup menggunakan static server sederhana tanpa perlu install dependensi berat:
```bash
# Menggunakan Python
cd frontend
python3 -m http.server 8080

# Atau buka index.html langsung di browser
```

---

## 📱 PWA & Instalasi di Android

1. Buka URL aplikasi di browser **Google Chrome** pada HP Android.
2. Ketuk ikon menu (tiga titik di kanan atas) atau tombol **"Install App"** di bagian atas aplikasi.
3. Pilih **"Tambahkan ke Layar Utama" (Add to Home screen)** / **"Install Aplikasi"**.
4. Ikon OpenMontage Mobile akan muncul di app drawer HP Anda dan siap digunakan kapan saja, bahkan saat mode pesawat (offline).

---

## 📂 Struktur File

```
openmontage-mobile/
├── frontend/
│   ├── index.html           # Struktur antarmuka mobile-first
│   ├── style.css            # Dark mode UI & styling responsif
│   ├── app.js               # Logika aplikasi, IndexedDB, Canvas, & MediaRecorder
│   ├── manifest.webmanifest # PWA Web App Manifest
│   ├── sw.js                # Service Worker untuk cache offline
│   └── assets/              # Ikon PWA (192x192 & 512x512)
├── docs/
│   └── FREE_STACK.md        # Rincian arsitektur Rp0 biaya operasional
├── .github/
│   └── workflows/
│       └── pages.yml        # CI/CD otomatis ke GitHub Pages
├── README.md                # Dokumentasi utama proyek
├── AGENT_GUIDE.md           # Panduan pengembangan berikutnya
└── PROJECT_CONTEXT.md       # Konteks arsitektur dan skema data
```

---

## ⚖️ Lisensi
Didistribusikan di bawah lisensi MIT. Bebas dimodifikasi dan digunakan untuk kebutuhan komersial maupun pribadi.
