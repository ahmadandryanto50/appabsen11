/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, getLocalDateString, getLocalTimeString } from '../types';
import { Camera, FileImage, Trash2, CheckCircle, Clock, Loader2, Play, UserCheck, RotateCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TeacherAttendanceViewProps {
  currentUser: User | null;
  onSubmit: (payload: any) => Promise<boolean>;
  currentTimeString: string;
}

export function TeacherAttendanceView({
  currentUser,
  onSubmit,
  currentTimeString,
}: TeacherAttendanceViewProps) {
  const [tipeAbsen, setTipeAbsen] = useState<'Datang' | 'Pulang'>('Datang');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [alreadyDatang, setAlreadyDatang] = useState(false);
  const [alreadyPulang, setAlreadyPulang] = useState(false);
  const [activeHoliday, setActiveHoliday] = useState<any>(null);
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    // Determine if today is weekend in WITA (Asia/Makassar)
    let isTodayWeekend = false;
    try {
      const dayName = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Makassar',
        weekday: 'long',
      }).format(new Date());
      isTodayWeekend = dayName === 'Saturday' || dayName === 'Sunday';
    } catch (e) {
      const dayOfWeek = new Date().getDay();
      isTodayWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    }
    setIsWeekend(isTodayWeekend);

    const now = new Date();
    const todayStr = getLocalDateString(now);
    const stored = localStorage.getItem('absensi_hari_libur');
    if (stored) {
      try {
        const list = JSON.parse(stored);
        const match = list.find((h: any) => h.tanggal === todayStr);
        if (match) {
          setActiveHoliday(match);
        }
      } catch (e) {}
    }
  }, []);

  const [hasIzinToday, setHasIzinToday] = useState(false);

  useEffect(() => {
    try {
      const rawHistory = localStorage.getItem('absensi_history_guru_absen');
      if (rawHistory && currentUser) {
        const history = JSON.parse(rawHistory);
        const todayStr = getLocalDateString(new Date());
        
        let foundDatang = false;
        let foundPulang = false;
        
        history.forEach((log: any) => {
          if (log.tanggal === todayStr && 
             (log.nip === currentUser.nip || (log.namaGuru && currentUser.nama && log.namaGuru.includes(currentUser.nama)))) {
            const tipe = String(log.tipeAbsen || log.kategori || '').toLowerCase();
            if (tipe.includes('datang') || tipe.includes('masuk')) {
              foundDatang = true;
            } else if (tipe.includes('pulang') || tipe.includes('keluar')) {
              foundPulang = true;
            }
          }
        });

        // Check for permit
        let hasIzin = false;
        try {
          const rawPermits = localStorage.getItem('absensi_history_guru') || '[]';
          const permits = JSON.parse(rawPermits);
          const matchPermit = permits.find((log: any) => {
            const isMatchDate = log.tanggal === todayStr;
            const isMatchUser = log.nip === currentUser.nip || 
                               (log.namaGuru && currentUser.nama && log.namaGuru.trim() === currentUser.nama.trim());
            const isNotHadir = log.status && !log.status.toLowerCase().includes('hadir');
            return isMatchDate && isMatchUser && isNotHadir;
          });
          if (matchPermit) {
            hasIzin = true;
          }
        } catch (err) {}
        
        setHasIzinToday(hasIzin);

        if (hasIzin) {
          if (foundDatang) {
            setAlreadyDatang(true);
            setAlreadyPulang(true);
            setTipeAbsen('Datang');
          } else {
            setAlreadyDatang(true);
            setAlreadyPulang(true);
          }
        } else {
          setAlreadyDatang(foundDatang);
          setAlreadyPulang(foundPulang);
          
          if (foundDatang && !foundPulang) {
            setTipeAbsen('Pulang');
          } else if (!foundDatang) {
            setTipeAbsen('Datang');
          }
        }
      }
    } catch(e) {}
  }, [currentUser]);

  // Camera Snapshot State
  const [showCameraStream, setShowCameraStream] = useState(false);
  const [cameraPhoto, setCameraPhoto] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (mode: 'user' | 'environment' = cameraFacingMode) => {
    setShowCameraStream(true);
    setCameraPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setShowCameraStream(false);
      alert('Gagal membuka kamera. Pastikan Anda memberikan izin kamera.');
    }
  };

  const toggleCameraFacingMode = async () => {
    const newMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(newMode);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      await startCamera(newMode);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      const maxDim = 320; // Reduced to fit within Google Sheets 50k cell limit
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // Lower quality to save string length
        setCameraPhoto(dataUrl);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCameraStream(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const rawUrl = event.target.result as string;
          const img = new Image();
          img.onload = () => {
            let w = img.width;
            let h = img.height;
            const maxDim = 320; // Reduced to fit within Google Sheets 50k cell limit
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              setCameraPhoto(canvas.toDataURL('image/jpeg', 0.5)); // Lower quality to save string length
            } else {
              setCameraPhoto(rawUrl);
            }
          };
          img.src = rawUrl;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!cameraPhoto) {
      alert('Silakan ambil foto bukti kehadiran terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const dateString = getLocalDateString(now);
      const timeString = getLocalTimeString(now);

      const statusAbsenLabel = tipeAbsen === 'Pulang' ? 'Absen Pulang' : 'Absen Datang';
      const payload = {
        tanggal: dateString,
        waktu: timeString,
        nip: currentUser?.nip || '',
        namaGuru: currentUser?.nama || '',
        tipeAbsen: statusAbsenLabel,
        kategori: statusAbsenLabel,
        photo: cameraPhoto,
        photoBase64: cameraPhoto,
      };

      const isSuccess = await onSubmit(payload);
      if (isSuccess) {
        setCameraPhoto(null);
        if (tipeAbsen === 'Datang') {
          setAlreadyDatang(true);
          setTipeAbsen('Pulang');
        } else if (tipeAbsen === 'Pulang') {
          setAlreadyPulang(true);
        }
      } else {
        alert("Gagal menyimpan presensi. Silakan coba tekan Kirim Presensi sekali lagi.");
      }
    } catch (err: any) {
      console.error('Failed to submit Teacher attendance:', err);
      alert("Gagal menyimpan presensi: " + (err.message || 'Kesalahan jaringan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !cameraPhoto || (tipeAbsen === 'Datang' && alreadyDatang) || (tipeAbsen === 'Pulang' && alreadyPulang);

  const isBlocked = (activeHoliday || isWeekend) && currentUser?.role !== 'Admin Utama';

  if (isBlocked) {
    return (
      <div className="bg-red-50 border border-red-200/80 rounded-3xl p-8 text-center max-w-xl mx-auto my-8 space-y-4 shadow-sm animate-scale-up">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-black text-red-900 uppercase tracking-wide">
            {isWeekend ? 'Libur Akhir Pekan' : 'Hari Libur Terdeteksi'}
          </h3>
          <p className="text-xs font-extrabold text-red-700 bg-red-100/60 px-3 py-1.5 rounded-full inline-block">
            {isWeekend 
              ? 'Hari ini: Sabtu / Minggu (Weekend)' 
              : `Hari ini: "${activeHoliday?.nama}" (${activeHoliday?.kategori})`
            }
          </p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Sistem absensi guru harian otomatis ditangguhkan selama hari libur atau akhir pekan. Selamat menikmati waktu istirahat bersama keluarga!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* MODE OVERRIDE ADMIN UTAMA BANNER */}
      {(activeHoliday || isWeekend) && currentUser?.role === 'Admin Utama' && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-300 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-100 flex-shrink-0" />
          <div className="text-xs text-left">
            <span className="font-extrabold block">Mode Override Admin Utama Aktif!</span>
            <span className="font-medium opacity-90">Hari ini libur/akhir pekan, tetapi sebagai Admin Utama Anda tetap dapat menguji & menginput presensi guru.</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Presensi Kehadiran Guru</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Lakukan presensi harian Anda secara mandiri sebagai Guru menggunakan kamera perangkat sebagai bukti otentik.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <Clock className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-slate-700 tracking-tight font-mono whitespace-nowrap">
              {currentTimeString}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase tracking-wider">
              Identitas Pengguna
            </span>
            <h4 className="text-base font-extrabold text-slate-800 mt-1">{currentUser?.nama}</h4>
            <p className="text-xs text-slate-500 font-semibold font-mono">
              NIP: {currentUser?.nip || 'TIDAK TERSEDIA'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Role Akun</span>
            <span className="text-sm font-extrabold text-slate-700">{currentUser?.role}</span>
          </div>
        </div>

        {/* Status Administrator Non-Wajib Presensi */}
        {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin' || String(currentUser?.role || '').toLowerCase().includes('admin') || String(currentUser?.username || '').toLowerCase().includes('admin')) && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-amber-950 block">Akun Administrator (Non-Wajib Presensi)</span>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                Khusus akun <strong>Admin Utama</strong> dan <strong>Admin</strong>, Anda <strong>tidak memiliki kewajiban presensi</strong> harian (datang/pulang/kelas/izin) dan akun ini <strong>tidak dimasukkan ke dalam rekapitulasi evaluasi kehadiran</strong> guru. Fitur form di bawah tetap dapat digunakan untuk pengujian atau pencatatan simulasi jika diperlukan.
              </p>
            </div>
          </div>
        )}

        {/* Status Izin Terdeteksi */}
        {hasIzinToday && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-blue-900 text-xs animate-scale-up">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5 text-left">
              <span className="font-extrabold text-blue-950 block">Status Izin/Sakit/Cuti Terdeteksi Hari Ini</span>
              <p className="text-blue-800/90 text-[11px] leading-relaxed">
                Anda telah mengajukan permohonan izin/sakit/cuti hari ini. 
                {localStorage.getItem('absensi_history_guru_absen') && JSON.parse(localStorage.getItem('absensi_history_guru_absen') || '[]').some((log: any) => {
                  const todayStr = getLocalDateString(new Date());
                  const isMatchDate = log.tanggal === todayStr;
                  const isMatchUser = log.nip === currentUser?.nip || (log.namaGuru && currentUser?.nama && log.namaGuru.includes(currentUser?.nama));
                  const tipe = String(log.tipeAbsen || log.kategori || '').toLowerCase();
                  return isMatchDate && isMatchUser && (tipe.includes('datang') || tipe.includes('masuk'));
                }) ? (
                  <span> Absen Pulang dikunci secara otomatis, dan status kehadiran Anda hari ini tetap dihitung <strong>Hadir</strong> karena Anda telah melakukan Absen Datang di pagi hari.</span>
                ) : (
                  <span> Fitur Absen Datang dan Absen Pulang dikunci sepenuhnya karena Anda langsung menggunakan form izin hari ini.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Select Tipe Presensi (Datang / Pulang) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Kategori Presensi Guru <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={alreadyDatang}
              onClick={() => setTipeAbsen('Datang')}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-extrabold text-xs transition-all ${
                alreadyDatang ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400' : 'cursor-pointer'
              } ${
                tipeAbsen === 'Datang' && !alreadyDatang
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 shadow-sm'
                  : !alreadyDatang ? 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/70' : ''
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                tipeAbsen === 'Datang' && !alreadyDatang ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
              }`}>
                {tipeAbsen === 'Datang' && !alreadyDatang && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-base">☀️</span>
              <span>Absen Datang {alreadyDatang && '(Selesai)'}</span>
            </button>

            <button
              type="button"
              disabled={alreadyPulang}
              onClick={() => setTipeAbsen('Pulang')}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-extrabold text-xs transition-all ${
                alreadyPulang ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400' : 'cursor-pointer'
              } ${
                tipeAbsen === 'Pulang' && !alreadyPulang
                  ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-sm'
                  : !alreadyPulang ? 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/70' : ''
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                tipeAbsen === 'Pulang' && !alreadyPulang ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
              }`}>
                {tipeAbsen === 'Pulang' && !alreadyPulang && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-base">🌙</span>
              <span>Absen Pulang {alreadyPulang && '(Selesai)'}</span>
            </button>
          </div>
        </div>

        {/* Camera Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Foto Bukti Absen Datang / Pulang <span className="text-rose-500">*</span>
          </label>

          {!showCameraStream && !cameraPhoto && (
            <div className="h-48 border-2 border-dashed border-slate-200 bg-slate-50/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-400">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Gunakan Kamera atau Unggah Berkas</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Sistem membutuhkan foto diri di lokasi sekolah untuk verifikasi kehadiran.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Aktifkan Kamera</span>
                </button>
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 cursor-pointer transition-colors">
                  <FileImage className="w-3.5 h-3.5" />
                  <span>Pilih Berkas</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {showCameraStream && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video max-w-md mx-auto shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
              />
              <div className="absolute bottom-4 inset-x-0 flex flex-wrap justify-center gap-2 px-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto</span>
                </button>
                <button
                  type="button"
                  onClick={toggleCameraFacingMode}
                  className="px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold rounded-xl backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Ganti Kamera Depan / Belakang"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{cameraFacingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold rounded-xl backdrop-blur-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {cameraPhoto && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video max-w-md mx-auto bg-slate-50 shadow-sm group">
              <img
                src={cameraPhoto}
                alt="Bukti Absen Guru"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setCameraPhoto(null)}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg cursor-pointer transform hover:scale-110 transition-transform"
                  title="Hapus foto dan ambil ulang"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitDisabled}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Presensi...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Kirim Presensi ({tipeAbsen === 'Pulang' ? 'Absen Pulang' : 'Absen Datang'})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
