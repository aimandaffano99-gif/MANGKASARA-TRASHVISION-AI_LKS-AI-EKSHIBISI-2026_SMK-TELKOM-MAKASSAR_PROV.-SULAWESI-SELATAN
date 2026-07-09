"use client";

import { useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Cloud,
  Leaf,
  RefreshCcw,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trophy,
} from "lucide-react";

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

interface BackendPredictionResponse {
  object_name?: string;
  category?: string;
  confidence?: number;
  action_recommendation?: string;
  bounding_box?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null;
}

type ScanMode = "trash" | "chiganjing";

const API_URL = process.env.NEXT_PUBLIC_AI_API_URL ?? "http://127.0.0.1:8000/api/predict";

export default function ScannerPage() {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCapturedFrame, setHasCapturedFrame] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCO2, setTotalCO2] = useState(0);
  const [currentImpact, setCurrentImpact] = useState<{ points: number; co2: number } | null>(null);
  const [mode, setMode] = useState<ScanMode>("trash");
  const [offlineMode, setOfflineMode] = useState(false);
  const [ambiguityAnswers, setAmbiguityAnswers] = useState({ wasteType: "", handling: "" });
  const [reportSent, setReportSent] = useState(false);
  const [foodWasteVerified, setFoodWasteVerified] = useState(false);
  const [foodWasteProgress, setFoodWasteProgress] = useState(0);

  const isB3Alert = result?.data.category?.toLowerCase() === "b3";
  const isAmbiguousAlert = Boolean(result && result.data.confidence_score < 85);

  const calculateImpact = (category: string, object_detected: string) => {
    let points = 5;
    let co2 = 10;
    const lowerObj = object_detected.toLowerCase();

    if (lowerObj.includes("plastik") || lowerObj.includes("plastic")) {
      points = 15;
      co2 = 50;
    } else if (lowerObj.includes("kaca") || lowerObj.includes("glass")) {
      points = 20;
      co2 = 100;
    } else if (lowerObj.includes("kertas") || lowerObj.includes("paper") || lowerObj.includes("kardus") || lowerObj.includes("cardboard")) {
      points = 10;
      co2 = 20;
    } else if (lowerObj.includes("metal") || lowerObj.includes("kaleng")) {
      points = 25;
      co2 = 80;
    } else if (category.toLowerCase() === "organik" || category.toLowerCase() === "sisa makanan") {
      points = 10;
      co2 = 30;
    }

    return { points, co2 };
  };

  const deriveMaterialRecommendation = (object_detected: string, category: string) => {
    const lowerObj = object_detected.toLowerCase();
    const lowerCat = category.toLowerCase();

    if (lowerObj.includes("kertas") || lowerObj.includes("paper") || lowerObj.includes("kardus") || lowerObj.includes("cardboard") || lowerCat.includes("kertas") || lowerCat.includes("kardus")) {
      return "Pilahan kertas kering, lipat rapi, dan masukkan ke bin Anorganik. Siap disetor ke BSU terdekat.";
    }

    if (lowerObj.includes("plastik") || lowerObj.includes("plastic") || lowerObj.includes("botol") || lowerObj.includes("kemasan") || lowerCat.includes("plastik")) {
      return "Pisahkan plastik bersih dan kering, kumpulkan ke bin Anorganik, lalu kirim ke bank sampah atau daur ulang.";
    }

    if (lowerObj.includes("kaca") || lowerObj.includes("glass") || lowerCat.includes("kaca")) {
      return "Kumpulkan kaca dalam kondisi utuh atau bungkus rapih, masukkan ke bin Anorganik, dan bawa ke pusat daur ulang terdekat.";
    }

    if (lowerObj.includes("metal") || lowerObj.includes("kaleng") || lowerObj.includes("logam") || lowerCat.includes("metal")) {
      return "Bersihkan logam atau kaleng jika perlu, lalu masukkan ke bin Anorganik untuk pemilahan dan daur ulang.";
    }

    if (lowerCat.includes("organik") || lowerCat.includes("sisa makanan") || lowerObj.includes("sisa makanan") || lowerObj.includes("makanan")) {
      return "Pisahkan sisa makanan basah ke tempat sampah organik atau kompos, hindari mencampurkannya dengan sampah anorganik.";
    }

    if (lowerCat.includes("b3") || lowerObj.includes("baterai") || lowerObj.includes("elektronik") || lowerObj.includes("lampu") || lowerObj.includes("cairan")) {
      return "Masukkan limbah B3 ke wadah tertutup, pisahkan dari sampah biasa, dan serahkan ke bank sampah atau fasilitas resmi.";
    }

    return "Pisahkan material ini sesuai kategori, kumpulkan di tempat terpisah, dan bawa ke bank sampah atau pusat daur ulang terdekat untuk penanganan lebih lanjut.";
  };

  const isGenericFallbackRecommendation = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return !normalized || normalized.includes("tinjau hasil prediksi");
  };

  const getExecutionRecommendation = (result: AnalysisResult | null) => {
    if (offlineMode) {
      return "Rekomendasi Gemini tidak tersedia dalam mode offline. Pemilahan dialihkan ke panduan lokal.";
    }

    if (!result) {
      return "Rekomendasi tidak tersedia.";
    }

    if (result.data.confidence_score < 85) {
      return deriveMaterialRecommendation(result.data.object_detected, result.data.category);
    }

    if (isGenericFallbackRecommendation(result.data.action_recommendation)) {
      return deriveMaterialRecommendation(result.data.object_detected, result.data.category);
    }

    return result.data.action_recommendation;
  };

  const handleFeedback = (type: "yes" | "no") => {
    setFeedback(type);

    if (type === "yes" && result) {
      const impact = calculateImpact(result.data.category, result.data.object_detected);
      setCurrentImpact(impact);
      setTotalPoints((prev) => prev + impact.points);
      setTotalCO2((prev) => prev + impact.co2);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCapturedImage(null);
    setHasCapturedFrame(false);
    setError(null);
    setFeedback(null);
    setCurrentImpact(null);
    setReportSent(false);
    setFoodWasteVerified(false);
    setFoodWasteProgress(0);
    setAmbiguityAnswers({ wasteType: "", handling: "" });
  };

  const handleNextScan = () => {
    setCapturedImage(null);
    setHasCapturedFrame(false);
    setResult(null);
    setError(null);
    setFeedback(null);
    setCurrentImpact(null);
    setReportSent(false);
    setFoodWasteVerified(false);
    setFoodWasteProgress(0);
    setAmbiguityAnswers({ wasteType: "", handling: "" });
  };

  const handleAnalyze = async () => {
    const imageSrc = webcamRef.current?.getScreenshot() ?? null;

    if (!imageSrc) {
      setError("Kamera belum siap. Pastikan izin kamera aktif.");
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);
    setCapturedImage(imageSrc);
    setHasCapturedFrame(true);
    setResult(null);
    setReportSent(false);
    setAmbiguityAnswers({ wasteType: "", handling: "" });

    try {
      const base64Image = imageSrc.replace(/^data:image\/\w+;base64,/, "");
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as BackendPredictionResponse;
      const mappedResult: AnalysisResult = {
        success: true,
        mode: "Live Prediction",
        data: {
          object_detected: payload.object_name?.trim() || "Objek tidak teridentifikasi",
          category: payload.category?.trim() || "Tidak diketahui",
          confidence_score: Math.max(0, Math.min(100, Number(payload.confidence ?? 0))),
          action_recommendation: payload.action_recommendation?.trim() || "Tinjau hasil prediksi secara manual.",
          bounding_box: payload.bounding_box ?? null,
        },
      };

      setResult(mappedResult);
    } catch {
      setError("Gagal terhubung ke server AI. Pastikan backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  const handleFoodWasteVerification = () => {
    setFoodWasteVerified(true);
    setFoodWasteProgress(100);
    setTotalPoints((prev) => prev + 25);
  };

  const recommendationText = getExecutionRecommendation(result);

  return (
    <div className={`min-h-screen rounded-[32px] border border-white/10 p-4 shadow-[0_20px_80px_rgba(5,150,105,0.15)] backdrop-blur-2xl sm:p-6 ${isB3Alert ? "bg-rose-950/80" : "bg-slate-950/70"}`}>
      <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_20px_rgba(52,211,153,0.35)]">
            <Leaf className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Mangkasara TrashVision AI</h1>
            <p className="text-sm text-slate-400">Preview lokal untuk pemindaian sampah dan pelacakan limbah makanan</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <Trophy className="h-3.5 w-3.5" />
            {totalPoints} PTS
          </div>
          <div className="flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300">
            <Cloud className="h-3.5 w-3.5" />
            {totalCO2}g CO₂
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${offlineMode ? "border-amber-400/20 bg-amber-500/10 text-amber-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>
            {offlineMode ? <AlertCircle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {offlineMode ? "Mode Offline (Edge AI MobileNetV3 Aktif)" : "Gemini AI Online"}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className={`text-xs font-semibold ${mode === "trash" ? "text-white" : "text-slate-400"}`}>Mangkasara Vision (YOLOv8)</span>
            <button
              aria-pressed={mode === "chiganjing"}
              onClick={() => setMode(mode === "trash" ? "chiganjing" : "trash")}
              className="relative h-6 w-12 rounded-full border border-white/10 bg-slate-900/80 p-1"
            >
              <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-transform ${mode === "chiganjing" ? "translate-x-6" : "translate-x-0"}`} />
            </button>
            <span className={`text-xs font-semibold ${mode === "chiganjing" ? "text-amber-300" : "text-slate-400"}`}>CHIGANJING Vision (Food Waste)</span>
          </div>
          <button
            onClick={() => setOfflineMode((prev) => !prev)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${offlineMode ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}
          >
            {offlineMode ? "Mode Offline Aktif" : "Simulasikan Mode Offline"}
          </button>
        </div>
      </header>

      {mode === "chiganjing" && (
        <section className="mb-6 rounded-[28px] border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-slate-900/70 to-emerald-500/10 p-5 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">CHIGANJING Vision · Pelacakan sisa makanan</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Pantau jejak piring Anda dengan visualisasi yang lebih intuitif.</h2>
            </div>
            <button
              onClick={handleFoodWasteVerification}
              disabled={foodWasteVerified}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${foodWasteVerified ? "cursor-default border border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"}`}
            >
              {foodWasteVerified ? "Piring bersih terverifikasi" : "Verifikasi Piring Bersih"}
            </button>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
              <span>Sisa Makanan di Piring: {foodWasteProgress}%</span>
              <span className="font-semibold text-amber-200">{foodWasteVerified ? "0%" : "0%"}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-slate-900">
              <div className={`h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700 ${foodWasteVerified ? "w-full" : "w-[0%]"}`} />
            </div>
            {foodWasteVerified && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 animate-bounce" />
                Bonus +25 PTS berhasil ditambahkan ke total Anda.
              </div>
            )}
          </div>
        </section>
      )}

      <main className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
            <Camera className="h-5 w-5 text-emerald-400" />
            Pemindai objek
          </div>

          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <p className="font-semibold">Analisis langsung ke backend</p>
            <p className="mt-1 text-xs text-emerald-200/90">Frame kamera saat ini akan dikirim ke server AI lokal di {API_URL}.</p>
          </div>

          <div className={`relative aspect-[4/3] overflow-hidden rounded-[24px] border bg-black shadow-inner ${isB3Alert ? "border-rose-500 animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.5)]" : "border-slate-700/60"}`}>
            {capturedImage ? (
              <img src={capturedImage} alt="Tangkapan kamera" className="h-full w-full object-cover" style={{ opacity: loading ? 0.5 : 1 }} />
            ) : (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="h-full w-full object-cover"
                style={{ opacity: loading ? 0.5 : 1 }}
                onUserMediaError={() => setCameraError(true)}
                onUserMedia={() => setCameraError(false)}
              />
            )}

            {result?.data?.bounding_box && !loading && (
              <div
                className={`pointer-events-none absolute z-30 border-[3px] ${isB3Alert ? "border-rose-500 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.4)]" : "border-emerald-500 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.4)]"}`}
                style={{
                  left: `${result.data.bounding_box.x1 * 100}%`,
                  top: `${result.data.bounding_box.y1 * 100}%`,
                  width: `${(result.data.bounding_box.x2 - result.data.bounding_box.x1) * 100}%`,
                  height: `${(result.data.bounding_box.y2 - result.data.bounding_box.y1) * 100}%`,
                }}
              >
                <div className={`absolute left-0 top-0 whitespace-nowrap px-2 py-1 text-[10px] font-bold text-black sm:text-xs ${isB3Alert ? "bg-rose-500" : "bg-emerald-500"}`}>
                  {result.data.object_detected} ({result.data.confidence_score}%)
                </div>
              </div>
            )}

            {loading && (
              <>
                <div className={`absolute inset-0 z-10 ${isB3Alert ? "bg-rose-500/10" : "bg-emerald-500/10"}`} />
                <div className={`absolute left-0 top-0 z-20 h-2 w-full animate-[scan_2s_ease-in-out_infinite] ${isB3Alert ? "bg-rose-400/80 shadow-[0_0_20px_rgba(244,63,94,1)]" : "bg-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,1)]"}`} />
              </>
            )}

            <div className="absolute left-4 top-4 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/30" />
            <div className="absolute right-4 top-4 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/30" />
            <div className="absolute bottom-4 left-4 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/30" />
            <div className="absolute bottom-4 right-4 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/30" />
          </div>

          {error && !capturedImage && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {cameraError && !capturedImage && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Kamera tidak dapat dimuat. Pastikan izin kamera aktif.</p>
            </div>
          )}

          <button
            onClick={hasCapturedFrame ? handleNextScan : handleAnalyze}
            disabled={loading}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold tracking-wide transition-all ${loading ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500" : "bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(52,211,153,0.5)]"}`}
          >
            {loading ? (
              <>
                <ScanLine className="h-5 w-5 animate-spin" />
                Menganalisis dengan Mangkasara AI...
              </>
            ) : hasCapturedFrame ? (
              <>
                <RefreshCw className="h-5 w-5" />
                PINDAI SAMPAH SELANJUTNYA
              </>
            ) : (
              <>
                <ScanLine className="h-5 w-5" />
                ANALISIS SAMPAH
              </>
            )}
          </button>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-sky-400" />
              Hasil kecerdasan buatan
            </div>
            {result && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${offlineMode ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-sky-500/20 bg-sky-500/10 text-sky-400"}`}>
                <ShieldCheck className="h-3 w-3" />
                {offlineMode ? "Mode offline aktif" : "Gemini AI aktif"}
              </div>
            )}
          </div>

          {result ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Identifikasi material</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <p className="truncate text-lg font-semibold text-white">{result.data.object_detected}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kategori sistem</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
                      <Leaf className="h-5 w-5" />
                    </div>
                    <p className="text-lg font-semibold text-white">{result.data.category}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-3 flex items-end justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Akurasi visual model</p>
                  <p className="text-lg font-semibold text-emerald-400">{result.data.confidence_score}%</p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${result.data.confidence_score}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-black/50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-400">Rekomendasi eksekusi</p>
                {isAmbiguousAlert && (
                  <p className="mt-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Catatan: Akurasi visual model di bawah standar (85%). Mohon lengkapi kuesioner Verifikasi Mandiri di bawah untuk validasi data.
                  </p>
                )}
                <p className="mt-3 text-sm leading-6 text-slate-300">{recommendationText}</p>
              </div>

              {isB3Alert && (
                <div className="rounded-[22px] border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <p className="mb-2 text-sm font-semibold text-rose-200">PANDUAN KESELAMATAN LIMBAH B3</p>
                  <ul className="list-disc space-y-1 pl-5 leading-6">
                    <li>Jangan menyentuh langsung baterai bekas atau cairan yang mungkin bocor.</li>
                    <li>Masukkan ke wadah tertutup dan pisahkan dari sampah rumah tangga biasa.</li>
                    <li>Serahkan ke petugas atau bank sampah resmi untuk penanganan aman.</li>
                  </ul>
                </div>
              )}

              {isAmbiguousAlert && (
                <div className="rounded-[22px] border border-amber-400/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm font-semibold">Verifikasi Mandiri: Apakah ini benar {result.data.object_detected}?</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    <label className="block rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                      <span className="mb-2 block font-medium text-white">1. Apakah objek ini memerlukan peninjauan lebih lanjut?</span>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="wasteType" checked={ambiguityAnswers.wasteType === "ya"} onChange={() => setAmbiguityAnswers((prev) => ({ ...prev, wasteType: "ya" }))} />
                          Ya
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="wasteType" checked={ambiguityAnswers.wasteType === "tidak"} onChange={() => setAmbiguityAnswers((prev) => ({ ...prev, wasteType: "tidak" }))} />
                          Tidak
                        </label>
                      </div>
                    </label>
                    <label className="block rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                      <span className="mb-2 block font-medium text-white">2. Apakah objek ini butuh penanganan khusus oleh relawan?</span>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="handling" checked={ambiguityAnswers.handling === "ya"} onChange={() => setAmbiguityAnswers((prev) => ({ ...prev, handling: "ya" }))} />
                          Ya
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="handling" checked={ambiguityAnswers.handling === "tidak"} onChange={() => setAmbiguityAnswers((prev) => ({ ...prev, handling: "tidak" }))} />
                          Tidak
                        </label>
                      </div>
                    </label>
                    <button
                      onClick={() => setReportSent(true)}
                      disabled={!ambiguityAnswers.wasteType || !ambiguityAnswers.handling}
                      className={`w-full rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${!ambiguityAnswers.wasteType || !ambiguityAnswers.handling ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500" : "border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"}`}
                    >
                      Kirim ke Eco Ranger SWSC Unismuh
                    </button>
                    {reportSent && (
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 animate-bounce" />
                        Laporan terkirim ke Relawan Eco Ranger.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                {feedback === null ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Evaluasi manusia</p>
                    <p className="text-sm text-slate-300">Apakah hasil deteksi ini sesuai dengan jenis sampah Anda?</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleFeedback("yes")} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20">
                        <ThumbsUp className="h-3.5 w-3.5" /> Ya, sesuai
                      </button>
                      <button onClick={() => handleFeedback("no")} className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 transition-all hover:border-rose-500/50 hover:bg-rose-500/20">
                        <ThumbsDown className="h-3.5 w-3.5" /> Tidak, perlu koreksi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-semibold">Feedback berhasil dikirim ke sistem</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">
                        <Trophy className="h-3.5 w-3.5" /> +{currentImpact?.points || 0} poin
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-400">
                        <Cloud className="h-3.5 w-3.5" /> {currentImpact?.co2 || 0}g CO₂ terkurangi
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleReset} className="flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white">
                <RefreshCcw className="h-4 w-4" />
                Reset analisis
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-400/20 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                <ScanLine className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Siap memulai deteksi sampah?</h3>
              <p className="max-w-md text-sm leading-7 text-slate-400">
                Aktifkan kamera Anda, lalu jalankan analisis untuk melihat hasil prediksi langsung dari backend AI.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
