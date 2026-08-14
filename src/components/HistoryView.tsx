/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AttendanceRecord, TeacherAbsenceRecord, User, AppCustomization, getLocalDateString, KioskScanRecord } from '../types';
import {
  Calendar,
  Users,
  Search,
  PenSquare,
  FileSpreadsheet,
  FolderOpen,
  Filter,
  Loader2,
  Lock,
  RotateCcw,
  Download,
  FileText,
  TrendingUp,
  BookOpen,
  Layers,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  ExternalLink,
  ScanLine,
  CheckCheck,
} from 'lucide-react';
import { apiClient } from '../api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoryViewProps {
  currentUser: User | null;
  kelasList: string[];
  historyList: AttendanceRecord[];
  teacherHistoryList: TeacherAbsenceRecord[];
  onFilterHistory: (tanggal: string, kelas: string) => Promise<void>;
  onFilterTeacher: (tanggal: string) => Promise<void>;
  onUpdateRecord: (rowIndex: string | number, newStatus: string, newKeterangan: string) => Promise<void>;
  onDeleteRecord: (rowIndex: string | number) => Promise<void>;
  onUpdateTeacherRecord: (rowIndex: string | number, status: string, alasan: string) => Promise<void>;
  onDeleteTeacherRecord: (rowIndex: string | number) => Promise<void>;
  customization?: AppCustomization;
}

export function HistoryView({
  currentUser,
  kelasList,
  historyList,
  teacherHistoryList,
  onFilterHistory,
  onFilterTeacher,
  onUpdateRecord,
  onDeleteRecord,
  onUpdateTeacherRecord,
  onDeleteTeacherRecord,
  customization,
}: HistoryViewProps) {
  const isFullAccess = currentUser?.role === 'Admin' || String(currentUser?.role || '').toLowerCase().includes('admin') || Boolean(currentUser?.username?.toLowerCase().includes('admin'));

  const [subTab, setSubTab] = useState<'siswa' | 'kiosk-siswa' | 'guru' | 'tendik-absen' | 'tendik-izin' | 'rekap-pdf'>(
    currentUser?.role === 'Tendik' ? 'tendik-absen' : 'siswa'
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filter States - Siswa (Log Kelas)
  const [filterSiswaTanggal, setFilterSiswaTanggal] = useState('');
  const [filterSiswaKelas, setFilterSiswaKelas] = useState('');
  const [isLoadingSiswa, setIsLoadingSiswa] = useState(false);

  // Filter States - Kiosk Presensi Masuk Siswa
  const [filterKioskTanggal, setFilterKioskTanggal] = useState(getLocalDateString());
  const [filterKioskKelas, setFilterKioskKelas] = useState('');
  const [searchKioskNama, setSearchKioskNama] = useState('');
  const [kioskHistory, setKioskHistory] = useState<KioskScanRecord[]>([]);
  const [isLoadingKiosk, setIsLoadingKiosk] = useState(false);

  // Filter States - Guru
  const [filterGuruTanggal, setFilterGuruTanggal] = useState('');
  const [isLoadingGuru, setIsLoadingGuru] = useState(false);

  // Filter States - Tendik
  const [filterTendikTanggal, setFilterTendikTanggal] = useState('');
  const [tendikAbsenHistory, setTendikAbsenHistory] = useState<any[]>(() => {
    try {
      if (!apiClient.isDemoMode()) {
        const saved = localStorage.getItem('absensi_history_tendik_absen');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return parsed.filter((r: any) => r.namaTendik !== 'Bambang Suryono, S.Kom.');
      }
      const saved = localStorage.getItem('absensi_history_tendik_absen');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [tendikIzinHistory, setTendikIzinHistory] = useState<any[]>(() => {
    try {
      if (!apiClient.isDemoMode()) {
        const saved = localStorage.getItem('absensi_history_tendik_izin');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return parsed.filter((r: any) => r.namaTendik !== 'Bambang Suryono, S.Kom.');
      }
      const saved = localStorage.getItem('absensi_history_tendik_izin');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingTendik, setIsLoadingTendik] = useState(false);

  // Edit Modal States - Siswa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AttendanceRecord | null>(null);
  const [newKeterangan, setNewKeterangan] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit Modal States - Guru
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editingTeacherItem, setEditingTeacherItem] = useState<TeacherAbsenceRecord | null>(null);
  const [newTeacherStatus, setNewTeacherStatus] = useState('');
  const [newTeacherAlasan, setNewTeacherAlasan] = useState('');
  const [isUpdatingTeacher, setIsUpdatingTeacher] = useState(false);

  // Delete Confirm Modal States
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingRowIndex, setDeletingRowIndex] = useState<string | number | null>(null);
  const [deletingRecordType, setDeletingRecordType] = useState<'siswa' | 'kiosk-siswa' | 'guru' | 'tendik-absen' | 'tendik-izin' | null>(null);
  const [deletingKioskItem, setDeletingKioskItem] = useState<KioskScanRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF Recap States
  const [teachers, setTeachers] = useState<{ nip: string; nama: string; role: string }[]>([]);
  const [mapels, setMapels] = useState<string[]>([]);
  const [selectedGuru, setSelectedGuru] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [rekapPeriode, setRekapPeriode] = useState<'minggu' | 'bulan' | 'kustom'>('minggu');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState('');
  const [allHistory, setAllHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingAllHistory, setIsLoadingAllHistory] = useState(false);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  // Initialize default date range (7 days ago to today)
  useEffect(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6);
    setTanggalMulai(getLocalDateString(lastWeek));
    setTanggalAkhir(todayStr);
  }, []);

  // Fetch Master lists and full history when opening PDF tab
  useEffect(() => {
    if (subTab === 'rekap-pdf') {
      setIsLoadingMasters(true);
      setIsLoadingAllHistory(true);
      
      Promise.all([
        apiClient.getCrud('Master_Guru'),
        apiClient.getCrud('Master_Mapel'),
        apiClient.getAttendanceHistory('', '')
      ])
        .then(([resGuru, resMapel, resHistory]) => {
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

          // Parse Mapels
          const mapelSet = new Set<string>();
          if (resMapel.status === 'success' && resMapel.rows) {
            const headersLower = resMapel.headers.map((h) => h.toLowerCase().trim());
            const nameIdx = headersLower.indexOf('nama mata pelajaran') !== -1
              ? headersLower.indexOf('nama mata pelajaran')
              : headersLower.indexOf('nama pelajaran') !== -1
              ? headersLower.indexOf('nama pelajaran')
              : headersLower.indexOf('mata pelajaran') !== -1
              ? headersLower.indexOf('mata pelajaran')
              : headersLower.indexOf('nama') !== -1
              ? headersLower.indexOf('nama')
              : -1;

            if (nameIdx !== -1) {
              resMapel.rows.forEach((row) => {
                if (row.data[nameIdx]) mapelSet.add(row.data[nameIdx]);
              });
            }
          }

          // Dynamic additions from history
          if (resHistory.status === 'success' && resHistory.history) {
            setAllHistory(resHistory.history);
            resHistory.history.forEach((h) => {
              if (h.mapel) mapelSet.add(h.mapel);
            });
          }

          setMapels(Array.from(mapelSet).filter(Boolean));
        })
        .catch((err) => {
          console.error('Failed to load master lists in PDF Recap:', err);
        })
        .finally(() => {
          setIsLoadingMasters(false);
          setIsLoadingAllHistory(false);
        });
    }
  }, [subTab]);

  const handleApplySiswaFilter = async () => {
    setIsLoadingSiswa(true);
    try {
      await onFilterHistory(filterSiswaTanggal, filterSiswaKelas);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSiswa(false);
    }
  };

  const handleApplyGuruFilter = async () => {
    setIsLoadingGuru(true);
    try {
      await onFilterTeacher(filterGuruTanggal);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGuru(false);
    }
  };

  const openEditModal = (item: AttendanceRecord) => {
    setEditingItem(item);
    setNewKeterangan(item.keterangan);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsUpdating(true);
    try {
      await onUpdateRecord(editingItem.rowIndex, '', newKeterangan);
      setShowEditModal(false);
      // Reload lists
      await onFilterHistory(filterSiswaTanggal, filterSiswaKelas);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditTeacherModal = (item: TeacherAbsenceRecord) => {
    setEditingTeacherItem(item);
    setNewTeacherStatus(item.status);
    setNewTeacherAlasan(item.alasan);
    setShowEditTeacherModal(true);
  };

  const handleSaveTeacherEdit = async () => {
    if (!editingTeacherItem) return;
    setIsUpdatingTeacher(true);
    try {
      await onUpdateTeacherRecord(editingTeacherItem.rowIndex, newTeacherStatus, newTeacherAlasan);
      setShowEditTeacherModal(false);
      // Reload lists
      await onFilterTeacher(filterGuruTanggal);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTeacher(false);
    }
  };

  const handleApplyTendikFilter = async () => {
    // Populate immediately from local cache if present
    const cachedAbsen = localStorage.getItem('absensi_history_tendik_absen');
    const cachedIzin = localStorage.getItem('absensi_history_tendik_izin');
    let hasCache = false;
    if (cachedAbsen) {
      try {
        let parsed = JSON.parse(cachedAbsen);
        if (filterTendikTanggal) parsed = parsed.filter((h: any) => h.tanggal === filterTendikTanggal);
        setTendikAbsenHistory(parsed);
        hasCache = true;
      } catch (e) {}
    }
    if (cachedIzin) {
      try {
        let parsed = JSON.parse(cachedIzin);
        if (filterTendikTanggal) parsed = parsed.filter((h: any) => h.tanggal === filterTendikTanggal);
        setTendikIzinHistory(parsed);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache) {
      setIsLoadingTendik(true);
    }

    try {
      const [resAbsen, resIzin] = await Promise.all([
        apiClient.getTendikAttendanceHistory(filterTendikTanggal),
        apiClient.getTendikPermitHistory(filterTendikTanggal)
      ]);
      if (resAbsen.status === 'success' && Array.isArray(resAbsen.history)) {
        setTendikAbsenHistory(resAbsen.history);
      }
      if (resIzin.status === 'success' && Array.isArray(resIzin.history)) {
        setTendikIzinHistory(resIzin.history);
      }
    } catch (err) {
      console.error('Failed to load Tendik history:', err);
    } finally {
      setIsLoadingTendik(false);
    }
  };

  const handleApplyKioskFilter = async () => {
    setIsLoadingKiosk(true);
    try {
      const res = await apiClient.getKioskAttendanceHistory(filterKioskTanggal, filterKioskKelas);
      if (res.status === 'success' && Array.isArray(res.history)) {
        setKioskHistory(res.history);
      }
    } catch (err) {
      console.error('Failed to load Kiosk history:', err);
    } finally {
      setIsLoadingKiosk(false);
    }
  };

  useEffect(() => {
    if (subTab === 'kiosk-siswa') {
      handleApplyKioskFilter();
    }
    
    const handleFocus = () => {
      if (subTab === 'kiosk-siswa') {
        handleApplyKioskFilter();
      }
    };
    window.addEventListener('focus', handleFocus);
    
    // Auto refresh every 30 seconds
    const intervalId = setInterval(() => {
      if (subTab === 'kiosk-siswa') {
        handleApplyKioskFilter();
      }
    }, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [subTab, filterKioskTanggal, filterKioskKelas]);

  useEffect(() => {
    if (subTab === 'tendik-absen' || subTab === 'tendik-izin') {
      handleApplyTendikFilter();
    }
  }, [subTab, filterTendikTanggal]);

  const openDeleteConfirmModal = (
    rowIndex: string | number,
    type: 'siswa' | 'kiosk-siswa' | 'guru' | 'tendik-absen' | 'tendik-izin',
    kioskItem?: KioskScanRecord
  ) => {
    setDeletingRowIndex(rowIndex);
    setDeletingRecordType(type);
    setDeletingKioskItem(kioskItem || null);
    setShowDeleteConfirmModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!deletingRowIndex || !deletingRecordType) return;
    setIsDeleting(true);
    try {
      if (deletingRecordType === 'siswa') {
        await onDeleteRecord(deletingRowIndex);
        await onFilterHistory(filterSiswaTanggal, filterSiswaKelas);
      } else if (deletingRecordType === 'kiosk-siswa') {
        // Optimistic instant removal from UI
        setKioskHistory((prev) =>
          prev.filter((k) => {
            if (k.rowIndex && String(k.rowIndex) === String(deletingRowIndex)) return false;
            if (deletingKioskItem && k.timestamp === deletingKioskItem.timestamp && k.nisn === deletingKioskItem.nisn) return false;
            return true;
          })
        );
        await apiClient.deleteKioskAttendanceRecord(
          deletingRowIndex,
          deletingKioskItem?.timestamp,
          deletingKioskItem?.nisn
        );
        await handleApplyKioskFilter();
      } else if (deletingRecordType === 'guru') {
        await onDeleteTeacherRecord(deletingRowIndex);
        await onFilterTeacher(filterGuruTanggal);
      } else if (deletingRecordType === 'tendik-absen') {
        await apiClient.deleteTendikAttendanceRecord(deletingRowIndex);
        await handleApplyTendikFilter();
      } else if (deletingRecordType === 'tendik-izin') {
        await apiClient.deleteTendikPermitRecord(deletingRowIndex);
        await handleApplyTendikFilter();
      }
      setShowDeleteConfirmModal(false);
      setDeletingKioskItem(null);
    } catch (e) {
      console.error('Delete execution failed:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const parseKioskDateTime = (item: KioskScanRecord) => {
    let tanggal = item.tanggal || '';
    let waktu = item.waktu || '';
    if (!tanggal || !waktu) {
      const raw = item.timestamp ? String(item.timestamp).trim() : '';
      if (raw) {
        const parsedDate = new Date(raw);
        if (!isNaN(parsedDate.getTime()) && raw.match(/[a-zA-Z]/) && raw.includes(':')) {
          const y = parsedDate.getFullYear();
          const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const d = String(parsedDate.getDate()).padStart(2, '0');
          tanggal = `${y}-${m}-${d}`;
          const h = String(parsedDate.getHours()).padStart(2, '0');
          const min = String(parsedDate.getMinutes()).padStart(2, '0');
          const s = String(parsedDate.getSeconds()).padStart(2, '0');
          waktu = `${h}:${min}:${s}`;
        } else if (raw.includes('T')) {
          const parts = raw.split('T');
          tanggal = parts[0] || '';
          waktu = (parts[1] || '').split('.')[0] || '';
        } else if (raw.includes(' ')) {
          const parts = raw.split(' ');
          if (parts.length >= 2 && parts[1].includes(':')) {
            tanggal = parts[0] || '';
            waktu = parts[1] || '';
          } else {
            tanggal = raw;
            waktu = '-';
          }
        } else {
          tanggal = raw;
          waktu = '-';
        }
      }
    }
    return {
      tanggal: tanggal || '-',
      waktu: waktu || '-',
    };
  };

  const handleDownloadKioskPDF = () => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [37, 99, 235]; // Royal Blue

    // Header Title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text((customization?.appName || 'E-ABSENSI').toUpperCase(), 15, 10);

    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI PRESENSI MASUK SISWA (GERBANG/KIOSK)', 15, 28);

    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Tanggal: ${filterKioskTanggal || 'Semua Tanggal'} | Kelas: ${filterKioskKelas || 'Semua Kelas'}`, 15, 35);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 15, 40);

    // Summary counts
    const totalScan = filteredKioskHistory.length;
    const totalHadir = filteredKioskHistory.filter(h => h.status === 'Hadir').length;
    const totalTerlambat = filteredKioskHistory.filter(h => h.status === 'Terlambat').length;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 45, 180, 12, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Masuk: ${totalScan} Siswa  |  Tepat Waktu (Hadir): ${totalHadir}  |  Terlambat: ${totalTerlambat}`, 20, 52.5);

    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'NISN', 'Nama Siswa', 'Kelas', 'Status', 'Keterlambatan']];
    const tableBody = filteredKioskHistory.map((item, idx) => {
      const dt = parseKioskDateTime(item);
      return [
        idx + 1,
        dt.tanggal,
        dt.waktu,
        item.nisn || '-',
        item.nama || '-',
        item.kelas || '-',
        item.status || 'Hadir',
        item.keterlambatan || (item.menitTerlambat ? `${item.menitTerlambat} menit` : '-')
      ];
    });

    autoTable(doc, {
      startY: 62,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 26, halign: 'center' }
      },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak' }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    // Signature Block
    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Mengetahui,', 140, currentY);
    doc.text('Kepala Sekolah,', 140, currentY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.text(`( ${customization?.kepalaSekolahNama || '______________________'} )`, 140, currentY + 30);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '..................................'}`, 140, currentY + 35);

    doc.save(`Rekap_Presensi_Masuk_${filterKioskTanggal || 'Semua'}.pdf`);
  };

  // Filtered Kiosk History
  const filteredKioskHistory = kioskHistory.filter((item) => {
    if (searchKioskNama.trim()) {
      const q = searchKioskNama.toLowerCase().trim();
      const matchN = (item.nama || '').toLowerCase().includes(q);
      const matchId = (item.nisn || '').toLowerCase().includes(q);
      const matchK = (item.kelas || '').toLowerCase().includes(q);
      if (!matchN && !matchId && !matchK) return false;
    }
    return true;
  });

  // Helper selectors
  const handlePeriodChange = (val: 'minggu' | 'bulan' | 'kustom') => {
    setRekapPeriode(val);
    const today = new Date();
    const todayStr = getLocalDateString(today);
    
    if (val === 'minggu') {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 6);
      setTanggalMulai(getLocalDateString(lastWeek));
      setTanggalAkhir(todayStr);
    } else if (val === 'bulan') {
      const lastMonth = new Date();
      lastMonth.setDate(today.getDate() - 29);
      setTanggalMulai(getLocalDateString(lastMonth));
      setTanggalAkhir(todayStr);
    }
  };

  const matchTeacher = (recordGuru: string, targetNama: string) => {
    if (!recordGuru || !targetNama) return false;
    return recordGuru.toLowerCase().trim() === targetNama.toLowerCase().trim();
  };

  const matchMapel = (recordMapel: string, targetMapel: string) => {
    if (!recordMapel || !targetMapel) return false;
    return recordMapel.toLowerCase().trim() === targetMapel.toLowerCase().trim();
  };

  // Generate grouped processed attendance logs
  const getProcessedRecap = () => {
    if (!selectedGuru || !selectedMapel) return [];

    const start = new Date(tanggalMulai);
    const end = new Date(tanggalAkhir);
    
    // Filter history records
    const filtered = allHistory.filter((record) => {
      const matchG = matchTeacher(record.guru, selectedGuru);
      const matchM = matchMapel(record.mapel, selectedMapel);
      
      const recordDate = new Date(record.tanggal);
      const matchDate = recordDate >= start && recordDate <= end;

      return matchG && matchM && matchDate;
    });

    // Group by Kelas
    const groups: Record<string, AttendanceRecord[]> = {};
    filtered.forEach((record) => {
      if (!groups[record.kelas]) {
        groups[record.kelas] = [];
      }
      groups[record.kelas].push(record);
    });

    // Format groups into a structured list
    return Object.entries(groups).map(([kelasName, records]) => {
      // Sort records by date & time ascending
      const sortedRecords = [...records].sort((a, b) => {
        const dateDiff = a.tanggal.localeCompare(b.tanggal);
        if (dateDiff !== 0) return dateDiff;
        return a.waktu.localeCompare(b.waktu);
      });

      // Calculate totals
      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpa = 0;

      sortedRecords.forEach((r) => {
        totalHadir += Number(r.hadir) || 0;
        totalSakit += Number(r.sakit) || 0;
        totalIzin += Number(r.izin) || 0;
        totalAlpa += Number(r.alpa) || 0;
      });

      const totalStudents = totalHadir + totalSakit + totalIzin + totalAlpa;
      const avgPresenceRate = totalStudents > 0 ? (totalHadir / totalStudents) * 100 : 0;

      return {
        kelas: kelasName,
        records: sortedRecords,
        totalPertemuan: sortedRecords.length,
        totals: {
          hadir: totalHadir,
          sakit: totalSakit,
          izin: totalIzin,
          alpa: totalAlpa,
          studentsCount: totalStudents
        },
        avgPresenceRate
      };
    });
  };

  // Download PDF Report
  const handleDownloadPDF = () => {
    const data = getProcessedRecap();
    if (data.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Elegant Color Scheme
    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800 (#1e293b)
    const secondaryColor: [number, number, number] = [59, 130, 246]; // Blue 600

    // Page 1: Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F'); // Top accent bar

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI KEHADIRAN GURU & SISWA', 105, 30, { align: 'center' });
    
    // Subtitle / School Name
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Sistem Informasi E-Absensi Sekolah Digital', 105, 36, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(1);
    doc.line(15, 41, 195, 41);

    // Metadata Grid (Teacher and Subject Info)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI LAPORAN:', 15, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Nama Guru Pengampu :  ${selectedGuru}`, 15, 54);
    doc.text(`NIP Guru                      :  ${teachers.find(t => t.nama === selectedGuru)?.nip || '-'}`, 15, 60);
    doc.text(`Mata Pelajaran            :  ${selectedMapel}`, 15, 66);
    doc.text(`Periode Laporan          :  ${tanggalMulai} s.d. ${tanggalAkhir}`, 15, 72);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 78);

    doc.line(15, 83, 195, 83);

    let currentY = 90;

    // Loop through each class's recap
    data.forEach((classRecap, index) => {
      // Check space remaining. If too low, add page.
      if (currentY > 230) {
        doc.addPage();
        // Accent bar on next page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 10, 'F');
        currentY = 25;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${index + 1}. REKAP KELAS: ${classRecap.kelas}`, 15, currentY);

      // Simple Subtext with totals
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Total Pertemuan: ${classRecap.totalPertemuan} Sesi  |  Rata-rata Kehadiran Siswa: ${classRecap.avgPresenceRate.toFixed(1)}% (Hadir: ${classRecap.totals.hadir}, Sakit: ${classRecap.totals.sakit}, Izin: ${classRecap.totals.izin}, Alpa: ${classRecap.totals.alpa})`,
        15,
        currentY + 5
      );

      // Render Sesi logs table
      const tableHeaders = [['No', 'Tanggal', 'Waktu', 'Kehadiran Guru', 'Siswa Hadir', 'Siswa Sakit', 'Siswa Izin', 'Siswa Alpa', 'Catatan / Keterangan Sesi']];
      const tableBody = classRecap.records.map((r, rIdx) => [
        rIdx + 1,
        r.tanggal,
        r.waktu.substring(0, 5),
        'Hadir Mengajar',
        r.hadir || 0,
        r.sakit || 0,
        r.izin || 0,
        r.alpa || 0,
        r.keterangan || '-'
      ]);

      autoTable(doc, {
        startY: currentY + 8,
        head: tableHeaders,
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 'auto' }
        },
        margin: { left: 15, right: 15 },
        styles: { overflow: 'linebreak' }
      });

      // Update currentY based on table finalY
      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    // Add Indonesian-style signature block
    if (currentY > 230) {
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 10, 'F');
      currentY = 25;
    } else {
      currentY += 5;
    }

    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Mengetahui,', 20, currentY);
    doc.text('Kepala Sekolah,', 20, currentY + 5);
    
    doc.text('Guru Pengampu,', 140, currentY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.text(`( ${customization?.kepalaSekolahNama || '______________________'} )`, 20, currentY + 30);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '..................................'}`, 20, currentY + 35);

    doc.setFont('Helvetica', 'bold');
    doc.text(`( ${selectedGuru} )`, 140, currentY + 30);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIP. ${teachers.find(t => t.nama === selectedGuru)?.nip || '..................................'}`, 140, currentY + 35);

    // Save report
    const sanitizedGuru = selectedGuru.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedMapel = selectedMapel.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Rekap_Presensi_${sanitizedGuru}_${sanitizedMapel}_${tanggalMulai}_to_${tanggalAkhir}.pdf`);
  };

  // Download Teacher Permits PDF Report
  const handleDownloadTeacherPDF = () => {
    if (teacherHistoryList.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800

    // Page 1: Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F'); // Top accent bar

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI IZIN & KETIDAKHADIRAN GURU', 105, 30, { align: 'center' });
    
    // Subtitle / School Name
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Sistem Informasi E-Absensi Sekolah Digital', 105, 36, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(1);
    doc.line(15, 41, 195, 41);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Tanggal Rekap             :  ${filterGuruTanggal ? new Date(filterGuruTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Semua Tanggal'}`, 15, 54);
    doc.text(`Total Guru Izin/Sakit   :  ${teacherHistoryList.length} Orang`, 15, 60);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 66);

    doc.line(15, 71, 195, 71);

    let currentY = 78;

    // Render Teacher History logs table
    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'NIP Guru', 'Nama Guru', 'Status / Keterangan', 'Alasan / Detail Izin']];
    const tableBody = teacherHistoryList.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.waktu ? item.waktu.substring(0, 5) : '-',
      item.nip || '-',
      item.namaGuru,
      item.status,
      item.alasan || '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 40 },
        5: { cellWidth: 32 },
        6: { cellWidth: 'auto' }
      },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak' }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Signature Block
    if (currentY > 230) {
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 10, 'F');
      currentY = 25;
    }

    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Mengetahui,', 140, currentY);
    doc.text('Kepala Sekolah,', 140, currentY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.text(`( ${customization?.kepalaSekolahNama || '______________________'} )`, 140, currentY + 30);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '..................................'}`, 140, currentY + 35);

    // Save report
    doc.save(`Rekap_Izin_Guru_${filterGuruTanggal || 'Semua'}.pdf`);
  };

  // Download Tendik Presence PDF Report
  const handleDownloadTendikAbsenPDF = () => {
    if (tendikAbsenHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F'); // Top accent bar

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI PRESENSI HADIR TENDIK', 105, 30, { align: 'center' });
    
    // Subtitle / School Name
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Sistem Informasi E-Absensi Sekolah Digital', 105, 36, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(1);
    doc.line(15, 41, 195, 41);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Tanggal Rekap             :  ${filterTendikTanggal ? new Date(filterTendikTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Semua Tanggal'}`, 15, 54);
    doc.text(`Total Tendik Hadir       :  ${tendikAbsenHistory.length} Orang`, 15, 60);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 66);

    doc.line(15, 71, 195, 71);

    let currentY = 78;

    // Table
    const tableHeaders = [['No', 'Tanggal', 'Waktu Presensi', 'NIP Tendik', 'Nama Lengkap', 'Status Kehadiran']];
    const tableBody = tendikAbsenHistory.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.waktu ? item.waktu.substring(0, 5) : '-',
      item.nip || '-',
      item.namaTendik,
      'Hadir'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 35, halign: 'center' }
      },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak' }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Signature Block
    if (currentY > 230) {
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 10, 'F');
      currentY = 25;
    }

    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Mengetahui,', 140, currentY);
    doc.text('Kepala Sekolah,', 140, currentY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.text(`( ${customization?.kepalaSekolahNama || '______________________'} )`, 140, currentY + 30);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '..................................'}`, 140, currentY + 35);

    doc.save(`Rekap_Presensi_Hadir_Tendik_${filterTendikTanggal || 'Semua'}.pdf`);
  };

  // Download Tendik Permits PDF Report
  const handleDownloadTendikIzinPDF = () => {
    if (tendikIzinHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo 600

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 15, 'F'); // Top accent bar

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI IZIN & CUTI TENDIK', 105, 30, { align: 'center' });
    
    // Subtitle / School Name
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Sistem Informasi E-Absensi Sekolah Digital', 105, 36, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(1);
    doc.line(15, 41, 195, 41);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 48);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Tanggal Rekap             :  ${filterTendikTanggal ? new Date(filterTendikTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Semua Tanggal'}`, 15, 54);
    doc.text(`Total Tendik Izin/Cuti :  ${tendikIzinHistory.length} Orang`, 15, 60);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 66);

    doc.line(15, 71, 195, 71);

    let currentY = 78;

    // Table
    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'NIP Tendik', 'Nama Lengkap', 'Status', 'Keterangan / Alasan']];
    const tableBody = tendikIzinHistory.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.waktu ? item.waktu.substring(0, 5) : '-',
      item.nip || '-',
      item.namaTendik,
      item.status,
      item.alasan || '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 40 },
        5: { cellWidth: 32 },
        6: { cellWidth: 'auto' }
      },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak' }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Signature Block
    if (currentY > 230) {
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 10, 'F');
      currentY = 25;
    }

    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Mengetahui,', 140, currentY);
    doc.text('Kepala Sekolah,', 140, currentY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.text(`( ${customization?.kepalaSekolahNama || '______________________'} )`, 140, currentY + 30);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '..................................'}`, 140, currentY + 35);

    doc.save(`Rekap_Izin_Tendik_${filterTendikTanggal || 'Semua'}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Sub tab buttons */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 flex-wrap">
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => setSubTab('siswa')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'siswa'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Jurnal Presensi Kelas</span>
            </button>
          )}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => {
                setSubTab('kiosk-siswa');
                handleApplyKioskFilter();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'kiosk-siswa'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>Presensi Masuk (Kiosk / Barcode)</span>
            </button>
          )}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => {
                setSubTab('guru');
                handleApplyGuruFilter();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'guru'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Riwayat Izin Guru</span>
            </button>
          )}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Tendik') && (
            <button
              type="button"
              onClick={() => {
                setSubTab('tendik-absen');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'tendik-absen'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Absen Tendik</span>
            </button>
          )}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Tendik') && (
            <button
              type="button"
              onClick={() => {
                setSubTab('tendik-izin');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'tendik-izin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Riwayat Izin Tendik</span>
            </button>
          )}
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => setSubTab('rekap-pdf')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'rekap-pdf'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap PDF</span>
            </button>
          )}
        </div>

        {/* SUB TAB 1: RIWAYAT SISWA */}
        {subTab === 'siswa' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Log & Riwayat Presensi Kelas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ringkasan rekap sesi pembelajaran (Tanggal, Waktu, Mapel, Rekap Hadir/Sakit/Izin/Alpa & Guru).
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={filterSiswaTanggal}
                  onChange={(e) => setFilterSiswaTanggal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Kelas</label>
                <select
                  value={filterSiswaKelas}
                  onChange={(e) => setFilterSiswaKelas(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Semua Kelas</option>
                  {kelasList.map((k, idx) => (
                    <option key={`opt-k-${k}-${idx}`} value={k}>
                      {k.startsWith('Kelas') ? k : 'Kelas ' + k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleApplySiswaFilter}
                  disabled={isLoadingSiswa}
                  className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isLoadingSiswa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Terapkan Filter</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-36">Waktu Sesi</th>
                    <th className="p-3.5 w-16 text-center">Kelas</th>
                    <th className="p-3.5">Mata Pelajaran</th>
                    <th className="p-3.5 text-center w-12">Hadir</th>
                    <th className="p-3.5 text-center w-12">Sakit</th>
                    <th className="p-3.5 text-center w-12">Izin</th>
                    <th className="p-3.5 text-center w-12">Alpa</th>
                    <th className="p-3.5">Keterangan Khusus</th>
                    <th className="p-3.5">Guru Absen</th>
                    <th className="p-3.5 text-center w-24">Bukti Foto</th>
                    <th className="p-3.5 pr-4 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.length > 0 ? (
                    historyList.map((item, idx) => (
                      <tr key={`sis-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {item.tanggal} <span className="text-slate-300">|</span> {item.waktu}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700 whitespace-nowrap">{item.kelas}</td>
                        <td className="p-3.5 font-semibold text-blue-700 whitespace-nowrap">{item.mapel || '-'}</td>
                        <td className="p-3.5 text-center font-bold">
                          <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px]">
                            {item.hadir || 0}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px]">
                            {item.sakit || 0}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px]">
                            {item.izin || 0}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className="inline-block px-2 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-[10px]">
                            {item.alpa || 0}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-650 max-w-xs truncate font-medium" title={item.keterangan}>
                          {item.keterangan || '-'}
                        </td>
                        <td className="p-3.5 text-slate-700 font-semibold whitespace-nowrap">{item.guru}</td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {item.photo ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(item.photo || null)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Foto</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-semibold">-</span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                              title="Edit keterangan"
                            >
                              <PenSquare className="w-4 h-4" />
                            </button>
                            {currentUser?.role === 'Admin' && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmModal(item.rowIndex, 'siswa')}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada log presensi pada tanggal dan kelas terpilih.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB TAB: KIOSK PRESENSI MASUK SISWA */}
        {subTab === 'kiosk-siswa' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-blue-600" />
                  <span>Riwayat Presensi Masuk Siswa (Kiosk / Gerbang)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar pemindaian barcode/QR presensi pagi di gerbang beserta status kehadiran dan menit keterlambatan.
                </p>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Total Presensi</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{filteredKioskHistory.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Tepat Waktu (Hadir)</span>
                  <p className="text-2xl font-black text-emerald-800 mt-0.5">
                    {filteredKioskHistory.filter((k) => k.status === 'Hadir').length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase">Terlambat</span>
                  <p className="text-2xl font-black text-amber-800 mt-0.5">
                    {filteredKioskHistory.filter((k) => k.status === 'Terlambat').length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tanggal Scan</label>
                <input
                  type="date"
                  value={filterKioskTanggal}
                  onChange={(e) => setFilterKioskTanggal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Kelas</label>
                <select
                  value={filterKioskKelas}
                  onChange={(e) => setFilterKioskKelas(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Semua Kelas</option>
                  {kelasList.map((k, idx) => (
                    <option key={`opt-kiosk-${k}-${idx}`} value={k}>
                      {k.startsWith('Kelas') ? k : 'Kelas ' + k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Cari Siswa / NISN</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchKioskNama}
                    onChange={(e) => setSearchKioskNama(e.target.value)}
                    placeholder="Ketik nama / NISN..."
                    className="w-full p-2.5 pl-8 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div className="sm:col-span-3 flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyKioskFilter}
                  disabled={isLoadingKiosk}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingKiosk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadKioskPDF}
                  disabled={filteredKioskHistory.length === 0}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Unduh Rekap PDF Presensi Masuk"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-12 text-center">No</th>
                    <th className="p-3.5 w-28">Tanggal</th>
                    <th className="p-3.5 w-24">Waktu Scan</th>
                    <th className="p-3.5 w-28">NISN</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5 w-24 text-center">Kelas</th>
                    <th className="p-3.5 w-32 text-center">Status Masuk</th>
                    <th className="p-3.5 w-36 text-center">Keterlambatan</th>
                    {(currentUser?.role === 'Admin' || isFullAccess) && <th className="p-3.5 pr-4 text-center w-20">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKioskHistory.length > 0 ? (
                    filteredKioskHistory.map((item, idx) => {
                      const dt = parseKioskDateTime(item);
                      return (
                        <tr key={`kiosk-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 pl-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3.5 font-mono text-slate-700 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{dt.tanggal}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-xs">
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{dt.waktu} WIB</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500 font-semibold whitespace-nowrap">{item.nisn}</td>
                          <td className="p-3.5 font-semibold text-slate-800 text-sm whitespace-nowrap">{item.nama}</td>
                          <td className="p-3.5 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                              {item.kelas}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold ${
                                item.status === 'Terlambat'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {item.status || 'Hadir'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {item.status === 'Terlambat' ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black">
                                {item.keterlambatan && item.keterlambatan !== '-'
                                  ? item.keterlambatan
                                  : item.menitTerlambat
                                  ? `${item.menitTerlambat} menit`
                                  : 'Terlambat'}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold">Tepat Waktu</span>
                            )}
                          </td>
                          {(currentUser?.role === 'Admin' || isFullAccess) && (
                            <td className="p-3.5 pr-4 text-center">
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmModal(item.rowIndex || idx + 2, 'kiosk-siswa', item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Data Presensi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={currentUser?.role === 'Admin' ? 9 : 8} className="p-12 text-center text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">
                          Tidak ada rekaman presensi masuk siswa pada filter ini.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB TAB 2: RIWAYAT GURU */}
        {subTab === 'guru' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Riwayat Izin & Sakit Guru</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar absensi/permohonan izin dan keterangan ketidakhadiran guru yang dilaporkan ke sekolah.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tanggal Permohonan</label>
                <input
                  type="date"
                  value={filterGuruTanggal}
                  onChange={(e) => setFilterGuruTanggal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyGuruFilter}
                  disabled={isLoadingGuru}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingGuru ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Terapkan Filter</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTeacherPDF}
                  disabled={teacherHistoryList.length === 0}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Unduh Rekap Izin Guru (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Rekap PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-40">Waktu Kirim</th>
                    <th className="p-3.5 w-32">NIP Guru</th>
                    <th className="p-3.5 w-52">Nama Guru</th>
                    <th className="p-3.5 w-32">Status/Alasan</th>
                    <th className="p-3.5">Keterangan / Deskripsi Alasan</th>
                    <th className="p-3.5 pr-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherHistoryList.length > 0 ? (
                    teacherHistoryList.map((item, idx) => (
                      <tr key={`guru-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {item.tanggal} <span className="text-slate-300">|</span> {item.waktu}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">{item.nip || '-'}</td>
                        <td className="p-3.5 font-bold text-slate-800 text-sm">{item.namaGuru}</td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            item.status.toLowerCase().includes('sakit')
                              ? 'bg-rose-50 border border-rose-100 text-rose-700'
                              : item.status.toLowerCase().includes('hadir') || item.status.toLowerCase().includes('mengajar')
                              ? 'bg-emerald-50 border border-emerald-150 text-emerald-700 font-extrabold'
                              : item.status.toLowerCase().includes('izin')
                              ? 'bg-blue-50 border border-blue-100 text-blue-700'
                              : item.status.toLowerCase().includes('dinas')
                              ? 'bg-purple-50 border border-purple-100 text-purple-700'
                              : item.status.toLowerCase().includes('cuti')
                              ? 'bg-slate-50 border border-slate-150 text-slate-700'
                              : 'bg-amber-50 border border-amber-100 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 leading-relaxed font-medium">{item.alasan}</td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditTeacherModal(item)}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                              title="Edit izin guru"
                            >
                              <PenSquare className="w-4 h-4" />
                            </button>
                            {currentUser?.role === 'Admin' && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmModal(item.rowIndex, 'guru')}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus izin guru"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada riwayat permohonan izin guru pada tanggal ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB TAB 2.1: RIWAYAT ABSEN TENDIK */}
        {subTab === 'tendik-absen' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Riwayat Presensi Hadir Tendik</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar log kehadiran harian Tenaga Kependidikan (Tendik) beserta bukti foto diri.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tanggal Presensi</label>
                <input
                  type="date"
                  value={filterTendikTanggal}
                  onChange={(e) => setFilterTendikTanggal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyTendikFilter}
                  disabled={isLoadingTendik}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingTendik ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Terapkan Filter</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTendikAbsenPDF}
                  disabled={tendikAbsenHistory.length === 0}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Unduh Rekap Presensi Hadir Tendik (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Rekap PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-40">Waktu Presensi</th>
                    <th className="p-3.5 w-40">NIP</th>
                    <th className="p-3.5 w-60">Nama Lengkap</th>
                    <th className="p-3.5 text-center w-36">Bukti Foto</th>
                    <th className="p-3.5 pr-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tendikAbsenHistory.length > 0 ? (
                    tendikAbsenHistory.map((item, idx) => (
                      <tr key={`t-absen-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {item.tanggal} <span className="text-slate-300">|</span> {item.waktu}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">{item.nip || '-'}</td>
                        <td className="p-3.5 font-bold text-slate-800 text-sm">{item.namaTendik}</td>
                        <td className="p-3.5 text-center">
                          {item.photo ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(item.photo)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer border border-blue-200/40"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Foto</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">Tanpa Foto</span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {currentUser?.role === 'Admin' && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmModal(item.rowIndex, 'tendik-absen')}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus presensi tendik"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada riwayat presensi hadir Tendik pada tanggal ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB TAB 2.2: RIWAYAT IZIN TENDIK */}
        {subTab === 'tendik-izin' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Riwayat Izin, Sakit & Cuti Tendik</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar absensi, permohonan izin, sakit, dan cuti Tenaga Kependidikan (Tendik).
              </p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tanggal Permohonan</label>
                <input
                  type="date"
                  value={filterTendikTanggal}
                  onChange={(e) => setFilterTendikTanggal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyTendikFilter}
                  disabled={isLoadingTendik}
                  className="flex-1 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingTendik ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>Terapkan Filter</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTendikIzinPDF}
                  disabled={tendikIzinHistory.length === 0}
                  className="p-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Unduh Rekap Izin Tendik (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Rekap PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-40">Waktu Kirim</th>
                    <th className="p-3.5 w-32">NIP</th>
                    <th className="p-3.5 w-52">Nama Lengkap</th>
                    <th className="p-3.5 w-32">Status</th>
                    <th className="p-3.5">Keterangan / Alasan</th>
                    <th className="p-3.5 text-center w-32">Lampiran</th>
                    <th className="p-3.5 pr-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tendikIzinHistory.length > 0 ? (
                    tendikIzinHistory.map((item, idx) => (
                      <tr key={`t-izin-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {item.tanggal} <span className="text-slate-300">|</span> {item.waktu}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">{item.nip || '-'}</td>
                        <td className="p-3.5 font-bold text-slate-800 text-sm">{item.namaTendik}</td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            item.status.toLowerCase().includes('sakit')
                              ? 'bg-rose-50 border border-rose-100 text-rose-700'
                              : item.status.toLowerCase().includes('izin')
                              ? 'bg-blue-50 border border-blue-100 text-blue-700'
                              : 'bg-slate-50 border border-slate-150 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 leading-relaxed font-medium">{item.alasan}</td>
                        <td className="p-3.5 text-center">
                          {item.photo ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(item.photo)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer border border-indigo-200/40"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Bukti</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">Tanpa Lampiran</span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {currentUser?.role === 'Admin' && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmModal(item.rowIndex, 'tendik-izin')}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus izin tendik"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada riwayat permohonan izin Tendik pada tanggal ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB TAB 3: UNDUH REKAP PDF */}
        {subTab === 'rekap-pdf' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FileText className="w-5.5 h-5.5 text-blue-600" />
                <span>Unduh Laporan Rekap Kehadiran PDF</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih guru mata pelajaran dan tentukan rentang waktu mingguan atau bulanan untuk mengunduh laporan PDF kehadiran guru beserta siswa di setiap kelas.
              </p>
            </div>

            {/* Filter / Selector Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Pilih Guru Pengampu</label>
                <select
                  value={selectedGuru}
                  onChange={(e) => setSelectedGuru(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t, idx) => (
                    <option key={`teacher-${t.nip || 'nip'}-${idx}`} value={t.nama}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Mata Pelajaran</label>
                <select
                  value={selectedMapel}
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {mapels.map((m, idx) => (
                    <option key={`mapel-${m}-${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-200 p-0.5 rounded-xl border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => handlePeriodChange('minggu')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      rekapPeriode === 'minggu' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Minggu Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodChange('bulan')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      rekapPeriode === 'bulan' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodChange('kustom')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      rekapPeriode === 'kustom' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Kustom
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tgl Mulai</label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => {
                      setTanggalMulai(e.target.value);
                      setRekapPeriode('kustom');
                    }}
                    className="w-full p-2 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tgl Akhir</label>
                  <input
                    type="date"
                    value={tanggalAkhir}
                    onChange={(e) => {
                      setTanggalAkhir(e.target.value);
                      setRekapPeriode('kustom');
                    }}
                    className="w-full p-2 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Content Loading State */}
            {isLoadingMasters || isLoadingAllHistory ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Memuat database riwayat presensi...</span>
              </div>
            ) : !selectedGuru || !selectedMapel ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50/30 border border-dashed border-slate-200 rounded-3xl">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Pilih Guru & Mata Pelajaran</p>
                <p className="text-xs text-slate-400 mt-1">Harap pilih guru pengampu beserta mapel untuk memuat pratinjau rekap.</p>
              </div>
            ) : getProcessedRecap().length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50/30 border border-dashed border-slate-200 rounded-3xl space-y-2">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Tidak Ada Log Sesi Mengajar</p>
                <p className="text-xs text-slate-400">
                  Tidak ditemukan data presensi untuk <span className="font-semibold text-slate-700">{selectedGuru}</span> mengajar <span className="font-semibold text-slate-700">{selectedMapel}</span> dari tanggal {tanggalMulai} s.d. {tanggalAkhir}.
                </p>
              </div>
            ) : (
              /* PREVIEW RESULTS AND DOWNLOAD ACTION */
              <div className="space-y-6">
                {/* Summary bar */}
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>Ringkasan Laporan Latihan Mengajar</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Ditemukan <span className="font-bold text-blue-700">{getProcessedRecap().length} Kelas</span> yang diampu oleh {selectedGuru} ({selectedMapel}) pada periode ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/15 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Rekap PDF</span>
                  </button>
                </div>

                {/* Grid of Class Recaps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getProcessedRecap().map((classRecap, cIdx) => (
                    <div key={`recap-${classRecap.kelas}-${cIdx}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                      {/* Class Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {classRecap.kelas}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-slate-800 text-xs">Kelas {classRecap.kelas}</h5>
                            <p className="text-[10px] text-slate-400">Total: {classRecap.totalPertemuan} Tatap Muka</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Kehadiran Siswa</span>
                          <span className={`text-xs font-black ${classRecap.avgPresenceRate >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {classRecap.avgPresenceRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Cumulative Student Stats Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Siswa Hadir: {classRecap.totals.hadir}</span>
                          <span>Sakit: {classRecap.totals.sakit} | Izin: {classRecap.totals.izin} | Alpa: {classRecap.totals.alpa}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${classRecap.avgPresenceRate}%` }}></div>
                          <div className="bg-amber-400 h-full" style={{ width: `${classRecap.totals.studentsCount > 0 ? (classRecap.totals.sakit / classRecap.totals.studentsCount) * 100 : 0}%` }}></div>
                          <div className="bg-blue-500 h-full" style={{ width: `${classRecap.totals.studentsCount > 0 ? (classRecap.totals.izin / classRecap.totals.studentsCount) * 100 : 0}%` }}></div>
                          <div className="bg-rose-500 h-full" style={{ width: `${classRecap.totals.studentsCount > 0 ? (classRecap.totals.alpa / classRecap.totals.studentsCount) * 100 : 0}%` }}></div>
                        </div>
                      </div>

                      {/* Sesi Logs List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Daftar Jurnal Mengajar & Absensi:</span>
                        {classRecap.records.map((sesi, idx) => (
                          <div key={sesi.rowIndex || idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[11px] font-semibold text-slate-700">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-slate-400">{sesi.tanggal} | {sesi.waktu.substring(0, 5)}</span>
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold">
                                Guru Hadir
                              </span>
                            </div>
                            <p className="text-slate-500 text-[10px] leading-relaxed">
                              Siswa: <span className="text-emerald-600 font-bold">{sesi.hadir} H</span>, <span className="text-amber-500 font-bold">{sesi.sakit} S</span>, <span className="text-blue-500 font-bold">{sesi.izin} I</span>, <span className="text-rose-500 font-bold">{sesi.alpa} A</span>
                            </p>
                            {sesi.keterangan && (
                              <p className="text-[10px] text-slate-400 italic font-medium truncate" title={sesi.keterangan}>
                                "{sesi.keterangan}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT MODAL DIALOG */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Edit Catatan Sesi Presensi</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ubah atau tambahkan keterangan rekap untuk {editingItem.kelas} ({editingItem.mapel}).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Informasi Sesi</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-1 font-semibold">
                  <p>Tanggal: {editingItem.tanggal}</p>
                  <p>Waktu: {editingItem.waktu}</p>
                  <p>Guru: {editingItem.guru}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Keterangan / Catatan Siswa</label>
                <textarea
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Isi rekap kehadiran atau kendila yang ditemui..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL DIALOG */}
      {showEditTeacherModal && editingTeacherItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Edit Riwayat Izin Guru</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ubah atau perbarui laporan ketidakhadiran untuk {editingTeacherItem.namaGuru}.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Informasi Guru</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-1 font-semibold">
                  <p>Tanggal: {editingTeacherItem.tanggal}</p>
                  <p>NIP: {editingTeacherItem.nip || '-'}</p>
                  <p>Waktu Kirim: {editingTeacherItem.waktu}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Status / Kategori Absen</label>
                <select
                  value={newTeacherStatus}
                  onChange={(e) => setNewTeacherStatus(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-slate-850"
                >
                  <option value="Sakit">Sakit</option>
                  <option value="Izin">Izin</option>
                  <option value="Dinas Luar">Dinas Luar</option>
                  <option value="Cuti">Cuti</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Alasan / Deskripsi Detail</label>
                <textarea
                  value={newTeacherAlasan}
                  onChange={(e) => setNewTeacherAlasan(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Isi keterangan detail perizinan..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditTeacherModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTeacherEdit}
                disabled={isUpdatingTeacher}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isUpdatingTeacher && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Konfirmasi Hapus Data</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus data log{' '}
              <span className="font-bold text-slate-700">
                {deletingRecordType === 'siswa'
                  ? 'presensi pembelajaran siswa'
                  : deletingRecordType === 'kiosk-siswa'
                  ? 'presensi masuk kiosk/barcode siswa'
                  : deletingRecordType === 'guru'
                  ? 'izin guru'
                  : deletingRecordType === 'tendik-absen'
                  ? 'presensi tendik'
                  : 'izin tendik'}
              </span>
              ? Tindakan ini bersifat permanen dan data akan dihapus dari Google Sheets.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" id="history-photo-viewer-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Foto Bukti Kelas / Pembelajaran</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="py-4 flex-1 flex flex-col items-center justify-center overflow-hidden bg-slate-50 rounded-xl mt-3 min-h-[250px]">
              {selectedPhoto.startsWith('http') ? (
                <div className="flex flex-col items-center gap-3 w-full p-2">
                  <img
                    src={
                      selectedPhoto.includes('drive.google.com')
                        ? (selectedPhoto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
                          ? `https://drive.google.com/uc?export=view&id=${selectedPhoto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]}`
                          : selectedPhoto)
                        : selectedPhoto
                    }
                    alt="Bukti Absensi"
                    className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <a
                    href={selectedPhoto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Google Drive</span>
                  </a>
                </div>
              ) : (
                <img
                  src={selectedPhoto}
                  alt="Bukti Absensi"
                  className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
