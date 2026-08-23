/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Student, User, AppCustomization, getLocalDateString, getLocalTimeString } from '../types';
import { Camera, FileImage, Trash2, CheckCircle, Clock, CheckSquare, Sparkles, Loader2, Play, RotateCw, AlertTriangle } from 'lucide-react';
import { StudentNameBadge, getStudentColorInfo } from '../utils/studentColor';

interface AttendanceViewProps {
  currentUser: User | null;
  kelasList: string[];
  mapelList: string[];
  onLoadStudents: (kelas: string) => Promise<Student[]>;
  onSubmit: (payload: any) => Promise<void>;
  currentTimeString: string;
  customization?: AppCustomization;
}

export function AttendanceView({
  currentUser,
  kelasList,
  mapelList,
  onLoadStudents,
  onSubmit,
  currentTimeString,
  customization,
}: AttendanceViewProps) {
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeHoliday, setActiveHoliday] = useState<any>(null);
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    // Determine if today is weekend in WITA
    const tzOffset = 8 * 60; // WITA
    const now = new Date();
    const localMs = now.getTime() + (now.getTimezoneOffset() + tzOffset) * 60000;
    const localDate = new Date(localMs);
    const dayOfWeek = localDate.getUTCDay(); // 0 is Sunday, 6 is Saturday
    setIsWeekend(dayOfWeek === 0 || dayOfWeek === 6);

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

      const normK = (s: any) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetNorm = normK(selectedKelas);

      // Populate immediately from cache if available so UI responds in 0ms
      let hasCache = false;
      const cached = localStorage.getItem(`absensi_students_${selectedKelas}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStudentList(parsed.map((s) => ({ ...s, status: 'Hadir', keterangan: '' })));
            hasCache = true;
          }
        } catch (e) {}
      }

      if (!hasCache) {
        const rawMaster = localStorage.getItem('absensi_master_siswa');
        if (rawMaster) {
          try {
            const parsed: any[] = JSON.parse(rawMaster);
            const filtered = parsed
              .filter((s) => s && s.data && normK(s.data[3]) === targetNorm && (normK(s.data[5]) === 'aktif' || !s.data[5]))
              .map((s) => ({
                id: s.data[0] ? String(s.data[0]) : `S_${s.data[1]}`,
                nisn: s.data[1] ? String(s.data[1]) : '',
                nama: s.data[2] || '',
                kelas: s.data[3] || selectedKelas,
                gender: s.data[4] || 'Laki-laki',
                status: 'Hadir',
                keterangan: '',
              }));
            if (filtered.length > 0) {
              setStudentList(filtered);
              hasCache = true;
            }
          } catch (e) {}
        }
      }

      if (!hasCache) {
        setIsLoading(true);
      }

      onLoadStudentsRef.current(selectedKelas)
        .then((students) => {
          if (students && students.length > 0) {
            setStudentList(students.map((s) => ({ ...s, status: 'Hadir', keterangan: '' })));
          }
          lastLoadedKelasRef.current = selectedKelas;
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setStudentList([]);
      lastLoadedKelasRef.current = '';
      setIsLoading(false);
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
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      const maxDim = 320; // Downscale to prevent payload bloat
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
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
            const maxDim = 320; // Downscale uploaded image
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
              setCameraPhoto(canvas.toDataURL('image/jpeg', 0.5));
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

  const setAllStatus = (status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat') => {
    setStudentList((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleStatusChange = (index: number, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat') => {
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
    if (studentList.length === 0) {
      alert('Daftar siswa belum dimuat/kosong. Harap klik "Tampilkan Daftar Siswa" atau pilih kelas ulang!');
      return;
    }

    setIsLoading(true);

    const now = new Date();
    const tanggalStr = getLocalDateString(now);
    const waktuStr = getLocalTimeString(now);

    let countHadir = 0;
    let countTerlambat = 0;
    let countSakit = 0;
    let countIzin = 0;
    let countAlpa = 0;
    const detailKetList: string[] = [];

    studentList.forEach((student) => {
      if (student.status === 'Hadir') {
        countHadir++;
      } else if (student.status === 'Terlambat') {
        countHadir++;
        countTerlambat++;
        detailKetList.push(`Terlambat: ${student.nama}${student.keterangan ? ' (' + student.keterangan + ')' : ''}`);
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

    const keteranganSummary = detailKetList.length > 0 ? detailKetList.join('; ') : 'Semua siswa hadir tepat waktu (100%)';

    const payload = {
      kelas: selectedKelas,
      mapel: selectedMapel,
      guruPengampu: currentUser?.nama || 'Guru Pengampu',
      photoBase64: cameraPhoto,
      tanggal: tanggalStr,
      waktu: waktuStr,
      countHadir,
      countTerlambat,
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
            Sistem absensi guru, tendik, maupun siswa di kelas otomatis ditangguhkan selama hari libur atau akhir pekan. Selamat berlibur dan menikmati waktu istirahat!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MODE OVERRIDE ADMIN UTAMA BANNER */}
      {(activeHoliday || isWeekend) && currentUser?.role === 'Admin Utama' && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-300 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3 animate-pulse">
          <Sparkles className="w-5 h-5 text-amber-100 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold block">Mode Override Admin Utama Aktif!</span>
            <span className="font-medium opacity-90">Hari ini libur/akhir pekan, tetapi sebagai Admin Utama Anda tetap dapat menguji & menginput presensi.</span>
          </div>
        </div>
      )}

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
              {kelasList.map((k, idx) => (
                <option key={`cls-${k}-${idx}`} value={k}>
                  {k.startsWith('Kelas') ? k : 'Kelas ' + k}
                </option>
              ))}
            </select>
          </div>

          {/* Mapel */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">2. Mata Pelajaran</label>
            {mapelList && mapelList.length > 0 ? (
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none"
              >
                <option value="" disabled>-- Pilih Mata Pelajaran --</option>
                {mapelList.map((mapel) => (
                  <option key={mapel} value={mapel}>{mapel}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                placeholder="Contoh: Matematika, Bahasa Inggris..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            )}
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
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                      <span className="font-medium text-slate-500">Keterangan Tombol:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">H: Hadir</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">T: Terlambat</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">S: Sakit</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">I: Izin</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">A: Alpa</span>
                      <span className="ml-1 text-slate-300">|</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                        <span>🕌</span>
                        <span>{studentList.filter(s => getStudentColorInfo(s).isPondok).length} Santri Pondok</span>
                      </span>
                    </div>
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
                        <tr key={`st-${student.id || student.nisn || 'st'}-${index}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 pl-4 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="p-3.5 font-mono text-slate-500 font-semibold">{student.nisn}</td>
                          <td className="p-3.5 font-semibold text-slate-800 text-sm">
                            <StudentNameBadge student={student} />
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1">
                              {(['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                let labelAbbr = st.charAt(0);
                                let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

                                if (student.status === st) {
                                  if (st === 'Hadir') btnStyle = 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/10';
                                  else if (st === 'Terlambat') btnStyle = 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/10';
                                  else if (st === 'Sakit') btnStyle = 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/10';
                                  else if (st === 'Izin') btnStyle = 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10';
                                  else if (st === 'Alpa') btnStyle = 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/10';
                                }

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(index, st)}
                                    className={`w-9 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${btnStyle}`}
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
