# Arsitektur Bebas Biaya (Rp0 Biaya Operasional) — OpenMontage Mobile

Dokumen ini mendefinisikan prinsip, arsitektur, dan implementasi teknis bagaimana **OpenMontage Mobile** beroperasi dengan **Rp0 biaya operasional**, tanpa server berbayar, tanpa VPS, dan tanpa ketergantungan API pihak ketiga.

---

## 1. Prinsip Utama: Client-Side First (100% On-Device)

Sebagian besar aplikasi video maker di pasar bergantung pada server cloud yang mahal (FFmpeg server, AWS EC2 GPU instance, Cloudflare Workers, atau SaaS rendering API). OpenMontage Mobile membalik paradigma ini:

> **Seluruh komputasi rendering, pembuatan naskah, penyimpanan, dan ekspor dijalankan langsung pada chip prosesor dan browser HP Android pengguna.**

| Komponen | Solusi Konvensional (Berbayar) | Solusi OpenMontage Mobile (Rp0) |
| :--- | :--- | :--- |
| **Hosting & CDN** | Vercel Pro / VPS Cloud ($10-$50/bulan) | **GitHub Pages** (Gratis selamanya) |
| **CI / CD Deploy** | Cloud Build / Runner Khusus | **GitHub Actions** (2000 menit/bulan gratis) |
| **Video Rendering** | Cloud FFmpeg / Remotion Cloud | **HTML5 Canvas 2D + MediaRecorder API** |
| **Database** | Supabase Pro / Firebase ($25+/bulan) | **IndexedDB (Local Storage Browser HP)** |
| **File Storage** | AWS S3 / Cloudflare R2 | **Blob URL & IndexedDB Local Storage** |
| **Naskah & Copywriting** | OpenAI / Anthropic API ($0.02 - $0.10/req) | **Local Rule-Based & Modular Template Engine** |
| **Format Output** | Cloud MP4 Transcoder H.264 | **WebM (VP8/VP9) Native Android Hardware** |

---

## 2. Rincian Tumpukan Teknologi (Tech Stack)

### A. Rendering: Canvas 2D + MediaRecorder API
- **Canvas 2D API**: Merender frame per frame secara deterministik (30 FPS) dengan rasio 9:16 vertikal (format standar TikTok, Reels, dan Shorts).
- **Animasi Matematis**: Interpolasi posisi, transparansi (alpha fade), perbesaran (Ken Burns scale), dan teks dinamis dihitung murni dengan formula trigonometri & waktu delta dalam JavaScript.
- **MediaRecorder API**: Mengambil stream canvas melalui `canvas.captureStream(30)` dan mengodekannya menjadi kontainer video WebM langsung memanfaatkan akselerasi hardware Android.

### B. Penyimpanan: IndexedDB (`OpenMontageDB`)
- Menggunakan database transaksional lokal pada browser pengguna.
- Mendukung penyimpanan blob gambar resolusi tinggi tanpa kuota sempit LocalStorage (5MB vs IndexedDB hingga ratusan megabyte/gigabyte tergantung sisa memori HP).
- Proyek disimpan dengan skema terstruktur: ID, nama proyek, tanggal pembuatan, data scene, naskah, dan pengaturan font/animasi.

### C. Naskah: Local Rule-Based Template Engine
- Beroperasi offline tanpa sambungan internet.
- Menyediakan katalog template promosi produk, edukasi, storytelling, dan template khusus **MyRepublic WiFi Promotion Studio**.
- Generator hook viral, Call to Action (CTA), judul, hashtag, dan konversi instan ke 5 scene storyboard.

### D. PWA (Progressive Web App) & Service Worker
- `manifest.webmanifest`: Memungkinkan aplikasi diinstal ke beranda Android layaknya aplikasi native (`standalone`).
- `sw.js`: Melakukan precache seluruh aset aplikasi (HTML, CSS, JS, Ikon). Setelah pertama kali dibuka, aplikasi dapat dijalankan **100% tanpa koneksi internet (offline mode)**.

---

## 3. Limitasi & Rekomendasi Perangkat Android

1. **Resolusi yang Didukung**:
   - **540p (540x960)**: Sangat direkomendasikan untuk HP Android entry-level dengan RAM 2GB–3GB. Proses render sangat cepat.
   - **720p (720x1280)**: Keseimbangan optimal untuk kualitas jernih di Instagram Reels & TikTok dengan HP RAM 4GB ke atas.
   - **1080p (1080x1920)**: Untuk perangkat modern dengan prosesor menengah ke atas.
2. **Format Video**:
   - Output video adalah `.webm` (bukan `.mp4` palsu). Format WebM didukung penuh oleh Android, YouTube Shorts, WhatsApp, TikTok, serta browser modern.
