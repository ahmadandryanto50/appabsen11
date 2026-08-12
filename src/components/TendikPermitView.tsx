/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, getLocalDateString } from '../types';
import { Camera, FileImage, Trash2, CheckCircle, Clock, Loader2, Play, CalendarDays, RotateCw } from 'lucide-react';

interface TendikPermitViewProps {
  currentUser: User | null;
  onSubmit: (payload: any) => Promise<void>;
  currentTimeString: string;
}

export function TendikPermitView({
  currentUser,
  onSubmit,
  currentTimeString,
}: TendikPermitViewProps) {
  const [status, setStatus] = useState('Sakit');
  const [alasan, setAlasan] = useState('');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasan.trim()) {
      alert('Silakan tulis detail alasan ketidakhadiran Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const dateString = getLocalDateString(now);
      const timeString = now.toTimeString().split(' ')[0];

      const payload = {
        tanggal: dateString,
        waktu: timeString,
        nip: currentUser?.nip || '',
        namaTendik: currentUser?.nama || '',
        status: status,
        alasan: alasan,
        photo: cameraPhoto || '',
        photoBase64: cameraPhoto || '',
      };

      await onSubmit(payload);
      setAlasan('');
      setCameraPhoto(null);
    } catch (err) {
      console.error('Failed to submit Tendik permit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              <span>Formulir Permohonan Izin / Sakit Tendik</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ajukan permohonan ketidakhadiran kerja secara resmi ke sistem administrasi.
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
            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 uppercase tracking-wider">
              Pemohon Izin
            </span>
            <h4 className="text-base font-extrabold text-slate-800 mt-1">{currentUser?.nama}</h4>
            <p className="text-xs text-slate-500 font-semibold font-mono">
              NIP: {currentUser?.nip || 'TIDAK TERSEDIA'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Jabatan/Role</span>
            <span className="text-sm font-extrabold text-slate-700">{currentUser?.role}</span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kategori Ketidakhadiran <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Sakit', 'Izin', 'Cuti'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatus(opt)}
                    className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      status === opt
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Detail Alasan Ketidakhadiran <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Tulis alasan tidak masuk secara detail (misal: Demam tinggi butuh bedrest, Ada keperluan keluarga mendadak, dll)..."
                required
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold placeholder-slate-400 leading-relaxed"
              />
            </div>
          </div>

          {/* Attachment Photo Section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lampiran Foto Bukti <span className="text-slate-400">(Opsional / Sangat Disarankan)</span>
            </label>

            {!showCameraStream && !cameraPhoto && (
              <div className="h-44 border-2 border-dashed border-slate-200 bg-slate-50/30 rounded-2xl flex flex-col items-center justify-center p-4 text-center gap-2">
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Lampirkan Surat / Foto Bukti</p>
                  <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mx-auto mt-0.5">Unggah foto surat dokter, surat tugas, atau ambil langsung via kamera.</p>
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Kamera</span>
                  </button>
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-200 cursor-pointer transition-colors">
                    <FileImage className="w-3 h-3" />
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
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
                />
                <div className="absolute bottom-3 inset-x-0 flex flex-wrap justify-center gap-2 px-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-lg flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ambil Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleCameraFacingMode}
                    className="px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="Ganti Kamera Depan / Belakang"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{cameraFacingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2 bg-slate-900/85 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {cameraPhoto && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-50 shadow-sm group">
                <img
                  src={cameraPhoto}
                  alt="Bukti Izin Tendik"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setCameraPhoto(null)}
                    className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg cursor-pointer transform hover:scale-110 transition-transform"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Formulir...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Kirim Permohonan Izin</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
