# 🌍 Mangkasara TrashVision AI

**Mangkasara TrashVision AI** (sebelumnya EwakoVision AI) adalah sistem pendeteksi, klasifikasi, dan manajemen sampah hibrida (Offline + Online) yang dirancang khusus untuk LKS AI Eksibisi 2026 tingkat Provinsi Sulawesi Selatan.

Aplikasi ini menggunakan **YOLOv8 Object Detection** untuk pelacakan koordinat sampah secara real-time (*Bounding Box*), **Gemini 1.5 Flash** untuk menyusun panduan rekomendasi eksekusi cerdas, serta ekosistem dashboard **Next.js** untuk manajemen logistik spasial (GIS) armada truk sampah terpilah di Kota Makassar.

---

## 🛠️ Persyaratan Sistem
Sebelum memulai, pastikan komputer Anda telah terinstal:
* Node.js (Versi 18 atau lebih baru)
* Python (Versi 3.9 hingga 3.12)
* Git

---

## 🚀 Cara Menjalankan Proyek (Setup Guide)

### Langkah 1: Kloning Repositori Utama LKS
```bash
git clone https://github.com/aimandaffano99-gif/MANGKASARA-TRASHVISION-AI_LKS-AI-EKSHIBISI-2026_SMK-TELKOM-MAKASSAR_PROV.-SULAWESI-SELATAN.git
cd MANGKASARA-TRASHVISION-AI_LKS-AI-EKSHIBISI-2026_SMK-TELKOM-MAKASSAR_PROV.-SULAWESI-SELATAN
```

### Langkah 2: Setup & Environment Frontend (Next.js)

1. Masuk ke folder frontend dan instal semua pustaka antarmuka web:

```bash
cd frontend
npm install
```

2. Buat file `.env.local` di dalam folder `frontend/` untuk mengaktifkan fitur pencatatan logging data sampah:

```bash
NEXT_PUBLIC_SUPABASE_URL=masukkan_url_supabase_project_anda
NEXT_PUBLIC_SUPABASE_ANON_KEY=masukkan_anon_key_supabase_anda
```

3. Jalankan server pengembangan frontend:

```bash
npm run dev
```

👉 Frontend dapat diakses melalui **http://localhost:3000** (Menu Navigasi Sidebar: Dashboard, AI Scanner, Peta GIS, Waste Wallet, Tukar Poin).

### Langkah 3: Setup Backend AI (FastAPI & YOLOv8)
Buka tab terminal baru (biarkan terminal frontend tetap berjalan), lalu buat dan aktifkan *Virtual Environment* Python:

```bash
cd backend

# Membuat Virtual Environment (Windows)
python -m venv venv

# Mengaktifkan Virtual Environment (Windows)
venv\Scripts\activate
# (Untuk Mac/Linux gunakan: source venv/bin/activate)
```

Setelah Virtual Environment aktif (ditandai dengan munculnya teks `(venv)` di terminal), instal dependensi model AI:

```bash
pip install -r requirements.txt
```

### Langkah 4: Setup API Key (Gemini AI di Backend)

1. Di dalam folder `backend/`, buat sebuah file baru bernama `.env`.
2. Buka file `.env` tersebut dan masukkan API Key Gemini Anda:

```bash
GEMINI_API_KEY=AIzaSy...masukkan_api_key_gemini_anda_disini...
```

### Langkah 5: Jalankan Server AI Backend
Pastikan Virtual Environment masih aktif, lalu jalankan server Uvicorn:

```bash
uvicorn main:app --reload
```

👉 Backend AI akan berjalan di **http://127.0.0.1:8000**. Saat tombol **"Analisis Sampah"** ditekan pertama kali di aplikasi, backend akan otomatis mengunduh arsitektur model dasar `yolov8n.pt` (sekitar 6 MB).

## 🎯 Menggunakan Model Kustom (Opsional)
Jika Anda memiliki model YOLOv8 hasil training kustom (misal dari Roboflow untuk tipe-tipe sampah spesifik), cukup ubah nama file bobot model Anda menjadi `trash_yolov8.pt` lalu letakkan langsung di dalam folder `backend/`. Sistem akan mendeteksi dan memuat model kustom tersebut secara otomatis.

## 🐳 Menjalankan Backend via Docker (Alternatif)
Jika Anda tidak ingin mengonfigurasi environment Python lokal, backend dapat dieksekusi langsung melalui Docker Container:

```bash
cd backend
# Build Docker Image
docker build -t mangkasara-backend .
# Jalankan Container
docker run -p 8000:8000 -e GEMINI_API_KEY=YOUR_API_KEY mangkasara-backend
```
