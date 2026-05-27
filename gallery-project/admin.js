// ==========================================
// Modern Dark Web Gallery - Admin Panel Logic
// Terhubung langsung ke Supabase Auth, Storage, dan Database
// ==========================================

// 1. KONFIGURASI SUPABASE
// Ganti dengan kredensial proyek Supabase Anda sendiri untuk mengaktifkan koneksi database asli
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

let supabaseClient = null;
let isDemoMode = false;

// Kumpulan akun admin tiruan untuk demo jika Supabase belum aktif
const DEMO_ADMIN = {
  email: "admin@gallery.com",
  password: "password123"
};

// Inisialisasi Klien Supabase
function initSupabase() {
  const savedUrl = localStorage.getItem("supabase_url");
  const savedKey = localStorage.getItem("supabase_anon_key");

  const url = savedUrl || SUPABASE_URL;
  const key = savedKey || SUPABASE_ANON_KEY;

  if (url === "YOUR_SUPABASE_URL" || key === "YOUR_SUPABASE_ANON_KEY" || !url || !key) {
    console.warn("Supabase tidak terkonfigurasi. Berjalan dalam Demo Mode.");
    isDemoMode = true;
    showToast("Berjalan dalam Demo Mode. Akun Pengujian: admin@gallery.com / password123", "success");
    return null;
  }

  try {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(url, key);
      localStorage.setItem("supabase_url", url);
      localStorage.setItem("supabase_anon_key", key);
      return supabaseClient;
    } else {
      throw new Error("Supabase CDN JS tidak ditemukan.");
    }
  } catch (err) {
    console.error("Gagal inisialisasi Supabase:", err);
    isDemoMode = true;
    showToast("Menggunakan Demo Mode karena error inisialisasi.", "error");
    return null;
  }
}

// 2. STATE MANAGE
let currentUser = null;
let adminPhotos = [];
let selectedFileToUpload = null;
let photoIdToEdit = null;

// ELEMEN DOM CORES
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");

const sidebar = document.getElementById("sidebar");
const userEmailDisplay = document.getElementById("user-email-display");
const btnLogout = document.getElementById("btn-logout");

const uploadTabBtn = document.getElementById("tab-upload-btn");
const manageTabBtn = document.getElementById("tab-manage-btn");
const panelUpload = document.getElementById("panel-upload");
const panelManage = document.getElementById("panel-manage");

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const previewImg = document.getElementById("preview-img");
const previewName = document.getElementById("preview-name");
const previewSize = document.getElementById("preview-size");
const btnRemovePreview = document.getElementById("btn-remove-preview");

const uploadForm = document.getElementById("upload-form");
const photoTitle = document.getElementById("photo-title");
const photoCategory = document.getElementById("photo-category");
const photoDesc = document.getElementById("photo-desc");
const btnUploadSubmit = document.getElementById("btn-upload-submit");

const manageGrid = document.getElementById("manage-grid");
const manageLoader = document.getElementById("manage-loader");

// EDIT MODAL ELEMENTS
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editTitle = document.getElementById("edit-title");
const editCategory = document.getElementById("edit-category");
const editDesc = document.getElementById("edit-desc");
const btnSaveEdit = document.getElementById("btn-save-edit");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const closeEditBtn = document.getElementById("close-edit-btn");

// 3. AUTH CONTROLLER
async function checkAuthSession() {
  if (isDemoMode) {
    const savedUser = sessionStorage.getItem("demo_admin_session");
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      showAdminDashboard();
    } else {
      showLoginScreen();
    }
  } else {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      
      if (session) {
        currentUser = session.user;
        showAdminDashboard();
      } else {
        showLoginScreen();
      }
    } catch (err) {
      console.error("Gagal memeriksa sesi auth:", err);
      showLoginScreen();
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showToast("Isi email dan password dengan lengkap!", "error");
    return;
  }

  showLoader(true, "Membuka gerbang masuk...");

  if (isDemoMode) {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (email === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
      currentUser = { email: email, id: "demo-admin-id" };
      sessionStorage.setItem("demo_admin_session", JSON.stringify(currentUser));
      showToast("Berhasil masuk (Demo Mode)!");
      showAdminDashboard();
    } else {
      showToast("Email atau password admin tiruan salah! Hubungi pembuat.", "error");
    }
    showLoader(false);
  } else {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      currentUser = data.user;
      showToast("Selamat datang kembali, Admin!");
      showAdminDashboard();
    } catch (err) {
      console.error("Gagal login login:", err);
      showToast(err.message || "Gagal login. Periksa email & password Anda.", "error");
    } finally {
      showLoader(false);
    }
  }
}

async function handleLogout() {
  if (isDemoMode) {
    sessionStorage.removeItem("demo_admin_session");
    currentUser = null;
    showToast("Berhasil keluar.");
    showLoginScreen();
  } else {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      currentUser = null;
      showToast("Berhasil keluar dari dashboard.");
      showLoginScreen();
    } catch (err) {
      console.error("Gagal logout:", err);
      showToast("Gagal melakukan keluar log.", "error");
    }
  }
}

// SCREEN TOGGLES
function showLoginScreen() {
  loginScreen.style.display = "flex";
  if (sidebar) sidebar.style.display = "none";
  document.querySelector(".main-content").style.marginLeft = "0";
}

function showAdminDashboard() {
  loginScreen.style.display = "none";
  if (sidebar) sidebar.style.display = "flex";
  if (window.innerWidth > 768) {
    document.querySelector(".main-content").style.marginLeft = "280px";
  }
  userEmailDisplay.textContent = currentUser.email;
  
  // Set tab default ke unggah
  switchTab("upload");
  fetchAdminPhotos();
}

// 4. TAB CONTROLLERS
function switchTab(tab) {
  if (tab === "upload") {
    uploadTabBtn.classList.add("active");
    manageTabBtn.classList.remove("active");
    panelUpload.classList.add("active");
    panelManage.classList.remove("active");
  } else {
    uploadTabBtn.classList.remove("active");
    manageTabBtn.classList.add("active");
    panelUpload.classList.remove("active");
    panelManage.classList.add("active");
    fetchAdminPhotos(); // Pastikan data terbaru di-fetch saat buka manajemen
  }
}

// 5. UPLOAD LOGICS (DRAG & DROP + KLIK PREVIEWS)
function initUploadListeners() {
  if (!dropzone) return;

  // Klik dropzone untuk buka select file
  dropzone.addEventListener("click", () => fileInput.click());

  // Handle seleksi file manual
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // Drag over effects
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  // Hapus seleksi
  btnRemovePreview.addEventListener("click", (e) => {
    e.stopPropagation(); // Biar g memicu file dialog lagi
    removeSelectedFile();
  });
}

function handleSelectedFile(file) {
  // Validasi tipe file gambar saja
  if (!file.type.startsWith("image/")) {
    showToast("File harus berformat Gambar (JPEG, PNG, WEBP)!", "error");
    return;
  }

  // Maksimal file 5MB
  if (file.size > 5 * 1024 * 1024) {
    showToast("Ukuran foto maksimal adalah 5MB!", "error");
    return;
  }

  selectedFileToUpload = file;

  // Render preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    previewSize.textContent = formatBytes(file.size);
    previewContainer.classList.add("active");
  };
  reader.readAsDataURL(file);
}

function removeSelectedFile() {
  selectedFileToUpload = null;
  fileInput.value = "";
  previewImg.src = "";
  previewName.textContent = "";
  previewSize.textContent = "";
  previewContainer.classList.remove("active");
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// SUBMIT FORM UPLOAD FOTO
async function handlePhotoUpload(e) {
  e.preventDefault();

  const title = photoTitle.value.trim();
  const category = photoCategory.value;
  const description = photoDesc.value.trim();

  if (!selectedFileToUpload) {
    showToast("Pilih foto terlebih dahulu sebelum mengunggah!", "error");
    return;
  }

  if (!title) {
    showToast("Judul foto tidak boleh kosong!", "error");
    return;
  }

  setUploadButtonState(true, "Menghubungkan & mentransfer data...");

  if (isDemoMode) {
    // Di Demo Mode, baca berkas sebagai Base64 dan simpan di localStorage
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;
      const newPhoto = {
        id: "demo-" + Date.now(),
        title,
        description,
        category,
        image_url: base64Image,
        file_path: "demo-bucket/" + selectedFileToUpload.name,
        created_at: new Date().toISOString()
      };

      const localDb = JSON.parse(localStorage.getItem("demo_db_photos")) || [];
      localDb.unshift(newPhoto);
      localStorage.setItem("demo_db_photos", JSON.stringify(localDb));

      await new Promise(resolve => setTimeout(resolve, 800)); // Simulasi upload delay
      showToast("Foto berhasil diunggah di Demo Mode!");
      resetUploadForm();
      setUploadButtonState(false);
      switchTab("manage");
    };
    reader.readAsDataURL(selectedFileToUpload);
  } else {
    try {
      // 1. Upload File ke Supabase Storage
      const fileExt = selectedFileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("gallery-images")
        .upload(filePath, selectedFileToUpload);

      if (uploadError) throw uploadError;

      // 2. Dapatkan URL Publik dari File yang Telah Diupload
      const { data: { publicUrl } } = supabaseClient.storage
        .from("gallery-images")
        .getPublicUrl(filePath);

      // 3. Masukkan record metadata foto ke tabel photos di database
      const { error: dbError } = await supabaseClient
        .from("photos")
        .insert({
          title,
          description,
          category,
          image_url: publicUrl,
          file_path: filePath
        });

      if (dbError) {
        // Jika insert DB gagal, bersihkan file yang baru saja diupload agar storage tidak boros
        await supabaseClient.storage.from("gallery-images").remove([filePath]);
        throw dbError;
      }

      showToast("Foto Anda berhasil diunggah!");
      resetUploadForm();
      switchTab("manage");
    } catch (err) {
      console.error("Gagal melakukan upload:", err);
      showToast(err.message || "Gagal mengunggah foto.", "error");
    } finally {
      setUploadButtonState(false);
    }
  }
}

function setUploadButtonState(isLoading, text = "Mengunggah...") {
  if (isLoading) {
    btnUploadSubmit.disabled = true;
    btnUploadSubmit.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:0.5rem;"></span> ${text}`;
  } else {
    btnUploadSubmit.disabled = false;
    btnUploadSubmit.innerHTML = "Selesaikan Unggah Foto";
  }
}

function resetUploadForm() {
  uploadForm.reset();
  removeSelectedFile();
}

// 6. MANAGE PHOTOS (TAB LIST)
async function fetchAdminPhotos() {
  showLoader(true, "Memproses pembaruan data...");

  if (isDemoMode) {
    const localDb = localStorage.getItem("demo_db_photos");
    adminPhotos = localDb ? JSON.parse(localDb) : [];
  } else {
    try {
      const { data, error } = await supabaseClient
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      adminPhotos = data || [];
    } catch (err) {
      console.error("Gagal fetch data admin:", err);
      showToast("Gagal mengambil daftar foto.", "error");
    }
  }

  showLoader(false);
  renderManageGrid();
}

function renderManageGrid() {
  if (!manageGrid) return;

  manageGrid.innerHTML = "";

  if (adminPhotos.length === 0) {
    manageGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <p>Anda belum mengunggah karya foto satupun.</p>
        <button onclick="switchTab('upload')" class="btn-primary" style="margin-top:1rem;">Mulai Upload Sekarang</button>
      </div>
    `;
    return;
  }

  adminPhotos.forEach(photo => {
    const card = document.createElement("div");
    card.className = "dashboard-card";
    card.innerHTML = `
      <div class="dashboard-card-img-wrapper">
        <img src="${photo.image_url}" alt="${photo.title}">
        <div class="dashboard-card-category">${photo.category || "General"}</div>
      </div>
      <div class="dashboard-card-info">
        <h4 class="dashboard-card-title">${photo.title}</h4>
        <p class="dashboard-card-desc">${photo.description || "Tanpa deskripsi."}</p>
        <div class="dashboard-card-actions">
          <button class="btn-secondary" onclick="openEditModal('${photo.id}')" style="padding:0.5rem; font-size:0.8rem; border-radius: var(--radius-sm);">
            ✎ Edit
          </button>
          <button class="btn-logout" onclick="deletePhoto('${photo.id}')" style="padding:0.5rem; font-size:0.8rem; border-radius: var(--radius-sm); border-color: rgba(244,63,94,0.1)">
            🗑 Hapus
          </button>
        </div>
      </div>
    `;
    manageGrid.appendChild(card);
  });
}

// 7. EDIT MODAL CONTROLLERS
window.openEditModal = function(id) {
  const photo = adminPhotos.find(p => p.id === id);
  if (!photo) return;

  photoIdToEdit = id;
  editTitle.value = photo.title;
  editCategory.value = photo.category || "General";
  editDesc.value = photo.description || "";

  editModal.classList.add("active");
  document.body.style.overflow = "hidden";
};

function closeEditModal() {
  editModal.classList.remove("active");
  document.body.style.overflow = "";
  photoIdToEdit = null;
  editForm.reset();
}

async function handleEditSave(e) {
  e.preventDefault();

  const title = editTitle.value.trim();
  const category = editCategory.value;
  const description = editDesc.value.trim();

  if (!title) {
    showToast("Judul foto wajib diisi!", "error");
    return;
  }

  btnSaveEdit.disabled = true;

  if (isDemoMode) {
    const localDb = JSON.parse(localStorage.getItem("demo_db_photos")) || [];
    const index = localDb.findIndex(p => p.id === photoIdToEdit);
    
    if (index !== -1) {
      localDb[index].title = title;
      localDb[index].category = category;
      localDb[index].description = description;

      localStorage.setItem("demo_db_photos", JSON.stringify(localDb));
      showToast("Metadata foto berhasil diperbarui di Demo Mode!");
      closeEditModal();
      fetchAdminPhotos();
    } else {
      showToast("Gagal memperbarui: Foto tidak ditemukan.", "error");
    }
    btnSaveEdit.disabled = false;
  } else {
    try {
      const { error } = await supabaseClient
        .from("photos")
        .update({
          title,
          category,
          description
        })
        .eq("id", photoIdToEdit);

      if (error) throw error;

      showToast("Perubahan data foto berhasil disimpan!");
      closeEditModal();
      fetchAdminPhotos();
    } catch (err) {
      console.error("Gagal melakukan update metadata:", err);
      showToast(err.message || "Gagal menyimpan perubahan.", "error");
    } finally {
      btnSaveEdit.disabled = false;
    }
  }
}

// 8. HAPUS FOTO CONTROLLER (Hapus di DB + Storage)
window.deletePhoto = async function(id) {
  const photo = adminPhotos.find(p => p.id === id);
  if (!photo) return;

  const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus foto "${photo.title}" dari galeri? Tindakan ini tidak dapat dibatalkan.`);
  if (!konfirmasi) return;

  showLoader(true, "Menghapus data permanen...");

  if (isDemoMode) {
    const localDb = JSON.parse(localStorage.getItem("demo_db_photos")) || [];
    const updatedDb = localDb.filter(p => p.id !== id);
    localStorage.setItem("demo_db_photos", JSON.stringify(updatedDb));
    
    await new Promise(resolve => setTimeout(resolve, 600));
    showToast("Foto berhasil didelete dari local database.");
    fetchAdminPhotos();
  } else {
    try {
      // 1. Hapus metadata di database (akan error jika file_path tidak ada, tapi selesaikan satu-satu)
      const { error: dbError } = await supabaseClient
        .from("photos")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // 2. Hapus fisik file di Supabase Storage
      if (photo.file_path) {
        const { error: storageError } = await supabaseClient.storage
          .from("gallery-images")
          .remove([photo.file_path]);

        if (storageError) {
          console.warn("Fisik file gagal dihapus dari storage (mungkin sudah terhapus manual):", storageError);
        }
      }

      showToast("Karya foto berhasil dihapus sepenuhnya dari server!");
      fetchAdminPhotos();
    } catch (err) {
      console.error("Gagal menghapus karya:", err);
      showToast(err.message || "Gagal menghapus file dari database.", "error");
      showLoader(false);
    }
  }
};

// 9. LOADER / TOAST CONTROLLERS
function showLoader(show, text = "Loading...") {
  if (!manageLoader) return;
  manageLoader.style.display = show ? "flex" : "none";
  if (show) {
    manageLoader.querySelector("p").textContent = text;
  }
}

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
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 10. SETUP EVENTS AND INITS
document.addEventListener("DOMContentLoaded", () => {
  // Buat toast container if not present
  if (!document.getElementById("toast-container")) {
    const toastCont = document.createElement("div");
    toastCont.id = "toast-container";
    toastCont.className = "toast-container";
    document.body.appendChild(toastCont);
  }

  initSupabase();
  checkAuthSession();

  // Bind Form Auth
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Bind Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }

  // Bind Switch Tabs
  if (uploadTabBtn && manageTabBtn) {
    uploadTabBtn.addEventListener("click", () => switchTab("upload"));
    manageTabBtn.addEventListener("click", () => switchTab("manage"));
  }

  // Bind Photo Upload
  if (uploadForm) {
    uploadForm.addEventListener("submit", handlePhotoUpload);
  }

  // Bind Edit Photo Modal Saving
  if (editForm) {
    editForm.addEventListener("submit", handleEditSave);
  }

  // Bind Close modal events
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
  if (closeEditBtn) closeEditBtn.addEventListener("click", closeEditModal);
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Inisialisasi pendengar Drag & Drop Unggah berkas
  initUploadListeners();
});
