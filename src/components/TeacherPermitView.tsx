/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, getLocalDateString } from '../types';
import { 
  CalendarRange, 
  Send, 
  Loader2, 
  UserCheck, 
  UserX, 
  Layers, 
  BookOpen, 
  Clock, 
  Calendar, 
  CheckSquare, 
  Users,
  AlertCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../api';
import { StudentNameBadge } from '../utils/studentColor';

interface TeacherPermitViewProps {
  currentUser: User | null;
  onSubmit: (payload: any) => Promise<void>;
}

export function TeacherPermitView({ currentUser, onSubmit }: TeacherPermitViewProps) {
  const [absenceStatus, setAbsenceStatus] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
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
        const match = list.find((item: any) => item.tanggal === todayStr);
        if (match) {
          setActiveHoliday(match);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // States for Admin features
  const [teachers, setTeachers] = useState<{ nip: string; nama: string; role: string }[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedTeacherNip, setSelectedTeacherNip] = useState('');
  const [selectedTeacherNama, setSelectedTeacherNama] = useState('');
  const [attendanceMode, setAttendanceMode] = useState<'izin' | 'hadir'>('izin');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  
  // Student roster state for Class attendance (side-by-side with Teacher in class)
  const [studentList, setStudentList] = useState<{ id: string; nisn: string; nama: string; kelas: string; status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'; keterangan: string }[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Custom date-time override for Admin
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  // Fetch Master Data on Mount if user is Admin
  useEffect(() => {
    if (isAdmin) {
      setIsLoadingMasters(true);
      
      // Initialize with today's date & time
      const today = new Date();
      setCustomDate(getLocalDateString(today));
      setCustomTime(today.toTimeString().split(' ')[0]);

      Promise.all([
        apiClient.getCrud('Master_Guru'),
        apiClient.getCrud('Master_Kelas')
      ]).then(([resGuru, resKelas]) => {
        // Parse Teachers
        if (resGuru.status === 'success' && resGuru.rows) {
          const headersLower = resGuru.headers.map((h) => h.toLowerCase().trim());
          const nipIdx = headersLower.indexOf('nip');
          const namaIdx = headersLower.indexOf('nama lengkap') !== -1 
            ? headersLower.indexOf('nama lengkap') 
            : headersLower.indexOf('nama');
          const statusIdx = headersLower.indexOf('status');
          const roleIdx = headersLower.indexOf('role');

          const parsed = resGuru.rows
            .map((row) => {
              const rowNip = nipIdx !== -1 ? row.data[nipIdx] : '';
              const rowNama = namaIdx !== -1 ? row.data[namaIdx] : '';
              const rowStatus = statusIdx !== -1 ? row.data[statusIdx] : 'Aktif';
              const rowRole = roleIdx !== -1 ? row.data[roleIdx] : 'Guru';
              return { nip: rowNip, nama: rowNama, status: rowStatus, role: rowRole };
            })
            .filter((t) => t.nama && t.nip && t.status.toLowerCase() === 'aktif');

          setTeachers(parsed);
        }

        // Parse Classes
        if (resKelas.status === 'success' && resKelas.rows) {
          const headersLower = resKelas.headers.map((h) => h.toLowerCase().trim());
          const nameIdx = headersLower.indexOf('nama kelas');
          const statusIdx = headersLower.indexOf('status');

          const parsed = resKelas.rows
            .map((row) => {
              const name = nameIdx !== -1 ? row.data[nameIdx] : '';
              const status = statusIdx !== -1 ? row.data[statusIdx] : 'Aktif';
              return { name, status };
            })
            .filter((c) => c.name && c.status.toLowerCase() === 'aktif')
            .map((c) => c.name);

          setClasses(parsed);
        }
      })
      .catch((err) => {
        console.error('Failed to load master lists in TeacherPermitView:', err);
      })
      .finally(() => {
        setIsLoadingMasters(false);
      });
    }
  }, [isAdmin]);

  // Load students automatically when class is selected
  useEffect(() => {
    if (isAdmin && attendanceMode === 'hadir' && selectedKelas) {
      const cached = localStorage.getItem(`absensi_students_${selectedKelas}`);
      let hasCache = false;
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
        setIsLoadingStudents(true);
      }

      apiClient.getStudents(selectedKelas)
        .then((res) => {
          if (res.status === 'success' && res.students && res.students.length > 0 && !hasCache) {
            setStudentList(res.students.map((s) => ({
              ...s,
              status: 'Hadir',
              keterangan: '',
            })));
          }
        })
        .catch((err) => {
          console.error('Failed to load student list:', err);
        })
        .finally(() => {
          setIsLoadingStudents(false);
        });
    } else {
      setStudentList([]);
    }
  }, [isAdmin, attendanceMode, selectedKelas]);

  const handleTeacherChange = (nip: string) => {
    setSelectedTeacherNip(nip);
    const found = teachers.find(t => t.nip === nip);
    if (found) {
      setSelectedTeacherNama(found.nama);
    } else {
      setSelectedTeacherNama('');
    }
  };

  const setAllStudentStatus = (status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setStudentList((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleStudentStatusChange = (index: number, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setStudentList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status };
      return copy;
    });
  };

  const handleStudentKeteranganChange = (index: number, val: string) => {
    setStudentList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], keterangan: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (isAdmin) {
      if (!selectedTeacherNip) {
        alert('Harap pilih guru terlebih dahulu!');
        return;
      }
      if (attendanceMode === 'hadir') {
        if (!selectedKelas) {
          alert('Harap pilih kelas guru mengajar!');
          return;
        }
        if (!selectedMapel.trim()) {
          alert('Harap isi mata pelajaran!');
          return;
        }
      } else {
        if (!absenceStatus.trim()) {
          alert('Harap pilih status ketidakhadiran!');
          return;
        }
        if (!absenceReason.trim()) {
          alert('Harap isi detail alasan ketidakhadiran guru!');
          return;
        }
      }
    } else {
      if (!absenceStatus.trim() || !absenceReason.trim()) {
        alert('Harap isi semua kolom formulir!');
        return;
      }
    }

    setIsLoading(true);

    const now = new Date();
    const finalDate = (isAdmin && customDate) ? customDate : getLocalDateString(now);
    const finalTime = (isAdmin && customTime) ? customTime : now.toTimeString().split(' ')[0];

    const finalNip = isAdmin ? selectedTeacherNip : (currentUser?.nip || 'Belum diisi');
    const finalNama = isAdmin ? selectedTeacherNama : (currentUser?.nama || 'Guru');
    const finalStatus = attendanceMode === 'hadir' ? 'Hadir Mengajar' : absenceStatus;
    
    const finalAlasan = attendanceMode === 'hadir'
      ? `Hadir mengajar Kelas ${selectedKelas} - Mapel ${selectedMapel}.${absenceReason.trim() ? ' Catatan: ' + absenceReason : ''}`
      : absenceReason;

    const payload = {
      nip: finalNip,
      namaGuru: finalNama,
      status: finalStatus,
      alasan: finalAlasan,
      tanggal: finalDate,
      waktu: finalTime,
    };

    try {
      // 1. Submit Teacher Log
      await onSubmit(payload);

      // 2. Submit Student Attendance Log if we are in class (hadir)
      if (isAdmin && attendanceMode === 'hadir' && studentList.length > 0) {
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

        const studentPayload = {
          kelas: selectedKelas,
          mapel: selectedMapel.trim(),
          guruPengampu: finalNama,
          photoBase64: '', // Admin overrides do not require photographic proof
          tanggal: finalDate,
          waktu: finalTime,
          countHadir,
          countSakit,
          countIzin,
          countAlpa,
          keterangan: keteranganSummary,
          attendances: studentList,
        };

        await apiClient.submitAttendance(studentPayload);
      }

      // Reset local state fields
      setAbsenceStatus('');
      setAbsenceReason('');
      setSelectedKelas('');
      setSelectedMapel('');
      setStudentList([]);
      if (isAdmin) {
        setSelectedTeacherNip('');
        setSelectedTeacherNama('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isBlocked = (activeHoliday || isWeekend) && currentUser?.role !== 'Admin Utama';

  if (isBlocked) {
    return (
      <div className="bg-red-50 border border-red-200/80 rounded-3xl p-8 text-center max-w-xl mx-auto my-8 space-y-4 shadow-sm animate-scale-up">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-8 h-8" />
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
            Formulir permohonan izin/sakit guru otomatis ditangguhkan selama hari libur atau akhir pekan. Selamat menikmati waktu istirahat bersama keluarga!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MODE OVERRIDE ADMIN UTAMA BANNER */}
      {(activeHoliday || isWeekend) && currentUser?.role === 'Admin Utama' && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-300 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3 animate-pulse max-w-2xl mx-auto">
          <AlertTriangle className="w-5 h-5 text-amber-100 flex-shrink-0" />
          <div className="text-xs text-left">
            <span className="font-extrabold block">Mode Override Admin Utama Aktif!</span>
            <span className="font-medium opacity-90">Hari ini libur/akhir pekan, tetapi sebagai Admin Utama Anda tetap dapat menginput/mengajukan surat izin guru.</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarRange className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
            <span>{isAdmin ? 'Presensi & Surat Izin Guru (Admin)' : 'Form Izin & Sakit Guru'}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin 
              ? 'Administrator Utama dapat mengabsenkan guru yang izin/sakit, maupun merekam kehadiran guru yang mengajar di kelas sekaligus mengabsenkan siswanya.'
              : 'Gunakan formulir ini untuk mengirimkan surat pemberitahuan tidak hadir mengajar kepada kepala sekolah secara digital.'}
          </p>
        </div>

        {/* Attendance Mode Selector for Admin */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAttendanceMode('izin');
                setAbsenceStatus('');
                setAbsenceReason('');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                attendanceMode === 'izin'
                  ? 'bg-white text-slate-800 shadow-md font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserX className={`w-4 h-4 ${attendanceMode === 'izin' ? 'text-rose-500' : 'text-slate-400'}`} />
              <span>Guru Izin / Sakit / Dinas</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAttendanceMode('hadir');
                setAbsenceStatus('Hadir Mengajar');
                setAbsenceReason('');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                attendanceMode === 'hadir'
                  ? 'bg-white text-slate-800 shadow-md font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className={`w-4 h-4 ${attendanceMode === 'hadir' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Guru di Kelas (Hadir)</span>
            </button>
          </div>
        )}

        {isLoadingMasters ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Memuat data guru & kelas dari database...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. SELECT TEACHER (IF ADMIN) */}
            {isAdmin ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Pilih Guru Pengajar</label>
                <select
                  value={selectedTeacherNip}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t, idx) => (
                    <option key={`t-${t.nip || t.nama || 'nip'}-${idx}`} value={t.nip}>
                      {t.nama} (NIP: {t.nip})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nama Guru</label>
                <input
                  type="text"
                  value={currentUser?.nama || ''}
                  readOnly
                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50/80 text-slate-600 text-sm font-semibold focus:outline-none"
                />
              </div>
            )}

            {/* 2. ADMIN DATE/TIME OVERRIDE */}
            {isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tanggal Presensi</span>
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Waktu Presensi</span>
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            {/* 3. CONDITIONAL FORM BASED ON ATTENDANCE MODE */}
            {attendanceMode === 'izin' ? (
              <>
                {/* IZIN / SAKIT FIELDS */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Alasan Ketidakhadiran</label>
                  <input
                    type="text"
                    value={absenceStatus}
                    onChange={(e) => setAbsenceStatus(e.target.value)}
                    required
                    placeholder="Contoh: Sakit, Izin, Dinas Luar, Cuti, dll."
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Detail Keterangan Lengkap</label>
                  <textarea
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    rows={4}
                    required
                    placeholder="Jelaskan detail alasan ketidakhadiran (Contoh: Mengikuti rapat dinas luar, menderita flu dan demam perlu istirahat)..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  ></textarea>
                </div>
              </>
            ) : (
              <>
                {/* GURU DI KELAS (HADIR MENGAJAR) FIELDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mengajar di Kelas</span>
                    </label>
                    <select
                      value={selectedKelas}
                      onChange={(e) => setSelectedKelas(e.target.value)}
                      required
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white font-semibold text-slate-700"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((cls, idx) => (
                        <option key={`cls-${cls}-${idx}`} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mata Pelajaran (Manual)</span>
                    </label>
                    <input
                      type="text"
                      value={selectedMapel}
                      onChange={(e) => setSelectedMapel(e.target.value)}
                      required
                      placeholder="Isi nama mapel (misal: Bahasa Indonesia)"
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {/* 4. CONDITIONAL STUDENT ATTENDANCE SECTION */}
                {selectedKelas && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    {isLoadingStudents ? (
                      <div className="p-8 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        <span className="text-xs text-slate-500 font-semibold">Memuat daftar siswa kelas {selectedKelas}...</span>
                      </div>
                    ) : studentList.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-blue-600" />
                              <span>Daftar Presensi Siswa ({selectedKelas})</span>
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Berikan status kehadiran siswa kelas ini.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAllStudentStatus('Hadir')}
                            className="self-start sm:self-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Set Semua Hadir</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white max-h-72 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                              <tr>
                                <th className="p-3 pl-4 w-12 text-center bg-slate-50">No</th>
                                <th className="p-3 bg-slate-50">Nama Siswa</th>
                                <th className="p-3 text-center w-44 bg-slate-50">Status</th>
                                <th className="p-3 pr-4 bg-slate-50">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {studentList.map((student, index) => (
                                <tr key={`st-${student.id || student.nisn || 'st'}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 pl-4 text-center text-slate-400 font-bold">{index + 1}</td>
                                  <td className="p-3 font-semibold text-slate-700 text-xs">
                                    <StudentNameBadge 
                                      student={student} 
                                      nameClassName="text-xs" 
                                      subText={<div className="text-[10px] text-slate-400 font-mono font-normal">NISN: {student.nisn || '-'}</div>} 
                                    />
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-center gap-1">
                                      {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => {
                                        let labelAbbr = st.charAt(0);
                                        let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

                                        if (student.status === st) {
                                          if (st === 'Hadir') btnStyle = 'bg-emerald-600 text-white font-extrabold shadow-sm';
                                          else if (st === 'Sakit') btnStyle = 'bg-amber-500 text-white font-extrabold shadow-sm';
                                          else if (st === 'Izin') btnStyle = 'bg-blue-600 text-white font-extrabold shadow-sm';
                                          else if (st === 'Alpa') btnStyle = 'bg-rose-600 text-white font-extrabold shadow-sm';
                                        }

                                        return (
                                          <button
                                            key={st}
                                            type="button"
                                            onClick={() => handleStudentStatusChange(index, st)}
                                            className={`w-8 h-7 rounded-lg text-[10px] font-black transition-all cursor-pointer ${btnStyle}`}
                                            title={st}
                                          >
                                            {labelAbbr}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="p-3 pr-4">
                                    <input
                                      type="text"
                                      value={student.keterangan || ''}
                                      onChange={(e) => handleStudentKeteranganChange(index, e.target.value)}
                                      placeholder="Catatan..."
                                      className="w-full p-1.5 rounded-lg border border-slate-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">Tidak ada siswa ditemukan</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">Pastikan Anda telah mengisi data master siswa untuk kelas {selectedKelas}.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Catatan Tambahan Kegiatan Kelas <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    rows={3}
                    placeholder="Masukkan catatan khusus atau materi yang sedang diajarkan di kelas (Misal: Melaksanakan kuis bab 3, pembelajaran luar kelas)..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  ></textarea>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>
                {isAdmin 
                  ? (attendanceMode === 'hadir' ? 'Kirim Absensi Guru & Siswa Kelas' : 'Kirim Log Izin Guru')
                  : 'Kirim Surat Permohonan'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
