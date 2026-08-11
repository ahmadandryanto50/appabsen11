/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Student, User } from '../types';
import { Camera, FileImage, Trash2, CheckCircle, Clock, CheckSquare, Sparkles, Loader2, Play, RotateCw } from 'lucide-react';

interface AttendanceViewProps {
  currentUser: User | null;
  kelasList: string[];
  onLoadStudents: (kelas: string) => Promise<Student[]>;
  onSubmit: (payload: any) => Promise<void>;
  currentTimeString: string;
}

export function AttendanceView({
  currentUser,
  kelasList,
  onLoadStudents,
  onSubmit,
  currentTimeString,
}: AttendanceViewProps) {
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Camera Snapshot State
  const [showCameraStream, setShowCameraStream] = useState(false);
  const [cameraPhoto, setCameraPhoto] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cache the onLoadStudents callback to prevent dependency re-runs during parent state updates (e.g., clock ticks)
  const onLoadStudentsRef = useRef(onLoadStudents);
  useEffect(() => {
    onLoadStudentsRef.current = onLoadStudents;
  }, [onLoadStudents]);

  const lastLoadedKelasRef = useRef('');

  // Load students when class changes
  useEffect(() => {
    if (selectedKelas) {
      if (lastLoadedKelasRef.current === selectedKelas) {
        // Class hasn't changed, prevent erasing student list and refetching
        return;
      }
      setIsLoading(true);
      onLoadStudentsRef.current(selectedKelas)
        .then((students) => {
          setStudentList(students.map((s) => ({ ...s, status: 'Hadir', keterangan: '' })));
          lastLoadedKelasRef.current = selectedKelas;
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setStudentList([]);
      lastLoadedKelasRef.current = '';
    }
  }, [selectedKelas]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // WebCam methods
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
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
          setCameraPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const setAllStatus = (status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setStudentList((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleStatusChange = (index: number, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setStudentList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status };
      return copy;
    });
  };

  const handleKeteranganChange = (index: number, val: string) => {
    setStudentList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], keterangan: val };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!selectedKelas) {
      alert('Harap pilih kelas terlebih dahulu!');
      return;
    }
    if (!selectedMapel.trim()) {
      alert('Harap isi nama mata pelajaran!');
      return;
    }

    setIsLoading(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const tanggalStr = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const waktuStr = `${hours}:${minutes}:${seconds}`;

    let countHadir = 0;
    let countSakit = 0;
    let countIzin = 0;
    let countAlpa = 0;
    const detailKetList: string[] = [];

    studentList.forEach((student) => {
      if (student.status === 'Hadir') {
        countHadir++;
      } else if (student.status === 'Sakit') {
        countSakit++;
        detailKetList.push(`Sakit: ${student.nama}${student.keterangan ? ' (' + student.keterangan + ')' : ''}`);
      } else if (student.status === 'Izin') {
        countIzin++;
        detailKetList.push(`Izin: ${student.nama}${student.keterangan ? ' (' + student.keterangan + ')' : ''}`);
      } else if (student.status === 'Alpa') {
        countAlpa++;
        detailKetList.push(`Alpa: ${student.nama}${student.keterangan ? ' (' + student.keterangan + ')' : ''}`);
      }
    });

    const keteranganSummary = detailKetList.length > 0 ? detailKetList.join('; ') : 'Semua siswa hadir (100%)';

    const payload = {
      kelas: selectedKelas,
      mapel: selectedMapel,
      guruPengampu: currentUser?.nama || 'Guru Pengampu',
      photoBase64: cameraPhoto,
      tanggal: tanggalStr,
      waktu: waktuStr,
      countHadir,
      countSakit,
      countIzin,
      countAlpa,
      keterangan: keteranganSummary,
      attendances: studentList,
    };

    try {
      await onSubmit(payload);
      // Reset form
      setSelectedKelas('');
      setSelectedMapel('');
      setStudentList([]);
      setCameraPhoto(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Presensi Kelas & Pembelajaran</h3>
          <p className="text-xs text-slate-500 mt-1">
            Pilih kelas, masukkan mata pelajaran, ambil foto suasana belajar, lalu tentukan status presensi siswa.
          </p>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pick Class */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">1. Pilih Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map((k) => (
                <option key={k} value={k}>
                  {k.startsWith('Kelas') ? k : 'Kelas ' + k}
                </option>
              ))}
            </select>
          </div>

          {/* Mapel */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">2. Mata Pelajaran</label>
            <input
              type="text"
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              placeholder="Contoh: Matematika, Bahasa Inggris..."
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Time & Guru Info */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Guru & Waktu Absen</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentUser?.nama || ''}
                readOnly
                className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50/80 text-slate-600 text-sm font-medium focus:outline-none"
              />
              <div
                className="px-3 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-mono font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                title="Jam Absensi Live"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{currentTimeString}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Camera snapshot view */}
        <div className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            3. Foto Bukti Kelas / Pembelajaran
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera</span>
            </button>
            <span className="text-xs text-slate-400 font-medium">atau</span>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer">
              <FileImage className="w-4 h-4 text-slate-500" />
              <span>Unggah Foto</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Camera preview window */}
          {showCameraStream && (
            <div className="space-y-3 max-w-md mt-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full rounded-xl bg-black aspect-video object-cover ${cameraFacingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Ambil Foto</span>
                </button>
                <button
                  type="button"
                  onClick={toggleCameraFacingMode}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  title="Ganti Kamera Depan / Belakang"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{cameraFacingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-150 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Image preview state */}
          {cameraPhoto && (
            <div className="relative inline-block mt-2">
              <div className="relative w-40 h-28 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md">
                <img src={cameraPhoto} alt="Snapshot bukti" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setCameraPhoto(null)}
                  className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center cursor-pointer shadow-md"
                  title="Hapus foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <span className="absolute -bottom-2 -right-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-[9px] font-bold shadow-sm">
                Terlampir
              </span>
            </div>
          )}
        </div>

        {/* Student attendance list roster */}
        {selectedKelas && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Memuat daftar siswa kelas {selectedKelas}...</p>
              </div>
            ) : studentList.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span>
                        Daftar Kehadiran Siswa ({selectedKelas} - {studentList.length} Siswa)
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Ubah status kehadiran masing-masing siswa di bawah.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllStatus('Hadir')}
                    className="self-start sm:self-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Set Semua Hadir</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3.5 pl-4 w-12 text-center">No</th>
                        <th className="p-3.5 w-32">NISN</th>
                        <th className="p-3.5">Nama Siswa</th>
                        <th className="p-3.5 text-center w-64">Status Kehadiran</th>
                        <th className="p-3.5 pr-4">Catatan Khusus (Izin/Sakit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentList.map((student, index) => (
                        <tr key={student.id || index} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 pl-4 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="p-3.5 font-mono text-slate-500 font-semibold">{student.nisn}</td>
                          <td className="p-3.5 font-semibold text-slate-800 text-sm">{student.nama}</td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                let labelAbbr = st.charAt(0);
                                let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

                                if (student.status === st) {
                                  if (st === 'Hadir') btnStyle = 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/10';
                                  else if (st === 'Sakit') btnStyle = 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/10';
                                  else if (st === 'Izin') btnStyle = 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10';
                                  else if (st === 'Alpa') btnStyle = 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/10';
                                }

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(index, st)}
                                    className={`w-10 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${btnStyle}`}
                                    title={st}
                                  >
                                    {labelAbbr}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3.5 pr-4">
                            <input
                              type="text"
                              value={student.keterangan || ''}
                              onChange={(e) => handleKeteranganChange(index, e.target.value)}
                              placeholder="Keterangan tambahan (misal: Surat dokter)..."
                              className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Submit row */}
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Simpan Absensi Kelas Ini</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs font-medium">Tidak ada siswa terdaftar di kelas {selectedKelas} saat ini.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
