"use client";
import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Camera, Sparkles, AlertCircle, ScanLine, Trash2, Leaf, ShieldCheck, RefreshCcw, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';

interface AnalysisResult {
  success: boolean;
  mode: string;
  data: {
    object_detected: string;
    category: string;
    confidence_score: number;
    action_recommendation: string;
    bounding_box?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    } | null;
  };
}

export default function EwakoVisionDashboard() {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);

  const handleReset = () => {
    setResult(null);
    setCapturedImage(null);
    setError(null);
    setFeedback(null);
  };

  const base64ToBlob = (base64Data: string) => {
    const byteString = atob(base64Data.split(',')[1]);
    const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleAnalyze = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError("Gagal menangkap gambar dari kamera. Pastikan izin kamera aktif.");
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);
    setCapturedImage(imageSrc); // Mengunci (freeze) frame kamera

    try {
      console.log("[EwakoVision] Memulai analisis...");
      const imageBlob = base64ToBlob(imageSrc);
      const formData = new FormData();
      formData.append('image', imageBlob, 'webcam_capture.jpg');

      console.log("[EwakoVision] Mengirim request POST ke backend...");
      
      // Deteksi URL Backend secara dinamis
      // Di Vercel, Anda cukup mengisi environment variable NEXT_PUBLIC_API_URL dengan URL Hugging Face
      const isProd = process.env.NODE_ENV === 'production';
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (isProd ? 'https://muhalifanhar-ewakovision-backend.hf.space' : 'http://localhost:8000');
      
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      console.log("[EwakoVision] Menerima respons HTTP status:", response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error("[EwakoVision] Backend Error Text:", errText);
        throw new Error(`Gagal terhubung ke Server AI Backend (Status: ${response.status}).`);
      }
      
      const resData: AnalysisResult = await response.json();
      console.log("[EwakoVision] Data JSON berhasil di-parse:", resData);
      
      if (resData && resData.data) {
        setResult(resData);
      } else {
        throw new Error("Format respons tidak valid dari backend.");
      }
    } catch (err: any) {
      console.error("[EwakoVision] Terjadi error di blok catch:", err);
      setError(err.message || "Terjadi kesalahan sistem.");
    } finally {
      console.log("[EwakoVision] Mengeksekusi blok finally, menghentikan loading.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden pb-12">
      {/* Premium Header */}
      <header className="w-full border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              <Leaf className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
                EwakoVision AI
              </h1>
              <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">Deteksi Sampah Hibrida</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-slate-300 font-medium tracking-wide">Sistem Aktif</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* Glow effect backgrounds */}
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        {/* LEFT COLUMN: CAMERA & CONTROLS */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Glass Card for Controls */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl flex-1 flex flex-col relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>

            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-6">
              <Camera className="w-5 h-5 text-emerald-400" />
              Pemindai Objek
            </h2>

            {/* Camera Frame */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-black aspect-[4/3] shadow-inner flex-shrink-0 group">
              {capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Tangkapan Kamera" 
                  className="w-full h-full object-cover transition-opacity duration-300"
                  style={{ opacity: loading ? 0.5 : 1 }}
                />
              ) : (
                <Webcam 
                  audio={false} 
                  ref={webcamRef} 
                  screenshotFormat="image/jpeg" 
                  className="w-full h-full object-cover transition-opacity duration-300"
                  style={{ opacity: loading ? 0.5 : 1 }}
                />
              )}
              
              {/* Overlay Bounding Box (YOLOv8) */}
              {result?.data?.bounding_box && !loading && (
                <div 
                  className="absolute border-[3px] border-emerald-500 bg-emerald-500/20 z-30 pointer-events-none transition-all duration-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                  style={{
                    left: `${result.data.bounding_box.x1 * 100}%`,
                    top: `${result.data.bounding_box.y1 * 100}%`,
                    width: `${(result.data.bounding_box.x2 - result.data.bounding_box.x1) * 100}%`,
                    height: `${(result.data.bounding_box.y2 - result.data.bounding_box.y1) * 100}%`
                  }}
                >
                  {/* Label diposisikan di DALAM kotak agar tidak terpotong (overflow-hidden) */}
                  <div className="bg-emerald-500 text-black text-[10px] sm:text-xs font-bold px-2 py-1 absolute top-0 left-0 whitespace-nowrap">
                    {result.data.object_detected} ({result.data.confidence_score}%)
                  </div>
                </div>
              )}

              {/* Scanning Animation */}
              {loading && (
                <>
                  <div className="absolute inset-0 bg-emerald-500/10 z-10"></div>
                  <div className="absolute top-0 left-0 w-full h-2 bg-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,1)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
                </>
              )}

              {/* Viewfinder crosshairs */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/30 rounded-tl-lg z-10"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/30 rounded-tr-lg z-10"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/30 rounded-bl-lg z-10"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/30 rounded-br-lg z-10"></div>
            </div>

            {/* Removed API Key Input Field */}

            {/* Error Notification */}
            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            <div className="mt-auto pt-6">
              <button 
                onClick={handleAnalyze} 
                disabled={loading || capturedImage !== null}
                className={`w-full py-4 rounded-xl font-bold tracking-wide text-sm flex items-center justify-center gap-2 transition-all duration-300 transform ${
                  loading || capturedImage !== null
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                {loading ? (
                  <>
                    <ScanLine className="w-5 h-5 animate-spin" />
                    MEMPROSES CITRA...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-5 h-5" />
                    ANALISIS SAMPAH
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI ANALYSIS RESULTS */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl flex-1 flex flex-col relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-sky-500 to-teal-400"></div>

            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Hasil Kecerdasan Buatan
              </h2>
              {result && (
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 ${result.mode.includes('Online') ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  <ShieldCheck className="w-3 h-3" />
                  {result.mode.includes('Online') ? 'Gemini AI Aktif' : 'Engine Lokal Aktif'}
                </div>
              )}
            </div>
            
            {result ? (
              <div className="space-y-6 flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Object Detected */}
                  <div className="bg-black/40 border border-white/5 p-5 rounded-2xl relative group hover:border-emerald-500/30 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl"></div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest mb-1">Identifikasi Material</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-2xl font-black text-white truncate" title={result.data.object_detected}>
                        {result.data.object_detected}
                      </span>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="bg-black/40 border border-white/5 p-5 rounded-2xl relative group hover:border-sky-500/30 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 rounded-l-2xl"></div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest mb-1">Kategori Sistem</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
                        <Leaf className="w-5 h-5 text-sky-400" />
                      </div>
                      <span className="text-xl font-bold text-white leading-tight">
                        {result.data.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="bg-black/40 border border-white/5 p-5 rounded-2xl">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Akurasi Visual Model</span>
                    <span className="text-lg font-black text-emerald-400">{result.data.confidence_score}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out relative" 
                      style={{ width: `${result.data.confidence_score}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/30 to-transparent blur-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="mt-2 bg-gradient-to-br from-slate-800/50 to-black/50 border border-slate-700/50 p-6 rounded-2xl flex-1 flex flex-col relative">
                  <div className="absolute -top-3 left-6 px-2 bg-slate-900 text-xs font-bold text-sky-400 tracking-wider uppercase flex items-center gap-1.5 border border-slate-700/50 rounded-lg">
                    <Sparkles className="w-3 h-3" /> Rekomendasi Eksekusi
                  </div>
                  <p className="text-slate-300 leading-relaxed font-medium mt-2 text-sm sm:text-base">
                    {typeof result.data.action_recommendation === 'string' ? 
                      result.data.action_recommendation.split(/\[.*?\]/).map((text, i) => {
                        if (text.trim() === '') return null;
                        return <span key={i}>{text}</span>;
                      })
                      : "Rekomendasi tidak tersedia."
                    }
                  </p>
                </div>

                {/* Human-in-the-Loop Feedback UI */}
                <div className="mt-2 bg-black/40 border border-white/5 p-5 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 block">Evaluasi Manusia (Human-in-the-Loop)</span>
                  
                  {feedback === null ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-medium text-slate-300">Apakah hasil deteksi ini sesuai dengan jenis sampah Anda?</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          onClick={() => setFeedback('yes')}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Ya, Sesuai
                        </button>
                        <button 
                          onClick={() => setFeedback('no')}
                          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> Kurang Tepat
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 animate-in fade-in zoom-in duration-300">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="text-sm font-medium">Terima kasih! Masukan Anda membantu EwakoVision AI belajar menjadi lebih pintar.</p>
                    </div>
                  )}
                </div>

                {/* Reset Button */}
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={handleReset}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-xl font-bold text-sm text-slate-300 hover:text-emerald-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <RefreshCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
                    Analisis Lagi?
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-700/50 rounded-2xl bg-black/20">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <ScanLine className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Menunggu Data Visual</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  Posisikan sampah di depan kamera dan tekan tombol <strong>Analisis Sampah</strong> untuk memulai pemindaian bertenaga AI.
                </p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Global Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0; }
        }
      `}} />
    </div>
  );
}
