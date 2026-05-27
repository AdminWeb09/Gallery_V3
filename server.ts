import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const CONFIG_FILE = path.join(process.cwd(), "supabase-config.json");

// Helper to read config
function readConfig() {
  // First priority: Env variables
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      source: "env"
    };
  }

  // Second priority: JSON config file
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
          source: "file"
        };
      }
    } catch (e) {
      console.error("Failed to parse supabase-config.json:", e);
    }
  }

  return { url: "", anonKey: "", source: "none" };
}

// Helper to save config
function saveConfig(url: string, anonKey: string) {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ url, anonKey }, null, 2),
      "utf-8"
    );
    return true;
  } catch (e) {
    console.error("Error saving supabase-config.json:", e);
    return false;
  }
}

// Helper to delete config
function deleteConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
    return true;
  } catch (e) {
    console.error("Error deleting supabase-config.json:", e);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard middleware untuk parsing body
  app.use(express.json());

  // API Route: Ambil konfigurasi Supabase
  app.get("/api/supabase-config", (req, res) => {
    const config = readConfig();
    res.json(config);
  });

  // API Route: Simpan konfigurasi Supabase (permanen lintas perangkat)
  app.post("/api/supabase-config", (req, res) => {
    const { url, anonKey } = req.body;
    if (!url || !anonKey) {
      return res.status(400).json({ error: "URL dan anonKey wajib diisi" });
    }
    const success = saveConfig(url, anonKey);
    if (success) {
      res.json({ message: "Konfigurasi berhasil disimpan di server", source: "file" });
    } else {
      res.status(500).json({ error: "Gagal menulis file konfigurasi di server" });
    }
  });

  // API Route: Hapus konfigurasi Supabase
  app.delete("/api/supabase-config", (req, res) => {
    const success = deleteConfig();
    if (success) {
      res.json({ message: "Konfigurasi berhasil dihapus di server" });
    } else {
      res.status(500).json({ error: "Gagal menghapus file konfigurasi di server" });
    }
  });

  // Serve the gallery-project folder statically for production & development so it's accessible across all devices
  app.use("/gallery-project", express.static(path.join(process.cwd(), "gallery-project")));

  // Integrasi Vite middleware untuk development, atau file statis untuk production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
