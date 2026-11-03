# PROJECT CONTEXT — OpenMontage Mobile

## 1. Identitas Proyek
- **Nama Aplikasi**: OpenMontage Mobile
- **Inspirasi Workflow**: [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) (Sistem produksi video otomatis yang disederhanakan untuk eksekusi murni di perangkat mobile Android).
- **Target Repository**: `anjaydesign/openmontage-mobile`
- **Tujuan**: Memberikan kreator konten, UMKM, dan tim sales (khususnya sales MyRepublic WiFi) kemampuan memproduksi video promosi vertikal (9:16) berkualitas tinggi langsung dari HP Android tanpa laptop, tanpa VPS, dan tanpa biaya bulanan (Rp0).

---

## 2. Peta Fase Pengembangan (Fase 2 - 10)

| Fase | Deskripsi | Status |
| :--- | :--- | :--- |
| **Fase 2** | Struktur PWA, Manifest, Service Worker, Dashboard & Navigasi Mobile | ✅ Selesai |
| **Fase 3** | Script Assistant, Template Generator, dan MyRepublic Promotion Studio | ✅ Selesai |
| **Fase 4** | Storyboard Otomatis & Editor 5-Scene Vertikal (9:16) | ✅ Selesai |
| **Fase 5** | Manajemen Gambar, File Picker Galeri HP, dan Pratinjau Thumbnail | ✅ Selesai |
| **Fase 6** | Engine Canvas 2D, Animasi Matematis (Fade, Slide, Ken-Burns, Bounce) | ✅ Selesai |
| **Fase 7** | MediaRecorder API, Perekaman Video WebM, Pilihan 540p/720p/1080p | ✅ Selesai |
| **Fase 8** | Export Center: Subtitle SRT, Naskah TXT, Storyboard JSON, Caption Medsos | ✅ Selesai |
| **Fase 9** | IndexedDB Storage (`OpenMontageDB`), LocalStorage, Cache Offline PWA | ✅ Selesai |
| **Fase 10** | Pengujian Menyeluruh, Optimasi Touch Android, CI/CD GitHub Pages | ✅ Selesai |

---

## 3. Skema Data Proyek (IndexedDB Schema)

```typescript
interface Project {
  id: string; // "proj_" + timestamp + random
  name: string; // e.g. "Promo MyRepublic Joy 30Mbps"
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  format: "9:16";
  resolution: "540p" | "720p" | "1080p";
  fps: 30;
  script: {
    title: string;
    hook: string;
    body: string;
    cta: string;
    fullText: string;
    caption: string;
  };
  scenes: Scene[];
}

interface Scene {
  id: number; // 1 s/d 5
  duration: number; // durasi dalam detik (1 - 8s, default 3s)
  text: string; // Teks headline/overlay
  fontFamily: string; // "system-ui", "Montserrat", "Impact", "Georgia"
  fontSize: "sm" | "md" | "lg" | "xl";
  textColor: string; // Hex color e.g. "#FFFFFF"
  textPosition: "top" | "center" | "bottom";
  textBadge: "none" | "dark" | "blue" | "gradient";
  animation: "none" | "fade" | "slide-up" | "slide-left" | "ken-burns" | "bounce";
  bgType: "gradient" | "image";
  bgColor: string; // Preset nama gradien atau kode hex
  imageDataUrl: string | null; // Base64 dataURL gambar dari galeri HP
}
```

---

## 4. Ketentuan Khusus MyRepublic Promotion Studio
Sesuai arahan integritas data:
- **Dilarang mengarang**: Harga paket, kecepatan Mbps, dan promo bonus harus selalu dapat diedit sepenuhnya oleh agen sales sesuai promo resmi terkini.
- **Informasi Kontak**: Menyediakan kolom nama sales, ID sales, dan nomor WhatsApp/telepon yang otomatis disematkan pada scene penutup (CTA) dan caption media sosial.
