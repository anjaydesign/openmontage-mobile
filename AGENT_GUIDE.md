# AGENT & DEVELOPER GUIDE — OpenMontage Mobile

Panduan ini ditujukan bagi AI Agent atau pengembang berikutnya yang memelihara atau menambahkan fitur pada OpenMontage Mobile.

---

## 1. Konvensi Kode & Filosofi Desain

1. **Vanilla JavaScript (ES6+)**:
   - Jangan memasukkan dependensi bundler (Webpack, Vite, Rollup) atau framework berat (React, Vue, Angular) ke dalam frontend client ini jika tujuannya mempertahankan kesederhanaan zero-build untuk GitHub Pages.
   - Semua modul fungsional disatukan secara bersih di `frontend/app.js` atau modul ES6 browser native.
2. **Tanpa Komputasi Backend**:
   - Jangan menambahkan pemanggilan API berbayar (OpenAI, Replicate, ElevenLabs, Runway, dsb.) ke alur utama.
   - Semua fitur harus berfungsi saat offline setelah aplikasi dicache oleh Service Worker.
3. **Sentuhan & Layar Mobile-First**:
   - Seluruh target klik / sentuh harus memiliki ukuran minimal `44px x 44px`.
   - Hindari efek yang hanya aktif saat `:hover` karena pengguna HP Android berinteraksi lewat tap.
   - Selalu uji scroll pada container dengan overflow halus (`-webkit-overflow-scrolling: touch`).

---

## 2. Rendering Engine (Canvas & MediaRecorder)

Rendering dilakukan dalam loop berbasis waktu presisi:
- Engine menghitung durasi kumulatif tiap scene (`scene.duration * 30` frame).
- Pada saat mode **Render & Export**, canvas digambar per frame menggunakan fungsi `renderFrame(ctx, currentScene, progressInScene, width, height)`.
- MediaRecorder merekam stream canvas:
  ```javascript
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
  ```
- Deteksi tipe MIME yang didukung browser dilakukan secara otomatis sebelum memulai perekaman (`MediaRecorder.isTypeSupported`).

---

## 3. Skrip & Template Generator

Template terletak di dalam objek `SCRIPT_TEMPLATES` di `frontend/app.js`. Ketika menambahkan template baru:
- Sediakan minimal 5 potongan naskah yang terstruktur untuk Scene 1 (Hook), Scene 2 (Masalah), Scene 3 (Solusi), Scene 4 (Penawaran/Keunggulan), dan Scene 5 (CTA & Kontak).
- Sediakan generator variasi hook dan CTA terpisah agar pengguna dapat melakukan mix & match.
