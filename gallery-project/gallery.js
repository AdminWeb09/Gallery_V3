// ==========================================
// Modern Dark Web Gallery - Gallery Logic (Halaman Publik)
// Terhubung langsung ke Supabase Client
// ==========================================

// 1. KONFIGURASI SUPABASE
// Ganti dengan kredensial proyek Supabase Anda sendiri untuk mengaktifkan koneksi database asli
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

let supabaseClient = null;
let isDemoMode = false;

// Kumpulan foto cadangan jika Supabase belum dikonfigurasi / kosong (Demo Mode)
const DEMO_PHOTOS = [
  {
    id: "demo-1",
    title: "Symmetry of Modern Architecture",
    description: "Perfect geometric symmetry found in modern carbon-framed skyscrapers, capturing the play of shadow and light on brushed steel windows.",
    category: "Architecture",
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-2",
    title: "Whispering Pine Forest",
    description: "Ethereal sunrise filtering through high-altitude pine tree tops shrouded in dense autumn mist, evoking absolute solitude and serenity.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1200",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-3",
    title: "Floating Ink Aesthetics",
    description: "An elegant, high-contrast flat lay of monochrome ink drops diffusing smoothly into pure glycerin, representing the flow of artistic thoughts.",
    category: "Minimalist",
    image_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1200",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-4",
    title: "Sculpted Desert Dunes",
    description: "Sensual curves formed by shifting sand dunes in the Namib desert, cast under the harsh golden orange rays of early morning sunlight.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=1200",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-5",
    title: "The Industrial Monolith",
    description: "Brutalist raw concrete structure acting as a modern library center, emphasizing raw volume, repetitive lines, and structural honesty.",
    category: "Architecture",
    image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-6",
    title: "Negative Space Canvas",
    description: "A single minimalist ceramics vase cast standing on an off-white concrete desk, beautifully balanced by extensive light negative space.",
    category: "Minimalist",
    image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&q=80&w=1200",
    created_at: new Date().toISOString()
  }
];

// Inisialisasi Klien Supabase
function initSupabase() {
  // Cek apakah ada konfigurasi tersimpan di localStorage (untuk kemudahan pengujian dari panel live-preview)
  const savedUrl = localStorage.getItem("supabase_url");
  const savedKey = localStorage.getItem("supabase_anon_key");

  const url = savedUrl || SUPABASE_URL;
  const key = savedKey || SUPABASE_ANON_KEY;

  if (url === "YOUR_SUPABASE_URL" || key === "YOUR_SUPABASE_ANON_KEY" || !url || !key) {
    console.warn("Supabase tidak terkonfigurasi. Menggunakan Demo Mode dengan data lokal.");
    isDemoMode = true;
    showToast("Berjalan dalam Demo Mode. Konfigurasi kredensial proyek untuk beralih ke Database Supabase!");
    return null;
  }

  try {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(url, key);
      console.log("Koneksi Supabase berhasil diinisialisasi.");
      localStorage.setItem("supabase_url", url);
      localStorage.setItem("supabase_anon_key", key);
      return supabaseClient;
    } else {
      throw new Error("Pustaka Supabase JS CDN belum dideklarasikan di file HTML Anda.");
    }
  } catch (err) {
    console.error("Gagal menginisialisasi Klien Supabase:", err);
    isDemoMode = true;
    showToast("Koneksi Supabase gagal. Berjalan dalam Demo Mode.", "error");
    return null;
  }
}

// 2. STATE APLIKASI
let allPhotos = [];
let selectedCategory = "all";

// 3. ELEMEN DOM UTAMA
const galleryGrid = document.getElementById("gallery-grid");
const filtersContainer = document.getElementById("filters-container");
const loaderContainer = document.getElementById("loader-container");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxCategory = document.getElementById("lightbox-category");
const lightboxDesc = document.getElementById("lightbox-desc");
const lightboxClose = document.getElementById("lightbox-close");

// 4. FETCH DATA FOTO
async function fetchPhotos() {
  showLoader(true);
  
  if (isDemoMode) {
    // Simulasi loading di Demo Mode
    await new Promise(resolve => setTimeout(resolve, 600));
    // Load data lokal dari localStorage jika pernah menambah via editor dummy, atau default
    const localDb = localStorage.getItem("demo_db_photos");
    if (localDb) {
      allPhotos = JSON.parse(localDb);
    } else {
      allPhotos = [...DEMO_PHOTOS];
      localStorage.setItem("demo_db_photos", JSON.stringify(allPhotos));
    }
  } else {
    try {
      const { data, error } = await supabaseClient
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      allPhotos = data || [];
    } catch (err) {
      console.error("Gagal mematangkan data dari Supabase:", err);
      showToast("Gagal mengambil data dari Supabase. Mengalihkan ke Demo Mode.", "error");
      // Fallback ke demo mode jika error koneksi/tabel belum dibuat
      isDemoMode = true;
      allPhotos = JSON.parse(localStorage.getItem("demo_db_photos")) || [...DEMO_PHOTOS];
    }
  }

  showLoader(false);
  renderFilters();
  renderGallery();
}

// 5. RENDER FILTER KATEGORI (Dinamis dari Data)
function renderFilters() {
  if (!filtersContainer) return;

  // Dapatkan seluruh kategori unik
  const categories = ["all"];
  allPhotos.forEach(photo => {
    if (photo.category && !categories.includes(photo.category)) {
      categories.push(photo.category);
    }
  });

  filtersContainer.innerHTML = "";

  categories.forEach(category => {
    const btn = document.createElement("button");
    btn.className = `filter-btn ${category === selectedCategory ? "active" : ""}`;
    btn.textContent = category === "all" ? "Semua Karya" : category;
    btn.addEventListener("click", () => {
      // Ubah filter aktif
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCategory = category;
      renderGallery();
    });
    filtersContainer.appendChild(btn);
  });
}

// 6. RENDER KARYA FOTO KE GRID GALERI MASONRY
function renderGallery() {
  if (!galleryGrid) return;

  // Saring foto berdasarkan kategori terpilih
  const filteredPhotos = selectedCategory === "all" 
    ? allPhotos 
    : allPhotos.filter(photo => photo.category === selectedCategory);

  galleryGrid.innerHTML = "";

  if (filteredPhotos.length === 0) {
    galleryGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <p>Belum ada karya foto yang diunggah dalam kategori ini.</p>
        ${isDemoMode ? '<button onclick="resetDemoPhotos()" class="btn-primary" style="margin-top:1rem;">Pulihkan Foto Demo</button>' : ''}
      </div>
    `;
    return;
  }

  filteredPhotos.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.setAttribute("id", `photo-${photo.id}`);

    // Lazy load gambar bertahap dengan efek transition fade in
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "gallery-img-wrapper";

    const img = document.createElement("img");
    img.src = photo.image_url;
    img.alt = photo.title;
    img.loading = "lazy";
    
    // Smooth transition class saat load selesai
    img.onload = () => {
      // Tunggu sedikit supaya layout masonry seimbang sebelum fade in
      setTimeout(() => {
        item.classList.add("loaded");
      }, index * 50); // Stagger effect
    };

    imgWrapper.appendChild(img);

    // Overlay Card
    const overlay = document.createElement("div");
    overlay.className = "gallery-overlay";
    overlay.innerHTML = `
      <div class="img-category">${photo.category || "General"}</div>
      <h3 class="img-title">${photo.title}</h3>
      <p class="img-desc">${photo.description || ""}</p>
    `;

    item.appendChild(imgWrapper);
    item.appendChild(overlay);

    // Event Klik untuk membuka Lightbox
    item.addEventListener("click", () => openLightbox(photo));

    galleryGrid.appendChild(item);
  });
}

// 7. LIGHTBOX (MODAL VIEW) CONTROLLER
function openLightbox(photo) {
  if (!lightbox) return;

  lightboxImg.src = photo.image_url;
  lightboxImg.alt = photo.title;
  lightboxTitle.textContent = photo.title;
  lightboxCategory.textContent = photo.category || "General";
  lightboxDesc.textContent = photo.description || "Tidak ada deskripsi tambahan untuk karya ini.";

  lightbox.classList.add("active");
  document.body.style.overflow = "hidden"; // Cegah scroll latar belakang
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("active");
  document.body.style.overflow = ""; // Pulihkan scroll latar belakang
  
  // Kosongkan src saat ditutup agar tidak terjadi kedipan gambar lama saat dibuka lagi
  setTimeout(() => {
    lightboxImg.src = "";
  }, 300);
}

// 8. LOADING CONTROL
function showLoader(show) {
  if (!loaderContainer) return;
  loaderContainer.style.display = show ? "flex" : "none";
}

// 9. TOAST MANAGER
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-weight: 600;">${type === "error" ? "✕" : "✓"}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  // Trigger transisi masuk
  setTimeout(() => toast.classList.add("show"), 10);

  // Hilangkan otomatis setelah 4 detik
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Pulihkan foto demo jika user menghapus atau ingin reset
window.resetDemoPhotos = function() {
  localStorage.removeItem("demo_db_photos");
  fetchPhotos();
  showToast("Foto demo berhasil dipulihkan!");
};

// 10. SETUP EVENT LISTENERS & INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  // Buat kontainer toast jika belum ada
  if (!document.getElementById("toast-container")) {
    const toastCont = document.createElement("div");
    toastCont.id = "toast-container";
    toastCont.className = "toast-container";
    document.body.appendChild(toastCont);
  }

  initSupabase();
  fetchPhotos();

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  // Tutup lightbox jika mengklik area di luar gambar
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Tutup dengan ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox && lightbox.classList.contains("active")) {
      closeLightbox();
    }
  });
});
