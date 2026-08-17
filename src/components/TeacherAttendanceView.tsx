/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, getLocalDateString } from '../types';
import { Camera, FileImage, Trash2, CheckCircle, Clock, Loader2, Play, UserCheck, RotateCw } from 'lucide-react';

interface TeacherAttendanceViewProps {
  currentUser: User | null;
  onSubmit: (payload: any) => Promise<void>;
  currentTimeString: string;
}

export function TeacherAttendanceView({
  currentUser,
  onSubmit,
  currentTimeString,
}: TeacherAttendanceViewProps) {
  const [tipeAbsen, setTipeAbsen] = useState<'Datang' | 'Pulang'>('Datang');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const maxDim = 480;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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
            const maxDim = 480;
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
              setCameraPhoto(canvas.toDataURL('image/jpeg', 0.6));
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
      const timeString = now.toTimeString().split(' ')[0];

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

      await onSubmit(payload);
      setCameraPhoto(null);
    } catch (err) {
      console.error('Failed to submit Teacher attendance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
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
              Identitas Guru
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

        {/* Select Tipe Presensi (Datang / Pulang) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Kategori Presensi Guru <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipeAbsen('Datang')}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-extrabold text-xs transition-all cursor-pointer ${
                tipeAbsen === 'Datang'
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 shadow-sm'
                  : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                tipeAbsen === 'Datang' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
              }`}>
                {tipeAbsen === 'Datang' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-base">☀️</span>
              <span>Absen Datang</span>
            </button>

            <button
              type="button"
              onClick={() => setTipeAbsen('Pulang')}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-extrabold text-xs transition-all cursor-pointer ${
                tipeAbsen === 'Pulang'
                  ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-sm'
                  : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                tipeAbsen === 'Pulang' ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
              }`}>
                {tipeAbsen === 'Pulang' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-base">🌙</span>
              <span>Absen Pulang</span>
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
            disabled={isSubmitting || !cameraPhoto}
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
