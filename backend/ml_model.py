"""
EwakoVision AI - Core AI Layer
Arsitektur: YOLOv8 Object Detection (Dinamis)
Sistem membaca daftar kelas dari model .pt secara otomatis.
Mendukung model 1-kelas (Garbage) maupun multi-kelas (Roboflow/COCO).
"""

from ultralytics import YOLO
from PIL import Image
import io
import os

# ============================================================
# INISIALISASI MODEL YOLOv8
# ============================================================
print("[EwakoVision AI] Memuat model YOLOv8...")

model_path = "trash_yolov8.pt"
if not os.path.exists(model_path):
    model_path = "yolov8n.pt"

YOLO_MODEL = YOLO(model_path)
print(f"[EwakoVision AI] Model YOLOv8 ({model_path}) berhasil dimuat! [OK]")

# Cetak daftar kelas model ke konsol agar developer bisa mengaudit
print(f"[EwakoVision AI] Total kelas: {len(YOLO_MODEL.names)}")
for idx, name in YOLO_MODEL.names.items():
    print(f"  Index {idx}: {name}")

# ============================================================
# PEMETAAN DINAMIS: KELAS MODEL -> KATEGORI SAMPAH
# Dictionary ini dibaca secara dinamis berdasarkan output
# model.names. Tambahkan entry baru di sini jika Anda
# mengganti model dengan yang multi-kelas.
# ============================================================
KATEGORI_MAP = {
    # === Model 1-Kelas (Garbage Detector) ===
    "Garbage": "Anorganik / Sampah Umum",
    "garbage": "Anorganik / Sampah Umum",

    # === Model Multi-Kelas (Roboflow TrashNet / Custom) ===
    "plastic": "Anorganik / Daur Ulang",
    "paper": "Anorganik / Daur Ulang",
    "cardboard": "Anorganik / Daur Ulang",
    "metal": "Anorganik / Daur Ulang",
    "glass": "Anorganik / Daur Ulang",
    "trash": "Anorganik / Residu",
    "organic": "Organik / Kompos",
    "biological": "Organik / Kompos",
    "battery": "B3 (Bahan Berbahaya & Beracun)",
    "shoes": "Anorganik / Residu",
    "clothes": "Anorganik / Residu",

    # === Model COCO (yolov8n.pt fallback) ===
    "bottle": "Anorganik / Daur Ulang",
    "cup": "Anorganik / Daur Ulang",
    "wine glass": "Anorganik / Daur Ulang",
    "fork": "Anorganik / Residu",
    "knife": "Anorganik / Residu",
    "spoon": "Anorganik / Residu",
    "bowl": "Anorganik / Daur Ulang",
    "banana": "Organik / Kompos",
    "apple": "Organik / Kompos",
    "orange": "Organik / Kompos",
    "broccoli": "Organik / Kompos",
    "carrot": "Organik / Kompos",
    "cell phone": "B3 (Bahan Berbahaya & Beracun) / E-Waste",
    "keyboard": "B3 (Bahan Berbahaya & Beracun) / E-Waste",
    "book": "Anorganik / Daur Ulang",
    "scissors": "Anorganik / Daur Ulang",
    "toothbrush": "Anorganik / Residu",
}

# Terjemahan kelas ke Bahasa Indonesia
TERJEMAHAN_LOKAL = {
    # === Model 1-Kelas ===
    "Garbage": "Sampah Terdeteksi",
    "garbage": "Sampah Terdeteksi",

    # === Model Multi-Kelas ===
    "plastic": "Plastik",
    "paper": "Kertas",
    "cardboard": "Kardus",
    "metal": "Logam / Kaleng",
    "glass": "Kaca / Beling",
    "trash": "Sampah Campuran",
    "organic": "Sampah Organik",
    "biological": "Limbah Biologis",
    "battery": "Baterai Bekas",
    "shoes": "Sepatu Bekas",
    "clothes": "Pakaian Bekas",

    # === Model COCO ===
    "bottle": "Botol Bekas",
    "cup": "Gelas Plastik/Kertas",
    "wine glass": "Gelas Kaca",
    "fork": "Garpu",
    "knife": "Pisau",
    "spoon": "Sendok",
    "bowl": "Mangkuk",
    "banana": "Kulit Pisang",
    "apple": "Sisa Apel",
    "orange": "Kulit Jeruk",
    "broccoli": "Sisa Sayur",
    "carrot": "Sisa Sayur",
    "cell phone": "Ponsel Bekas",
    "keyboard": "Keyboard Bekas",
    "book": "Buku/Kertas Bekas",
    "scissors": "Gunting",
    "toothbrush": "Sikat Gigi Bekas",
}

def predict_object(image_bytes):
    """
    Fungsi utama prediksi objek menggunakan YOLOv8.
    Mengembalikan (nama_objek, kategori, akurasi, bbox).
    Bbox berupa dict {x1, y1, x2, y2} dalam format persentase (0-1).
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_width, img_height = image.size

        results = YOLO_MODEL(image, verbose=False)
        result = results[0]

        if len(result.boxes) == 0:
            return "Tidak Ada Objek", "Tidak Diketahui", 0.0, None

        # Cari deteksi dengan confidence tertinggi
        best_box = max(result.boxes, key=lambda b: float(b.conf[0]))
        best_conf = float(best_box.conf[0])

        # Baca nama kelas secara DINAMIS dari model
        cls_id = int(best_box.cls[0])
        cls_name = YOLO_MODEL.names[cls_id]

        # Terjemahkan ke nama lokal & kategori
        nama_tampil = TERJEMAHAN_LOKAL.get(cls_name, cls_name.title())
        kategori = KATEGORI_MAP.get(cls_name, "Anorganik / Sampah Umum")

        # Normalisasi bounding box ke format persentase (0-1)
        x1, y1, x2, y2 = best_box.xyxy[0].tolist()
        bbox_normalized = {
            "x1": round(x1 / img_width, 4),
            "y1": round(y1 / img_height, 4),
            "x2": round(x2 / img_width, 4),
            "y2": round(y2 / img_height, 4)
        }

        print(f"[EwakoVision AI] Deteksi: '{cls_name}' -> '{nama_tampil}' | Kategori: {kategori} | Akurasi: {best_conf*100:.2f}% | BBox: {bbox_normalized}")

        return nama_tampil, kategori, best_conf, bbox_normalized

    except Exception as e:
        print(f"[EwakoVision AI] Error pada prediksi YOLOv8: {str(e)}")
        return "Objek Tidak Dikenali", "Anorganik / Sampah Umum", 0.0, None
