/**
 * OpenMontage Mobile — Core Application Logic
 * 100% Client-Side Video Studio (Vanilla JS, Canvas API, MediaRecorder API, IndexedDB, PWA)
 * Operational Cost: Rp0
 */

// ============================================================================
// 1. CONSTANTS & DEFAULT DATA STRUCTURES
// ============================================================================

const RESOLUTIONS = {
  '540p': { width: 540, height: 960, label: '540p (540x960)' },
  '720p': { width: 720, height: 1280, label: '720p (720x1280)' },
  '1080p': { width: 1080, height: 1920, label: '1080p (1080x1920)' }
};

const BG_GRADIENTS = {
  'midnight': ['#0B0E17', '#1E293B'],
  'royal': ['#1E1B4B', '#312E81'],
  'neon-purple': ['#2E1065', '#581C87'],
  'cyber-cyan': ['#083344', '#164E63'],
  'emerald': ['#064E3B', '#047857'],
  'sunset': ['#450A0A', '#7F1D1D']
};

function createDefaultProject(name = 'Proyek Video Baru') {
  return {
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    name: name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    format: '9:16',
    resolution: '540p',
    fps: 30,
    script: {
      title: name,
      hook: '',
      body: '',
      cta: '',
      fullText: '',
      caption: ''
    },
    scenes: [
      {
        id: 1,
        duration: 3,
        text: 'Hook Menarik: Masalah yang Sering Dialami!',
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'fade',
        bgType: 'gradient',
        bgColor: 'midnight',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: 'Apakah Anda Mengalami Hal Serupa Setiap Hari?',
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'slide-up',
        bgType: 'gradient',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: 'Ini Solusi Terbaik & Paling Praktis untuk Anda!',
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#38BDF8',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'ken-burns',
        bgType: 'gradient',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: 'Fitur Unggulan, Hemat Biaya, & Terpercaya',
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FBBF24',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'slide-left',
        bgType: 'gradient',
        bgColor: 'cyber-cyan',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: 'Dapatkan Sekarang! Klik Link / Hubungi Kami Hari Ini!',
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        textBadge: 'blue',
        animation: 'bounce',
        bgType: 'gradient',
        bgColor: 'sunset',
        imageDataUrl: null
      }
    ]
  };
}

// Global App State
let currentProject = createDefaultProject();
let db = null;
let deferredPrompt = null;
let isPlaying = false;
let isLooping = true;
let isRendering = false;
let cancelRenderRequested = false;
let playbackStartTime = 0;
let playbackElapsed = 0;
let animationFrameId = null;
let lastRenderedBlob = null;
const imageCache = new Map();

// ============================================================================
// 2. INDEXEDDB ENGINE (OpenMontageDB)
// ============================================================================

function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OpenMontageDB', 1);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('projects')) {
        const store = database.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('[IndexedDB] Database initialized successfully');
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Error initializing DB:', event.target.error);
      reject(event.target.error);
    };
  });
}

function dbSaveProject(project) {
  return new Promise((resolve, reject) => {
    if (!db) return reject('Database not ready');
    project.updatedAt = Date.now();
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const req = store.put(project);
    req.onsuccess = () => resolve(project);
    req.onerror = () => reject(req.error);
  });
}

function dbGetProject(id) {
  return new Promise((resolve, reject) => {
    if (!db) return reject('Database not ready');
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAllProjects() {
  return new Promise((resolve, reject) => {
    if (!db) return reject('Database not ready');
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

function dbDeleteProject(id) {
  return new Promise((resolve, reject) => {
    if (!db) return reject('Database not ready');
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// 3. UI CONTROLLERS & NAVIGATION
// ============================================================================

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function switchView(viewName) {
  // Stop preview if leaving render view
  if (viewName !== 'render' && isPlaying) {
    pausePreview();
  }

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `view-${viewName}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // View specific refreshes
  if (viewName === 'dashboard') {
    refreshProjectsList();
  } else if (viewName === 'storyboard') {
    renderStoryboardScenes();
  } else if (viewName === 'render') {
    initCanvasSize();
    drawFrameAtTime(playbackElapsed);
  } else if (viewName === 'export') {
    refreshExportView();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchSubtab(subtabId) {
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    if (btn.dataset.subtab === subtabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.subtab-content').forEach(content => {
    if (content.id === `subtab-${subtabId}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// ============================================================================
// 4. SCRIPT ASSISTANT & MYREPUBLIC PROMOTION STUDIO
// ============================================================================

function setupMyRepublicStudio() {
  // Load saved sales preferences
  const savedName = localStorage.getItem('om_sales_name');
  const savedPhone = localStorage.getItem('om_sales_phone');
  const savedArea = localStorage.getItem('om_sales_area');

  if (savedName) document.getElementById('myrep-sales-name').value = savedName;
  if (savedPhone) document.getElementById('myrep-sales-phone').value = savedPhone;
  if (savedArea) document.getElementById('myrep-area').value = savedArea;

  document.getElementById('btn-generate-myrep-video').addEventListener('click', () => {
    const salesName = document.getElementById('myrep-sales-name').value.trim();
    const salesPhone = document.getElementById('myrep-sales-phone').value.trim();
    const area = document.getElementById('myrep-area').value.trim();
    const packageTier = document.getElementById('myrep-package-tier').value.trim();
    const price = document.getElementById('myrep-price').value.trim();
    const specialPromo = document.getElementById('myrep-special-promo').value.trim() || 'Hubungi untuk promo terkini';
    const usp = document.getElementById('myrep-usp').value.trim() || '100% Full Fiber Optic Simetris';

    if (!salesName || !salesPhone || !area || !packageTier || !price) {
      showToast('⚠️ Harap isi Nama Sales, Kontak WA, Area, Paket & Kecepatan, serta Harga resmi!');
      return;
    }

    // Save preferences
    localStorage.setItem('om_sales_name', salesName);
    localStorage.setItem('om_sales_phone', salesPhone);
    localStorage.setItem('om_sales_area', area);

    // Create 5 precise promo scenes
    currentProject.name = `Promo MyRepublic — ${packageTier}`;
    currentProject.script = {
      title: `Promo MyRepublic ${packageTier}`,
      hook: `Internet Rumah Sering Lemot? Saatnya Pasang MyRepublic WiFi!`,
      body: `WiFi Fiber Optic Cepat & Stabil untuk Streaming, Game, dan WFH`,
      cta: `Hubungi: ${salesName} (WA: ${salesPhone})`,
      fullText: `MyRepublic WiFi Promo ${packageTier}. Kecepatan stabil 100% fiber optic. Hubungi ${salesName}: ${salesPhone}.`,
      caption: `🔥 Promo Spesial Pasang Wi-Fi MyRepublic!\n\n📶 ${packageTier}\n💰 ${price}\n🎁 Bonus: ${specialPromo}\n⚡ Keunggulan: ${usp}\n📍 Area Layanan: ${area}\n\n📲 Hubungi Sales Resmi:\n👤 ${salesName}\n📞 WA: ${salesPhone}\n\n#MyRepublic #PromoMyRepublic #PasangWifi #WifiRumah #InternetCepat #MyRepublicFiber`
    };

    currentProject.scenes = [
      {
        id: 1,
        duration: 3,
        text: 'Internet Rumah Sering Lemot? 😤\nSaatnya Pasang MyRepublic WiFi!',
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'fade',
        bgType: 'gradient',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `📶 ${packageTier}\nInternet Super Cepat & Stabil!`,
        fontFamily: 'sans-serif',
        fontSize: 'xl',
        textColor: '#38BDF8',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'slide-up',
        bgType: 'gradient',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `⚡ ${usp}`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FBBF24',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'ken-burns',
        bgType: 'gradient',
        bgColor: 'cyber-cyan',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `🎉 PROMO RESMI:\n${specialPromo}\nTarif: ${price}`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#34D399',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'slide-left',
        bgType: 'gradient',
        bgColor: 'emerald',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `📲 DAFTAR SEKARANG:\n${salesName}\nWA: ${salesPhone}\nArea: ${area}`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        textBadge: 'blue',
        animation: 'bounce',
        bgType: 'gradient',
        bgColor: 'sunset',
        imageDataUrl: null
      }
    ];

    dbSaveProject(currentProject);
    updateProjectHeaderLabel();
    showToast('✨ 5 Scene MyRepublic berhasil dibuat!');
    switchView('storyboard');
  });
}
function setupGeneralTemplates() {
  document.getElementById('btn-generate-template').addEventListener('click', () => {
    const cat = document.getElementById('tpl-category').value;
    const prod = document.getElementById('tpl-product-name').value.trim() || 'Produk Unggulan';
    const aud = document.getElementById('tpl-target-audience').value.trim() || 'Anda';
    const prob = document.getElementById('tpl-problem').value.trim() || 'Masalah yang sering dialami';
    const sol = document.getElementById('tpl-solution').value.trim() || 'Solusi praktis dan cepat';
    const offer = document.getElementById('tpl-offer').value.trim() || 'Dapatkan penawaran terbatas hari ini!';

    currentProject.name = `Video Promosi ${prod}`;
    currentProject.script.title = currentProject.name;
    currentProject.script.caption = `Solusi terbaik untuk ${aud}! ${prod} siap membantu mengatasi ${prob}. ${offer} #Rekomendasi #SolusiPraktis #${prod.replace(/\s+/g, '')}`;

    currentProject.scenes = [
      {
        id: 1,
        duration: 3,
        text: `STOP! Khusus ${aud} yang lagi pusing karena:\n"${prob}"`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'fade',
        bgType: 'gradient',
        bgColor: 'midnight',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `Sekarang nggak perlu khawatir lagi, kenalin:\n✨ ${prod} ✨`,
        fontFamily: 'sans-serif',
        fontSize: 'xl',
        textColor: '#38BDF8',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'slide-up',
        bgType: 'gradient',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `Keunggulan Utama:\n💡 ${sol}`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FBBF24',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'ken-burns',
        bgType: 'gradient',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `Sudah terbukti membantu ribuan orang hemat waktu dan tenaga!`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        textBadge: 'dark',
        animation: 'slide-left',
        bgType: 'gradient',
        bgColor: 'cyber-cyan',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `🔥 ${offer}\nKlik Link di Bio / Hubungi Kami Sekarang!`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        textBadge: 'blue',
        animation: 'bounce',
        bgType: 'gradient',
        bgColor: 'sunset',
        imageDataUrl: null
      }
    ];

    dbSaveProject(currentProject);
    updateProjectHeaderLabel();
    showToast('✨ Naskah template berhasil dipecah ke 5 scene!');
    switchView('storyboard');
  });
}

function setupBoosterGenerators() {
  const hooks = [
    "Jangan skip video ini kalau kamu pengen hemat budget!",
    "Pernah nggak sih kamu ngalamin masalah nyebelin kayak gini?",
    "Rahasia yang jarang dibongkar banyak orang akhirnya terungkap!",
    "Stop lakukan kesalahan fatal ini kalau nggak mau rugi!",
    "Ini dia alasan kenapa semua orang mulai beralih ke sini!"
  ];

  const ctas = [
    "Dapatkan diskon promo spesial dengan klik link di profil!",
    "Ketik 'MAU' di kolom komentar untuk info selengkapnya!",
    "Hubungi kontak kami sekarang sebelum kuota promo habis!",
    "Simpan video ini dan bagikan ke teman yang membutuhkan!",
    "Jangan tunda lagi, pesan sekarang selagi ready stock!"
  ];

  const hooksContainer = document.getElementById('hooks-container');
  hooksContainer.innerHTML = '';
  hooks.forEach((text, i) => {
    const item = document.createElement('div');
    item.className = 'booster-item';
    item.innerHTML = `
      <p>"${text}"</p>
      <button class="btn btn-sm btn-outline" data-hook="${i}">Gunakan di Scene 1</button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      if (currentProject.scenes[0]) {
        currentProject.scenes[0].text = text;
        dbSaveProject(currentProject);
        showToast('✅ Hook disematkan pada Scene 1');
      }
    });
    hooksContainer.appendChild(item);
  });

  const ctaContainer = document.getElementById('cta-container');
  ctaContainer.innerHTML = '';
  ctas.forEach((text, i) => {
    const item = document.createElement('div');
    item.className = 'booster-item';
    item.innerHTML = `
      <p>"${text}"</p>
      <button class="btn btn-sm btn-outline" data-cta="${i}">Gunakan di Scene 5</button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      if (currentProject.scenes[4]) {
        currentProject.scenes[4].text = text;
        dbSaveProject(currentProject);
        showToast('✅ CTA disematkan pada Scene 5');
      }
    });
    ctaContainer.appendChild(item);
  });
}

function setupManualScriptEditor() {
  const textarea = document.getElementById('manual-script-text');
  const counter = document.getElementById('script-counter');

  textarea.addEventListener('input', () => {
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const estSec = Math.ceil(words / 2.5); // avg reading speed
    counter.textContent = `${words} Kata • ~${estSec} detik`;
  });

  document.getElementById('btn-parse-to-scenes').addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) {
      showToast('⚠️ Masukkan teks naskah terlebih dahulu');
      return;
    }

    // Split text into paragraphs or sentences
    const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    const scenesCount = 5;
    
    // Distribute into 5 scenes
    for (let i = 0; i < scenesCount; i++) {
      if (lines[i]) {
        currentProject.scenes[i].text = lines[i];
      }
    }

    dbSaveProject(currentProject);
    showToast('✨ Naskah manual dipecah ke 5 scene storyboard!');
    switchView('storyboard');
  });
}

// ============================================================================
// 5. STORYBOARD & 5-SCENE VISUAL EDITOR
// ============================================================================

function renderStoryboardScenes() {
  const container = document.getElementById('scenes-editor-container');
  container.innerHTML = '';

  let totalDuration = 0;

  currentProject.scenes.forEach((scene, index) => {
    totalDuration += Number(scene.duration || 3);
    const sceneCard = document.createElement('div');
    sceneCard.className = 'scene-card';
    sceneCard.dataset.index = index;

    const hasImage = Boolean(scene.imageDataUrl);

    sceneCard.innerHTML = `
      <div class="scene-card-header">
        <span class="scene-badge-pill">Scene ${index + 1}</span>
        <div class="scene-header-controls">
          <div class="scene-duration-chip">
            <span>Durasi:</span>
            <input type="number" min="1" max="8" class="scene-duration-input" value="${scene.duration}" data-prop="duration">
            <span>detik</span>
          </div>
          <button class="btn btn-sm btn-outline btn-scene-up" ${index === 0 ? 'disabled' : ''} title="Pindah ke Atas">▲</button>
          <button class="btn btn-sm btn-outline btn-scene-down" ${index === currentProject.scenes.length - 1 ? 'disabled' : ''} title="Pindah ke Bawah">▼</button>
        </div>
      </div>

      <div class="scene-card-body">
        
        <!-- Media / Image Box -->
        <div class="scene-image-preview-box" id="img-box-${index}" style="background: ${hasImage ? 'none' : getGradientCSS(scene.bgColor)}">
          ${hasImage ? `<img src="${scene.imageDataUrl}" alt="Scene ${index+1}">` : `<div class="scene-image-empty-placeholder">🖼️ Belum Ada Gambar (Klik Upload)</div>`}
          <div class="scene-image-actions-overlay">
            <label class="btn btn-sm btn-primary" title="Upload Gambar dari Galeri">
              📷 Upload Gambar
              <input type="file" accept="image/*" class="file-image-input" style="display:none;" data-index="${index}">
            </label>
            ${hasImage ? `<button class="btn btn-sm btn-danger btn-remove-image" data-index="${index}">✕</button>` : ''}
          </div>
        </div>

        <!-- Text Input with Character Counter -->
        <div class="form-group">
          <div class="scene-text-label-row">
            <label>Teks Headline / Narasi Scene</label>
            <span class="char-count" id="char-count-${index}">${(scene.text || '').length} karakter</span>
          </div>
          <textarea class="form-textarea scene-text-input" rows="2" data-prop="text">${escapeHtml(scene.text || '')}</textarea>
        </div>

        <!-- AI Assistant Toolbar per Scene -->
        <div class="scene-ai-bar">
          <div class="scene-ai-bar-title">
            <span class="ai-sparkle">✨</span> <strong>Bantuan AI Scene ${index + 1}:</strong>
          </div>
          <div class="scene-ai-chips">
            <button type="button" class="btn-ai-chip btn-ai-quick-hook" data-index="${index}" title="Jadikan Hook Viral Memikat">⚡ Hook</button>
            <button type="button" class="btn-ai-chip btn-ai-quick-shorten" data-index="${index}" title="Persingkat Teks Pas Layar 9:16">🎯 Padatkan</button>
            <button type="button" class="btn-ai-chip btn-ai-quick-cta" data-index="${index}" title="Jadikan Ajakan Bertindak">🛒 CTA</button>
            <button type="button" class="btn-ai-chip btn-ai-quick-autostyle" data-index="${index}" title="Pilih Animasi & Desain Otomatis">🎨 Auto-Style</button>
            <button type="button" class="btn-ai-chip btn-ai-open-modal" data-index="${index}" title="Buka Asisten AI Lengkap">💬 Asisten AI...</button>
          </div>
        </div>

        <!-- Typography & Alignment Controls -->
        <div class="scene-row-controls">
          <div class="form-group">
            <label>Animasi Masuk</label>
            <select class="form-select" data-prop="animation">
              <option value="none" ${scene.animation === 'none' ? 'selected' : ''}>Tanpa Animasi</option>
              <option value="fade" ${scene.animation === 'fade' ? 'selected' : ''}>Pudar Masuk (Fade)</option>
              <option value="slide-up" ${scene.animation === 'slide-up' ? 'selected' : ''}>Geser dari Bawah (Slide Up)</option>
              <option value="slide-left" ${scene.animation === 'slide-left' ? 'selected' : ''}>Geser dari Kiri (Slide Left)</option>
              <option value="ken-burns" ${scene.animation === 'ken-burns' ? 'selected' : ''}>Zoom Perlahan (Ken Burns)</option>
              <option value="bounce" ${scene.animation === 'bounce' ? 'selected' : ''}>Membal Dinamis (Bounce)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Posisi Teks</label>
            <select class="form-select" data-prop="textPosition">
              <option value="top" ${scene.textPosition === 'top' ? 'selected' : ''}>Atas</option>
              <option value="center" ${scene.textPosition === 'center' ? 'selected' : ''}>Tengah</option>
              <option value="bottom" ${scene.textPosition === 'bottom' ? 'selected' : ''}>Bawah</option>
            </select>
          </div>
        </div>

        <div class="scene-row-controls">
          <div class="form-group">
            <label>Ukuran Huruf</label>
            <select class="form-select" data-prop="fontSize">
              <option value="sm" ${scene.fontSize === 'sm' ? 'selected' : ''}>Kecil (Small)</option>
              <option value="md" ${scene.fontSize === 'md' ? 'selected' : ''}>Sedang (Medium)</option>
              <option value="lg" ${scene.fontSize === 'lg' ? 'selected' : ''}>Besar (Large)</option>
              <option value="xl" ${scene.fontSize === 'xl' ? 'selected' : ''}>Ekstra Besar (XL)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Latar Gradien (Jika Tanpa Gambar)</label>
            <select class="form-select" data-prop="bgColor">
              <option value="midnight" ${scene.bgColor === 'midnight' ? 'selected' : ''}>Midnight Dark</option>
              <option value="royal" ${scene.bgColor === 'royal' ? 'selected' : ''}>Royal Indigo</option>
              <option value="neon-purple" ${scene.bgColor === 'neon-purple' ? 'selected' : ''}>Neon Purple</option>
              <option value="cyber-cyan" ${scene.bgColor === 'cyber-cyan' ? 'selected' : ''}>Cyber Cyan</option>
              <option value="emerald" ${scene.bgColor === 'emerald' ? 'selected' : ''}>Emerald Green</option>
              <option value="sunset" ${scene.bgColor === 'sunset' ? 'selected' : ''}>Sunset Red</option>
            </select>
          </div>
        </div>

      </div>
    `;

    // Event listeners on scene elements
    sceneCard.querySelector('.scene-duration-input').addEventListener('change', (e) => {
      const val = Math.max(1, Math.min(8, Number(e.target.value) || 3));
      e.target.value = val;
      currentProject.scenes[index].duration = val;
      updateTotalDuration();
      dbSaveProject(currentProject);
    });

    const textInput = sceneCard.querySelector('.scene-text-input');
    const charCounter = sceneCard.querySelector(`#char-count-${index}`);
    textInput.addEventListener('input', (e) => {
      currentProject.scenes[index].text = e.target.value;
      if (charCounter) charCounter.textContent = `${e.target.value.length} karakter`;
      dbSaveProject(currentProject);
    });

    // Quick AI Actions per Scene
    sceneCard.querySelector('.btn-ai-quick-hook').addEventListener('click', () => {
      triggerQuickAiAction(index, 'hook');
    });

    sceneCard.querySelector('.btn-ai-quick-shorten').addEventListener('click', () => {
      triggerQuickAiAction(index, 'shorten');
    });

    sceneCard.querySelector('.btn-ai-quick-cta').addEventListener('click', () => {
      triggerQuickAiAction(index, 'cta');
    });

    sceneCard.querySelector('.btn-ai-quick-autostyle').addEventListener('click', () => {
      applyAiStyleRecommendationToScene(index);
    });

    sceneCard.querySelector('.btn-ai-open-modal').addEventListener('click', () => {
      openAiSceneModal(index);
    });

    sceneCard.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const prop = e.target.dataset.prop;
        currentProject.scenes[index][prop] = e.target.value;
        if (prop === 'bgColor' && !currentProject.scenes[index].imageDataUrl) {
          const imgBox = document.getElementById(`img-box-${index}`);
          if (imgBox) imgBox.style.background = getGradientCSS(e.target.value);
        }
        dbSaveProject(currentProject);
      });
    });

    // Image Upload Handler
    const fileInput = sceneCard.querySelector('.file-image-input');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target.result;
        currentProject.scenes[index].imageDataUrl = dataUrl;
        preloadImage(dataUrl);
        dbSaveProject(currentProject).then(() => {
          showToast(`✅ Gambar Scene ${index + 1} berhasil dimuat`);
          renderStoryboardScenes();
        });
      };
      reader.readAsDataURL(file);
    });

    // Remove Image
    const removeImgBtn = sceneCard.querySelector('.btn-remove-image');
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => {
        currentProject.scenes[index].imageDataUrl = null;
        dbSaveProject(currentProject).then(() => {
          renderStoryboardScenes();
        });
      });
    }

    // Reorder buttons
    const upBtn = sceneCard.querySelector('.btn-scene-up');
    const downBtn = sceneCard.querySelector('.btn-scene-down');

    upBtn.addEventListener('click', () => {
      if (index > 0) {
        const temp = currentProject.scenes[index - 1];
        currentProject.scenes[index - 1] = currentProject.scenes[index];
        currentProject.scenes[index] = temp;
        dbSaveProject(currentProject).then(renderStoryboardScenes);
      }
    });

    downBtn.addEventListener('click', () => {
      if (index < currentProject.scenes.length - 1) {
        const temp = currentProject.scenes[index + 1];
        currentProject.scenes[index + 1] = currentProject.scenes[index];
        currentProject.scenes[index] = temp;
        dbSaveProject(currentProject).then(renderStoryboardScenes);
      }
    });

    container.appendChild(sceneCard);
  });

  document.getElementById('total-duration-label').textContent = `${totalDuration} detik`;
}

function updateTotalDuration() {
  let total = 0;
  currentProject.scenes.forEach(s => total += Number(s.duration || 3));
  document.getElementById('total-duration-label').textContent = `${total} detik`;
}

function getGradientCSS(gradientKey) {
  const colors = BG_GRADIENTS[gradientKey] || BG_GRADIENTS['midnight'];
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// 6. CANVAS 2D RENDERING & ANIMATION MATHEMATICS
// ============================================================================

function preloadImage(url) {
  if (!url) return Promise.resolve(null);
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn('[Image] Failed loading image for canvas:', url.substring(0, 50));
      resolve(null);
    };
    img.src = url;
  });
}

function initCanvasSize() {
  const canvas = document.getElementById('video-canvas');
  const resKey = currentProject.resolution || '540p';
  const res = RESOLUTIONS[resKey] || RESOLUTIONS['540p'];
  canvas.width = res.width;
  canvas.height = res.height;
}

/**
 * Calculates which scene is active at a given elapsed time (in seconds),
 * and what the relative progress (0.0 to 1.0) inside that scene is.
 */
function getActiveSceneInfo(elapsedSeconds) {
  let accum = 0;
  for (let i = 0; i < currentProject.scenes.length; i++) {
    const scene = currentProject.scenes[i];
    const dur = Number(scene.duration || 3);
    if (elapsedSeconds < accum + dur || i === currentProject.scenes.length - 1) {
      const sceneElapsed = Math.max(0, elapsedSeconds - accum);
      const progress = Math.min(1.0, sceneElapsed / dur);
      return {
        sceneIndex: i,
        scene: scene,
        sceneElapsed: sceneElapsed,
        sceneDuration: dur,
        progress: progress
      };
    }
    accum += dur;
  }
  return {
    sceneIndex: 0,
    scene: currentProject.scenes[0],
    sceneElapsed: 0,
    sceneDuration: 3,
    progress: 0
  };
}

function getTotalDuration() {
  return currentProject.scenes.reduce((acc, s) => acc + Number(s.duration || 3), 0);
}

/**
 * Deterministic frame renderer
 */
function drawFrame(ctx, width, height, activeInfo) {
  const { scene, progress } = activeInfo;
  
  // 1. Draw Background (Image or Gradient)
  const img = scene.imageDataUrl ? imageCache.get(scene.imageDataUrl) : null;
  if (img) {
    // Ken-Burns zoom if animation is ken-burns or subtle default zoom
    let scale = 1.0;
    if (scene.animation === 'ken-burns') {
      scale = 1.0 + (progress * 0.15); // zoom in 15%
    }
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    
    // Cover fill math
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;
    let drawW, drawH;
    
    if (imgAspect > canvasAspect) {
      drawH = height;
      drawW = height * imgAspect;
    } else {
      drawW = width;
      drawH = width / imgAspect;
    }
    
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Dark vignette overlay so text is always readable
    const vig = ctx.createLinearGradient(0, 0, 0, height);
    vig.addColorStop(0, 'rgba(0,0,0,0.4)');
    vig.addColorStop(0.5, 'rgba(0,0,0,0.2)');
    vig.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Draw Gradient
    const colors = BG_GRADIENTS[scene.bgColor] || BG_GRADIENTS['midnight'];
    const grad = ctx.createLinearGradient(0, 0, width * 0.8, height);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative ambient tech grid/particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = 0; y < height; y += 40) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  // 2. Compute Text Animation Transitions
  let alpha = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  let textScale = 1.0;

  if (scene.animation === 'fade') {
    alpha = Math.min(1.0, progress * 3.5); // fast fade in within first ~30%
  } else if (scene.animation === 'slide-up') {
    const slideProgress = Math.min(1.0, progress * 3.0);
    const easeOut = 1 - Math.pow(1 - slideProgress, 3);
    offsetY = (1.0 - easeOut) * (height * 0.15);
    alpha = slideProgress;
  } else if (scene.animation === 'slide-left') {
    const slideProgress = Math.min(1.0, progress * 3.0);
    const easeOut = 1 - Math.pow(1 - slideProgress, 3);
    offsetX = (1.0 - easeOut) * (-width * 0.4);
    alpha = slideProgress;
  } else if (scene.animation === 'bounce') {
    const bounceProgress = Math.min(1.0, progress * 2.5);
    // Overshoot bounce
    const c4 = (2 * Math.PI) / 3;
    textScale = bounceProgress === 0 ? 0 : bounceProgress === 1 ? 1 : Math.pow(2, -10 * bounceProgress) * Math.sin((bounceProgress * 10 - 0.75) * c4) + 1;
    alpha = Math.min(1.0, bounceProgress * 2);
  }

  // 3. Render Text
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Determine base font size based on canvas resolution
  const resScale = width / 540; // 540 is base
  let fontSizePx = 32 * resScale;
  if (scene.fontSize === 'sm') fontSizePx = 24 * resScale;
  if (scene.fontSize === 'lg') fontSizePx = 38 * resScale;
  if (scene.fontSize === 'xl') fontSizePx = 48 * resScale;

  ctx.font = `bold ${Math.round(fontSizePx)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Determine vertical position
  let targetY = height / 2;
  if (scene.textPosition === 'top') targetY = height * 0.22;
  if (scene.textPosition === 'bottom') targetY = height * 0.78;

  const targetX = (width / 2) + offsetX;
  targetY = targetY + offsetY;

  // Text Wrap
  const maxWidth = width * 0.84;
  const lines = wrapTextLines(ctx, scene.text, maxWidth);
  const lineHeight = fontSizePx * 1.35;
  const totalTextHeight = lines.length * lineHeight;

  // Draw Badge Highlight behind text if selected
  if (scene.textBadge !== 'none') {
    const padX = 20 * resScale;
    const padY = 16 * resScale;
    const badgeW = maxWidth + (padX * 2);
    const badgeH = totalTextHeight + (padY * 2);
    const badgeX = targetX - (badgeW / 2);
    const badgeY = targetY - (totalTextHeight / 2) - padY;

    ctx.save();
    ctx.translate(targetX, targetY);
    ctx.scale(textScale, textScale);
    ctx.translate(-targetX, -targetY);

    if (scene.textBadge === 'dark') {
      ctx.fillStyle = 'rgba(11, 14, 23, 0.82)';
    } else if (scene.textBadge === 'blue') {
      ctx.fillStyle = 'rgba(30, 58, 138, 0.9)';
    } else {
      ctx.fillStyle = 'rgba(88, 28, 135, 0.85)';
    }
    
    // Draw rounded rectangle
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14 * resScale);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5 * resScale;
    ctx.stroke();
    ctx.restore();
  }

  // Draw each line of text
  ctx.save();
  ctx.translate(targetX, targetY);
  ctx.scale(textScale, textScale);

  ctx.fillStyle = scene.textColor || '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8 * resScale;
  ctx.shadowOffsetX = 2 * resScale;
  ctx.shadowOffsetY = 2 * resScale;

  const startY = -(totalTextHeight / 2) + (lineHeight / 2);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 0, startY + (idx * lineHeight));
  });

  ctx.restore();
  ctx.restore();
}

function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [''];
  const rawParagraphs = text.split('\n');
  const allLines = [];

  rawParagraphs.forEach(para => {
    const words = para.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) allLines.push(currentLine);
  });

  return allLines.length > 0 ? allLines : [''];
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawFrameAtTime(seconds) {
  const canvas = document.getElementById('video-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const info = getActiveSceneInfo(seconds);
  drawFrame(ctx, canvas.width, canvas.height, info);

  // Update playback timecode UI
  const total = getTotalDuration();
  document.getElementById('playback-timecode').textContent = 
    `${formatTime(seconds)} / ${formatTime(total)}`;
  
  const pct = total > 0 ? Math.min(100, (seconds / total) * 100) : 0;
  document.getElementById('playback-progress-bar').style.width = `${pct}%`;
  document.getElementById('playback-current-scene-badge').textContent = 
    `Scene ${info.sceneIndex + 1}/${currentProject.scenes.length}`;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// 7. PREVIEW PLAYBACK LOOP
// ============================================================================

function startPreview() {
  if (isPlaying) return;
  isPlaying = true;
  document.getElementById('btn-play-pause').textContent = '⏸';
  
  const total = getTotalDuration();
  if (playbackElapsed >= total) {
    playbackElapsed = 0;
  }
  
  playbackStartTime = performance.now() - (playbackElapsed * 1000);

  function loop(now) {
    if (!isPlaying) return;
    playbackElapsed = (now - playbackStartTime) / 1000;
    const total = getTotalDuration();

    if (playbackElapsed >= total) {
      if (isLooping) {
        playbackElapsed = 0;
        playbackStartTime = performance.now();
      } else {
        pausePreview();
        playbackElapsed = total;
        drawFrameAtTime(playbackElapsed);
        return;
      }
    }

    drawFrameAtTime(playbackElapsed);
    animationFrameId = requestAnimationFrame(loop);
  }

  animationFrameId = requestAnimationFrame(loop);
}

function pausePreview() {
  isPlaying = false;
  document.getElementById('btn-play-pause').textContent = '▶';
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function togglePreview() {
  if (isPlaying) {
    pausePreview();
  } else {
    startPreview();
  }
}

// ============================================================================
// 8. MEDIARECORDER API & VIDEO WEBM RENDERING
// ============================================================================

function detectSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return 'video/webm';
}

async function renderVideoWebM() {
  if (isRendering) return;
  pausePreview();

  // Pre-load all scene images before starting recording
  for (const s of currentProject.scenes) {
    if (s.imageDataUrl) {
      await preloadImage(s.imageDataUrl);
    }
  }

  const canvas = document.getElementById('video-canvas');
  initCanvasSize();

  const totalDuration = getTotalDuration();
  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);

  // Check MediaRecorder support
  if (typeof MediaRecorder === 'undefined') {
    showToast('❌ Browser tidak mendukung MediaRecorder API.');
    return;
  }

  const mimeType = detectSupportedMimeType();
  document.getElementById('detected-mime-badge').textContent = mimeType;

  // Open modal
  const modal = document.getElementById('render-modal');
  modal.classList.add('active');
  document.getElementById('modal-render-title').textContent = 'Sedang Merender Video...';
  document.getElementById('modal-progress-fill').style.width = '0%';
  document.getElementById('modal-progress-percent').textContent = '0%';
  document.getElementById('modal-progress-scene').textContent = `0 / ${totalFrames} frame`;
  document.getElementById('modal-render-result').classList.add('hidden');
  document.getElementById('btn-cancel-render').classList.remove('hidden');
  document.getElementById('btn-close-render-modal').classList.add('hidden');
  document.getElementById('modal-render-status-desc').style.display = 'block';

  isRendering = true;
  cancelRenderRequested = false;

  const stream = canvas.captureStream(fps);
  const recordedChunks = [];
  let recorder;

  try {
    recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    });
  } catch (err) {
    console.warn('Fallback to standard mime:', err);
    recorder = new MediaRecorder(stream);
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      resolve(blob);
    };
  });

  recorder.start();

  const ctx = canvas.getContext('2d');
  const frameIntervalMs = 1000 / fps;

  // Render loop using setTimeout for deterministic pacing
  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelRenderRequested) {
      recorder.stop();
      isRendering = false;
      modal.classList.remove('active');
      showToast('⚠️ Proses render dibatalkan');
      return;
    }

    const currentTimeSec = frame / fps;
    const activeInfo = getActiveSceneInfo(currentTimeSec);
    drawFrame(ctx, canvas.width, canvas.height, activeInfo);

    // Update modal progress UI
    const pct = Math.round(((frame + 1) / totalFrames) * 100);
    document.getElementById('modal-progress-fill').style.width = `${pct}%`;
    document.getElementById('modal-progress-percent').textContent = `${pct}%`;
    document.getElementById('modal-progress-scene').textContent = 
      `Scene ${activeInfo.sceneIndex + 1}/5 (${frame + 1}/${totalFrames} frame)`;

    // Yield control so UI updates and MediaRecorder captures the frame
    await new Promise(r => setTimeout(r, frameIntervalMs));
  }

  // Complete recording
  recorder.stop();
  const videoBlob = await recordingPromise;
  isRendering = false;
  lastRenderedBlob = videoBlob;

  // Display result in modal
  document.getElementById('modal-render-title').textContent = '🎉 Video Berhasil Dirender!';
  document.getElementById('modal-render-status-desc').style.display = 'none';
  document.getElementById('btn-cancel-render').classList.add('hidden');
  document.getElementById('btn-close-render-modal').classList.remove('hidden');

  const resultSection = document.getElementById('modal-render-result');
  resultSection.classList.remove('hidden');

  const videoTag = document.getElementById('rendered-video-preview');
  videoTag.src = URL.createObjectURL(videoBlob);
  videoTag.load();

  const sizeKb = Math.round(videoBlob.size / 1024);
  document.getElementById('rendered-file-size').textContent = `${sizeKb} KB`;
  document.getElementById('rendered-file-res').textContent = `${canvas.width}x${canvas.height}`;

  showToast('✅ Video WebM berhasil diproduksi!');
}

function downloadRenderedWebM() {
  if (!lastRenderedBlob) {
    showToast('⚠️ Belum ada video yang dirender');
    return;
  }
  const cleanName = (currentProject.name || 'openmontage')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(lastRenderedBlob);
  a.download = `${cleanName}.webm`; // Strict WebM format, no fake mp4
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('📥 Mengunduh video WebM...');
}

// ============================================================================
// 9. EXPORT CENTER: SRT, TXT, JSON, & CAPTION
// ============================================================================

function generateSRT() {
  let srtContent = '';
  let accumSec = 0;

  currentProject.scenes.forEach((scene, i) => {
    const dur = Number(scene.duration || 3);
    const startSec = accumSec;
    const endSec = accumSec + dur;
    accumSec = endSec;

    const startSRT = formatSRTTime(startSec);
    const endSRT = formatSRTTime(endSec);

    srtContent += `${i + 1}\n`;
    srtContent += `${startSRT} --> ${endSRT}\n`;
    srtContent += `${scene.text.replace(/\n/g, ' ')}\n\n`;
  });

  return srtContent;
}

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function generateTXT() {
  let txt = `=========================================\n`;
  txt += `NASKAH LENGKAP: ${currentProject.name}\n`;
  txt += `Dibuat dengan OpenMontage Mobile (Rp0 Studio)\n`;
  txt += `=========================================\n\n`;

  txt += `ESTIMASI DURASI: ${getTotalDuration()} Detik\n`;
  txt += `FORMAT: 9:16 Vertikal (TikTok / Reels / Shorts)\n\n`;

  txt += `--- BREAKDOWN 5 SCENE ---\n`;
  currentProject.scenes.forEach((s, i) => {
    txt += `[Scene ${i + 1}] (${s.duration}s | Animasi: ${s.animation})\n`;
    txt += `Teks: ${s.text}\n\n`;
  });

  if (currentProject.script && currentProject.script.caption) {
    txt += `--- CAPTION MEDIA SOSIAL ---\n`;
    txt += `${currentProject.script.caption}\n`;
  }

  return txt;
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function refreshExportView() {
  const captionArea = document.getElementById('export-caption-area');
  if (currentProject.script && currentProject.script.caption) {
    captionArea.value = currentProject.script.caption;
  } else {
    captionArea.value = `🔥 ${currentProject.name}\n\nSimak video lengkapnya! #OpenMontage #VideoPromosi #Reels #TikTok`;
  }
}

// ============================================================================
// 10. PROJECTS DASHBOARD & CRUD
// ============================================================================

async function refreshProjectsList() {
  const container = document.getElementById('projects-list-container');
  const countBadge = document.getElementById('project-count-badge');
  
  try {
    const list = await dbGetAllProjects();
    countBadge.textContent = `${list.length} Proyek`;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h4>Belum Ada Proyek Tersimpan</h4>
          <p>Mulai dengan membuat proyek baru atau gunakan template cepat.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    list.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'project-card';
      const dateStr = new Date(proj.updatedAt || proj.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const dur = (proj.scenes || []).reduce((acc, s) => acc + Number(s.duration || 3), 0);

      card.innerHTML = `
        <div class="project-header-row">
          <div>
            <h4 class="project-title">${escapeHtml(proj.name)}</h4>
            <div class="project-meta">
              <span>📅 ${dateStr}</span>
              <span>⏱ ${dur}s</span>
              <span>🎬 ${proj.scenes ? proj.scenes.length : 0} Scene</span>
            </div>
          </div>
        </div>
        <div class="project-actions-row">
          <button class="btn btn-sm btn-primary btn-load-proj" data-id="${proj.id}">Buka Proyek</button>
          <button class="btn btn-sm btn-outline btn-dup-proj" data-id="${proj.id}">Duplikat</button>
          <button class="btn btn-sm btn-danger btn-del-proj" data-id="${proj.id}">Hapus</button>
        </div>
      `;

      card.querySelector('.btn-load-proj').addEventListener('click', () => loadProject(proj.id));
      card.querySelector('.btn-dup-proj').addEventListener('click', () => duplicateProject(proj.id));
      card.querySelector('.btn-del-proj').addEventListener('click', () => confirmDeleteProject(proj.id));

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to list projects:', err);
  }
}

async function loadProject(id) {
  try {
    const proj = await dbGetProject(id);
    if (proj) {
      currentProject = proj;
      updateProjectHeaderLabel();
      showToast(`📂 Proyek "${proj.name}" dibuka`);
      switchView('storyboard');
    }
  } catch (err) {
    showToast('❌ Gagal membuka proyek');
  }
}

async function duplicateProject(id) {
  try {
    const proj = await dbGetProject(id);
    if (proj) {
      const duplicated = JSON.parse(JSON.stringify(proj));
      duplicated.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      duplicated.name = `${proj.name} (Salinan)`;
      duplicated.createdAt = Date.now();
      duplicated.updatedAt = Date.now();
      await dbSaveProject(duplicated);
      showToast('📋 Proyek berhasil diduplikat');
      refreshProjectsList();
    }
  } catch (err) {
    showToast('❌ Gagal menduplikat proyek');
  }
}

async function confirmDeleteProject(id) {
  if (confirm('Apakah Anda yakin ingin menghapus proyek ini? Data yang dihapus tidak dapat dikembalikan.')) {
    try {
      await dbDeleteProject(id);
      showToast('🗑 Proyek telah dihapus');
      refreshProjectsList();
    } catch (err) {
      showToast('❌ Gagal menghapus proyek');
    }
  }
}

function updateProjectHeaderLabel() {
  const lbl = document.getElementById('current-project-label');
  if (lbl) {
    lbl.textContent = `Proyek: ${currentProject.name || 'Baru'}`;
  }
}

// ============================================================================
// 11. INITIALIZATION & GLOBAL LISTENERS
// ============================================================================


// ============================================================================
// AI SCENE ASSISTANT & 5-SCENE STORYBOARD GENERATOR
// ============================================================================

let currentModalSceneIndex = 0;
let currentModalAiSuggestion = '';
let currentModalStyleRec = null;
let currentModalActionType = 'hook';
let aiVariantCounters = {};

function cleanBaseText(text) {
  if (!text) return '';
  return text
    .replace(/^scene\s*\d+\s*[:\-]\s*/i, '')
    .replace(/^(halo|hai|selamat datang|perkenalkan|video ini|halo semuanya|guys)\s*[,!:\-]?\s*/i, '')
    .trim();
}

function generateSceneHook(text, variant = 0) {
  const clean = cleanBaseText(text) || 'rahasia sukses yang wajib kamu tahu';
  const hooks = [
    `Stop scrolling! 🛑 ${clean}`,
    `Kalian masih sering ngalamin ini? 😱 ${clean}`,
    `Jarang ada yang tahu rahasia ini: ${clean} 🔥`,
    `Jangan sampai nyesel, tonton sampai habis! ⚠️ ${clean}`,
    `Ini alasan kenapa kamu wajib tahu: ${clean} ✨`,
    `Bongkar trik yang jarang dibahas: ${clean} 🚀`,
    `Ternyata ini penyebabnya! 💡 ${clean}`
  ];
  return hooks[Math.abs(variant) % hooks.length];
}

function generateSceneShorten(text) {
  let clean = cleanBaseText(text) || text || 'Pesan penting untuk Anda';
  clean = clean
    .replace(/\b(adalah|merupakan|yang mana|di mana|mungkin saja|bisa dibilang|seperti yang kita tahu)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ');
  if (words.length > 5) {
    const mid = Math.ceil(words.length / 2);
    return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
  }
  return clean;
}

function generateSceneCTA(text, variant = 0) {
  const ctas = [
    `Yuk amankan sekarang sebelum kehabisan! Klik link di bio 📲`,
    `Mau info & promo lebih lengkap? Hubungi via WhatsApp sekarang! 💬`,
    `Jangan tunda lagi, buktikan sendiri hari ini juga! 🔥`,
    `Save video ini biar nggak lupa & share ke teman kamu ya! 📌`,
    `Ketik "MAU" di kolom komentar untuk dapatkan promo spesial! 👇`,
    `Stok terbatas! Pesan sekarang juga sebelum kehabisan ⚡`
  ];
  return ctas[Math.abs(variant) % ctas.length];
}

function recommendSceneStyle(text, hasImage) {
  const lower = (text || '').toLowerCase();

  if (hasImage) {
    return {
      animation: 'ken-burns',
      animLabel: 'Zoom Perlahan (Ken Burns)',
      textPosition: 'bottom',
      posLabel: 'Bawah (Beri ruang gambar)',
      fontSize: 'md',
      sizeLabel: 'Sedang',
      bgColor: 'midnight',
      bgLabel: 'Midnight Dark',
      reason: 'Gambar terdeteksi — teks diposisikan di bawah dengan animasi Ken Burns sinematik.'
    };
  }

  if (/(promo|diskon|hemat|terbatas|sekarang|cepet|hari ini|flash sale|cashback|murah|gratis)/.test(lower)) {
    return {
      animation: 'bounce',
      animLabel: 'Membal Dinamis (Bounce)',
      textPosition: 'center',
      posLabel: 'Tengah',
      fontSize: 'xl',
      sizeLabel: 'Ekstra Besar',
      bgColor: 'sunset',
      bgLabel: 'Sunset Red',
      reason: 'Pesan urgensi / promo terdeteksi — efek membal enerjik dengan latar merah.'
    };
  }

  if (/(stop|jangan|kenapa|tahu|rahasia|bisa|awas|penasaran|siapa|apa)/.test(lower)) {
    return {
      animation: 'slide-up',
      animLabel: 'Geser dari Bawah (Slide Up)',
      textPosition: 'center',
      posLabel: 'Tengah',
      fontSize: 'lg',
      sizeLabel: 'Besar',
      bgColor: 'neon-purple',
      bgLabel: 'Neon Purple',
      reason: 'Hook / pemantik rasa penasaran — animasi slide-up dan warna ungu neon untuk menahan scrolling.'
    };
  }

  if (/(hubungi|wa|whatsapp|klik|bio|dm|order|pesan|chat|info)/.test(lower)) {
    return {
      animation: 'slide-left',
      animLabel: 'Geser dari Kiri (Slide Left)',
      textPosition: 'bottom',
      posLabel: 'Bawah',
      fontSize: 'lg',
      sizeLabel: 'Besar',
      bgColor: 'emerald',
      bgLabel: 'Emerald Green',
      reason: 'Ajakan aksi (CTA) terdeteksi — warna hijau konversi dan posisi bawah agar mudah dibaca.'
    };
  }

  if (/(tips|cara|solusi|metode|rahasia|langkah|panduan|edukasi)/.test(lower)) {
    return {
      animation: 'slide-up',
      animLabel: 'Geser dari Bawah (Slide Up)',
      textPosition: 'center',
      posLabel: 'Tengah',
      fontSize: 'md',
      sizeLabel: 'Sedang',
      bgColor: 'cyber-cyan',
      bgLabel: 'Cyber Cyan',
      reason: 'Konten edukasi/tips — warna cyan modern dan teks terpusat.'
    };
  }

  return {
    animation: 'fade',
    animLabel: 'Pudar Masuk (Fade)',
    textPosition: 'center',
    posLabel: 'Tengah',
    fontSize: 'lg',
    sizeLabel: 'Besar',
    bgColor: 'royal',
    bgLabel: 'Royal Indigo',
    reason: 'Gaya visual seimbang dan elegan untuk narasi umum.'
  };
}

function generate5ScenesFromTopic(topic, niche, tone) {
  const clean = cleanBaseText(topic) || 'Produk Unggulan Kami';

  if (niche === 'edukasi') {
    return [
      {
        id: 1,
        duration: 3,
        text: `Banyak yang salah kaprah soal ini! ⚠️\nSimak rahasia ${clean}:`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-up',
        bgColor: 'midnight',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `Faktanya, sebagian besar orang gagal karena lewatkan langkah dasar ini. 🤦‍♂️`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'fade',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `Kuncinya adalah: fokus pada ${clean} secara terarah! 💡`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-left',
        bgColor: 'cyber-cyan',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `Hasilnya? Proses 2x lebih cepat & bebas dari kesalahan fatal. 🚀`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'bounce',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `Save video ini biar nggak lupa & follow untuk tips lainnya! 📌`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        animation: 'slide-up',
        bgColor: 'midnight',
        imageDataUrl: null
      }
    ];
  } else if (niche === 'kuliner') {
    return [
      {
        id: 1,
        duration: 3,
        text: `Pecinta kuliner wajib merapat! 🤤\nMenu yang satu ini lagi viral banget:`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'bounce',
        bgColor: 'sunset',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `Cobain nikmatnya ${clean} dengan cita rasa otentik yang bikin nagih! 🔥`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'fade',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `Bahan segar pilihan & bumbu meresap sempurna sampai gigitan terakhir. ✨`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-left',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `Porsi puas, rasa juara, dan harga bersahabat di kantong! 💯`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'fade',
        bgColor: 'emerald',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `Yuk langsung order online atau mampir sekarang juga! 🛵📲`,
        fontFamily: 'sans-serif',
        fontSize: 'xl',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        animation: 'slide-up',
        bgColor: 'sunset',
        imageDataUrl: null
      }
    ];
  } else if (niche === 'storytelling') {
    return [
      {
        id: 1,
        duration: 3,
        text: `Dulu aku sempat bingung banget...\nSampai akhirnya nemu titik balik ini: 🥺`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'fade',
        bgColor: 'midnight',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `Tiap hari capek nyari cara yang beneran ampuh tapi nihil hasil. 🤦‍♂️`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-up',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `Semua berubah waktu mulai kenal & coba ${clean}! 💡`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'bounce',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `Nggak nyangka efeknya secepat ini, hasilnya nyata dan bikin lega. ✨`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-left',
        bgColor: 'cyber-cyan',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `Kamu juga bisa! Mulai langkah pertamamu hari ini bareng kami 📲`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        animation: 'slide-up',
        bgColor: 'emerald',
        imageDataUrl: null
      }
    ];
  } else if (niche === 'jasa') {
    return [
      {
        id: 1,
        duration: 3,
        text: `Capek ngurus sendiri tapi hasilnya kurang puas? 🤯\nSerahkan ke ahlinya!`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'bounce',
        bgColor: 'sunset',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `Waktu terbuang sia-sia dan biaya bengkak tanpa hasil jelas. 📉`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'fade',
        bgColor: 'midnight',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `Layanan ${clean} kami siap bantu tuntaskan sampai beres! 🚀`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-left',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `Dikerjakan tim profesional, proses transparan & bergaransi puas! 🤝`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-up',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `Konsultasi gratis sekarang! Klik tombol kontak di profil 📲`,
        fontFamily: 'sans-serif',
        fontSize: 'xl',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        animation: 'bounce',
        bgColor: 'emerald',
        imageDataUrl: null
      }
    ];
  } else {
    // Default: promo / sales
    return [
      {
        id: 1,
        duration: 3,
        text: `Stop scrolling! 🛑\nMasih bingung cari solusi buat ${clean}?`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'bounce',
        bgColor: 'sunset',
        imageDataUrl: null
      },
      {
        id: 2,
        duration: 3,
        text: `Jangan buang waktu dan biaya mahal untuk hal yang nggak pasti! ⚠️`,
        fontFamily: 'sans-serif',
        fontSize: 'md',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-up',
        bgColor: 'midnight',
        imageDataUrl: null
      },
      {
        id: 3,
        duration: 3,
        text: `Kenalkan: ${clean} dengan kualitas terbaik dan terpercaya! ✨`,
        fontFamily: 'sans-serif',
        fontSize: 'lg',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'slide-left',
        bgColor: 'royal',
        imageDataUrl: null
      },
      {
        id: 4,
        duration: 3,
        text: `Spesial hari ini! Ada diskon eksklusif & bonus tambahan 🔥`,
        fontFamily: 'sans-serif',
        fontSize: 'xl',
        textColor: '#FFFFFF',
        textPosition: 'center',
        animation: 'bounce',
        bgColor: 'neon-purple',
        imageDataUrl: null
      },
      {
        id: 5,
        duration: 3,
        text: `Slot terbatas! Klik link di bio atau WhatsApp kami sekarang 📲`,
        fontFamily: 'sans-serif',
        fontSize: 'xl',
        textColor: '#FFFFFF',
        textPosition: 'bottom',
        animation: 'slide-up',
        bgColor: 'emerald',
        imageDataUrl: null
      }
    ];
  }
}

async function callGeminiIfAvailable(prompt) {
  const apiKey = localStorage.getItem('om_gemini_api_key');
  if (!apiKey || !navigator.onLine) {
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Kamu adalah asisten copywriter video pendek (Reels/TikTok/Shorts) bahasa Indonesia. Jawab secara padat (maksimal 1-2 kalimat singkat, tanpa tanda petik, tanpa basa-basi). ${prompt}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 80
        }
      })
    });

    if (!res.ok) {
      console.warn('[AI] Gemini API error status:', res.status);
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      return candidate.trim();
    }
  } catch (err) {
    console.warn('[AI] Gemini network error:', err);
  }
  return null;
}

function triggerQuickAiAction(sceneIndex, actionType) {
  const scene = currentProject.scenes[sceneIndex];
  if (!scene) return;

  const key = `${sceneIndex}_${actionType}`;
  aiVariantCounters[key] = (aiVariantCounters[key] || 0) + 1;
  const variant = aiVariantCounters[key];

  let newText = '';
  if (actionType === 'hook') {
    newText = generateSceneHook(scene.text, variant);
    showToast(`⚡ AI: Hook viral diterapkan pada Scene ${sceneIndex + 1}`);
  } else if (actionType === 'shorten') {
    newText = generateSceneShorten(scene.text);
    showToast(`🎯 AI: Teks Scene ${sceneIndex + 1} dipadatkan untuk layar 9:16`);
  } else if (actionType === 'cta') {
    newText = generateSceneCTA(scene.text, variant);
    showToast(`🛒 AI: Ajakan aksi (CTA) diterapkan pada Scene ${sceneIndex + 1}`);
  }

  if (newText) {
    scene.text = newText;
    dbSaveProject(currentProject).then(() => {
      renderStoryboardScenes();
    });
  }
}

function applyAiStyleRecommendationToScene(sceneIndex) {
  const scene = currentProject.scenes[sceneIndex];
  if (!scene) return;

  const styleRec = recommendSceneStyle(scene.text, Boolean(scene.imageDataUrl));
  scene.animation = styleRec.animation;
  scene.textPosition = styleRec.textPosition;
  scene.fontSize = styleRec.fontSize;
  if (!scene.imageDataUrl) {
    scene.bgColor = styleRec.bgColor;
  }

  dbSaveProject(currentProject).then(() => {
    renderStoryboardScenes();
    showToast(`🎨 AI: Animasi "${styleRec.animLabel}" & posisi "${styleRec.posLabel}" diterapkan!`);
  });
}

function openAiSceneModal(sceneIndex) {
  currentModalSceneIndex = sceneIndex;
  currentModalActionType = 'hook';
  const scene = currentProject.scenes[sceneIndex];
  if (!scene) return;

  document.getElementById('modal-ai-scene-title').textContent = `Bantuan AI untuk Scene ${sceneIndex + 1}`;
  document.getElementById('modal-ai-original-text').textContent = scene.text || '(Belum ada teks naskah)';

  const defaultHook = generateSceneHook(scene.text, 0);
  currentModalAiSuggestion = defaultHook;
  document.getElementById('ai-suggestion-textarea').value = defaultHook;

  currentModalStyleRec = recommendSceneStyle(scene.text, Boolean(scene.imageDataUrl));
  const styleBox = document.getElementById('ai-style-recommendation');
  styleBox.innerHTML = `
    <strong>🎨 Rekomendasi Desain AI:</strong><br>
    Animasi: <strong>${currentModalStyleRec.animLabel}</strong> | Posisi: <strong>${currentModalStyleRec.posLabel}</strong> | Ukuran: <strong>${currentModalStyleRec.sizeLabel}</strong><br>
    <small class="text-dim">${currentModalStyleRec.reason}</small>
  `;
  styleBox.classList.remove('hidden');

  const geminiKey = localStorage.getItem('om_gemini_api_key');
  const engineBadge = document.getElementById('ai-engine-badge');
  if (geminiKey) {
    engineBadge.textContent = 'Gemini Cloud AI';
    engineBadge.className = 'badge badge-purple';
    document.getElementById('ai-gemini-key-input').value = geminiKey;
  } else {
    engineBadge.textContent = 'Offline AI (Rp0)';
    engineBadge.className = 'badge badge-emerald';
    document.getElementById('ai-gemini-key-input').value = '';
  }

  document.getElementById('ai-custom-prompt-input').value = '';
  document.getElementById('scene-ai-modal').classList.add('active');
}

function closeAiSceneModal() {
  document.getElementById('scene-ai-modal').classList.remove('active');
}

function initAiAssistant() {
  // Toggle 5-Scene Generator Card
  const toggleBtn = document.getElementById('btn-toggle-ai-generator');
  const body = document.getElementById('ai-generator-body');
  const icon = document.getElementById('ai-gen-toggle-icon');

  if (toggleBtn && body && icon) {
    toggleBtn.addEventListener('click', (e) => {
      if (e.target.closest('#ai-generator-body')) return;
      const isCollapsed = body.classList.toggle('collapsed');
      icon.textContent = isCollapsed ? '▼' : '▲';
    });
  }

  // 5-Scene Generator Button
  const genBtn = document.getElementById('btn-ai-generate-5-scenes');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      const topic = document.getElementById('ai-global-topic-input').value.trim();
      const niche = document.getElementById('ai-global-niche-select').value;
      const tone = document.getElementById('ai-global-tone-select').value;

      if (!topic) {
        showToast('⚠️ Harap masukkan ide, produk, atau topik video Anda!');
        document.getElementById('ai-global-topic-input').focus();
        return;
      }

      const newScenes = generate5ScenesFromTopic(topic, niche, tone);
      currentProject.scenes = newScenes;
      currentProject.name = `Video AI — ${topic.slice(0, 24)}`;

      dbSaveProject(currentProject).then(() => {
        renderStoryboardScenes();
        updateProjectHeaderLabel();
        showToast('✨ 5 Scene berhasil disusun otomatis oleh AI!');
        if (body) body.classList.add('collapsed');
        if (icon) icon.textContent = '▼';
      });
    });
  }

  // Modal Actions
  const btnClose = document.getElementById('btn-close-ai-modal');
  const btnCancel = document.getElementById('btn-cancel-ai-modal');
  if (btnClose) btnClose.addEventListener('click', closeAiSceneModal);
  if (btnCancel) btnCancel.addEventListener('click', closeAiSceneModal);

  // Quick Action cards inside modal
  document.querySelectorAll('.btn-ai-action-card').forEach(card => {
    card.addEventListener('click', async () => {
      const action = card.dataset.action;
      currentModalActionType = action;
      const scene = currentProject.scenes[currentModalSceneIndex];
      if (!scene) return;

      const variant = (aiVariantCounters[`modal_${action}`] = (aiVariantCounters[`modal_${action}`] || 0) + 1);

      if (action === 'hook') {
        const geminiRes = await callGeminiIfAvailable(`Ubah kalimat ini menjadi hook video pendek yang sangat memikat dan bikin penasaran: "${scene.text}"`);
        const result = geminiRes || generateSceneHook(scene.text, variant);
        document.getElementById('ai-suggestion-textarea').value = result;
      } else if (action === 'shorten') {
        const geminiRes = await callGeminiIfAvailable(`Persingkat teks ini agar pas dibaca cepat di layar HP vertikal 9:16 (maksimal 8 kata): "${scene.text}"`);
        const result = geminiRes || generateSceneShorten(scene.text);
        document.getElementById('ai-suggestion-textarea').value = result;
      } else if (action === 'cta') {
        const geminiRes = await callGeminiIfAvailable(`Ubah teks ini menjadi call to action (ajakan bertindak/beli) yang kuat dan persuasif: "${scene.text}"`);
        const result = geminiRes || generateSceneCTA(scene.text, variant);
        document.getElementById('ai-suggestion-textarea').value = result;
      } else if (action === 'autostyle') {
        currentModalStyleRec = recommendSceneStyle(scene.text, Boolean(scene.imageDataUrl));
        const styleBox = document.getElementById('ai-style-recommendation');
        styleBox.innerHTML = `
          <strong>🎨 Rekomendasi Desain AI:</strong><br>
          Animasi: <strong>${currentModalStyleRec.animLabel}</strong> | Posisi: <strong>${currentModalStyleRec.posLabel}</strong> | Ukuran: <strong>${currentModalStyleRec.sizeLabel}</strong><br>
          <small class="text-dim">${currentModalStyleRec.reason}</small>
        `;
        showToast('🎨 Rekomendasi gaya & animasi AI diperbarui!');
      }
    });
  });

  // Custom Prompt Submit
  const submitPromptBtn = document.getElementById('btn-submit-ai-prompt');
  if (submitPromptBtn) {
    submitPromptBtn.addEventListener('click', async () => {
      const prompt = document.getElementById('ai-custom-prompt-input').value.trim();
      const scene = currentProject.scenes[currentModalSceneIndex];
      if (!prompt || !scene) return;

      showToast('⏳ AI sedang memproses instruksi...');
      const geminiRes = await callGeminiIfAvailable(`Teks asli: "${scene.text}". Instruksi perbaikan: "${prompt}". Tulis ulang naskah video pendeknya:`);
      
      let finalResult = geminiRes;
      if (!finalResult) {
        // Fallback offline rules based on keywords in prompt
        const pLower = prompt.toLowerCase();
        if (pLower.includes('emoji')) {
          finalResult = `🔥 ${cleanBaseText(scene.text)} ✨`;
        } else if (pLower.includes('santai') || pLower.includes('gaul')) {
          finalResult = `Gais, kalian wajib coba ini: ${cleanBaseText(scene.text)} 😍`;
        } else if (pLower.includes('formal') || pLower.includes('baku')) {
          finalResult = `Solusi terpercaya dengan kualitas unggul: ${cleanBaseText(scene.text)}.`;
        } else {
          finalResult = `${prompt}: ${cleanBaseText(scene.text)}`;
        }
      }

      document.getElementById('ai-suggestion-textarea').value = finalResult;
      showToast('✨ AI selesai merespons instruksi Anda');
    });
  }

  // Regenerate button
  const regenBtn = document.getElementById('btn-regenerate-ai');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      const scene = currentProject.scenes[currentModalSceneIndex];
      if (!scene) return;
      const variant = (aiVariantCounters[`modal_regen`] = (aiVariantCounters[`modal_regen`] || 0) + 1);

      if (currentModalActionType === 'cta') {
        document.getElementById('ai-suggestion-textarea').value = generateSceneCTA(scene.text, variant);
      } else if (currentModalActionType === 'shorten') {
        document.getElementById('ai-suggestion-textarea').value = generateSceneShorten(scene.text);
      } else {
        document.getElementById('ai-suggestion-textarea').value = generateSceneHook(scene.text, variant);
      }
      showToast('🔄 Variasi alternatif ditampilkan');
    });
  }

  // Apply to Scene Button
  const applyBtn = document.getElementById('btn-apply-ai-scene');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const scene = currentProject.scenes[currentModalSceneIndex];
      if (!scene) return;

      const newText = document.getElementById('ai-suggestion-textarea').value.trim();
      if (newText) {
        scene.text = newText;
      }

      // Apply recommended style if present
      if (currentModalStyleRec) {
        scene.animation = currentModalStyleRec.animation;
        scene.textPosition = currentModalStyleRec.textPosition;
        scene.fontSize = currentModalStyleRec.fontSize;
        if (!scene.imageDataUrl) {
          scene.bgColor = currentModalStyleRec.bgColor;
        }
      }

      dbSaveProject(currentProject).then(() => {
        renderStoryboardScenes();
        closeAiSceneModal();
        showToast(`✅ Hasil AI berhasil diterapkan ke Scene ${currentModalSceneIndex + 1}!`);
      });
    });
  }

  // Engine Settings Toggle
  const btnToggleSettings = document.getElementById('btn-toggle-engine-settings');
  const settingsPanel = document.getElementById('ai-engine-settings-panel');
  if (btnToggleSettings && settingsPanel) {
    btnToggleSettings.addEventListener('click', () => {
      settingsPanel.classList.toggle('hidden');
    });
  }

  // Save Gemini Key
  const btnSaveKey = document.getElementById('btn-save-ai-key');
  if (btnSaveKey) {
    btnSaveKey.addEventListener('click', () => {
      const key = document.getElementById('ai-gemini-key-input').value.trim();
      const badge = document.getElementById('ai-engine-badge');
      if (key) {
        localStorage.setItem('om_gemini_api_key', key);
        badge.textContent = 'Gemini Cloud AI';
        badge.className = 'badge badge-purple';
        showToast('🔑 Kunci Gemini API berhasil disimpan');
      } else {
        localStorage.removeItem('om_gemini_api_key');
        badge.textContent = 'Offline AI (Rp0)';
        badge.className = 'badge badge-emerald';
        showToast('🟢 Kembali ke AI Bawaan Offline (Rp0)');
      }
      if (settingsPanel) settingsPanel.classList.add('hidden');
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Initializing OpenMontage Mobile...');

  // Initialize DB
  try {
    await initDatabase();
    refreshProjectsList();
  } catch (err) {
    console.warn('Running without IndexedDB, will use memory fallback:', err);
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.error('[PWA] Service Worker registration failed:', err));
  }

  // Network online/offline status
  const updateOnlineStatus = () => {
    const indicator = document.getElementById('status-offline-indicator');
    if (navigator.onLine) {
      indicator.className = 'status-pill status-online';
      indicator.textContent = '● Online';
    } else {
      indicator.className = 'status-pill status-offline';
      indicator.textContent = '● Offline (PWA)';
    }
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // PWA Install prompt listener
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btn-install-pwa');
    if (btn) {
      btn.classList.remove('hidden');
      btn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] User response:', outcome);
          deferredPrompt = null;
          btn.classList.add('hidden');
        }
      });
    }
  });

  // Setup Subsystems
  setupMyRepublicStudio();
  setupGeneralTemplates();
  setupBoosterGenerators();
  setupManualScriptEditor();
  initAiAssistant();

  // Navigation tab bar listeners
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // Subtabs listeners
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSubtab(btn.dataset.subtab);
    });
  });

  // Dashboard buttons
  document.getElementById('btn-dash-new-project').addEventListener('click', () => {
    currentProject = createDefaultProject('Proyek Video Baru');
    dbSaveProject(currentProject);
    updateProjectHeaderLabel();
    showToast('✨ Proyek baru telah dibuat');
    switchView('storyboard');
  });

  document.getElementById('btn-dash-myrep-quick').addEventListener('click', () => {
    switchView('script');
    switchSubtab('script-myrep');
  });

  // Storyboard buttons
  document.getElementById('btn-preview-canvas-now').addEventListener('click', () => {
    switchView('render');
  });

  document.getElementById('btn-save-project-storyboard').addEventListener('click', () => {
    dbSaveProject(currentProject).then(() => {
      showToast('💾 Proyek berhasil disimpan ke perangkat');
    });
  });

  document.getElementById('btn-proceed-to-render').addEventListener('click', () => {
    switchView('render');
  });

  // Playback Controls
  document.getElementById('btn-play-pause').addEventListener('click', togglePreview);
  document.getElementById('btn-rewind').addEventListener('click', () => {
    playbackElapsed = 0;
    playbackStartTime = performance.now();
    drawFrameAtTime(0);
  });

  const loopBtn = document.getElementById('btn-loop-toggle');
  loopBtn.addEventListener('click', () => {
    isLooping = !isLooping;
    loopBtn.classList.toggle('active-toggle', isLooping);
    showToast(isLooping ? '🔁 Loop otomatis aktif' : 'Putar sekali');
  });

  // Render Resolution setting
  const resSelect = document.getElementById('render-resolution');
  resSelect.addEventListener('change', (e) => {
    currentProject.resolution = e.target.value;
    initCanvasSize();
    drawFrameAtTime(playbackElapsed);
    dbSaveProject(currentProject);
  });

  // Video Render button
  document.getElementById('btn-start-render').addEventListener('click', renderVideoWebM);

  // Render Modal buttons
  document.getElementById('btn-cancel-render').addEventListener('click', () => {
    cancelRenderRequested = true;
  });

  document.getElementById('btn-close-render-modal').addEventListener('click', () => {
    document.getElementById('render-modal').classList.remove('active');
  });

  document.getElementById('btn-download-rendered-webm').addEventListener('click', downloadRenderedWebM);

  // Export Center Buttons
  document.getElementById('btn-export-srt').addEventListener('click', () => {
    const srt = generateSRT();
    const name = (currentProject.name || 'openmontage').toLowerCase().replace(/\s+/g, '_');
    downloadFile(srt, `${name}.srt`, 'text/plain');
    showToast('📥 Mengunduh subtitle SRT...');
  });

  document.getElementById('btn-export-txt').addEventListener('click', () => {
    const txt = generateTXT();
    const name = (currentProject.name || 'openmontage').toLowerCase().replace(/\s+/g, '_');
    downloadFile(txt, `${name}_naskah.txt`, 'text/plain');
    showToast('📥 Mengunduh naskah TXT...');
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const json = JSON.stringify(currentProject, null, 2);
    const name = (currentProject.name || 'openmontage').toLowerCase().replace(/\s+/g, '_');
    downloadFile(json, `${name}_backup.json`, 'application/json');
    showToast('📥 Mengunduh cadangan proyek JSON...');
  });

  document.getElementById('btn-copy-caption').addEventListener('click', () => {
    const area = document.getElementById('export-caption-area');
    area.select();
    navigator.clipboard.writeText(area.value).then(() => {
      showToast('📋 Caption berhasil disalin ke clipboard!');
    }).catch(() => {
      showToast('⚠️ Gagal menyalin secara otomatis, silakan salin manual.');
    });
  });

  // Initial draw
  initCanvasSize();
  drawFrameAtTime(0);
  updateProjectHeaderLabel();
  console.log('[App] OpenMontage Mobile ready.');
});
