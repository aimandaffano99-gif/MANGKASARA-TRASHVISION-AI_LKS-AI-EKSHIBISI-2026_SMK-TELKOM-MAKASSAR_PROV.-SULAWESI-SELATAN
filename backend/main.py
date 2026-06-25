import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from ml_model import predict_object
from gemini_service import dapatkan_rekomendasi_ewako

# Load environment variables dari .env file
load_dotenv()

app = FastAPI(title="EwakoVision AI Backend Engine")

# Mengatasi Isu Keamanan Jalur CORS lintas Port (3000 ke 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
def analyze_endpoint(
    image: UploadFile = File(...),
    api_key: str = Form(None)
):
    # Validasi Tipe File Ekstensi Gambar
    if image.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Format file wajib JPEG atau PNG.")
        
    try:
        # Karena kita menggunakan fungsi def (bukan async), gunakan method sinkronus read()
        image_bytes = image.file.read()
        
        # 1. Jalankan Core AI Layer (Deteksi Objek Lokal dengan YOLOv8)
        label_objek, kategori_sampah, akurasi, bbox = predict_object(image_bytes)
        
        # Ambil API key dari parameter atau environment variable
        final_api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        # 2. Jalankan Expansion AI Layer (Rekomendasi & Verifikasi Threshold)
        # Jika akurasi < 50%, Gemini Multimodal akan mengambil alih untuk memvalidasi gambar
        new_label, new_kategori, rekomendasi_konten = dapatkan_rekomendasi_ewako(
            label_objek, kategori_sampah, akurasi, image_bytes, final_api_key
        )
        
        # 3. Tentukan status konektivitas sistem yang berjalan
        mode_sistem = "Online (Gemini Enhanced)" if final_api_key else "Offline (Local Core Only)"
        
        return {
            "success": True,
            "mode": mode_sistem,
            "data": {
                "object_detected": new_label,
                "category": new_kategori,
                "confidence_score": round(akurasi * 100, 2),
                "bounding_box": bbox,
                "action_recommendation": rekomendasi_konten
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
