-- ==========================================
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

-- Policy C: Hanya user yang terautentikasi yang bisa memperbarui (update) foto
CREATE POLICY "Allow authenticated update" 
ON public.photos FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Policy D: Hanya user yang terautentikasi yang bisa menghapus (delete) foto
CREATE POLICY "Allow authenticated delete" 
ON public.photos FOR DELETE 
TO authenticated 
USING (true);


-- 4. Setup Storage Bucket "gallery-images"
-- Catatan: Biasanya Anda bisa membuat bucket langsung dari dashboard UI Supabase Storage.
-- Query di bawah ini mencoba memasukkan data bucket secara otomatis jika belum ada.
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Buat Storage Policies untuk "gallery-images"
-- Policy Storage A: Mengizinkan akses baca (read) publik ke semua file di bucket "gallery-images"
CREATE POLICY "Give public read access to any image"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-images');

-- Policy Storage B: Mengizinkan user terautentikasi untuk mengupload file ke bucket "gallery-images"
CREATE POLICY "Give authenticated upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-images');

-- Policy Storage C: Mengizinkan user terautentikasi untuk mengubah file di bucket "gallery-images"
CREATE POLICY "Give authenticated update access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery-images');

-- Policy Storage D: Mengizinkan user terautentikasi untuk menghapus file di bucket "gallery-images"
CREATE POLICY "Give authenticated delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-images');
