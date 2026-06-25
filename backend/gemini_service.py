import os
import google.generativeai as genai
from PIL import Image
import io
import json

def dapatkan_rekomendasi_ewako(nama_objek, kategori, akurasi, image_bytes=None, api_key=None):
    # LOGIKA SAKELAR HYBRID
    final_api_key = api_key or os.getenv("GEMINI_API_KEY")
    perlu_verifikasi_visual = (akurasi < 0.50) and (image_bytes is not None)
    
    if not final_api_key or final_api_key.strip() == "":
        # MODE OFFLINE/FALLBACK SYSTEM (Tanpa Gemini)
        fallback_msg = "⚠️ [MODE LOKAL] Objek terdeteksi sebagai sampah organik. Disarankan untuk dimasukkan ke komposter." if kategori == "Organik" else "⚠️ [MODE LOKAL] Kumpulkan ke bank sampah."
        return nama_objek, kategori, fallback_msg
            
    # MODE ONLINE (Menggunakan Keunggulan Gemini API)
    try:
        genai.configure(api_key=final_api_key)
        
        if perlu_verifikasi_visual:
            # MITIGASI 1: Ambiguitas Visual (YOLOv8 Confidence < 50%)
            # Memanggil Gemini Multimodal untuk mengevaluasi gambar
            model = genai.GenerativeModel('gemini-3.5-flash')
            image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            prompt = (
                f"Sistem Computer Vision lokal mendeteksi objek ini sebagai '{nama_objek}' "
                f"namun tingkat keyakinannya sangat rendah ({akurasi*100:.1f}%). "
                f"Tolong lihat gambar ini dan verifikasi jenis sampah apa yang sebenarnya terlihat (misal: Botol Plastik Bening, Kardus Bekas, Gelas Kaca). "
                f"Lalu berikan 1 rekomendasi daur ulang taktis skala rumah/sekolah maksimal 2 kalimat. "
                f"PENTING: Jawab HANYA menggunakan format JSON valid dengan key: 'nama_objek_baru', 'kategori_sampah_baru' (pilih: Organik/Anorganik/B3), dan 'rekomendasi_aksi'."
            )
            
            response = model.generate_content([prompt, image_pil])
            text_resp = response.text.strip()
            
            # Membersihkan backticks markdown JSON jika ada
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:-3]
            elif text_resp.startswith("```"):
                text_resp = text_resp[3:-3]
                
            try:
                data = json.loads(text_resp)
                verified_name = data.get("nama_objek_baru", nama_objek)
                verified_cat = data.get("kategori_sampah_baru", kategori)
                verified_rec = f"👁️✨ [GEMINI VISION VERIFIED] {data.get('rekomendasi_aksi', '')}"
                return verified_name, verified_cat, verified_rec
            except json.JSONDecodeError:
                # Fallback jika Gemini gagal me-return JSON murni
                return nama_objek, kategori, f"👁️✨ [GEMINI VISION VERIFIED] {text_resp}"
                
        else:
            # TEXT-ONLY MODE (YOLOv8 sangat yakin >= 50%)
            model = genai.GenerativeModel('gemini-3.5-flash')
            prompt = (
                f"Saya mendeteksi sampah '{nama_objek}' kategori '{kategori}' melalui kamera EwakoVision AI. "
                f"Berikan 1 ide daur ulang kreatif atau langkah penanganan lingkungan taktis skala rumah tangga "
                f"yang aplikatif. Gunakan Bahasa Indonesia yang ringkas, edukatif, maksimal 3 kalimat."
            )
            response = model.generate_content(prompt)
            return nama_objek, kategori, f"✨ [MODE AI TEXT] {response.text}"
            
    except Exception as e:
        return nama_objek, kategori, f"❌ Terjadi kesalahan pada Gemini API ({str(e)}). Menggunakan alternatif panduan manual."
