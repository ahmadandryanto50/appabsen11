import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, CheckCircle, FileText, Image as ImageIcon, Video, File, RefreshCcw } from 'lucide-react';
import { apiClient } from '../api';
import { User } from '../types';

interface BerkasViewProps {
  currentUser: User | null;
}

export function BerkasView({ currentUser }: BerkasViewProps) {
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileType, setFileType] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');

  // Camera State
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = async (mode = facingMode) => {
    setErrorMsg('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setUseCamera(true);
      setFileBase64(null);
      setFacingMode(mode);
    } catch (err: any) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        streamRef.current = fallbackStream;
        setUseCamera(true);
        setFileBase64(null);
      } catch (fallbackErr: any) {
        setErrorMsg('Gagal mengakses kamera: ' + fallbackErr.message);
      }
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const MAX_DIM = 1200;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setFileBase64(dataUrl);
      setFileType('image/jpeg');
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileType(file.type);
      if (!fileName) {
        setFileName(file.name.split('.')[0]);
      }
      
      // If it's an image, compress it automatically before sending
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              setFileBase64(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              setFileBase64(event.target?.result as string);
            }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setFileBase64(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const clearSelection = () => {
    setFileBase64(null);
    setFileName('');
    setUploadedUrl('');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileBase64) {
      setErrorMsg('Pilih file atau ambil foto terlebih dahulu.');
      return;
    }
    if (!fileName.trim()) {
      setErrorMsg('Masukkan nama berkas.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    // Extrapolate extension if missing
    let finalFileName = fileName.trim();
    if (!finalFileName.includes('.')) {
       if (fileType.includes('pdf')) finalFileName += '.pdf';
       else if (fileType.includes('png')) finalFileName += '.png';
       else if (fileType.includes('jpeg') || fileType.includes('jpg')) finalFileName += '.jpg';
       else if (fileType.includes('word')) finalFileName += '.docx';
       else if (fileType.includes('excel')) finalFileName += '.xlsx';
    }

    try {
      const uploaderName = currentUser?.nama || currentUser?.username || 'Pengguna E-Absensi';
      const res = await apiClient.uploadBerkas(finalFileName, fileBase64, uploaderName);
      
      if (res.status === 'success' && res.fileUrl) {
        setSuccessMsg(res.message || 'Berkas berhasil diunggah ke Google Drive dan tersimpan di Spreadsheet!');
        setUploadedUrl(res.fileUrl);
        setFileBase64(null);
        setFileName('');
      } else {
        setErrorMsg(`Gagal Upload ke Google Drive: ${res.message || 'Respons Apps Script tidak valid'}`);
        setUploadedUrl('');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal terhubung ke Google Apps Script: ${err.message || 'Koneksi error'}`);
      setUploadedUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPreview = () => {
    if (!fileBase64) return null;

    if (fileBase64.startsWith('data:image/')) {
      return (
        <div className="relative mt-4">
          <img src={fileBase64} alt="Preview" className="w-full max-h-64 object-contain rounded-xl border border-slate-200" />
          <button
            type="button"
            onClick={clearSelection}
            className="absolute -top-3 -right-3 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    } else {
      return (
        <div className="relative mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">Berkas Dipilih</span>
              <span className="text-xs text-slate-500">Siap diupload</span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 mb-2">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
          <File className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Upload Berkas</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Foto dokumen fisik atau upload file langsung ke Google Drive
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/60">
        {successMsg ? (
          <div className="text-center py-8 space-y-4 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Upload Berhasil!</h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto">{successMsg}</p>
            {uploadedUrl && (
              <div className="mt-4 space-y-2">
                {uploadedUrl.startsWith('http') ? (
                  <a
                    href={uploadedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-md transition-all"
                  >
                    <span>🔗 Buka Berkas di Google Drive</span>
                  </a>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <span>💡 Berkas tersimpan di Database Spreadsheet sebagai Tautan Gambar.</span>
                  </div>
                )}
              </div>
            )}
            <div className="pt-6">
              <button
                onClick={() => {
                  setSuccessMsg('');
                  setUploadedUrl('');
                }}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Upload File Lain
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Nama Berkas / Dokumen
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Contoh: RPP Matematika Ganjil"
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:font-normal"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {!fileBase64 && !useCamera && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors group"
                >
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-slate-700">Gunakan Kamera</span>
                    <span className="block text-xs text-slate-500 mt-1">Foto dokumen fisik langsung</span>
                  </div>
                </button>

                <label className="p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-slate-700">Upload File</span>
                    <span className="block text-xs text-slate-500 mt-1">Pilih dari galeri atau storage</span>
                  </div>
                  <input type="file" onChange={handleFileUpload} className="hidden" accept="*/*" />
                </label>
              </div>
            )}

            {useCamera && (
              <div className="space-y-4 animate-fade-in bg-slate-900 p-4 rounded-2xl relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-h-[60vh] object-contain rounded-xl bg-black"
                />
                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2"
                    title="Putar Kamera"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Ambil
                  </button>
                </div>
              </div>
            )}

            {renderPreview()}

            {fileBase64 && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      Sedang Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Sekarang
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
