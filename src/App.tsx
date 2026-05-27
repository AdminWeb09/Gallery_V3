/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { 
  Camera, 
  Settings, 
  Image as ImageIcon, 
  ShieldAlert, 
  Share2, 
  Copy, 
  Check, 
  Upload, 
  Trash2, 
  Edit3, 
  LogOut, 
  X, 
  Grid, 
  BookOpen, 
  Database, 
  RefreshCw, 
  Eye, 
  FileCode,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Photo, SupabaseConfig } from "./types";

// ==========================================
// PRE-DEFINED BEAUTIFUL DEFAULT PHOTOS
// ==========================================
const DEFAULT_PHOTOS: Photo[] = [
  {
    id: "demo-1",
    title: "Symmetry of Modern Architecture",
    description: "Perfect geometric symmetry found in modern carbon-framed skyscrapers, capturing the play of shadow and light on brushed steel windows.",
    category: "Architecture",
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
    file_path: "demo-bucket/arch-1.jpg",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: "demo-2",
    title: "Whispering Pine Forest",
    description: "Ethereal sunrise filtering through high-altitude pine tree tops shrouded in dense autumn mist, evoking absolute solitude and serenity.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1200",
    file_path: "demo-bucket/nature-1.jpg",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: "demo-3",
    title: "Floating Ink Aesthetics",
    description: "An elegant, high-contrast flat lay of monochrome ink drops diffusing smoothly into pure glycerin, representing the flow of artistic thoughts.",
    category: "Minimalist",
    image_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1200",
    file_path: "demo-bucket/mini-1.jpg",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  },
  {
    id: "demo-4",
    title: "Sculpted Desert Dunes",
    description: "Sensual curves formed by shifting sand dunes in the Namib desert, cast under the harsh golden orange rays of early morning sunlight.",
    category: "Nature",
    image_url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=1200",
    file_path: "demo-bucket/nature-2.jpg",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: "demo-5",
    title: "The Industrial Monolith",
    description: "Brutalist raw concrete structure acting as a modern library center, emphasizing raw volume, repetitive lines, and structural honesty.",
    category: "Architecture",
    image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200",
    file_path: "demo-bucket/arch-2.jpg",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: "demo-6",
    title: "Negative Space Canvas",
    description: "A single minimalist ceramics vase cast standing on an off-white concrete desk, beautifully balanced by extensive light negative space.",
    category: "Minimalist",
    image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&q=80&w=1200",
    file_path: "demo-bucket/mini-2.jpg",
    created_at: new Date().toISOString()
  }
];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = 2;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export default function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [view, setView] = useState<"gallery" | "admin" | "docs">("gallery");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  
  // Supabase Credentials
  const [sbConfig, setSbConfig] = useState<SupabaseConfig>(() => {
    const savedUrl = localStorage.getItem("supabase_url_react") || "";
    const savedKey = localStorage.getItem("supabase_anon_key_react") || "";
    return { url: savedUrl, anonKey: savedKey };
  });
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(true);
  
  // Modals / Overlays
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  
  // Admin Authentication
  const [adminUser, setAdminUser] = useState<{ email: string } | null>(() => {
    const savedSession = sessionStorage.getItem("admin_react_session");
    return savedSession ? JSON.parse(savedSession) : null;
  });
  const [adminTab, setAdminTab] = useState<"upload" | "manage">("upload");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [authChecking, setAuthChecking] = useState<boolean>(false);

  // Admin Upload state
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<string>("Architecture");
  const [uploadDesc, setUploadDesc] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("Architecture");
  const [editDesc, setEditDesc] = useState<string>("");

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "info" }>>([]);

  // Code Viewer file
  const [activeCodeFile, setActiveCodeFile] = useState<string>("supabase.sql");
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  // ==========================================
  // TOAST HANDLER
  // ==========================================
  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ==========================================
  // INITIALIZE SUPABASE CLIENT / LOAD PHOTOS
  // ==========================================
  useEffect(() => {
    let client: SupabaseClient | null = null;
    
    if (sbConfig.url && sbConfig.anonKey) {
      try {
        client = createClient(sbConfig.url, sbConfig.anonKey);
        setSupabase(client);
        setIsDemo(false);
        // Test query
        client.from("photos").select("id").limit(1)
          .then(({ error }) => {
            if (error) {
              addToast("Modul Supabase terpasang, namun relasi tabel 'photos' belum terdeteksi. Silakan jalankan kueri SQL di Supabase Editor!", "error");
            }
          });
      } catch (err) {
        console.error("Gagal menginisialisasi Klien Supabase React:", err);
        setIsDemo(true);
        setSupabase(null);
      }
    } else {
      setIsDemo(true);
      setSupabase(null);
    }
  }, [sbConfig]);

  // Fetch photos
  const fetchPhotos = async () => {
    setLoading(true);
    if (!isDemo && supabase) {
      try {
        const { data, error } = await supabase
          .from("photos")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPhotos(data || []);
      } catch (err: any) {
        console.error("Supabase Database error:", err);
        addToast("Koneksi Supabase error. Mengalihkan ke database lokal (Demo Mode).", "error");
        loadDemoPhotos();
      } finally {
        setLoading(false);
      }
    } else {
      // Simulate API load
      setTimeout(() => {
        loadDemoPhotos();
        setLoading(false);
      }, 500);
    }
  };

  const loadDemoPhotos = () => {
    const local = localStorage.getItem("demo_react_photos");
    if (local) {
      setPhotos(JSON.parse(local));
    } else {
      setPhotos(DEFAULT_PHOTOS);
      localStorage.setItem("demo_react_photos", JSON.stringify(DEFAULT_PHOTOS));
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [supabase, isDemo]);

  // Handle configuration submit
  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urlInput = (e.target as any).url.value.trim();
    const keyInput = (e.target as any).key.value.trim();

    if (!urlInput || !keyInput) {
      addToast("Alamat URL dan Kunci Anonim tidak boleh kosong!", "error");
      return;
    }

    localStorage.setItem("supabase_url_react", urlInput);
    localStorage.setItem("supabase_anon_key_react", keyInput);
    
    // Simpan juga untuk file html/js vanila
    localStorage.setItem("supabase_url", urlInput);
    localStorage.setItem("supabase_anon_key", keyInput);

    setSbConfig({ url: urlInput, anonKey: keyInput });
    setShowConfigModal(false);
    addToast("Konfigurasi Supabase berhasil diperbarui! Mencoba menghubungkan database...", "success");
  };

  const clearConfig = () => {
    localStorage.removeItem("supabase_url_react");
    localStorage.removeItem("supabase_anon_key_react");
    localStorage.removeItem("supabase_url");
    localStorage.removeItem("supabase_anon_key");
    setSbConfig({ url: "", anonKey: "" });
    setIsDemo(true);
    setSupabase(null);
    addToast("Konfigurasi dibersihkan. Kembali ke Demo Mode.", "info");
  };

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      addToast("Isi email dan sandi Anda dengan lengkap!", "error");
      return;
    }

    setAuthChecking(true);

    if (isDemo) {
      // Demo static credentials login
      setTimeout(() => {
        if (loginEmail === "admin@gallery.com" && loginPassword === "password123") {
          const userObj = { email: loginEmail };
          setAdminUser(userObj);
          sessionStorage.setItem("admin_react_session", JSON.stringify(userObj));
          addToast("Selamat Datang di Console Admin (Demo Mode)!");
          setLoginEmail("");
          setLoginPassword("");
        } else {
          addToast("Email atau sandi dummy salah! Gunakan kredensial yang disarankan.", "error");
        }
        setAuthChecking(false);
      }, 600);
    } else if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (error) throw error;

        if (data.user) {
          const userObj = { email: data.user.email || loginEmail };
          setAdminUser(userObj);
          sessionStorage.setItem("admin_react_session", JSON.stringify(userObj));
          addToast("Kredensial terverifikasi. Sesi Admin dibuka!");
          setLoginEmail("");
          setLoginPassword("");
        }
      } catch (err: any) {
        console.error("Gagal login Supabase:", err);
        addToast(err.message || "Gagal masuk. Periksa kembali konfigurasi database & email Anda.", "error");
      } finally {
        setAuthChecking(false);
      }
    }
  };

  const handleLogout = async () => {
    if (!isDemo && supabase) {
      await supabase.auth.signOut();
    }
    setAdminUser(null);
    sessionStorage.removeItem("admin_react_session");
    addToast("Sesi Admin telah ditutup.");
  };

  // ==========================================
  // FILE UPLOAD CONTROLLER
  // ==========================================
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      addToast("Berkas yang dipilih harus berekstensi Gambar!", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("Ukuran foto tidak boleh melebihi 5MB!", "error");
      return;
    }

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      addToast("Tekan area pilih berkas untuk menaruh foto!", "error");
      return;
    }

    const title = uploadTitle.trim();
    if (!title) {
      addToast("Judul karya bento foto wajib diisi!", "error");
      return;
    }

    setUploading(true);

    if (isDemo) {
      // Save Base64 inside localStorage as virtual Database record
      setTimeout(() => {
        const newPhoto: Photo = {
          id: "demo-" + Date.now(),
          title,
          description: uploadDesc.trim(),
          category: uploadCategory,
          image_url: uploadPreview,
          file_path: "demo-bucket/" + uploadFile.name,
          created_at: new Date().toISOString()
        };

        const currentLocalPhotos = JSON.parse(localStorage.getItem("demo_react_photos") || "[]");
        const updated = [newPhoto, ...currentLocalPhotos];
        localStorage.setItem("demo_react_photos", JSON.stringify(updated));
        
        // Simpan juga ke demo_db_photos untuk menyelaraskan dengan vanilla html/js
        localStorage.setItem("demo_db_photos", JSON.stringify(updated));

        setPhotos(updated);
        addToast("Foto baru berhasil ditambahkan secara lokal!");
        resetUploadForm();
        setAdminTab("manage");
        setUploading(false);
      }, 800);
    } else if (supabase) {
      try {
        const fileExt = uploadFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `photos/${fileName}`;

        // 1. Storage Upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("gallery-images")
          .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        // 2. Map Public URL
        const { data: { publicUrl } } = supabase.storage
          .from("gallery-images")
          .getPublicUrl(filePath);

        // 3. Database insert
        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            title,
            description: uploadDesc.trim(),
            category: uploadCategory,
            image_url: publicUrl,
            file_path: filePath
          });

        if (dbError) {
          // Cleanup storage if database creation fails
          await supabase.storage.from("gallery-images").remove([filePath]);
          throw dbError;
        }

        addToast("Foto Anda berhasil terpublikasi ke server!");
        resetUploadForm();
        fetchPhotos();
        setAdminTab("manage");
      } catch (err: any) {
        console.error("Gagal melakukan upload:", err);
        addToast(err.message || "Gagal mengunggah foto ke database.", "error");
      } finally {
        setUploading(false);
      }
    }
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDesc("");
    setUploadCategory("Architecture");
    setUploadFile(null);
    setUploadPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==========================================
  // EDIT & DELETE CONTROLLER
  // ==========================================
  const triggerEdit = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditTitle(photo.title);
    setEditCategory(photo.category || "General");
    setEditDesc(photo.description || "");
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    if (!editTitle.trim()) {
      addToast("Judul karya wajib diisi!", "error");
      return;
    }

    if (isDemo) {
      const updated = photos.map(p => {
        if (p.id === editingPhoto.id) {
          return {
            ...p,
            title: editTitle.trim(),
            category: editCategory,
            description: editDesc.trim()
          };
        }
        return p;
      });

      localStorage.setItem("demo_react_photos", JSON.stringify(updated));
      localStorage.setItem("demo_db_photos", JSON.stringify(updated));
      setPhotos(updated);
      addToast("Perubahan portofolio berhasil disimpan secara lokal!");
      setEditingPhoto(null);
    } else if (supabase) {
      try {
        const { error } = await supabase
          .from("photos")
          .update({
            title: editTitle.trim(),
            category: editCategory,
            description: editDesc.trim()
          })
          .eq("id", editingPhoto.id);

        if (error) throw error;

        addToast("Perubahan data karya tersimpan ke Supabase!");
        setEditingPhoto(null);
        fetchPhotos();
      } catch (err: any) {
        console.error("Edit metadata error:", err);
        addToast(err.message || "Gagal memperbarui metadata foto.", "error");
      }
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    const confirmation = window.confirm(`Apakah Anda yakin ingin menghapus foto "${photo.title}"?`);
    if (!confirmation) return;

    if (isDemo) {
      const updated = photos.filter(p => p.id !== photo.id);
      localStorage.setItem("demo_react_photos", JSON.stringify(updated));
      localStorage.setItem("demo_db_photos", JSON.stringify(updated));
      setPhotos(updated);
      addToast("Foto dihapus dari database lokal.");
    } else if (supabase) {
      try {
        // 1. Delete DB Row
        const { error: dbError } = await supabase
          .from("photos")
          .delete()
          .eq("id", photo.id);

        if (dbError) throw dbError;

        // 2. Clean up storage physical file
        if (photo.file_path) {
          const { error: storageError } = await supabase.storage
            .from("gallery-images")
            .remove([photo.file_path]);

          if (storageError) {
            console.warn("Storage deletion error (might have been missing):", storageError);
          }
        }

        addToast("Berkas dan database rekord dihapus sempurna!");
        fetchPhotos();
      } catch (err: any) {
        console.error("Gagal menghapus:", err);
        addToast(err.message || "Gagal menghapus karya dari server.", "error");
      }
    }
  };

  const triggerResetDemo = () => {
    localStorage.removeItem("demo_react_photos");
    localStorage.removeItem("demo_db_photos");
    loadDemoPhotos();
    addToast("Data demo berhasil dipulihkan!");
  };

  // ==========================================
  // CODE DOCUMENTATION EXPORTER DATA
  // ==========================================
  const codeFiles: Record<string, string> = {
    "supabase.sql": `-- ==========================================
-- SUPABASE DATABASE SETUP QUERY
-- Jalankan query ini di SQL Editor Supabase Anda
-- ==========================================

-- 1. Buat tabel photos
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image_url TEXT NOT NULL,     -- URL publik dari Supabase Storage
    file_path TEXT NOT NULL,     -- Path file di dalam bucket storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS) pada tabel photos
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- 3. Buat policy RLS untuk tabel photos
-- Policy A: Siapa saja (bahkan user anonim) bisa melihat/membaca foto
CREATE POLICY "Allow public read access" 
ON public.photos FOR SELECT 
USING (true);

-- Policy B: Hanya user yang terautentikasi (admin login) yang bisa menambah (insert) foto
CREATE POLICY "Allow authenticated insert" 
ON public.photos FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy C: Hanya user yang terautentikasi (admin login) yang bisa update foto
CREATE POLICY "Allow authenticated update" 
ON public.photos FOR UPDATE 
TO authenticated 
USING (true);

-- Policy D: Hanya user yang terautentikasi yang bisa menghapus (delete) foto
CREATE POLICY "Allow authenticated delete" 
ON public.photos FOR DELETE 
TO authenticated 
USING (true);


-- 4. Setup Storage Bucket "gallery-images"
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Buat Storage Policies untuk "gallery-images"
CREATE POLICY "Give public read access to any image"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-images');

CREATE POLICY "Give authenticated upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-images');

CREATE POLICY "Give authenticated delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-images');`,

    "index.html": `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ethereal Canvas | Galeri Foto Modern</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <div class="nav-container">
            <a href="index.html" class="logo-link">
                <div class="logo-dot"></div>
                <h1 class="brand-name">Ethereal<span>Canvas</span></h1>
            </a>
            <div class="nav-links">
                <a href="admin.html" class="btn-admin">Dashboard Admin</a>
            </div>
        </div>
    </header>

    <section class="hero">
        <h1>Capturing <span>Moments</span>, Preserving Light</h1>
        <p>Kumpulan karya seni fotografi kurasi eksklusif...</p>
    </section>

    <div id="filters-container" class="filters-container"></div>

    <main class="gallery-section">
        <div id="loader-container" class="loader-container">
            <div class="spinner"></div>
            <p>Memuat karya seni...</p>
        </div>
        <div id="gallery-grid" class="gallery-grid"></div>
    </main>

    <div id="lightbox" class="lightbox">
        <button id="lightbox-close" class="lightbox-close">✕</button>
        <div class="lightbox-content">
            <img id="lightbox-img" src="" alt="">
        </div>
        <div class="lightbox-info">
            <span id="lightbox-category" class="img-category"></span>
            <h2 id="lightbox-title"></h2>
            <p id="lightbox-desc"></p>
        </div>
    </div>

    <div id="toast-container" class="toast-container"></div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="gallery.js"></script>
</body>
</html>`,

    "admin.html": `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ethereal Dashboard | Admin Control Center</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="login-screen" class="login-screen">
        <div class="login-card">
            <div class="login-header">
                <h2>Dashboard Admin</h2>
                <p>Verifikasi kredensial Anda untuk masuk</p>
            </div>
            <form id="login-form">
                <!-- Form fields -->
            </form>
        </div>
    </div>

    <!-- Layout dashboard split sidebar left & content right -->
    <!-- See full source in /gallery-project/admin.html -->
</body>
</html>`,

    "gallery.js": `const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// Logika inisialisasi dan manipulasi DOM
// See full source in /gallery-project/gallery.js`,

    "admin.js": `const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// Autentikasi dan Unggah Berkas ke Bucket
// See full source in /gallery-project/admin.js`,

    "style.css": `/* Layouting, CSS Variables untuk dark theme dan responsive breakpoints */
/* See full source in /gallery-project/style.css */`
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(true);
    addToast("Koding berhasil disalin ke clipboard!", "success");
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Filter photos
  const filteredPhotos = selectedCategory === "all"
    ? photos
    : photos.filter(p => p.category === selectedCategory);

  // Derive unique categories dynamically
  const categories = ["all", ...Array.from(new Set(photos.map(p => p.category).filter(Boolean)))];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f8fafc] flex flex-col font-sans selection:bg-[#f59e0b] selection:text-black">
      
      {/* ==========================================
          GLOBAL HEADER TOP BAR
          ========================================== */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("gallery")}>
            <div className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full shadow-[0_0_10px_#f59e0b]"></div>
            <h1 className="font-serif text-lg tracking-wider font-semibold uppercase text-slate-100">
              Ethereal<span className="text-[#f59e0b] italic font-normal capitalize ml-1 font-serif">Canvas</span>
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1.5 bg-[#1a1a1a] p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setView("gallery")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${view === "gallery" ? "bg-[#f59e0b] text-black" : "text-slate-400 hover:text-white"}`}
            >
              Galeri Publikum
            </button>
            <button 
              onClick={() => setView("admin")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${view === "admin" ? "bg-[#f59e0b] text-black" : "text-slate-400 hover:text-white"}`}
            >
              Portal Admin
            </button>
            <button 
              onClick={() => setView("docs")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${view === "docs" ? "bg-[#f59e0b] text-black" : "text-slate-400 hover:text-white"}`}
            >
              Materi Kode & Setup
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Indicator */}
          <button 
            onClick={() => setShowConfigModal(true)}
            className={`flex items-center gap-2 p-1.5 lg:px-3 lg:py-1.5 rounded-md text-xs font-semibold border transition-all ${
              isDemo 
                ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20 hover:border-[#f59e0b]/50" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50"
            }`}
          >
            {isDemo ? <ShieldAlert className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isDemo ? "Demo Mode (Local)" : "Supabase Terkoneksi"}</span>
            <Settings className="w-3 h-3 text-slate-400" />
          </button>

          <button 
            onClick={() => setView(view === "admin" ? "gallery" : "admin")}
            className="md:hidden bg-[#1e293b] text-slate-200 border border-white/10 p-2 rounded-md"
            title="Toggle View"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==========================================
          TOAST ALERT BLOCK
          ========================================== */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[280px] max-w-[380px] border pointer-events-auto ${
                toast.type === "error" 
                  ? "bg-slate-900 border-rose-500/30 text-rose-400" 
                  : toast.type === "info"
                    ? "bg-slate-900 border-sky-500/30 text-sky-400"
                    : "bg-slate-900 border-[#f59e0b]/30 text-amber-400"
              }`}
            >
              <div className="flex-grow text-xs font-semibold">{toast.message}</div>
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100 cursor-pointer" onClick={() => setToasts(curr => curr.filter(t => t.id !== toast.id))} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ==========================================
          DATABASE CONFIGURATION MODAL
          ========================================== */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-xl p-6 lg:p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowConfigModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-[#f59e0b]" />
                <h3 className="font-serif text-xl font-bold">Inisialisasi Proyek Supabase</h3>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Masukkan kredensial Supabase Anda untuk mengaktifkan sinkronisasi database SQL dan Storage Bucket. 
                Data akan dipasang langsung ke browser Anda secara instan dan aman.
              </p>

              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Supabase URL</label>
                  <input 
                    name="url"
                    type="text" 
                    defaultValue={sbConfig.url}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Anon Public Key</label>
                  <input 
                    name="key"
                    type="password" 
                    defaultValue={sbConfig.anonKey}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#f59e0b] hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-widest py-3 rounded-md transition-all"
                  >
                    Simpan & Hubungkan
                  </button>
                  {sbConfig.url && (
                    <button 
                      type="button"
                      onClick={clearConfig}
                      className="bg-transparent hover:bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-md transition-all"
                    >
                      Reset Koneksi
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          CORE APPLICATION VIEWS
          ========================================== */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          
          {/* 1. PUBLIC PORTFOLIO GALLERY VIEW */}
          {view === "gallery" && (
            <motion.div 
              key="gallery-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-7xl mx-auto px-4 md:px-8 py-10 lg:py-16"
            >
              {/* Hero header */}
              <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-[0.25em] bg-[#f59e0b]/10 px-3 py-1 rounded-full border border-[#f59e0b]/20">
                  Minimalist Photography Curator
                </span>
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-slate-100 mt-6 leading-tight">
                  Capturing <span className="text-[#f59e0b] italic font-serif">Moments</span>, Preserving Light
                </h2>
                <p className="text-sm md:text-base text-slate-400 mt-4 font-light leading-relaxed">
                  Menawarkan harmoni visual lewat kurasi eksklusif: kemegahan struktur geometris arsitektur brutal,
                  sunyinya belantara rimba alam liar, serta kedalaman narasi emosional dalam balutan tema gelap yang misterius.
                </p>
              </div>

              {/* Dynamic Categories slider */}
              <div className="flex flex-wrap justify-center gap-2 mb-12">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide border cursor-pointer transition-all ${
                      selectedCategory === cat
                        ? "bg-[#f59e0b] text-black border-[#f59e0b] shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
                        : "bg-[#111111] text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {cat === "all" ? "Semua Karya" : cat}
                  </button>
                ))}
              </div>

              {/* Live Status indicator in gallery */}
              {isDemo && (
                <div className="max-w-xl mx-auto mb-8 bg-[#f59e0b]/5 border border-[#f59e0b]/10 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-amber-200">Menampilkan Database Dummy Lokal (localStorage)</span>
                  </div>
                  <button 
                    onClick={() => {
                      setView("admin");
                      addToast("Silakan sign in dahulu untuk mengakses editor dummy!", "info");
                    }} 
                    className="text-[10px] font-extrabold uppercase tracking-wider text-black bg-[#f59e0b] px-3 py-1.5 rounded hover:bg-amber-600 transition-all"
                  >
                    Coba Admin Panel
                  </button>
                </div>
              )}

              {/* Photo Masonry Grid */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <RefreshCw className="w-8 h-8 text-[#f59e0b] animate-spin" />
                  <span className="text-xs font-medium tracking-wide text-slate-400">Mensinkronisasi galeri...</span>
                </div>
              ) : filteredPhotos.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/[0.01]">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Belum ada karya foto yang ditambahkan ke kategori ini.</p>
                  {isDemo && (
                    <button 
                      onClick={triggerResetDemo}
                      className="mt-4 bg-[#1e293b] hover:bg-slate-850 text-[#f59e0b] font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-md border border-[#f59e0b]/25 transition-all"
                    >
                      Pulihkan Foto Demo
                    </button>
                  )}
                </div>
              ) : (
                <div className="masonry-cols-1 masonry-cols-2 masonry-cols-3">
                  <AnimatePresence>
                    {filteredPhotos.map((photo) => (
                      <motion.div
                        key={photo.id}
                        layoutId={`card-${photo.id}`}
                        onClick={() => setLightboxPhoto(photo)}
                        className="masonry-item rounded-xl overflow-hidden group border border-white/5 bg-[#111111] cursor-pointer hover:border-[#f59e0b]/30 shadow-lg relative"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="w-full overflow-hidden bg-black aspect-auto">
                          <img 
                            src={photo.image_url} 
                            alt={photo.title}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-all duration-700 ease-out"
                            loading="lazy"
                          />
                        </div>
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-6 transition-all duration-300">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-[#f59e0b] mb-1">
                            {photo.category || "General"}
                          </span>
                          <h4 className="font-serif text-lg text-white mb-1 leading-tight">{photo.title}</h4>
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-light">{photo.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. ADMIN CONTROL PANEL VIEW */}
          {view === "admin" && (
            <motion.div 
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-7xl mx-auto px-4 md:px-8 py-10"
            >
              {!adminUser ? (
                /* LOGIN COMPONENT SCREEN */
                <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
                  <div className="w-full max-w-md bg-[#111111] border border-white/5 rounded-2xl p-6 lg:p-8 shadow-2xl">
                    <div className="text-center mb-6">
                      <div className="w-3 h-3 bg-[#f59e0b] rounded-full mx-auto shadow-[0_0_10px_#f59e0b] mb-3"></div>
                      <h3 className="font-serif text-2xl font-bold">Dashboard Admin</h3>
                      <p className="text-xs text-slate-400 mt-1">Verifikasi identitas Anda untuk mengelola galeri</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Email</label>
                        <input 
                          type="email" 
                          required
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder="admin@gallery.com"
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Passcode</label>
                        <input 
                          type="password" 
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authChecking}
                        className="w-full bg-[#f59e0b] hover:bg-amber-600 disabled:bg-[#f59e0b]/50 text-black font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all"
                      >
                        {authChecking ? "Memproses..." : "Sign In ke Console"}
                      </button>
                    </form>

                    {isDemo && (
                      <div className="mt-6 bg-[#f59e0b]/5 border border-[#f59e0b]/10 rounded-lg p-4 text-[11px] leading-relaxed text-slate-300">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Berjalan dalam Demo Mode</span>
                        </div>
                        <p className="text-slate-400 mb-2">Simulasi admin dashboard menggunakan local database.</p>
                        <div className="bg-[#242c38] px-2.5 py-1.5 rounded font-mono text-slate-200">
                          <div>Karyawan: <b>admin@gallery.com</b></div>
                          <div>Sandi: <b>password123</b></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* DASHBOARD GRID CORE PANEL */
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  
                  {/* SIDEBAR CONTROL CENTER */}
                  <div className="lg:col-span-1 bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col gap-6 h-fit">
                    <div className="border-b border-white/5 pb-4">
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#f59e0b]">Panel Administrator</span>
                      <h4 className="font-serif text-lg font-bold truncate mt-1">{adminUser.email}</h4>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        {isDemo ? "Mode: Live Offline (localStorage)" : "Mode: Production Supabase"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => setAdminTab("upload")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
                          adminTab === "upload" 
                            ? "bg-[#f59e0b] text-black" 
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        Unggah Karya Baru
                      </button>
                      <button 
                        onClick={() => setAdminTab("manage")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
                          adminTab === "manage" 
                            ? "bg-[#f59e0b] text-black" 
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Grid className="w-4 h-4" />
                        Kelola Koleksi ({photos.length})
                      </button>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500 text-rose-400 hover:text-white flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all mt-6"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout Sesi
                    </button>
                  </div>

                  {/* MAIN PANEL CONTENT */}
                  <div className="lg:col-span-3">
                    
                    {/* A. TAB UPLOAD CARD */}
                    {adminTab === "upload" && (
                      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 lg:p-8 shadow-xl">
                        <div className="mb-6">
                          <h3 className="font-serif text-2xl font-bold">Unggah Karya Foto Baru</h3>
                          <p className="text-xs text-slate-400 mt-1">Sertakan berkas gambar berkualitas tinggi, judul artistik, kategori karya, serta deskripsinya.</p>
                        </div>

                        <form onSubmit={handlePhotoUpload} className="space-y-6">
                          
                          {/* Drag & Drop Upload Zone */}
                          <div 
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 hover:border-[#f59e0b] bg-[#0a0a0a] hover:bg-[#111111] rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                          >
                            <input 
                              ref={fileInputRef}
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={onFileSelect}
                            />
                            <div className="p-3 bg-white/5 rounded-full text-slate-400 group-hover:text-amber-400">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">Klik untuk menjelajah atau seret file gambar ke sini</p>
                              <p className="text-[10px] text-slate-400 mt-1">Mendukung visual dalam format PNG, JPG, JPEG, WEBP (maks 5MB)</p>
                            </div>
                          </div>

                          {/* Preview container */}
                          {uploadPreview && (
                            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                              <img src={uploadPreview} alt="upload preview" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                              <div className="flex-grow">
                                <p className="text-xs font-bold truncate max-w-xs">{uploadFile?.name}</p>
                                <p className="text-[10px] text-slate-400">{uploadFile ? formatBytes(uploadFile.size) : ""}</p>
                              </div>
                              <button 
                                type="button" 
                                onClick={resetUploadForm}
                                className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-full transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Judul Karya</label>
                              <input 
                                type="text"
                                required
                                value={uploadTitle}
                                onChange={e => setUploadTitle(e.target.value)}
                                placeholder="Contoh: Geometri Raw Cement"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kategori Portofolio</label>
                              <select 
                                value={uploadCategory}
                                onChange={e => setUploadCategory(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
                              >
                                <option value="Architecture">Architecture</option>
                                <option value="Nature">Nature</option>
                                <option value="Minimalist">Minimalist</option>
                                <option value="People">People</option>
                                <option value="General">General / Lainnya</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Deskripsi Naratif / Ekposure kamera</label>
                            <textarea 
                              value={uploadDesc}
                              onChange={e => setUploadDesc(e.target.value)}
                              placeholder="Tuliskan latar belakang foto, setting f-stop, exposure speed, atau impresi artistik yang dirasakan..."
                              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] h-32 resize-none"
                            />
                          </div>

                          <div className="flex justify-end pt-4 border-t border-white/5">
                            <button
                              type="submit"
                              disabled={uploading}
                              className="bg-[#f59e0b] hover:bg-amber-600 disabled:bg-[#f59e0b]/50 text-black font-extrabold text-xs uppercase tracking-widest py-3 px-6 rounded-lg transition-all"
                            >
                              {uploading ? "Mengirim ke server..." : "Publikasikan Karya Foto"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* B. TAB MANAGE CARDS */}
                    {adminTab === "manage" && (
                      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 lg:p-8 shadow-xl">
                        <div className="mb-6">
                          <h3 className="font-serif text-2xl font-bold">Kelola Koleksi Galeri</h3>
                          <p className="text-xs text-slate-400 mt-1">Daftar live karya foto Anda. Lakukan perubahan teks rincian karya atau hapus secara permanen dari server.</p>
                        </div>

                        {photos.length === 0 ? (
                          <div className="text-center py-20 border border-dashed border-white/5 rounded-xl">
                            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">Belum ada karya foto yang dipublikasikan.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {photos.map(photo => (
                              <div key={photo.id} className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl overflow-hidden flex flex-col">
                                <div className="aspect-[16/10] bg-black overflow-hidden relative">
                                  <img src={photo.image_url} alt={photo.title} className="w-full h-full object-cover" />
                                  <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-[#f59e0b]/20 text-[#f59e0b] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                    {photo.category || "General"}
                                  </span>
                                </div>
                                <div className="p-4 flex-grow flex flex-col justify-between">
                                  <div>
                                    <h5 className="font-serif text-base font-bold text-slate-100">{photo.title}</h5>
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed font-light">{photo.description || "Tanpa deskripsi."}</p>
                                  </div>
                                  
                                  <div className="flex gap-2 border-t border-white/5 pt-3 mt-4">
                                    <button 
                                      onClick={() => triggerEdit(photo)}
                                      className="flex-1 border border-white/10 hover:border-[#f59e0b]/30 bg-transparent hover:bg-[#f59e0b]/5 text-xs text-slate-300 hover:text-[#f59e0b] font-medium py-2 rounded-lg transition-all"
                                    >
                                      Edit Details
                                    </button>
                                    <button 
                                      onClick={() => handleDeletePhoto(photo)}
                                      className="flex-1 border border-rose-500/10 hover:border-rose-500/30 bg-rose-500/5 hover:bg-rose-500 text-xs text-rose-400 hover:text-white font-medium py-2 rounded-lg transition-all"
                                    >
                                      Delete File
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. MATERIAL CODES VIEW SECTION (EXPRESSIVE PORTAL) */}
          {view === "docs" && (
            <motion.div 
              key="docs-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-7xl mx-auto px-4 md:px-8 py-10"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* INSTRUCTION CARD */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                    <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest bg-[#f59e0b]/10 px-2.5 py-1 rounded">Panduan Integrasi</span>
                    <h3 className="font-serif text-2xl font-bold mt-4 mb-2">Setup Supabase Anda</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Selesaikan 4 langkah berikut untuk mempublikasikan galeri web statis fungsional Anda sendiri ke hosting cloud.
                    </p>

                    <ol className="mt-6 space-y-4 text-xs text-slate-300">
                      <li className="flex gap-3">
                        <div className="w-5 h-5 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                        <div>
                          <p className="font-bold">Buat Proyek Supabase</p>
                          <p className="text-slate-400 mt-0.5">Daftarkan akun gratis di <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300">supabase.com</a> dan buat proyek baru.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                        <div>
                          <p className="font-bold">Migrasi Tabel SQL & RLS</p>
                          <p className="text-slate-400 mt-0.5">Salin koding dari tab <b>supabase.sql</b> di sebelah kanan, buka tab <b>SQL Editor</b> di dashboard Supabase Anda, tempel kueri, lalu tekan <b>RUN</b>.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                        <div>
                          <p className="font-bold">Buat Admin Akun</p>
                          <p className="text-slate-400 mt-0.5">Buka menu <b>Authentication &gt; Users</b> di Supabase, pilih <b>Add User &gt; Create User</b>, isi email admin Anda serta sandinya.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                        <div>
                          <p className="font-bold">Tautkan Kunci API</p>
                          <p className="text-slate-400 mt-0.5">Buka Project Settings untuk mendapatkan URL & Anon Key. Ganti placeholder di baris awal <b>gallery.js</b> dan <b>admin.js</b> Anda.</p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                    <h4 className="font-serif text-lg font-bold mb-2">Unduh Proyek Mandiri</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Seluruh berkas siap pakai tersimpan rapi di dalam workspace folder <code>/gallery-project</code>.
                    </p>
                    <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5 font-mono text-[10px] text-slate-400 flex flex-col gap-1.5">
                      <div>📁 gallery-project/</div>
                      <div> &nbsp; ├── index.html <span className="opacity-40">(Halaman galeri publik)</span></div>
                      <div> &nbsp; ├── admin.html <span className="opacity-40">(Dashboard upload & kelola)</span></div>
                      <div> &nbsp; ├── style.css <span className="opacity-45">(Modern GlassMorphism styling)</span></div>
                      <div> &nbsp; ├── gallery.js <span className="opacity-40">(Konektor database client)</span></div>
                      <div> &nbsp; ├── admin.js <span className="opacity-40">(State controller backend)</span></div>
                      <div> &nbsp; └── supabase.sql <span className="opacity-40">(Kueri skema basis data)</span></div>
                    </div>
                  </div>
                </div>

                {/* THE CODE BOX VIEWER */}
                <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[70vh]">
                  
                  {/* Tab Selector */}
                  <div className="bg-[#18212f]/30 border-b border-white/5 p-3 flex gap-1.5 overflow-x-auto">
                    {Object.keys(codeFiles).map(fileName => (
                      <button
                        key={fileName}
                        onClick={() => {
                          setActiveCodeFile(fileName);
                          setCopiedFile(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border cursor-pointer whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          activeCodeFile === fileName
                            ? "bg-[#242c38] text-[#f59e0b] border-[#f59e0b]/20"
                            : "bg-transparent text-slate-400 border-transparent hover:text-white"
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        {fileName}
                      </button>
                    ))}
                  </div>

                  {/* Header tools */}
                  <div className="px-4 py-2 bg-[#171f2a]/10 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-500">Path: /gallery-project/{activeCodeFile}</span>
                    <button
                      onClick={() => copyCodeToClipboard(codeFiles[activeCodeFile])}
                      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-all"
                    >
                      {copiedFile ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedFile ? "Copied!" : "Copy Code"}
                    </button>
                  </div>

                  {/* Code Block Container */}
                  <pre className="flex-grow p-4 overflow-auto font-mono text-[11px] text-slate-300 bg-[#0a0a0a] leading-relaxed selection:bg-slate-300/10">
                    <code>{codeFiles[activeCodeFile]}</code>
                  </pre>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ==========================================
          MODAL LIGHTBOX FULL SCREEN OVERLAY
          ========================================== */}
      <AnimatePresence>
        {lightboxPhoto && (
          <div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setLightboxPhoto(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ cubicBezier: [0.16, 1, 0.3, 1] }}
              className="relative max-w-full max-h-[80vh] flex justify-center mb-6"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-12 right-0 bg-white/5 hover:bg-rose-500 border border-white/10 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <img 
                src={lightboxPhoto.image_url} 
                alt={lightboxPhoto.title} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/10 shadow-2xl"
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center max-w-xl px-4"
              onClick={e => e.stopPropagation()}
            >
              <span className="text-[10px] tracking-widest uppercase font-bold text-[#f59e0b] block mb-1">
                {lightboxPhoto.category || "General"}
              </span>
              <h3 className="font-serif text-2xl text-slate-100 leading-snug">{lightboxPhoto.title}</h3>
              <p className="text-xs text-slate-400 mt-2 font-light leading-relaxed">{lightboxPhoto.description}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL UNTUK EDIT METADATA FOTO 
          ========================================== */}
      <AnimatePresence>
        {editingPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111111] border border-white/10 rounded-xl p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h4 className="font-serif text-lg font-bold text-slate-100">Modifikasi Portofolio</h4>
                <button onClick={() => setEditingPhoto(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Judul Karya</label>
                  <input 
                    type="text"
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kategori</label>
                  <select 
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:border-[#f59e0b]"
                  >
                    <option value="Architecture">Architecture</option>
                    <option value="Nature">Nature</option>
                    <option value="Minimalist">Minimalist</option>
                    <option value="People">People</option>
                    <option value="General">General / Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Keterangan / Narasi</label>
                  <textarea 
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:border-[#f59e0b] h-24"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingPhoto(null)}
                    className="border border-white/10 hover:bg-white/5 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#f59e0b] hover:bg-amber-600 text-black px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer transition-all"
                  >
                    Simpan Rincian
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          FOOTER AT THE BOTTOM
          ========================================== */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 px-4 py-8 text-center text-slate-500 text-xs">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Ethereal Canvas. Seluruh hak cipta dilindungi undang-undang.</p>
          <div className="flex gap-4">
            <button onClick={() => setView("gallery")} className="hover:text-white transition-all">Galeri</button>
            <button onClick={() => setView("admin")} className="hover:text-white transition-all">Admin</button>
            <button onClick={() => setView("docs")} className="hover:text-white transition-all">Panduan Integrasi</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
