import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CrudRow, AppCustomization, getLocalDateString } from '../types';
import { Camera, CheckCircle, AlertCircle, Maximize, Clock, UserCheck, RotateCcw, Edit3, Check, Sparkles } from 'lucide-react';
import { apiClient } from '../api';
import { formatKeterlambatan } from '../utils/timeUtils';

interface ScannerKioskViewProps {
  students: CrudRow[];
  customization: AppCustomization;
  onUpdateCustomization?: (newCust: AppCustomization) => Promise<void> | void;
}

interface RecentScan {
  id: string;
  waktu: string;
  nama: string;
  nisn: string;
  kelas: string;
  status: string;
  keterlambatan?: string;
  menitTerlambat?: number;
}

// Robust helper to parse and normalize Batas Waktu string
export function parseBatasWaktu(batasWaktuStr?: string): { hour: number; minute: number; formatted: string } {
  if (!batasWaktuStr || typeof batasWaktuStr !== 'string' || !batasWaktuStr.trim()) {
    return { hour: 7, minute: 0, formatted: '07:00' };
  }
  const clean = batasWaktuStr.trim();
  const match = clean.match(/(\d{1,2})[:.](\d{1,2})/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      return { hour, minute, formatted };
    }
  }
  return { hour: 7, minute: 0, formatted: '07:00' };
}

export function ScannerKioskView({ students, customization, onUpdateCustomization }: ScannerKioskViewProps) {
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'error' | 'idle' | 'warning';
    message: string;
    studentName?: string;
    isLate?: boolean;
    menitTerlambat?: number;
  }>({ status: 'idle', message: 'Siap untuk scan barcode/QR.' });

  const [isScanning, setIsScanning] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isEditingBatas, setIsEditingBatas] = useState(false);
  const [tempBatasInput, setTempBatasInput] = useState(() => parseBatasWaktu(customization.batasWaktuMasuk).formatted);

  const [recentScans, setRecentScans] = useState<RecentScan[]>(() => {
    try {
      const todayKey = `kiosk_recent_scans_${getLocalDateString()}`;
      const saved = localStorage.getItem(todayKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [todayScannedCount, setTodayScannedCount] = useState<number>(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastScannedRef = useRef<{ id: string; time: number } | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isStartingRef = useRef(false);

  // Live timer to tick every second for real-time clock & late check
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update tempBatasInput when customization changes
  useEffect(() => {
    setTempBatasInput(parseBatasWaktu(customization.batasWaktuMasuk).formatted);
  }, [customization.batasWaktuMasuk]);

  // Current parsed cutoff time
  const currentCutoff = parseBatasWaktu(customization.batasWaktuMasuk);
  
  // Calculate current live status (whether now is late)
  const isCurrentlyLate = (() => {
    const cutoffDate = new Date(currentTime);
    cutoffDate.setHours(currentCutoff.hour, currentCutoff.minute, 0, 0);
    return currentTime.getTime() > cutoffDate.getTime();
  })();

  const currentLateMinutes = (() => {
    const cutoffDate = new Date(currentTime);
    cutoffDate.setHours(currentCutoff.hour, currentCutoff.minute, 0, 0);
    if (currentTime.getTime() > cutoffDate.getTime()) {
      return Math.max(1, Math.floor((currentTime.getTime() - cutoffDate.getTime()) / 60000));
    }
    return 0;
  })();

  // Update today's scanned count on mount & date change
  const refreshScannedCount = useCallback(() => {
    try {
      const dateKey = `kiosk_scans_${getLocalDateString()}`;
      const data: string[] = JSON.parse(localStorage.getItem(dateKey) || '[]').filter(
        (x: any) => typeof x === 'string' && x.trim().length > 0
      );
      setTodayScannedCount(data.length);
    } catch {
      setTodayScannedCount(0);
    }
  }, []);

  useEffect(() => {
    refreshScannedCount();
  }, [refreshScannedCount]);

  // Save recent scans to localStorage
  useEffect(() => {
    try {
      const todayKey = `kiosk_recent_scans_${getLocalDateString()}`;
      localStorage.setItem(todayKey, JSON.stringify(recentScans.slice(0, 50)));
    } catch (e) {}
  }, [recentScans]);

  // Quick save for Batas Jam Masuk
  const handleSaveBatasJam = () => {
    const parsed = parseBatasWaktu(tempBatasInput);
    if (onUpdateCustomization) {
      onUpdateCustomization({
        ...customization,
        batasWaktuMasuk: parsed.formatted,
      });
    } else {
      // Local fallback
      try {
        const saved = localStorage.getItem('absensi_app_customization');
        const parsedCust = saved ? JSON.parse(saved) : { ...customization };
        parsedCust.batasWaktuMasuk = parsed.formatted;
        localStorage.setItem('absensi_app_customization', JSON.stringify(parsedCust));
      } catch (e) {}
    }
    setIsEditingBatas(false);
  };

  // Initialize Web Audio API for synthetic beep
  const playBeep = (isLate = false) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = isLate ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(isLate ? 650 : 880, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.18);
    } catch (e) {
      console.error('Audio play failed:', e);
    }
  };

  // Screen Wake Lock API
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {});
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn(`Wake lock warning: ${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const submitToGAS = async (student: CrudRow, status: string, keterlambatan: string, menitTerlambat: number) => {
    try {
      const payload = {
        nisn: String(student.data[1] || '').trim(),
        nama: String(student.data[2] || '').trim(),
        kelas: String(student.data[3] || '').trim(),
        status: status,
        keterlambatan: keterlambatan,
        menitTerlambat: menitTerlambat,
      };

      await apiClient.submitKioskScan(payload);
      return true;
    } catch (e) {
      console.error('Error submitting kiosk scan:', e);
      return false;
    }
  };

  // Handle resetting today's scan cache
  const handleResetTodayCache = () => {
    const dateKey = `kiosk_scans_${getLocalDateString()}`;
    const todayKey = `kiosk_recent_scans_${getLocalDateString()}`;
    localStorage.removeItem(dateKey);
    localStorage.removeItem(todayKey);
    setRecentScans([]);
    setTodayScannedCount(0);
    setScanResult({
      status: 'idle',
      message: 'Cache presensi hari ini telah dibersihkan. Semua siswa dapat scan ulang.',
    });
  };

  const onScanSuccess = useCallback(
    async (decodedText: string) => {
      const cleanText = (decodedText || '').trim();
      if (!cleanText) return;

      const nowTime = Date.now();
      // Cooldown check for the same physical code within 3 seconds to prevent camera jitter
      if (lastScannedRef.current && lastScannedRef.current.id === cleanText) {
        if (nowTime - lastScannedRef.current.time < 3000) {
          return;
        }
      }

      lastScannedRef.current = { id: cleanText, time: nowTime };

      // Find student in master data by NISN, ID, or Nama
      const student = students.find((s) => {
        if (!s || !Array.isArray(s.data)) return false;
        const idStr = String(s.data[0] || '').trim();
        const nisnStr = String(s.data[1] || '').trim();
        const nameStr = String(s.data[2] || '').trim();
        return (
          (nisnStr && nisnStr === cleanText) ||
          (idStr && idStr === cleanText) ||
          (nameStr && nameStr.toLowerCase() === cleanText.toLowerCase())
        );
      });

      if (student) {
        const studentName = String(student.data[2] || 'Siswa').trim();
        const studentNisn = String(student.data[1] || '').trim();
        const studentKelas = String(student.data[3] || '').trim();

        // Determine valid unique key for duplicate checking
        const uniqueStudentKey = studentNisn || String(student.data[0] || '').trim() || studentName;

        const dateKey = `kiosk_scans_${getLocalDateString()}`;
        const rawScanned: any[] = JSON.parse(localStorage.getItem(dateKey) || '[]');
        const scannedData: string[] = rawScanned.filter((x) => typeof x === 'string' && x.trim().length > 0);

        // Check if student has already checked in today
        if (uniqueStudentKey && scannedData.includes(uniqueStudentKey)) {
          setScanResult({
            status: 'warning',
            message: 'Siswa sudah melakukan presensi hari ini!',
            studentName: studentName,
          });
          setTimeout(() => setScanResult({ status: 'idle', message: 'Siap untuk scan barcode/QR.' }), 3500);
          return;
        }

        // Calculate Keterlambatan based on normalized Batas Waktu Masuk
        const parsedCutoff = parseBatasWaktu(customization.batasWaktuMasuk);
        const scanDate = new Date();
        const cutoffDate = new Date(scanDate);
        cutoffDate.setHours(parsedCutoff.hour, parsedCutoff.minute, 0, 0);

        let presensiStatus = 'Hadir';
        let menitTerlambat = 0;
        let keterlambatanText = '-';

        if (scanDate.getTime() > cutoffDate.getTime()) {
          const diffMs = scanDate.getTime() - cutoffDate.getTime();
          menitTerlambat = Math.max(1, Math.floor(diffMs / 60000));
          presensiStatus = 'Terlambat';
          keterlambatanText = formatKeterlambatan(menitTerlambat);
        }

        // Play audio beep
        playBeep(presensiStatus === 'Terlambat');

        // Add to local duplicate check set
        if (uniqueStudentKey) {
          scannedData.push(uniqueStudentKey);
          localStorage.setItem(dateKey, JSON.stringify(scannedData));
          setTodayScannedCount(scannedData.length);
        }

        const feedbackMsg =
          presensiStatus === 'Terlambat'
            ? `Presensi Tercatat (Terlambat ${menitTerlambat} Menit)`
            : `Presensi Berhasil Masuk! (Hadir Tepat Waktu)`;

        setScanResult({
          status: 'success',
          message: feedbackMsg,
          studentName: studentName,
          isLate: presensiStatus === 'Terlambat',
          menitTerlambat: menitTerlambat,
        });

        // Add to recent scans dashboard
        const timeString = scanDate.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setRecentScans((prev) => {
          const newScan: RecentScan = {
            id: Date.now().toString(),
            waktu: timeString,
            nama: studentName,
            nisn: studentNisn || '-',
            kelas: studentKelas || '-',
            status: presensiStatus,
            keterlambatan: keterlambatanText,
            menitTerlambat: menitTerlambat,
          };
          return [newScan, ...prev].slice(0, 50);
        });

        // Submit to Google Sheets backend (Always executes whether Hadir or Terlambat)
        submitToGAS(student, presensiStatus, keterlambatanText, menitTerlambat).then((success) => {
          if (!success) {
            console.warn('Sync to GAS failed or offline, stored in local log.');
          }
        });
      } else {
        setScanResult({
          status: 'error',
          message: `Data siswa dengan kode "${cleanText}" tidak ditemukan di Master Siswa!`,
        });
      }

      // Reset feedback UI after 3.5 seconds
      setTimeout(() => {
        setScanResult({ status: 'idle', message: 'Siap untuk scan barcode/QR.' });
      }, 3500);
    },
    [students, customization.batasWaktuMasuk]
  );

  const startScanner = async () => {
    if (isStartingRef.current || isScanning) return;
    isStartingRef.current = true;
    setIsScanning(true);
    await requestWakeLock();

    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {}
          try {
            scannerRef.current.clear();
          } catch (e) {}
          scannerRef.current = null;
        }

        const reader = document.getElementById('reader');
        if (reader) reader.innerHTML = '';

        const devices = await Html5Qrcode.getCameras();

        if (devices && devices.length > 0) {
          scannerRef.current = new Html5Qrcode('reader');
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          const backCamera = devices.find(
            (d) =>
              d &&
              d.label &&
              (d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment'))
          );

          const cameraId = backCamera ? backCamera.id : devices[0].id;

          await scannerRef.current.start(cameraId, config, onScanSuccess, () => {});
        } else {
          throw new Error('Tidak ada kamera yang terdeteksi.');
        }
      } catch (e) {
        if (!isStartingRef.current) return;
        setIsScanning(false);
        setScanResult({
          status: 'error',
          message: 'Gagal mengakses kamera. Pastikan izin kamera telah diberikan.',
        });
      } finally {
        isStartingRef.current = false;
      }
    }, 200);
  };

  const stopScanner = async () => {
    isStartingRef.current = false;
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    releaseWakeLock();
  };

  useEffect(() => {
    return () => {
      isStartingRef.current = false;
      if (scannerRef.current) {
        try {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
            })
            .catch(() => {});
        } catch (e) {}
      }
      releaseWakeLock();
    };
  }, []);

  // Summary counts for recent scans
  const totalHadirCount = recentScans.filter((s) => s.status === 'Hadir').length;
  const totalTerlambatCount = recentScans.filter((s) => s.status === 'Terlambat').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kiosk Scanner & Live Presensi Siswa</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                Otomatis
              </span>
            </div>
            <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">
              Pemindaian Barcode / QR Card untuk Presensi Gerbang Sekolah
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {todayScannedCount > 0 && (
              <button
                type="button"
                onClick={handleResetTodayCache}
                title="Reset cache agar siswa dapat scan ulang jika diperlukan"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Cache Hari Ini ({todayScannedCount})</span>
              </button>
            )}

            {!isScanning ? (
              <button
                onClick={startScanner}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer text-sm"
              >
                <Camera className="w-5 h-5" />
                <span>Mulai Scan</span>
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-md shadow-rose-500/20 cursor-pointer text-sm"
              >
                <AlertCircle className="w-5 h-5" />
                <span>Hentikan Kamera</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Cutoff Status Bar & Real-time Indicator */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Cutoff Setting Pill */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-amber-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Batas Waktu Masuk</span>
                {isEditingBatas ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="time"
                      value={tempBatasInput}
                      onChange={(e) => setTempBatasInput(e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleSaveBatasJam}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Simpan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingBatas(false)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-300 text-sm">{currentCutoff.formatted} WIB</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingBatas(true)}
                      title="Ubah Batas Waktu Masuk"
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Current Realtime Clock */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Jam Scanner Sekarang</span>
                <span className="font-extrabold text-white text-sm font-mono">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Late / On-Time Status Indicator */}
          <div className="flex items-center gap-2">
            {isCurrentlyLate ? (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 px-3.5 py-2 rounded-xl text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <div className="text-xs">
                  <span className="font-black block">STATUS SAAT INI: TERLAMBAT</span>
                  <span className="text-[11px] text-amber-200/90 font-medium">
                    Lewat {currentLateMinutes} menit dari batas {currentCutoff.formatted}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-2 rounded-xl text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <div className="text-xs">
                  <span className="font-black block">STATUS SAAT INI: TEPAT WAKTU</span>
                  <span className="text-[11px] text-emerald-200/90 font-medium">
                    Scan sebelum {currentCutoff.formatted} otomatis dicatat Hadir
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Scanner and Feedback */}
          <div className="lg:col-span-7 space-y-6">
            {/* Scanner View */}
            <div className="bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden min-h-[350px]">
              <div id="reader" className="w-full flex-1 min-h-[300px] rounded-2xl overflow-hidden shadow-sm relative z-10 bg-black/5"></div>

              {!isScanning && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl m-1">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Maximize className="w-10 h-10" />
                  </div>
                  <p className="text-slate-500 font-medium max-w-[280px] text-center text-sm">
                    Arahkan kamera ke Barcode / QR Code pada Kartu Pelajar Siswa.
                  </p>
                  <button
                    onClick={startScanner}
                    className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Aktifkan Kamera Sekarang
                  </button>
                </div>
              )}
            </div>

            {/* Feedback View */}
            <div
              className={`p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 transform ${
                scanResult.status === 'success'
                  ? scanResult.isLate
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-emerald-50 border-emerald-300'
                  : scanResult.status === 'warning'
                  ? 'bg-amber-50 border-amber-300'
                  : scanResult.status === 'error'
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {scanResult.status === 'success' && (
                  scanResult.isLate ? (
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                      <Clock className="w-9 h-9" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 animate-bounce">
                      <CheckCircle className="w-9 h-9" />
                    </div>
                  )
                )}
                {scanResult.status === 'warning' && (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                    <AlertCircle className="w-9 h-9" />
                  </div>
                )}
                {scanResult.status === 'error' && (
                  <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                    <AlertCircle className="w-9 h-9" />
                  </div>
                )}
                {scanResult.status === 'idle' && (
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                    <Camera className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1">
                  {scanResult.studentName && (
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-1">
                      <h3
                        className={`text-xl sm:text-2xl font-black ${
                          scanResult.isLate
                            ? 'text-amber-800'
                            : scanResult.status === 'success'
                            ? 'text-emerald-800'
                            : scanResult.status === 'warning'
                            ? 'text-amber-800'
                            : 'text-rose-800'
                        }`}
                      >
                        {scanResult.studentName}
                      </h3>
                      {scanResult.isLate && scanResult.menitTerlambat && (
                        <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-black rounded-lg shadow-sm">
                          TERLAMBAT {scanResult.menitTerlambat} MENIT
                        </span>
                      )}
                      {!scanResult.isLate && scanResult.status === 'success' && (
                        <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-black rounded-lg shadow-sm">
                          TEPAT WAKTU (HADIR)
                        </span>
                      )}
                    </div>
                  )}
                  <p
                    className={`font-bold text-sm sm:text-base ${
                      scanResult.isLate
                        ? 'text-amber-700'
                        : scanResult.status === 'success'
                        ? 'text-emerald-700'
                        : scanResult.status === 'warning'
                        ? 'text-amber-700'
                        : scanResult.status === 'error'
                        ? 'text-rose-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {scanResult.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Information Cards */}
            <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl flex items-start gap-3 text-blue-900">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <p className="font-bold mb-1">Ketentuan Presensi & Keterlambatan:</p>
                <ul className="list-disc pl-4 space-y-1 opacity-90 text-xs">
                  <li>
                    Siswa yang memindai sebelum <strong>{currentCutoff.formatted} WIB</strong> dicatat status <strong>Hadir</strong> (Keterlambatan: <code>-</code>).
                  </li>
                  <li>
                    Siswa yang memindai setelah <strong>{currentCutoff.formatted} WIB</strong> otomatis dicatat status <strong>Terlambat</strong> dengan hitungan menit keterlambatan (misal: <code>15 menit</code>).
                  </li>
                  <li>
                    Semua hasil scan tersimpan secara real-time ke spreadsheet dan dapat dipantau pada menu <strong>Riwayat Presensi</strong>.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dashboard */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-slate-800 rounded-t-3xl p-5 text-white flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-black text-base tracking-tight">Live Dashboard Masuk</h3>
                    <p className="text-[11px] text-slate-300">Hasil Scan Hari Ini</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-700 text-slate-200">
                  {recentScans.length} Masuk
                </span>
              </div>

              {/* Stats Mini Badges */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/80">
                <div className="bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">Tepat Waktu:</span>
                  <span className="text-sm font-black text-emerald-400">{totalHadirCount}</span>
                </div>
                <div className="bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300">Terlambat:</span>
                  <span className="text-sm font-black text-amber-400">{totalTerlambatCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-3xl p-4 flex-1 min-h-[420px]">
              {recentScans.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-60">
                  <Clock className="w-12 h-12 text-slate-400" />
                  <p className="font-bold text-slate-500 text-sm">Belum ada siswa yang scan</p>
                  <p className="text-xs text-slate-400 max-w-[200px]">Hasil scan akan langsung muncul di sini secara langsung.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {recentScans.map((scan, idx) => (
                    <div
                      key={scan.id}
                      className={`p-3.5 bg-white rounded-2xl shadow-sm border transition-all ${
                        idx === 0
                          ? scan.status === 'Terlambat'
                            ? 'border-amber-300 shadow-amber-500/10'
                            : 'border-emerald-300 shadow-emerald-500/10'
                          : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-xs sm:text-sm uppercase leading-tight">
                            {scan.nama}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {scan.nisn}
                            </span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              {scan.kelas}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end text-right">
                          <span
                            className={`font-bold text-[11px] px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                              scan.status === 'Terlambat'
                                ? 'text-amber-800 bg-amber-100 border border-amber-200 font-extrabold'
                                : 'text-emerald-800 bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            <span>{scan.status}</span>
                            {scan.status === 'Terlambat' && scan.keterlambatan ? (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                                {scan.keterlambatan}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {scan.waktu}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
