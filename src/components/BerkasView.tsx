import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, CheckCircle, FileText, File, RefreshCcw, FolderOpen, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { apiClient } from '../api';
import { User } from '../types';

interface BerkasViewProps {
  currentUser: User | null;
}

export interface FileItem {
  id: string;
  name: string;
  base64: string;
  type: string;
  size?: number;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  uploadedUrl?: string;
  errorMsg?: string;
}

export function BerkasView({ currentUser }: BerkasViewProps) {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [completedUploads, setCompletedUploads] = useState<{ name: string; url: string; status: 'success' | 'error'; errorMsg?: string }[]>([]);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Camera State
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFacingMode(mode);
    } catch (err: any) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        streamRef.current = fallbackStream;
        setUseCamera(true);
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
      const photoName = `Foto Kamera ${fileList.length + 1} (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')})`;
      
      const newPhotoItem: FileItem = {
        id: Math.random().toString(36).substring(2, 9) + Date.now(),
        name: photoName,
        base64: dataUrl,
        type: 'image/jpeg',
        status: 'pending'
      };

      setFileList((prev) => [...prev, newPhotoItem]);
      stopCamera();
    }
  };

  // Process image or doc to Base64
  const processFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
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
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              resolve(event.target?.result as string);
            }
          };
          img.onerror = () => resolve(event.target?.result as string);
          img.src = event.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error('Gagal membaca file'));
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');
    const newItems: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const baseName = file.name.split('.').slice(0, -1).join('.') || file.name;

      try {
        const base64 = await processFileToBase64(file);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9) + Date.now() + i,
          name: baseName,
          base64: base64,
          type: file.type,
          size: file.size,
          status: 'pending',
        });
      } catch (err) {
        console.error('Gagal memproses file:', file.name, err);
      }
    }

    if (newItems.length > 0) {
      setFileList((prev) => [...prev, ...newItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFileItem = (id: string) => {
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFileName = (id: string, newName: string) => {
    setFileList((prev) => prev.map((item) => (item.id === id ? { ...item, name: newName } : item)));
  };

  const clearSelection = () => {
    setFileList([]);
    setCompletedUploads([]);
    setSuccessMsg('');
    setErrorMsg('');
    setUploadProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fileList.length === 0) {
      setErrorMsg('Pilih minimal satu file atau ambil foto terlebih dahulu.');
      return;
    }

    if (fileList.some((item) => !item.name.trim())) {
      setErrorMsg('Harap isi nama semua berkas sebelum mengupload.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setCompletedUploads([]);

    const results: { name: string; url: string; status: 'success' | 'error'; errorMsg?: string }[] = [];
    const uploaderName = currentUser?.nama || currentUser?.username || 'Pengguna E-Absensi';

    for (let i = 0; i < fileList.length; i++) {
      const item = fileList[i];
      setUploadProgress({ current: i + 1, total: fileList.length, currentName: item.name });

      let finalFileName = item.name.trim();
      if (!finalFileName.includes('.')) {
        if (item.type.includes('pdf')) finalFileName += '.pdf';
        else if (item.type.includes('png')) finalFileName += '.png';
        else if (item.type.includes('jpeg') || item.type.includes('jpg')) finalFileName += '.jpg';
        else if (item.type.includes('word')) finalFileName += '.docx';
        else if (item.type.includes('excel')) finalFileName += '.xlsx';
      }

      try {
        const res = await apiClient.uploadBerkas(finalFileName, item.base64, uploaderName);
        if (res.status === 'success' && res.fileUrl) {
          results.push({
            name: finalFileName,
            url: res.fileUrl,
            status: 'success'
          });
        } else {
          results.push({
            name: finalFileName,
            url: '',
            status: 'error',
            errorMsg: res.message || 'Gagal upload file ke Drive'
          });
        }
      } catch (err: any) {
        results.push({
          name: finalFileName,
          url: '',
          status: 'error',
          errorMsg: err.message || 'Koneksi terputus saat upload'
        });
      }
    }

    setIsSubmitting(false);
    setUploadProgress(null);
    setCompletedUploads(results);

    const successCount = results.filter((r) => r.status === 'success').length;
    if (successCount > 0) {
      setSuccessMsg(`Berhasil mengunggah ${successCount} dari ${fileList.length} berkas ke Google Drive!`);
      setFileList([]);
    } else {
      setErrorMsg('Gagal mengunggah berkas. Silakan periksa koneksi internet dan coba lagi.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <File className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Upload Berkas Multi-File</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Upload satu atau beberapa file sekaligus (foto, PDF, Word, Excel) langsung ke Google Drive
            </p>
          </div>
        </div>
        <a 
          href="https://drive.google.com/drive/folders/1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition-colors shadow-sm flex-shrink-0"
        >
          <FolderOpen className="w-4 h-4" />
          Lihat Folder Drive
        </a>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/60">
        {successMsg ? (
          <div className="text-center py-8 space-y-6 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Proses Upload Selesai!</h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto">{successMsg}</p>

            {completedUploads.length > 0 && (
              <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-lg mx-auto space-y-3">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Daftar Hasil Upload:</span>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {completedUploads.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {item.status === 'success' ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                      </div>
                      {item.status === 'success' && item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg shrink-0 transition-colors"
                        >
                          Buka Link
                        </a>
                      ) : (
                        <span className="text-rose-500 font-bold text-[11px] shrink-0">{item.errorMsg || 'Gagal'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={clearSelection}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-md transition-all cursor-pointer"
              >
                Upload File Lainnya
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Picker Cards */}
            {!useCamera && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer"
                >
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-slate-700">Gunakan Kamera</span>
                    <span className="block text-xs text-slate-500 mt-1">Foto dokumen & tambahkan ke antrean</span>
                  </div>
                </button>

                <label className="p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-slate-700">Upload File (Multi-File)</span>
                    <span className="block text-xs text-slate-500 mt-1">Pilih satu atau banyak file sekaligus</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="*/*"
                    multiple
                  />
                </label>
              </div>
            )}

            {/* Camera View */}
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
                    Ambil Foto
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Selected File Queue List */}
            {fileList.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">Daftar Berkas Siap Upload</span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-full">
                      {fileList.length} File
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah File Lagi</span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="*/*"
                        multiple
                      />
                    </label>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Kosongkan Semua
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {fileList.map((item, idx) => {
                    const isImage = item.base64.startsWith('data:image/');
                    return (
                      <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                          <span className="w-6 text-center font-bold text-slate-400 text-xs shrink-0">{idx + 1}.</span>
                          {isImage ? (
                            <img src={item.base64} alt={item.name} className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Nama File / Dokumen</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateFileName(item.id, e.target.value)}
                              placeholder="Judul Berkas..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFileItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors self-end sm:self-center shrink-0 cursor-pointer"
                          title="Hapus file ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Progress Indicator */}
            {isSubmitting && uploadProgress && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>Mengunggah Berkas ke Google Drive...</span>
                  <span>{uploadProgress.current} / {uploadProgress.total} File</span>
                </div>
                <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-700 font-medium truncate">
                  Sedang memproses: {uploadProgress.currentName}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {fileList.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white rounded-2xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      <span>Sedang Mengunggah ({uploadProgress?.current || 1}/{fileList.length})...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Upload Semua Berkas ({fileList.length} File)</span>
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

