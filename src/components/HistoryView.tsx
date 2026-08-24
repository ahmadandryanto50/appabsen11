/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, TeacherAbsenceRecord, User, AppCustomization, getLocalDateString, getLocalTimeString, KioskScanRecord } from '../types';
import { StudentNameBadge } from '../utils/studentColor';
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
  EyeOff,
  X,
  ExternalLink,
  ScanLine,
  CheckCheck,
  RefreshCw,
  GraduationCap,
  Save,
  LayoutGrid,
  List,
  ArrowLeft,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '../api';
import { formatKeterlambatan } from '../utils/timeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type PeriodType = 'semua' | '1_minggu' | '1_bulan' | 'kustom' | 'hari_ini';

const getNormalizedDateStr = (dateInput: any): string => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    const ymdMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymdMatch) return ymdMatch[1];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const dObj = new Date(s);
    if (!isNaN(dObj.getTime())) {
      return getLocalDateString(dObj);
    }
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return getLocalDateString(dateInput);
  }
  return String(dateInput).slice(0, 10);
};

const getDateRangeForPeriode = (
  periode: PeriodType,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } => {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  if (periode === 'hari_ini') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (periode === '1_minggu') {
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    return { startDate: getLocalDateString(lastWeek), endDate: todayStr };
  }
  if (periode === '1_bulan') {
    const lastMonth = new Date(today);
    lastMonth.setDate(today.getDate() - 29);
    return { startDate: getLocalDateString(lastMonth), endDate: todayStr };
  }
  if (periode === 'kustom') {
    return {
      startDate: customStart || '',
      endDate: customEnd || todayStr,
    };
  }
  return { startDate: '', endDate: '' };
};

const isRecordInDateRange = (
  recordDate: string,
  startDate: string,
  endDate: string
): boolean => {
  if (!startDate && !endDate) return true;
  const norm = getNormalizedDateStr(recordDate);
  if (!norm) return true;
  if (startDate && norm < startDate) return false;
  if (endDate && norm > endDate) return false;
  return true;
};

const getPeriodeLabelText = (
  periode: PeriodType,
  customStart?: string,
  customEnd?: string
): string => {
  const { startDate, endDate } = getDateRangeForPeriode(periode, customStart, customEnd);
  if (periode === 'hari_ini') return `Hari Ini (${startDate || getLocalDateString()})`;
  if (periode === '1_minggu') return `Rekap 1 Minggu (${startDate} s/d ${endDate})`;
  if (periode === '1_bulan') return `Rekap 1 Bulan (${startDate} s/d ${endDate})`;
  if (periode === 'kustom' && startDate) return `Kustom (${startDate} s/d ${endDate})`;
  return 'Semua Tanggal';
};

const normalizePersonName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(s\.pd\.i|s\.pd|s\.kom|m\.pd|s\.si|dra\.|drs\.|m\.si|s\.t|s\.e|s\.sos|gr\.|dr\.|h\.|hj\.|m\.m|s\.ag)/gi, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchTeacher = (recordGuru: string, targetNama: string) => {
  if (!recordGuru || !targetNama) return false;
  const a = recordGuru.toLowerCase().trim();
  const b = targetNama.toLowerCase().trim();
  if (a === b) return true;
  const normA = normalizePersonName(recordGuru);
  const normB = normalizePersonName(targetNama);
  if (normA && normB) {
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }
  return false;
};

const matchMapel = (recordMapel: string, targetMapel: string) => {
  if (!recordMapel || !targetMapel) return false;
  return recordMapel.toLowerCase().trim() === targetMapel.toLowerCase().trim();
};

const renderOfficialKopSurat = (doc: jsPDF, customization?: AppCustomization) => {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('PEMERINTAH KOTA PALU', 105, 12, { align: 'center' });

  doc.setFontSize(15);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text((customization?.appName || 'SMP NEGERI 11 PALU').toUpperCase(), 105, 18, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('NSS : 2011866001011 \u2013 NIS : 200110 \u2013 NPSN : 40203578', 105, 22.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('ALAMAT : JL. KERAMIK KEL. DUYU KEC. TATANGA (0451) \u2013 8202057', 105, 26.5, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Website : http://www.smpn11palu.sch.id   Email : smpnegeri11palu@gmail.com', 105, 30, { align: 'center' });

  // Double Kop Line Divider
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.2);
  doc.line(10, 32.5, 200, 32.5);
  doc.setLineWidth(0.4);
  doc.line(10, 34, 200, 34);
};

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
  onSaveCustomization?: (newCust: Partial<AppCustomization>) => Promise<any>;
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
  onSaveCustomization,
}: HistoryViewProps) {
  const isFullAccess = (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || String(currentUser?.role || '').toLowerCase().includes('admin') || Boolean(currentUser?.username?.toLowerCase().includes('admin'));
  const isAdminUtama = currentUser?.role === 'Admin Utama' || String(currentUser?.role || '').toLowerCase() === 'admin utama' || (currentUser?.username || '').toLowerCase() === 'admin_utama';

  // Helper to determine if an account/record belongs to Admin or Admin Utama (excluded from mandatory teacher/tendik attendance & recaps)
  const isAdminUser = (userOrObj: any): boolean => {
    if (!userOrObj) return false;
    const r = String(userOrObj.role || '').toLowerCase().trim();
    const u = String(userOrObj.username || '').toLowerCase().trim();
    const n = String(userOrObj.nama || userOrObj.namaGuru || userOrObj.namaTendik || '').toLowerCase().trim();
    const nip = String(userOrObj.nip || '').toLowerCase().trim();

    if (r === 'admin utama' || r === 'admin' || r === 'administrator' || r === 'admin_utama' || r.includes('admin')) {
      return true;
    }
    if (u === 'admin' || u === 'admin_utama' || u.startsWith('admin')) {
      return true;
    }
    if (n === 'admin' || n === 'admin utama' || n === 'administrator' || n === 'administrator utama' || n.includes('administrator')) {
      return true;
    }
    if (nip === 'admin' || nip === 'admin_utama' || (nip === 'g01' && n.includes('admin'))) {
      return true;
    }
    return false;
  };

  const [subTab, setSubTab] = useState<'siswa' | 'kiosk-siswa' | 'guru' | 'guru-absen' | 'tendik-absen' | 'tendik-izin' | 'rekap-pdf' | 'rekap-kelas-guru'>(
    currentUser?.role === 'Tendik' ? 'tendik-absen' : 'siswa'
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filter States - Siswa (Log Kelas)
  const [filterSiswaTanggal, setFilterSiswaTanggal] = useState('');
  const [filterSiswaKelas, setFilterSiswaKelas] = useState('');
  const [filterSiswaPeriode, setFilterSiswaPeriode] = useState<PeriodType>('semua');
  const [filterSiswaTanggalAwal, setFilterSiswaTanggalAwal] = useState('');
  const [filterSiswaTanggalAkhir, setFilterSiswaTanggalAkhir] = useState('');
  const [isLoadingSiswa, setIsLoadingSiswa] = useState(false);

  // Filter States - Kiosk Presensi Masuk Siswa
  const [filterKioskTanggal, setFilterKioskTanggal] = useState('');
  const [filterKioskKelas, setFilterKioskKelas] = useState('');
  const [searchKioskNama, setSearchKioskNama] = useState('');
  const [filterKioskPeriode, setFilterKioskPeriode] = useState<PeriodType>('semua');
  const [filterKioskTanggalAwal, setFilterKioskTanggalAwal] = useState('');
  const [filterKioskTanggalAkhir, setFilterKioskTanggalAkhir] = useState('');
  const [kioskHistory, setKioskHistory] = useState<KioskScanRecord[]>([]);
  const [isLoadingKiosk, setIsLoadingKiosk] = useState(false);
  const [kioskViewMode, setKioskViewMode] = useState<'log' | 'rekap-kelas'>('log');
  const [masterSiswaList, setMasterSiswaList] = useState<any[]>([]);

  // Filter States - Guru (Izin)
  const [filterGuruTanggal, setFilterGuruTanggal] = useState('');
  const [filterGuruPeriode, setFilterGuruPeriode] = useState<PeriodType>('semua');
  const [filterGuruTanggalAwal, setFilterGuruTanggalAwal] = useState('');
  const [filterGuruTanggalAkhir, setFilterGuruTanggalAkhir] = useState('');
  const [isLoadingGuru, setIsLoadingGuru] = useState(false);

  // Filter States - Guru (Absen Mandiri)
  const [filterGuruAbsenPeriode, setFilterGuruAbsenPeriode] = useState<PeriodType>('semua');
  const [filterGuruAbsenTanggalAwal, setFilterGuruAbsenTanggalAwal] = useState('');
  const [filterGuruAbsenTanggalAkhir, setFilterGuruAbsenTanggalAkhir] = useState('');
  const [guruAbsenHistory, setGuruAbsenHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('absensi_history_guru_absen');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filter States - Tendik
  const [filterTendikTanggal, setFilterTendikTanggal] = useState('');
  const [filterTendikAbsenPeriode, setFilterTendikAbsenPeriode] = useState<PeriodType>('semua');
  const [filterTendikAbsenTanggalAwal, setFilterTendikAbsenTanggalAwal] = useState('');
  const [filterTendikAbsenTanggalAkhir, setFilterTendikAbsenTanggalAkhir] = useState('');
  const [filterTendikIzinPeriode, setFilterTendikIzinPeriode] = useState<PeriodType>('semua');
  const [filterTendikIzinTanggalAwal, setFilterTendikIzinTanggalAwal] = useState('');
  const [filterTendikIzinTanggalAkhir, setFilterTendikIzinTanggalAkhir] = useState('');
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

  // States for Rekap Per Kelas Guru
  const [selectedGuruClass, setSelectedGuruClass] = useState<string>('');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [isSavingRecap, setIsSavingRecap] = useState<boolean>(false);
  const [studentsRoster, setStudentsRoster] = useState<any[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);

  // Master Guru List State
  const [masterGuruList, setMasterGuruList] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getCrud('Master_Guru').then((res) => {
      if (res && res.status === 'success' && Array.isArray(res.rows)) {
        const parsed = res.rows.map((row: any) => ({
          id: row.data?.[0] || '',
          nip: row.data?.[1] || '',
          nama: row.data?.[2] || '',
          gender: row.data?.[3] || '',
          username: row.data?.[4] || '',
          role: row.data?.[6] || 'Guru',
        })).filter((g: any) => g.nama);
        setMasterGuruList(parsed);
      }
    }).catch(() => {});
  }, []);

  // States for Monthly Individual Recap - GURU
  const [rekapGuruMonth, setRekapGuruMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('absensi_rekap_guru_month');
      if (saved) return saved;
    } catch {}
    if (customization?.rekapSettings?.rekapGuruMonth) return customization.rekapSettings.rekapGuruMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rekapGuruNip, setRekapGuruNip] = useState<string>('');
  const [rekapGuruTargetDays, setRekapGuruTargetDays] = useState<number>(() => {
    if (customization?.rekapSettings?.rekapGuruTargetDays) return customization.rekapSettings.rekapGuruTargetDays;
    try {
      const saved = localStorage.getItem('absensi_rekap_guru_target_days');
      return saved ? parseInt(saved, 10) : 22;
    } catch {
      return 22;
    }
  });
  const [rekapGuruStartDay, setRekapGuruStartDay] = useState<number>(() => {
    if (customization?.rekapSettings?.rekapGuruStartDay) return customization.rekapSettings.rekapGuruStartDay;
    try {
      const saved = localStorage.getItem('absensi_rekap_guru_start_day');
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  // States for Monthly Individual Recap - TENDIK
  const [rekapTendikMonth, setRekapTendikMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('absensi_rekap_tendik_month');
      if (saved) return saved;
    } catch {}
    if (customization?.rekapSettings?.rekapTendikMonth) return customization.rekapSettings.rekapTendikMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rekapTendikNip, setRekapTendikNip] = useState<string>('');
  const [rekapTendikTargetDays, setRekapTendikTargetDays] = useState<number>(() => {
    if (customization?.rekapSettings?.rekapTendikTargetDays) return customization.rekapSettings.rekapTendikTargetDays;
    try {
      const saved = localStorage.getItem('absensi_rekap_tendik_target_days');
      return saved ? parseInt(saved, 10) : 22;
    } catch {
      return 22;
    }
  });
  const [rekapTendikStartDay, setRekapTendikStartDay] = useState<number>(() => {
    if (customization?.rekapSettings?.rekapTendikStartDay) return customization.rekapSettings.rekapTendikStartDay;
    try {
      const saved = localStorage.getItem('absensi_rekap_tendik_start_day');
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  // Sync rekapSettings state when customization prop updates
  useEffect(() => {
    if (customization?.rekapSettings) {
      const r = customization.rekapSettings;
      if (r.rekapGuruMonth) setRekapGuruMonth(r.rekapGuruMonth);
      if (r.rekapGuruStartDay !== undefined) setRekapGuruStartDay(r.rekapGuruStartDay);
      if (r.rekapGuruTargetDays !== undefined) setRekapGuruTargetDays(r.rekapGuruTargetDays);
      if (r.rekapTendikMonth) setRekapTendikMonth(r.rekapTendikMonth);
      if (r.rekapTendikStartDay !== undefined) setRekapTendikStartDay(r.rekapTendikStartDay);
      if (r.rekapTendikTargetDays !== undefined) setRekapTendikTargetDays(r.rekapTendikTargetDays);
    }
  }, [customization?.rekapSettings]);

  // Helper to sync rekap settings to LocalStorage and Google Sheets Cloud
  const handleSyncRekapSettings = async (overrides?: any) => {
    const currentGMonth = overrides?.rekapGuruMonth !== undefined ? overrides.rekapGuruMonth : rekapGuruMonth;
    const currentGStart = overrides?.rekapGuruStartDay !== undefined ? overrides.rekapGuruStartDay : rekapGuruStartDay;
    const currentGTarget = overrides?.rekapGuruTargetDays !== undefined ? overrides.rekapGuruTargetDays : rekapGuruTargetDays;
    const currentTMonth = overrides?.rekapTendikMonth !== undefined ? overrides.rekapTendikMonth : rekapTendikMonth;
    const currentTStart = overrides?.rekapTendikStartDay !== undefined ? overrides.rekapTendikStartDay : rekapTendikStartDay;
    const currentTTarget = overrides?.rekapTendikTargetDays !== undefined ? overrides.rekapTendikTargetDays : rekapTendikTargetDays;

    if (currentGMonth) localStorage.setItem('absensi_rekap_guru_month', currentGMonth);
    if (currentGStart !== undefined) localStorage.setItem('absensi_rekap_guru_start_day', String(currentGStart));
    if (currentGTarget !== undefined) localStorage.setItem('absensi_rekap_guru_target_days', String(currentGTarget));
    if (currentTMonth) localStorage.setItem('absensi_rekap_tendik_month', currentTMonth);
    if (currentTStart !== undefined) localStorage.setItem('absensi_rekap_tendik_start_day', String(currentTStart));
    if (currentTTarget !== undefined) localStorage.setItem('absensi_rekap_tendik_target_days', String(currentTTarget));

    if (onSaveCustomization) {
      try {
        await onSaveCustomization({
          rekapSettings: {
            rekapGuruMonth: currentGMonth,
            rekapGuruStartDay: currentGStart,
            rekapGuruTargetDays: currentGTarget,
            rekapTendikMonth: currentTMonth,
            rekapTendikStartDay: currentTStart,
            rekapTendikTargetDays: currentTTarget,
          },
        });
      } catch (e) {
        console.error('Failed to sync rekap settings to cloud:', e);
      }
    }
  };

  const [savingRecapMsg, setSavingRecapMsg] = useState<string>('');
  const [isSavingGuruRecap, setIsSavingGuruRecap] = useState<boolean>(false);
  const [isSavingTendikRecap, setIsSavingTendikRecap] = useState<boolean>(false);

  // Search & View Mode states for collective recap
  const [searchRekapGuru, setSearchRekapGuru] = useState<string>('');
  const [guruRekapViewMode, setGuruRekapViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedGuruDetailNip, setSelectedGuruDetailNip] = useState<string | null>(null);

  const [searchRekapTendik, setSearchRekapTendik] = useState<string>('');
  const [tendikRekapViewMode, setTendikRekapViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedTendikDetailNip, setSelectedTendikDetailNip] = useState<string | null>(null);

  // List of active custom holidays from customization or localStorage
  const holidayList = useMemo(() => {
    let list: any[] = [];
    if (customization?.holidays && Array.isArray(customization.holidays)) {
      list = customization.holidays;
    } else {
      try {
        const stored = localStorage.getItem('absensi_hari_libur');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (e) {}
    }
    return list;
  }, [customization?.holidays]);

  // Helper to detect Tendik role
  const isTendikRole = (roleStr: string) => {
    const r = String(roleStr || '').toLowerCase().trim();
    if (!r) return false;
    return (
      r.includes('tendik') ||
      r.includes('tu') ||
      r.includes('tata usaha') ||
      r.includes('staf') ||
      r.includes('staff') ||
      r.includes('pegawai') ||
      r.includes('kependidikan') ||
      r.includes('satpam') ||
      r.includes('penjaga') ||
      r.includes('kebersihan') ||
      r.includes('pustakawan') ||
      r.includes('laboran') ||
      r.includes('operator') ||
      r.includes('administrasi')
    );
  };

  // List Teachers & Tendik Users - STRICTLY SORTED ALPHABETICALLY (A to Z)
  // Khusus Admin Utama dan Admin tidak diwajibkan absen dan tidak masuk rekap harian/bulanan
  const listTendikUsers = useMemo(() => {
    const fromMaster = masterGuruList.filter(g => {
      if (isAdminUser(g)) return false;
      return isTendikRole(g.role);
    });
    const extraTendikMap = new Map<string, { nip: string; nama: string; role: string }>();
    (tendikAbsenHistory || []).forEach((log: any) => {
      if (isAdminUser(log)) return;
      const nama = log.namaTendik || log.namaGuru || log.nama;
      const nip = log.nip || '';
      if (nama && !fromMaster.some(m => matchTeacher(m.nama, nama))) {
        extraTendikMap.set(nama.toLowerCase().trim(), { nip: nip || '-', nama: nama.trim(), role: 'Tendik' });
      }
    });
    (tendikIzinHistory || []).forEach((log: any) => {
      if (isAdminUser(log)) return;
      const nama = log.namaTendik || log.namaGuru || log.nama;
      const nip = log.nip || '';
      if (nama && !fromMaster.some(m => matchTeacher(m.nama, nama))) {
        extraTendikMap.set(nama.toLowerCase().trim(), { nip: nip || '-', nama: nama.trim(), role: 'Tendik' });
      }
    });
    (teachers || []).forEach((t: any) => {
      if (isAdminUser(t)) return;
      if (isTendikRole(t.role)) {
        if (t.nama && !fromMaster.some(m => matchTeacher(m.nama, t.nama))) {
          extraTendikMap.set(t.nama.toLowerCase().trim(), { nip: t.nip || '-', nama: t.nama.trim(), role: 'Tendik' });
        }
      }
    });
    const combined = [...fromMaster, ...Array.from(extraTendikMap.values())].filter(item => !isAdminUser(item));
    const base = combined.length > 0 ? combined : [
      { nip: '19950505202005', nama: 'Rina Herawati, S.Pd.I.', role: 'Tendik' },
      { nip: '19970606202206', nama: 'Doni Setiawan', role: 'Tendik' },
    ];
    return [...base].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [masterGuruList, tendikAbsenHistory, tendikIzinHistory, teachers]);

  const listGuruUsers = useMemo(() => {
    const fromMaster = masterGuruList.filter(g => {
      if (isAdminUser(g)) return false;
      if (isTendikRole(g.role)) return false;
      const r = String(g.role || '').toLowerCase();
      return r === 'guru' || (!r.includes('tendik') && !r.includes('tu') && !r.includes('tata usaha') && !r.includes('staf') && !r.includes('pegawai'));
    });
    const extraGuruMap = new Map<string, { nip: string; nama: string; role: string }>();
    (guruAbsenHistory || []).forEach((log: any) => {
      if (isAdminUser(log)) return;
      if (isTendikRole(log.role)) return;
      const nama = log.namaGuru || log.nama;
      const nip = log.nip || '';
      if (nama && !fromMaster.some(m => matchTeacher(m.nama, nama))) {
        extraGuruMap.set(nama.toLowerCase().trim(), { nip: nip || '-', nama: nama.trim(), role: 'Guru' });
      }
    });
    (teacherHistoryList || []).forEach((log: any) => {
      if (isAdminUser(log)) return;
      if (isTendikRole(log.role)) return;
      const nama = log.namaGuru || log.nama;
      const nip = log.nip || '';
      if (nama && !fromMaster.some(m => matchTeacher(m.nama, nama))) {
        extraGuruMap.set(nama.toLowerCase().trim(), { nip: nip || '-', nama: nama.trim(), role: 'Guru' });
      }
    });
    (teachers || []).forEach((t: any) => {
      if (isAdminUser(t)) return;
      if (isTendikRole(t.role)) return;
      if (t.nama && !fromMaster.some(m => matchTeacher(m.nama, t.nama))) {
        extraGuruMap.set(t.nama.toLowerCase().trim(), { nip: t.nip || '-', nama: t.nama.trim(), role: 'Guru' });
      }
    });

    const tendikNamesAndNips = new Set<string>();
    listTendikUsers.forEach(t => {
      if (t.nama) tendikNamesAndNips.add(t.nama.toLowerCase().trim());
      if (t.nip && t.nip !== '-') tendikNamesAndNips.add(t.nip.trim());
    });

    const combined = [...fromMaster, ...Array.from(extraGuruMap.values())].filter(item => {
      if (isAdminUser(item)) return false;
      if (isTendikRole(item.role)) return false;
      if (item.nama && tendikNamesAndNips.has(item.nama.toLowerCase().trim())) return false;
      if (item.nip && item.nip !== '-' && tendikNamesAndNips.has(item.nip.trim())) return false;
      return true;
    });

    const base = combined.length > 0 ? combined : [
      { nip: '19900202201502', nama: 'Budi Santoso, S.Pd.', role: 'Guru' },
      { nip: '19920815201803', nama: 'Siti Rahma, M.Pd.', role: 'Guru' },
      { nip: '19881112201201', nama: 'Hendra Wijaya, S.Si.', role: 'Guru' },
    ];
    return [...base].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [masterGuruList, guruAbsenHistory, teacherHistoryList, teachers, listTendikUsers]);

  useEffect(() => {
    if (!rekapGuruNip) {
      if (isFullAccess) {
        setRekapGuruNip('ALL');
      } else if (currentUser?.role === 'Guru' && currentUser?.nip && !isAdminUser(currentUser)) {
        setRekapGuruNip(currentUser.nip);
      } else if (listGuruUsers.length > 0) {
        setRekapGuruNip(listGuruUsers[0].nip || listGuruUsers[0].nama);
      }
    }
  }, [currentUser, isFullAccess, listGuruUsers, rekapGuruNip]);

  useEffect(() => {
    if (!rekapTendikNip) {
      if (isFullAccess) {
        setRekapTendikNip('ALL');
      } else if (currentUser?.role === 'Tendik' && currentUser?.nip && !isAdminUser(currentUser)) {
        setRekapTendikNip(currentUser.nip);
      } else if (listTendikUsers.length > 0) {
        setRekapTendikNip(listTendikUsers[0].nip || listTendikUsers[0].nama);
      }
    }
  }, [currentUser, isFullAccess, listTendikUsers, rekapTendikNip]);

  // Compute Collective Monthly Attendance Data for ALL Guru
  const allGuruMonthlyList = useMemo(() => {
    const parts = (rekapGuruMonth || '2026-08').split('-');
    const year = parseInt(parts[0], 10) || 2026;
    const month = parseInt(parts[1], 10) || 8;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const effectiveStartDay = Math.max(1, Math.min(rekapGuruStartDay || 1, totalDaysInMonth));
    const todayStr = getLocalDateString(new Date());
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const totalHariKerja = rekapGuruTargetDays || 22;

    return listGuruUsers.map((guru) => {
      const targetNip = guru.nip || '';
      const targetNama = guru.nama || '';

      const dayRows = [];
      let countHadir = 0;
      let countIzin = 0;
      let countSakit = 0;
      let countCutiDL = 0;
      let countAlpa = 0;

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dStr = `${parts[0]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dObj = new Date(year, month - 1, day);
        const dayName = dayNames[dObj.getDay()];
        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

        const allDayPresensi = (guruAbsenHistory || []).filter((log: any) => {
          const logDate = getNormalizedDateStr(log.tanggal || log.rawTanggal);
          if (logDate !== dStr) return false;
          if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
          if (targetNama && log.namaGuru && matchTeacher(log.namaGuru, targetNama)) return true;
          return false;
        });

        const presensiMatch = allDayPresensi.length > 0 ? allDayPresensi[0] : null;

        const izinMatch = (teacherHistoryList || []).find((log: any) => {
          const logDate = getNormalizedDateStr(log.tanggal);
          if (logDate !== dStr) return false;
          if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
          if (targetNama && log.namaGuru && matchTeacher(log.namaGuru, targetNama)) return true;
          return false;
        });

        const holidayMatch = (holidayList || []).find((h: any) => {
          if (!h || !h.tanggal) return false;
          const hDate = getNormalizedDateStr(h.tanggal);
          return hDate === dStr;
        });

        let status = '-';
        let statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
        let jamDatang = '-';
        let jamPulang = '-';
        let timeLog = '-';
        let keterangan = '-';
        let photo: string | null = null;

        if (presensiMatch) {
          const logDatang = allDayPresensi.find((l: any) => {
            const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
            return type.includes('datang') || type.includes('masuk');
          });
          const logPulang = allDayPresensi.find((l: any) => {
            const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
            return type.includes('pulang') || type.includes('keluar');
          });

          if (logDatang && logDatang.waktu) {
            jamDatang = String(logDatang.waktu).substring(0, 5);
          }
          if (logPulang && logPulang.waktu) {
            jamPulang = String(logPulang.waktu).substring(0, 5);
          }

          const hasDatang = !!logDatang;
          const hasPulang = !!logPulang;

          let isAlpaIncomplete = false;
          if (hasDatang && !hasPulang) {
            if (!izinMatch) {
              if (dStr < todayStr) {
                isAlpaIncomplete = true;
              }
            }
          }

          if (isAlpaIncomplete) {
            status = 'Alpa';
            statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
            countAlpa++;
            keterangan = 'Tidak Hadir (Hanya Absen Datang)';
          } else {
            status = 'Hadir';
            statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
            countHadir++;
            keterangan = presensiMatch.tipeAbsen || 'Presensi Mandiri';
            if (hasDatang && !hasPulang && izinMatch) {
              keterangan += ' (Izin Pulang)';
            }
          }

          photo = presensiMatch.photo || null;
          timeLog = jamDatang !== '-' ? (jamPulang !== '-' ? `${jamDatang} - ${jamPulang}` : jamDatang) : '-';
        } else if (izinMatch) {
          const st = String(izinMatch.status || '').toLowerCase();
          photo = (izinMatch as any).photo || null;
          if (st.includes('sakit')) {
            status = 'Sakit';
            statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
            countSakit++;
          } else if (st.includes('dinas') || st.includes('cuti') || st.includes('dl')) {
            status = st.includes('cuti') ? 'Cuti' : 'Dinas Luar';
            statusBadge = 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
            countCutiDL++;
          } else {
            status = 'Izin';
            statusBadge = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
            countIzin++;
          }
          keterangan = izinMatch.alasan || 'Permohonan Resmi';
        } else if (isWeekend) {
          status = 'Libur Akhir Pekan';
          statusBadge = 'bg-slate-100 text-slate-400 border-slate-200 font-medium';
          keterangan = 'Akhir Pekan';
        } else if (holidayMatch) {
          status = 'Hari Libur';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          keterangan = holidayMatch.nama || holidayMatch.kategori || 'Hari Libur';
        } else if (day < effectiveStartDay) {
          status = 'Belum Dimulai';
          statusBadge = 'bg-slate-50 text-slate-400 border-slate-200/60 font-medium';
          keterangan = `Sebelum Mulai Periode (Tgl ${effectiveStartDay})`;
        } else if (dStr < todayStr) {
          status = 'Alpa';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          countAlpa++;
          keterangan = 'Tanpa Keterangan';
        } else if (dStr === todayStr) {
          const isPastCutoff = new Date().getHours() >= 17;
          if (isPastCutoff) {
            status = 'Alpa';
            statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
            countAlpa++;
            keterangan = 'Tanpa Keterangan';
          } else {
            status = 'Belum Absen';
            statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
            keterangan = 'Hari Ini (Dalam Proses)';
          }
        } else {
          status = 'Belum Berlangsung';
          statusBadge = 'bg-slate-50 text-slate-400 border-slate-100';
          keterangan = '-';
        }

        dayRows.push({
          dayNumber: day,
          tanggal: dStr,
          dayName,
          status,
          statusBadge,
          jamDatang,
          jamPulang,
          timeLog,
          keterangan,
          photo,
        });
      }

      const persentase = totalHariKerja > 0 ? Math.min(100, Math.round((countHadir / totalHariKerja) * 100)) : 0;

      return {
        nip: targetNip || '-',
        nama: targetNama || '-',
        countHadir,
        countIzin,
        countSakit,
        countCutiDL,
        countAlpa,
        totalHariKerja,
        persentase,
        dayRows,
      };
    });
  }, [rekapGuruMonth, rekapGuruTargetDays, rekapGuruStartDay, listGuruUsers, guruAbsenHistory, teacherHistoryList, holidayList]);

  // Compute Collective Monthly Attendance Data for ALL Tendik
  const allTendikMonthlyList = useMemo(() => {
    const parts = (rekapTendikMonth || '2026-08').split('-');
    const year = parseInt(parts[0], 10) || 2026;
    const month = parseInt(parts[1], 10) || 8;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const effectiveStartDay = Math.max(1, Math.min(rekapTendikStartDay || 1, totalDaysInMonth));
    const todayStr = getLocalDateString(new Date());
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const totalHariKerja = rekapTendikTargetDays || 22;

    return listTendikUsers.map((tendik) => {
      const targetNip = tendik.nip || '';
      const targetNama = tendik.nama || '';

      const dayRows = [];
      let countHadir = 0;
      let countIzin = 0;
      let countSakit = 0;
      let countCutiDL = 0;
      let countAlpa = 0;

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dStr = `${parts[0]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dObj = new Date(year, month - 1, day);
        const dayName = dayNames[dObj.getDay()];
        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

        const allDayPresensi = (tendikAbsenHistory || []).filter((log: any) => {
          const logDate = getNormalizedDateStr(log.tanggal || log.rawTanggal);
          if (logDate !== dStr) return false;
          if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
          if (targetNama && log.namaTendik && matchTeacher(log.namaTendik, targetNama)) return true;
          return false;
        });

        const presensiMatch = allDayPresensi.length > 0 ? allDayPresensi[0] : null;

        const izinMatch = (tendikIzinHistory || []).find((log: any) => {
          const logDate = getNormalizedDateStr(log.tanggal);
          if (logDate !== dStr) return false;
          if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
          if (targetNama && log.namaTendik && matchTeacher(log.namaTendik, targetNama)) return true;
          return false;
        });

        const holidayMatch = (holidayList || []).find((h: any) => {
          if (!h || !h.tanggal) return false;
          const hDate = getNormalizedDateStr(h.tanggal);
          return hDate === dStr;
        });

        let status = '-';
        let statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
        let jamDatang = '-';
        let jamPulang = '-';
        let timeLog = '-';
        let keterangan = '-';
        let photo: string | null = null;

        if (presensiMatch) {
          const logDatang = allDayPresensi.find((l: any) => {
            const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
            return type.includes('datang') || type.includes('masuk');
          });
          const logPulang = allDayPresensi.find((l: any) => {
            const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
            return type.includes('pulang') || type.includes('keluar');
          });

          if (logDatang && logDatang.waktu) {
            jamDatang = String(logDatang.waktu).substring(0, 5);
          }
          if (logPulang && logPulang.waktu) {
            jamPulang = String(logPulang.waktu).substring(0, 5);
          }

          const hasDatang = !!logDatang;
          const hasPulang = !!logPulang;

          let isAlpaIncomplete = false;
          if (hasDatang && !hasPulang) {
            if (!izinMatch) {
              if (dStr < todayStr) {
                isAlpaIncomplete = true;
              }
            }
          }

          if (isAlpaIncomplete) {
            status = 'Alpa';
            statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
            countAlpa++;
            keterangan = 'Tidak Hadir (Hanya Absen Datang)';
          } else {
            status = 'Hadir';
            statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
            countHadir++;
            keterangan = presensiMatch.tipeAbsen || 'Presensi Mandiri';
            if (hasDatang && !hasPulang && izinMatch) {
              keterangan += ' (Izin Pulang)';
            }
          }

          photo = presensiMatch.photo || null;
          timeLog = jamDatang !== '-' ? (jamPulang !== '-' ? `${jamDatang} - ${jamPulang}` : jamDatang) : '-';
        } else if (izinMatch) {
          const st = String(izinMatch.status || '').toLowerCase();
          photo = (izinMatch as any).photo || null;
          if (st.includes('sakit')) {
            status = 'Sakit';
            statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
            countSakit++;
          } else if (st.includes('dinas') || st.includes('cuti') || st.includes('dl')) {
            status = st.includes('cuti') ? 'Cuti' : 'Dinas Luar';
            statusBadge = 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
            countCutiDL++;
          } else {
            status = 'Izin';
            statusBadge = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
            countIzin++;
          }
          keterangan = izinMatch.alasan || 'Permohonan Resmi';
        } else if (isWeekend) {
          status = 'Libur Akhir Pekan';
          statusBadge = 'bg-slate-100 text-slate-400 border-slate-200 font-medium';
          keterangan = 'Akhir Pekan';
        } else if (holidayMatch) {
          status = 'Hari Libur';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          keterangan = holidayMatch.nama || holidayMatch.kategori || 'Hari Libur';
        } else if (day < effectiveStartDay) {
          status = 'Belum Dimulai';
          statusBadge = 'bg-slate-50 text-slate-400 border-slate-200/60 font-medium';
          keterangan = `Sebelum Mulai Periode (Tgl ${effectiveStartDay})`;
        } else if (dStr < todayStr) {
          status = 'Alpa';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          countAlpa++;
          keterangan = 'Tanpa Keterangan';
        } else if (dStr === todayStr) {
          const isPastCutoff = new Date().getHours() >= 17;
          if (isPastCutoff) {
            status = 'Alpa';
            statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
            countAlpa++;
            keterangan = 'Tanpa Keterangan';
          } else {
            status = 'Belum Absen';
            statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
            keterangan = 'Hari Ini (Dalam Proses)';
          }
        } else {
          status = 'Belum Berlangsung';
          statusBadge = 'bg-slate-50 text-slate-400 border-slate-100';
          keterangan = '-';
        }

        dayRows.push({
          dayNumber: day,
          tanggal: dStr,
          dayName,
          status,
          statusBadge,
          jamDatang,
          jamPulang,
          timeLog,
          keterangan,
          photo,
        });
      }

      const persentase = totalHariKerja > 0 ? Math.min(100, Math.round((countHadir / totalHariKerja) * 100)) : 0;

      return {
        nip: targetNip || '-',
        nama: targetNama || '-',
        countHadir,
        countIzin,
        countSakit,
        countCutiDL,
        countAlpa,
        totalHariKerja,
        persentase,
        dayRows,
      };
    });
  }, [rekapTendikMonth, rekapTendikTargetDays, rekapTendikStartDay, listTendikUsers, tendikAbsenHistory, tendikIzinHistory, holidayList]);

  // Filtered lists for searching (alphabetical order maintained)
  const filteredAllGuruMonthlyList = useMemo(() => {
    if (!searchRekapGuru.trim()) return allGuruMonthlyList;
    const q = searchRekapGuru.toLowerCase().trim();
    return allGuruMonthlyList.filter(g =>
      (g.nama || '').toLowerCase().includes(q) ||
      (g.nip || '').toLowerCase().includes(q)
    );
  }, [allGuruMonthlyList, searchRekapGuru]);

  const filteredAllTendikMonthlyList = useMemo(() => {
    if (!searchRekapTendik.trim()) return allTendikMonthlyList;
    const q = searchRekapTendik.toLowerCase().trim();
    return allTendikMonthlyList.filter(t =>
      (t.nama || '').toLowerCase().includes(q) ||
      (t.nip || '').toLowerCase().includes(q)
    );
  }, [allTendikMonthlyList, searchRekapTendik]);

  // Compute Guru Monthly Attendance Data
  const guruMonthlyData = useMemo(() => {
    const selectedObj = listGuruUsers.find(g => g.nip === rekapGuruNip || g.nama === rekapGuruNip) || {
      nip: rekapGuruNip || currentUser?.nip || '-',
      nama: currentUser?.nama || rekapGuruNip || 'Guru',
    };

    const targetNip = selectedObj.nip || '';
    const targetNama = selectedObj.nama || '';

    const parts = (rekapGuruMonth || '2026-08').split('-');
    const year = parseInt(parts[0], 10) || 2026;
    const month = parseInt(parts[1], 10) || 8;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const effectiveStartDay = Math.max(1, Math.min(rekapGuruStartDay || 1, totalDaysInMonth));

    const dayRows = [];
    let countHadir = 0;
    let countIzin = 0;
    let countSakit = 0;
    let countCutiDL = 0;
    let countAlpa = 0;

    const todayStr = getLocalDateString(new Date());
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dStr = `${parts[0]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, day);
      const dayName = dayNames[dObj.getDay()];
      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

      const allDayPresensi = (guruAbsenHistory || []).filter((log: any) => {
        const logDate = getNormalizedDateStr(log.tanggal || log.rawTanggal);
        if (logDate !== dStr) return false;
        if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
        if (targetNama && log.namaGuru && matchTeacher(log.namaGuru, targetNama)) return true;
        return false;
      });

      const presensiMatch = allDayPresensi.length > 0 ? allDayPresensi[0] : null;

      const izinMatch = (teacherHistoryList || []).find((log: any) => {
        const logDate = getNormalizedDateStr(log.tanggal);
        if (logDate !== dStr) return false;
        if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
        if (targetNama && log.namaGuru && matchTeacher(log.namaGuru, targetNama)) return true;
        return false;
      });

      const holidayMatch = (holidayList || []).find((h: any) => {
        if (!h || !h.tanggal) return false;
        const hDate = getNormalizedDateStr(h.tanggal);
        return hDate === dStr;
      });

      let status = '-';
      let statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
      let jamDatang = '-';
      let jamPulang = '-';
      let timeLog = '-';
      let keterangan = '-';
      let photo = null;

      if (presensiMatch) {
        // Calculate Jam Datang & Jam Pulang
        const logDatang = allDayPresensi.find((l: any) => {
          const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
          return type.includes('datang') || type.includes('masuk');
        });
        const logPulang = allDayPresensi.find((l: any) => {
          const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
          return type.includes('pulang') || type.includes('keluar');
        });

        if (logDatang && logDatang.waktu) {
          jamDatang = String(logDatang.waktu).substring(0, 5);
        }
        if (logPulang && logPulang.waktu) {
          jamPulang = String(logPulang.waktu).substring(0, 5);
        }

        if (jamDatang === '-' && allDayPresensi[0]?.waktu) {
          jamDatang = String(allDayPresensi[0].waktu).substring(0, 5);
        }
        if (jamPulang === '-' && allDayPresensi.length > 1) {
          const lastLog = allDayPresensi[allDayPresensi.length - 1];
          if (lastLog?.waktu && lastLog !== allDayPresensi[0]) {
            jamPulang = String(lastLog.waktu).substring(0, 5);
          }
        }

        const hasDatang = jamDatang !== '-';
        const hasPulang = jamPulang !== '-';

        let isAlpaIncomplete = false;
        if (hasDatang && !hasPulang) {
          if (!izinMatch) {
            if (dStr < todayStr) {
              isAlpaIncomplete = true;
            }
          }
        }

        if (isAlpaIncomplete) {
          status = 'Alpa';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          countAlpa++;
          keterangan = 'Tidak Hadir (Hanya Absen Datang)';
        } else {
          status = 'Hadir';
          statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
          countHadir++;
          keterangan = presensiMatch.tipeAbsen || 'Presensi Mandiri';
          if (hasDatang && !hasPulang && izinMatch) {
            keterangan += ' (Izin Pulang)';
          }
        }

        photo = presensiMatch.photo || null;
        timeLog = jamDatang !== '-' ? (jamPulang !== '-' ? `${jamDatang} - ${jamPulang}` : jamDatang) : '-';
      } else if (izinMatch) {
        const st = String(izinMatch.status || '').toLowerCase();
        if (st.includes('sakit')) {
          status = 'Sakit';
          statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
          countSakit++;
        } else if (st.includes('dinas') || st.includes('cuti') || st.includes('dl')) {
          status = st.includes('cuti') ? 'Cuti' : 'Dinas Luar';
          statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
          countCutiDL++;
        } else {
          status = 'Izin';
          statusBadge = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
          countIzin++;
        }
        timeLog = izinMatch.waktu ? String(izinMatch.waktu).substring(0, 5) : '-';
        jamDatang = timeLog;
        keterangan = izinMatch.alasan || 'Permohonan Resmi';
      } else if (isWeekend) {
        status = 'Libur Akhir Pekan';
        statusBadge = 'bg-slate-100 text-slate-400 border-slate-200';
        keterangan = 'Akhir Pekan';
      } else if (holidayMatch) {
        status = 'Hari Libur';
        statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
        keterangan = holidayMatch.nama || holidayMatch.kategori || 'Hari Libur';
      } else if (day < effectiveStartDay) {
        status = 'Belum Dimulai';
        statusBadge = 'bg-slate-50 text-slate-400 border-slate-200/60 font-medium';
        keterangan = `Sebelum Mulai Periode (Tgl ${effectiveStartDay})`;
      } else if (dStr < todayStr) {
        status = 'Alpa';
        statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
        keterangan = 'Tanpa Keterangan';
        countAlpa++;
      } else if (dStr === todayStr) {
        const isPastCutoff = new Date().getHours() >= 17;
        if (isPastCutoff) {
          status = 'Alpa';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          keterangan = 'Tanpa Keterangan';
          countAlpa++;
        } else {
          status = 'Belum Absen';
          statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
          keterangan = 'Hari Ini (Dalam Proses)';
        }
      } else {
        status = 'Belum Berlangsung';
        statusBadge = 'bg-slate-50 text-slate-400 border-slate-200/60';
        keterangan = '-';
      }

      dayRows.push({
        dayNumber: day,
        tanggal: dStr,
        dayName,
        status,
        statusBadge,
        jamDatang,
        jamPulang,
        timeLog,
        keterangan,
        photo,
      });
    }

    const totalHariKerja = rekapGuruTargetDays || 22;
    const persentase = totalHariKerja > 0 ? Math.min(100, Math.round((countHadir / totalHariKerja) * 100)) : 0;

    return {
      selectedObj,
      targetNip,
      targetNama,
      monthLabel: new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      totalDaysInMonth,
      dayRows,
      countHadir,
      countIzin,
      countSakit,
      countCutiDL,
      countAlpa,
      totalHariKerja,
      persentase,
    };
  }, [rekapGuruMonth, rekapGuruNip, rekapGuruTargetDays, rekapGuruStartDay, listGuruUsers, guruAbsenHistory, teacherHistoryList, currentUser, holidayList]);

  // Compute Tendik Monthly Attendance Data
  const tendikMonthlyData = useMemo(() => {
    const selectedObj = listTendikUsers.find(g => g.nip === rekapTendikNip || g.nama === rekapTendikNip) || {
      nip: rekapTendikNip || currentUser?.nip || '-',
      nama: currentUser?.nama || rekapTendikNip || 'Tendik',
    };

    const targetNip = selectedObj.nip || '';
    const targetNama = selectedObj.nama || '';

    const parts = (rekapTendikMonth || '2026-08').split('-');
    const year = parseInt(parts[0], 10) || 2026;
    const month = parseInt(parts[1], 10) || 8;
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const effectiveStartDay = Math.max(1, Math.min(rekapTendikStartDay || 1, totalDaysInMonth));

    const dayRows = [];
    let countHadir = 0;
    let countIzin = 0;
    let countSakit = 0;
    let countCutiDL = 0;
    let countAlpa = 0;

    const todayStr = getLocalDateString(new Date());
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dStr = `${parts[0]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, day);
      const dayName = dayNames[dObj.getDay()];
      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

      const allDayPresensi = (tendikAbsenHistory || []).filter((log: any) => {
        const logDate = getNormalizedDateStr(log.tanggal || log.rawTanggal);
        if (logDate !== dStr) return false;
        if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
        if (targetNama && log.namaTendik && matchTeacher(log.namaTendik, targetNama)) return true;
        return false;
      });

      const presensiMatch = allDayPresensi.length > 0 ? allDayPresensi[0] : null;

      const izinMatch = (tendikIzinHistory || []).find((log: any) => {
        const logDate = getNormalizedDateStr(log.tanggal);
        if (logDate !== dStr) return false;
        if (targetNip && log.nip && String(log.nip).trim() === String(targetNip).trim()) return true;
        if (targetNama && log.namaTendik && matchTeacher(log.namaTendik, targetNama)) return true;
        return false;
      });

      const holidayMatch = (holidayList || []).find((h: any) => {
        if (!h || !h.tanggal) return false;
        const hDate = getNormalizedDateStr(h.tanggal);
        return hDate === dStr;
      });

      let status = '-';
      let statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';
      let jamDatang = '-';
      let jamPulang = '-';
      let timeLog = '-';
      let keterangan = '-';
      let photo = null;

      if (presensiMatch) {
        // Calculate Jam Datang & Jam Pulang
        const logDatang = allDayPresensi.find((l: any) => {
          const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
          return type.includes('datang') || type.includes('masuk');
        });
        const logPulang = allDayPresensi.find((l: any) => {
          const type = String(l.tipeAbsen || l.kategori || '').toLowerCase();
          return type.includes('pulang') || type.includes('keluar');
        });

        if (logDatang && logDatang.waktu) {
          jamDatang = String(logDatang.waktu).substring(0, 5);
        }
        if (logPulang && logPulang.waktu) {
          jamPulang = String(logPulang.waktu).substring(0, 5);
        }

        if (jamDatang === '-' && allDayPresensi[0]?.waktu) {
          jamDatang = String(allDayPresensi[0].waktu).substring(0, 5);
        }
        if (jamPulang === '-' && allDayPresensi.length > 1) {
          const lastLog = allDayPresensi[allDayPresensi.length - 1];
          if (lastLog?.waktu && lastLog !== allDayPresensi[0]) {
            jamPulang = String(lastLog.waktu).substring(0, 5);
          }
        }

        const hasDatang = jamDatang !== '-';
        const hasPulang = jamPulang !== '-';

        let isAlpaIncomplete = false;
        if (hasDatang && !hasPulang) {
          if (!izinMatch) {
            if (dStr < todayStr) {
              isAlpaIncomplete = true;
            }
          }
        }

        if (isAlpaIncomplete) {
          status = 'Alpa';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          countAlpa++;
          keterangan = 'Tidak Hadir (Hanya Absen Datang)';
        } else {
          status = 'Hadir';
          statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
          countHadir++;
          keterangan = presensiMatch.tipeAbsen || 'Presensi Mandiri';
          if (hasDatang && !hasPulang && izinMatch) {
            keterangan += ' (Izin Pulang)';
          }
        }

        photo = presensiMatch.photo || null;
        timeLog = jamDatang !== '-' ? (jamPulang !== '-' ? `${jamDatang} - ${jamPulang}` : jamDatang) : '-';
      } else if (izinMatch) {
        const st = String(izinMatch.status || '').toLowerCase();
        if (st.includes('sakit')) {
          status = 'Sakit';
          statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
          countSakit++;
        } else if (st.includes('dinas') || st.includes('cuti') || st.includes('dl')) {
          status = st.includes('cuti') ? 'Cuti' : 'Dinas Luar';
          statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
          countCutiDL++;
        } else {
          status = 'Izin';
          statusBadge = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
          countIzin++;
        }
        timeLog = izinMatch.waktu ? String(izinMatch.waktu).substring(0, 5) : '-';
        jamDatang = timeLog;
        keterangan = izinMatch.alasan || 'Permohonan Resmi';
      } else if (isWeekend) {
        status = 'Libur Akhir Pekan';
        statusBadge = 'bg-slate-100 text-slate-400 border-slate-200';
        keterangan = 'Akhir Pekan';
      } else if (holidayMatch) {
        status = 'Hari Libur';
        statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
        keterangan = holidayMatch.nama || holidayMatch.kategori || 'Hari Libur';
      } else if (day < effectiveStartDay) {
        status = 'Belum Dimulai';
        statusBadge = 'bg-slate-50 text-slate-400 border-slate-200/60 font-medium';
        keterangan = `Sebelum Mulai Periode (Tgl ${effectiveStartDay})`;
      } else if (dStr < todayStr) {
        status = 'Alpa';
        statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
        keterangan = 'Tanpa Keterangan';
        countAlpa++;
      } else if (dStr === todayStr) {
        const isPastCutoff = new Date().getHours() >= 17;
        if (isPastCutoff) {
          status = 'Alpa';
          statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
          keterangan = 'Tanpa Keterangan';
          countAlpa++;
        } else {
          status = 'Belum Absen';
          statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
          keterangan = 'Hari Ini (Dalam Proses)';
        }
      } else {
        status = 'Belum Berlangsung';
        statusBadge = 'bg-slate-50 text-slate-400 border-slate-200/60';
        keterangan = '-';
      }

      dayRows.push({
        dayNumber: day,
        tanggal: dStr,
        dayName,
        status,
        statusBadge,
        jamDatang,
        jamPulang,
        timeLog,
        keterangan,
        photo,
      });
    }

    const totalHariKerja = rekapTendikTargetDays || 22;
    const persentase = totalHariKerja > 0 ? Math.min(100, Math.round((countHadir / totalHariKerja) * 100)) : 0;

    return {
      selectedObj,
      targetNip,
      targetNama,
      monthLabel: new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      totalDaysInMonth,
      dayRows,
      countHadir,
      countIzin,
      countSakit,
      countCutiDL,
      countAlpa,
      totalHariKerja,
      persentase,
    };
  }, [rekapTendikMonth, rekapTendikNip, rekapTendikTargetDays, rekapTendikStartDay, listTendikUsers, tendikAbsenHistory, tendikIzinHistory, currentUser, holidayList]);

  // Handlers for Guru Monthly
  const handleSaveGuruMonthlyToSheets = async () => {
    setIsSavingGuruRecap(true);
    setSavingRecapMsg('');
    try {
      if (rekapGuruNip === 'ALL') {
        let successCount = 0;
        for (const g of allGuruMonthlyList) {
          const res = await apiClient.saveGuruMonthlyRecap({
            bulanTahun: rekapGuruMonth,
            nip: g.nip || 'GURU',
            namaGuru: g.nama || 'Guru',
            hadir: g.countHadir,
            izin: g.countIzin,
            sakit: g.countSakit,
            cutiDL: g.countCutiDL,
            alpa: g.countAlpa,
            totalHari: g.totalHariKerja,
            persentase: g.persentase,
            catatan: `Rekap Kehadiran Semua Guru Bulan ${guruMonthlyData.monthLabel}`,
            dayRows: g.dayRows,
          });
          if (res && res.status === 'success') successCount++;
        }
        setSavingRecapMsg(`✅ Berhasil menyimpan rekap bulanan untuk ${successCount} dari ${allGuruMonthlyList.length} guru ke spreadsheet!`);
      } else {
        const res = await apiClient.saveGuruMonthlyRecap({
          bulanTahun: rekapGuruMonth,
          nip: guruMonthlyData.targetNip || 'GURU',
          namaGuru: guruMonthlyData.targetNama || 'Guru',
          hadir: guruMonthlyData.countHadir,
          izin: guruMonthlyData.countIzin,
          sakit: guruMonthlyData.countSakit,
          cutiDL: guruMonthlyData.countCutiDL,
          alpa: guruMonthlyData.countAlpa,
          totalHari: guruMonthlyData.totalHariKerja,
          persentase: guruMonthlyData.persentase,
          catatan: `Rekap Kehadiran Bulan ${guruMonthlyData.monthLabel}`,
          dayRows: guruMonthlyData.dayRows,
        });
        if (res && res.status === 'success') {
          setSavingRecapMsg('✅ ' + (res.message || 'Rekap bulanan Guru berhasil disimpan ke spreadsheet!'));
        } else {
          setSavingRecapMsg('❌ Gagal menyimpan: ' + (res?.message || 'Terjadi kesalahan'));
        }
      }
    } catch (e: any) {
      setSavingRecapMsg('❌ Error: ' + e.message);
    } finally {
      setIsSavingGuruRecap(false);
      setTimeout(() => setSavingRecapMsg(''), 5000);
    }
  };

  const handleExportGuruMonthlyPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    renderOfficialKopSurat(doc, customization);

    const primaryColor: [number, number, number] = [37, 99, 235];

    if (rekapGuruNip === 'ALL') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('LAPORAN REKAPITULASI KEHADIRAN BULANAN SEMUA GURU', 105, 40, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Bulan / Periode: ${guruMonthlyData.monthLabel}  |  Target: ${rekapGuruTargetDays} Hari Kerja`, 105, 45, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      const tableBody: any[] = allGuruMonthlyList.map((g, idx) => [
        idx + 1,
        g.nip || '-',
        g.nama,
        `${g.countHadir}`,
        `${g.countIzin}`,
        `${g.countSakit}`,
        `${g.countCutiDL}`,
        `${g.countAlpa}`,
        `${g.persentase}%`
      ]);

      const totalHadir = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countHadir, 0);
      const totalIzin = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countIzin, 0);
      const totalSakit = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countSakit, 0);
      const totalCutiDL = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countCutiDL, 0);
      const totalAlpa = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countAlpa, 0);
      const avgPersentase = allGuruMonthlyList.length > 0
        ? Math.round(allGuruMonthlyList.reduce((acc, curr) => acc + curr.persentase, 0) / allGuruMonthlyList.length)
        : 0;

      tableBody.push([
        '',
        'TOTAL',
        `${allGuruMonthlyList.length} Orang Guru`,
        `${totalHadir}`,
        `${totalIzin}`,
        `${totalSakit}`,
        `${totalCutiDL}`,
        `${totalAlpa}`,
        `${avgPersentase}%`
      ]);

      autoTable(doc, {
        startY: 52,
        head: [['No', 'NIP', 'Nama Guru', 'Hadir', 'Izin', 'Sakit', 'Cuti/DL', 'Alpa', '% Hadir']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 32, halign: 'center' },
          2: { cellWidth: 46 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 14, halign: 'center' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 14, halign: 'center' },
          8: { cellWidth: 18, halign: 'center' },
        },
        margin: { left: 15, right: 15 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 12;
      if (currentY > 230) {
        doc.addPage();
        currentY = 25;
      }

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text('Mengetahui, Kepala Sekolah,', 135, currentY);

      doc.setFont('Helvetica', 'bold');
      doc.text(`( ${customization?.kepalaSekolahNama || '....................'} )`, 135, currentY + 25);
      doc.text(`NIP. ${customization?.kepalaSekolahNip || '....................'}`, 135, currentY + 30);

      doc.save(`Rekap_Bulanan_Semua_Guru_${rekapGuruMonth}.pdf`);
      return;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI KEHADIRAN BULANAN GURU (PERSEORANGAN)', 105, 40, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Bulan / Periode: ${guruMonthlyData.monthLabel}`, 105, 45, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Nama Guru    : ${guruMonthlyData.targetNama}`, 15, 54);
    doc.text(`NIP                 : ${guruMonthlyData.targetNip || '-'}`, 15, 59);
    doc.text(`Target Hari   : ${guruMonthlyData.totalHariKerja} Hari Kerja`, 120, 54);
    doc.text(`Persentase   : ${guruMonthlyData.persentase}% Kehadiran`, 120, 59);

    autoTable(doc, {
      startY: 64,
      head: [['Hadir', 'Izin', 'Sakit', 'Cuti / DL', 'Alpa', 'Total Hari Kerja', 'Persentase']],
      body: [[
        `${guruMonthlyData.countHadir} Hari`,
        `${guruMonthlyData.countIzin} Hari`,
        `${guruMonthlyData.countSakit} Hari`,
        `${guruMonthlyData.countCutiDL} Hari`,
        `${guruMonthlyData.countAlpa} Hari`,
        `${guruMonthlyData.totalHariKerja} Hari`,
        `${guruMonthlyData.persentase}%`
      ]],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center', textColor: [30, 41, 59], fontStyle: 'bold' },
      margin: { left: 15, right: 15 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RINCIAN PRESENSI HARIAN:', 15, currentY);

    const tableBody = guruMonthlyData.dayRows.map((r) => [
      r.dayNumber,
      r.tanggal,
      r.dayName,
      r.status,
      r.jamDatang,
      r.jamPulang,
      r.keterangan
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Tgl', 'Tanggal Lengkap', 'Hari', 'Status Kehadiran', 'Jam Datang', 'Jam Pulang', 'Keterangan']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 'auto' }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text('Guru Yang Bersangkutan,', 25, currentY);
    doc.text('Mengetahui, Kepala Sekolah,', 135, currentY);

    doc.setFont('Helvetica', 'bold');
    doc.text(`( ${guruMonthlyData.targetNama} )`, 25, currentY + 25);
    doc.text(`NIP. ${guruMonthlyData.targetNip || '....................'}`, 25, currentY + 30);

    doc.text(`( ${customization?.kepalaSekolahNama || '....................'} )`, 135, currentY + 25);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '....................'}`, 135, currentY + 30);

    doc.save(`Rekap_Bulanan_Guru_${guruMonthlyData.targetNip}_${rekapGuruMonth}.pdf`);
  };

  const handleExportGuruMonthlyExcel = () => {
    if (rekapGuruNip === 'ALL') {
      const dataForSheet = allGuruMonthlyList.map((g, idx) => ({
        'No': idx + 1,
        'NIP': g.nip || '-',
        'Nama Guru': g.nama,
        'Jumlah Hadir': g.countHadir,
        'Jumlah Izin': g.countIzin,
        'Jumlah Sakit': g.countSakit,
        'Jumlah Cuti / DL': g.countCutiDL,
        'Jumlah Alpa / Tanpa Keterangan': g.countAlpa,
        'Target Hari Kerja': g.totalHariKerja,
        'Persentase Kehadiran (%)': `${g.persentase}%`
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Semua Guru');
      XLSX.writeFile(workbook, `Rekap_Bulanan_Semua_Guru_${rekapGuruMonth}.xlsx`);
      return;
    }

    const dataForSheet = guruMonthlyData.dayRows.map(r => ({
      'No Tanggal': r.dayNumber,
      'Tanggal': r.tanggal,
      'Hari': r.dayName,
      'Status Kehadiran': r.status,
      'Jam Presensi': r.timeLog,
      'Keterangan': r.keterangan
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Bulanan Guru');
    XLSX.writeFile(workbook, `Rekap_Bulanan_Guru_${guruMonthlyData.targetNip}_${rekapGuruMonth}.xlsx`);
  };

  // Handlers for Tendik Monthly
  const handleSaveTendikMonthlyToSheets = async () => {
    setIsSavingTendikRecap(true);
    setSavingRecapMsg('');
    try {
      if (rekapTendikNip === 'ALL') {
        let successCount = 0;
        for (const t of allTendikMonthlyList) {
          const res = await apiClient.saveTendikMonthlyRecap({
            bulanTahun: rekapTendikMonth,
            nip: t.nip || 'TENDIK',
            namaTendik: t.nama || 'Tendik',
            hadir: t.countHadir,
            izin: t.countIzin,
            sakit: t.countSakit,
            cutiDL: t.countCutiDL,
            alpa: t.countAlpa,
            totalHari: t.totalHariKerja,
            persentase: t.persentase,
            catatan: `Rekap Kehadiran Semua Tendik Bulan ${tendikMonthlyData.monthLabel}`,
            dayRows: t.dayRows,
          });
          if (res && res.status === 'success') successCount++;
        }
        setSavingRecapMsg(`✅ Berhasil menyimpan rekap bulanan untuk ${successCount} dari ${allTendikMonthlyList.length} tendik ke spreadsheet!`);
      } else {
        const res = await apiClient.saveTendikMonthlyRecap({
          bulanTahun: rekapTendikMonth,
          nip: tendikMonthlyData.targetNip || 'TENDIK',
          namaTendik: tendikMonthlyData.targetNama || 'Tendik',
          hadir: tendikMonthlyData.countHadir,
          izin: tendikMonthlyData.countIzin,
          sakit: tendikMonthlyData.countSakit,
          cutiDL: tendikMonthlyData.countCutiDL,
          alpa: tendikMonthlyData.countAlpa,
          totalHari: tendikMonthlyData.totalHariKerja,
          persentase: tendikMonthlyData.persentase,
          catatan: `Rekap Kehadiran Bulan ${tendikMonthlyData.monthLabel}`,
          dayRows: tendikMonthlyData.dayRows,
        });
        if (res && res.status === 'success') {
          setSavingRecapMsg('✅ ' + (res.message || 'Rekap bulanan Tendik berhasil disimpan ke spreadsheet!'));
        } else {
          setSavingRecapMsg('❌ Gagal menyimpan: ' + (res?.message || 'Terjadi kesalahan'));
        }
      }
    } catch (e: any) {
      setSavingRecapMsg('❌ Error: ' + e.message);
    } finally {
      setIsSavingTendikRecap(false);
      setTimeout(() => setSavingRecapMsg(''), 5000);
    }
  };

  const handleExportTendikMonthlyPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    renderOfficialKopSurat(doc, customization);

    const primaryColor: [number, number, number] = [16, 185, 129];

    if (rekapTendikNip === 'ALL') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('LAPORAN REKAPITULASI KEHADIRAN BULANAN SEMUA TENDIK', 105, 40, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Bulan / Periode: ${tendikMonthlyData.monthLabel}  |  Target: ${rekapTendikTargetDays} Hari Kerja`, 105, 45, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      const tableBody: any[] = allTendikMonthlyList.map((t, idx) => [
        idx + 1,
        t.nip || '-',
        t.nama,
        `${t.countHadir}`,
        `${t.countIzin}`,
        `${t.countSakit}`,
        `${t.countCutiDL}`,
        `${t.countAlpa}`,
        `${t.persentase}%`
      ]);

      const totalHadir = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countHadir, 0);
      const totalIzin = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countIzin, 0);
      const totalSakit = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countSakit, 0);
      const totalCutiDL = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countCutiDL, 0);
      const totalAlpa = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countAlpa, 0);
      const avgPersentase = allTendikMonthlyList.length > 0
        ? Math.round(allTendikMonthlyList.reduce((acc, curr) => acc + curr.persentase, 0) / allTendikMonthlyList.length)
        : 0;

      tableBody.push([
        '',
        'TOTAL',
        `${allTendikMonthlyList.length} Orang Tendik`,
        `${totalHadir}`,
        `${totalIzin}`,
        `${totalSakit}`,
        `${totalCutiDL}`,
        `${totalAlpa}`,
        `${avgPersentase}%`
      ]);

      autoTable(doc, {
        startY: 52,
        head: [['No', 'NIP', 'Nama Tendik', 'Hadir', 'Izin', 'Sakit', 'Cuti/DL', 'Alpa', '% Hadir']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 32, halign: 'center' },
          2: { cellWidth: 46 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 14, halign: 'center' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 14, halign: 'center' },
          8: { cellWidth: 18, halign: 'center' },
        },
        margin: { left: 15, right: 15 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 12;
      if (currentY > 230) {
        doc.addPage();
        currentY = 25;
      }

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text('Mengetahui, Kepala Sekolah,', 135, currentY);

      doc.setFont('Helvetica', 'bold');
      doc.text(`( ${customization?.kepalaSekolahNama || '....................'} )`, 135, currentY + 25);
      doc.text(`NIP. ${customization?.kepalaSekolahNip || '....................'}`, 135, currentY + 30);

      doc.save(`Rekap_Bulanan_Semua_Tendik_${rekapTendikMonth}.pdf`);
      return;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI KEHADIRAN BULANAN TENDIK (PERSEORANGAN)', 105, 40, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Bulan / Periode: ${tendikMonthlyData.monthLabel}`, 105, 45, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Nama Tendik : ${tendikMonthlyData.targetNama}`, 15, 54);
    doc.text(`NIP                 : ${tendikMonthlyData.targetNip || '-'}`, 15, 59);
    doc.text(`Target Hari   : ${tendikMonthlyData.totalHariKerja} Hari Kerja`, 120, 54);
    doc.text(`Persentase   : ${tendikMonthlyData.persentase}% Kehadiran`, 120, 59);

    autoTable(doc, {
      startY: 64,
      head: [['Hadir', 'Izin', 'Sakit', 'Cuti / DL', 'Alpa', 'Total Hari Kerja', 'Persentase']],
      body: [[
        `${tendikMonthlyData.countHadir} Hari`,
        `${tendikMonthlyData.countIzin} Hari`,
        `${tendikMonthlyData.countSakit} Hari`,
        `${tendikMonthlyData.countCutiDL} Hari`,
        `${tendikMonthlyData.countAlpa} Hari`,
        `${tendikMonthlyData.totalHariKerja} Hari`,
        `${tendikMonthlyData.persentase}%`
      ]],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center', textColor: [30, 41, 59], fontStyle: 'bold' },
      margin: { left: 15, right: 15 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RINCIAN PRESENSI HARIAN:', 15, currentY);

    const tableBody = tendikMonthlyData.dayRows.map((r) => [
      r.dayNumber,
      r.tanggal,
      r.dayName,
      r.status,
      r.jamDatang,
      r.jamPulang,
      r.keterangan
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Tgl', 'Tanggal Lengkap', 'Hari', 'Status Kehadiran', 'Jam Datang', 'Jam Pulang', 'Keterangan']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 'auto' }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text('Tendik Yang Bersangkutan,', 25, currentY);
    doc.text('Mengetahui, Kepala Sekolah,', 135, currentY);

    doc.setFont('Helvetica', 'bold');
    doc.text(`( ${tendikMonthlyData.targetNama} )`, 25, currentY + 25);
    doc.text(`NIP. ${tendikMonthlyData.targetNip || '....................'}`, 25, currentY + 30);

    doc.text(`( ${customization?.kepalaSekolahNama || '....................'} )`, 135, currentY + 25);
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '....................'}`, 135, currentY + 30);

    doc.save(`Rekap_Bulanan_Tendik_${tendikMonthlyData.targetNip}_${rekapTendikMonth}.pdf`);
  };

  const handleExportTendikMonthlyExcel = () => {
    if (rekapTendikNip === 'ALL') {
      const dataForSheet = allTendikMonthlyList.map((t, idx) => ({
        'No': idx + 1,
        'NIP': t.nip || '-',
        'Nama Tendik': t.nama,
        'Jumlah Hadir': t.countHadir,
        'Jumlah Izin': t.countIzin,
        'Jumlah Sakit': t.countSakit,
        'Jumlah Cuti / DL': t.countCutiDL,
        'Jumlah Alpa / Tanpa Keterangan': t.countAlpa,
        'Target Hari Kerja': t.totalHariKerja,
        'Persentase Kehadiran (%)': `${t.persentase}%`
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Semua Tendik');
      XLSX.writeFile(workbook, `Rekap_Bulanan_Semua_Tendik_${rekapTendikMonth}.xlsx`);
      return;
    }

    const dataForSheet = tendikMonthlyData.dayRows.map(r => ({
      'No Tanggal': r.dayNumber,
      'Tanggal': r.tanggal,
      'Hari': r.dayName,
      'Status Kehadiran': r.status,
      'Jam Presensi': r.timeLog,
      'Keterangan': r.keterangan
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Bulanan Tendik');
    XLSX.writeFile(workbook, `Rekap_Bulanan_Tendik_${tendikMonthlyData.targetNip}_${rekapTendikMonth}.xlsx`);
  };

  // Auto-set selectedGuru if currentUser is a Teacher (not Admin)
  useEffect(() => {
    if (currentUser?.nama && !selectedGuru && !isAdminUser(currentUser) && currentUser?.role === 'Guru') {
      setSelectedGuru(currentUser.nama);
    }
  }, [currentUser, selectedGuru]);

  // Compute restricted teachers for dropdown (excluding Admin & Admin Utama)
  const filteredTeachersForRecap = useMemo(() => {
    if (isFullAccess) return teachers.filter(t => !isAdminUser(t));
    if (currentUser?.role === 'Guru' && currentUser?.nama && !isAdminUser(currentUser)) {
      return teachers.filter(t => matchTeacher(t.nama, currentUser.nama) && !isAdminUser(t));
    }
    return teachers.filter(t => !isAdminUser(t));
  }, [isFullAccess, currentUser, teachers]);

  // Compute classes taught by selected teacher
  const classesTaughtByGuru = useMemo(() => {
    if (isFullAccess) return kelasList || [];
    if (!selectedGuru) return [];
    const classSet = new Set<string>();
    (allHistory || []).forEach((r) => {
      if (r && r.guru && matchTeacher(r.guru, selectedGuru) && r.kelas) {
        classSet.add(r.kelas);
      }
    });
    const list = Array.from(classSet).sort();
    return list.length > 0 ? list : (kelasList || []);
  }, [selectedGuru, allHistory, kelasList, isFullAccess]);

  // Compute mapels taught by selected teacher
  const mapelsTaughtByGuru = useMemo(() => {
    if (isFullAccess) return mapels || [];
    if (!selectedGuru) return [];
    const mapelSet = new Set<string>();
    (allHistory || []).forEach((r) => {
      if (r && r.guru && matchTeacher(r.guru, selectedGuru) && r.mapel) {
        mapelSet.add(r.mapel);
      }
    });
    const list = Array.from(mapelSet).sort();
    return list.length > 0 ? list : (mapels || []);
  }, [selectedGuru, allHistory, mapels, isFullAccess]);

  // Auto-select class when classesTaughtByGuru updates
  useEffect(() => {
    if (classesTaughtByGuru && classesTaughtByGuru.length > 0 && (!selectedGuruClass || !classesTaughtByGuru.includes(selectedGuruClass))) {
      setSelectedGuruClass(classesTaughtByGuru[0]);
    }
  }, [classesTaughtByGuru, selectedGuruClass]);

  // Fetch roster when selectedGuruClass changes
  useEffect(() => {
    if ((subTab === 'rekap-kelas-guru' || subTab === 'rekap-pdf') && selectedGuruClass) {
      setIsLoadingRoster(true);
      apiClient.getStudents(selectedGuruClass)
        .then((res) => {
          if (res && res.status === 'success' && Array.isArray(res.students) && res.students.length > 0) {
            setStudentsRoster(res.students);
          } else {
            apiClient.getCrud('Master_Siswa').then((crudRes) => {
              if (crudRes && crudRes.status === 'success' && Array.isArray(crudRes.rows)) {
                const headersLower = (crudRes.headers || []).map((h) => String(h || '').toLowerCase().trim());
                const nisnIdx = headersLower.indexOf('nisn');
                const namaIdx = headersLower.indexOf('nama') !== -1 ? headersLower.indexOf('nama') : headersLower.indexOf('nama siswa');
                const kelasIdx = headersLower.indexOf('kelas');
                const genderIdx = headersLower.indexOf('jenis kelamin') !== -1 ? headersLower.indexOf('jenis kelamin') : headersLower.indexOf('jk');

                const filtered = crudRes.rows
                  .map((row) => ({
                    id: row.rowIndex,
                    nisn: (nisnIdx !== -1 && row.data) ? row.data[nisnIdx] : '',
                    nama: (namaIdx !== -1 && row.data) ? row.data[namaIdx] : '',
                    kelas: (kelasIdx !== -1 && row.data) ? row.data[kelasIdx] : '',
                    gender: (genderIdx !== -1 && row.data) ? row.data[genderIdx] : 'Laki-laki',
                    tipe: row.data?.[6] || '',
                    fontColor: row.fontColor || row.data?.[7] || '',
                    bgColor: row.bgColor || row.data?.[8] || '',
                  }))
                  .filter((s) => s.nama && s.kelas && String(s.kelas).toLowerCase().trim() === String(selectedGuruClass || '').toLowerCase().trim());

                setStudentsRoster(filtered);
              } else {
                setStudentsRoster([]);
              }
            }).catch(() => setStudentsRoster([]));
          }
        })
        .catch(() => setStudentsRoster([]))
        .finally(() => setIsLoadingRoster(false));
    }
  }, [subTab, selectedGuruClass]);

  // Load full Master_Siswa list when kiosk-siswa tab is active to construct roster for class summary
  useEffect(() => {
    if (subTab === 'kiosk-siswa' && masterSiswaList.length === 0) {
      apiClient.getCrud('Master_Siswa').then((crudRes) => {
        if (crudRes && crudRes.status === 'success' && Array.isArray(crudRes.rows)) {
          const headersLower = (crudRes.headers || []).map((h) => String(h || '').toLowerCase().trim());
          const nisnIdx = headersLower.indexOf('nisn');
          const namaIdx = headersLower.indexOf('nama') !== -1 ? headersLower.indexOf('nama') : headersLower.indexOf('nama siswa');
          const kelasIdx = headersLower.indexOf('kelas');

          const list = crudRes.rows
            .map((row) => ({
              id: row.rowIndex,
              nisn: (nisnIdx !== -1 && row.data) ? String(row.data[nisnIdx] || '').trim() : '',
              nama: (namaIdx !== -1 && row.data) ? String(row.data[namaIdx] || '').trim() : '',
              kelas: (kelasIdx !== -1 && row.data) ? String(row.data[kelasIdx] || '').trim() : '',
            }))
            .filter((s) => s.nama);

          setMasterSiswaList(list);
        }
      }).catch(() => {});
    }
  }, [subTab, masterSiswaList.length]);

  // Matrix calculation per student
  const classStudentMatrix = useMemo(() => {
    if (!selectedGuru || !selectedGuruClass || !Array.isArray(studentsRoster)) return [];

    const start = tanggalMulai ? new Date(tanggalMulai) : new Date(0);
    const end = tanggalAkhir ? new Date(tanggalAkhir) : new Date(8640000000000000);

    const matchedSessions = (allHistory || []).filter((record) => {
      if (!record) return false;
      const matchG = matchTeacher(record.guru, selectedGuru);
      const matchK = record.kelas && String(record.kelas).toLowerCase().trim() === String(selectedGuruClass).toLowerCase().trim();
      const matchM = !selectedMapel || matchMapel(record.mapel, selectedMapel);
      const recordDate = new Date(record.tanggal);
      const matchDate = recordDate >= start && recordDate <= end;
      return matchG && matchK && matchM && matchDate;
    });

    const totalSessions = matchedSessions.length;

    return (studentsRoster || [])
      .filter((s) => s && (s.nama || s.nisn))
      .map((s, idx) => {
        let hadirCount = 0;
        let sakitCount = 0;
        let izinCount = 0;
        let alpaCount = 0;
        let terlambatCount = 0;

        matchedSessions.forEach((session) => {
          const ket = (session.keterangan || '').toLowerCase();
          const studentNameLow = String(s.nama || '').toLowerCase();
          const studentFirstName = studentNameLow.split(' ')[0] || '';

          if (studentNameLow && ket.includes(`sakit: ${studentNameLow}`) || (studentFirstName.length > 2 && ket.includes(`sakit: ${studentFirstName}`))) {
            sakitCount++;
          } else if (studentNameLow && ket.includes(`izin: ${studentNameLow}`) || (studentFirstName.length > 2 && ket.includes(`izin: ${studentFirstName}`))) {
            izinCount++;
          } else if (studentNameLow && ket.includes(`alpa: ${studentNameLow}`) || (studentFirstName.length > 2 && ket.includes(`alpa: ${studentFirstName}`))) {
            alpaCount++;
          } else if (studentNameLow && ket.includes(`terlambat: ${studentNameLow}`) || (studentFirstName.length > 2 && ket.includes(`terlambat: ${studentFirstName}`))) {
            hadirCount++;
            terlambatCount++;
          } else {
            hadirCount++;
          }
        });

        // Cross-reference kiosk scans
        const studentKioskScans = (kioskHistory || []).filter((k) => {
          if (!k) return false;
          const matchN = (k.nisn && s.nisn && k.nisn === s.nisn) || (k.nama && s.nama && String(k.nama).toLowerCase().trim() === String(s.nama).toLowerCase().trim());
          const recordDate = new Date(k.tanggal || '');
          const matchDate = recordDate >= start && recordDate <= end;
          return matchN && matchDate;
        });

        if (totalSessions === 0 && studentKioskScans.length > 0) {
          studentKioskScans.forEach((k) => {
            if (k.status === 'Hadir') hadirCount++;
            else if (k.status === 'Terlambat') { hadirCount++; terlambatCount++; }
            else if (k.status === 'Sakit') sakitCount++;
            else if (k.status === 'Izin') izinCount++;
            else if (k.status === 'Alpa') alpaCount++;
          });
        }

        const effectiveSessions = totalSessions || (hadirCount + sakitCount + izinCount + alpaCount) || 1;
        const persentase = Math.min(100, Math.round((hadirCount / effectiveSessions) * 100));

        let statusBadge = 'Sangat Baik';
        let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (persentase < 70 || alpaCount > 2) {
          statusBadge = 'Alpa Tinggi';
          badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
        } else if (persentase < 80 || sakitCount + izinCount + alpaCount > 3) {
          statusBadge = 'Perlu Perhatian';
          badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
        } else if (persentase < 90) {
          statusBadge = 'Baik';
          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        }

        return {
          no: idx + 1,
          id: s.id || idx,
          nisn: s.nisn || '-',
          nama: s.nama || 'Siswa',
          gender: s.gender || 'Laki-laki',
          tipe: s.tipe || '',
          fontColor: s.fontColor || '',
          bgColor: s.bgColor || '',
          kelas: selectedGuruClass,
          totalSessions: effectiveSessions,
          hadir: hadirCount,
          sakit: sakitCount,
          izin: izinCount,
          alpa: alpaCount,
          terlambat: terlambatCount,
          persentase,
          statusBadge,
          badgeColor,
        };
      });
  }, [selectedGuru, selectedGuruClass, selectedMapel, tanggalMulai, tanggalAkhir, allHistory, kioskHistory, studentsRoster]);

  const handleSaveClassRecapToSpreadsheet = async () => {
    if (!selectedGuru || !selectedGuruClass) {
      alert('Harap pilih Guru Pengampu dan Kelas terlebih dahulu!');
      return;
    }
    if (classStudentMatrix.length === 0) {
      alert('Tidak ada data siswa untuk disimpan.');
      return;
    }

    setIsSavingRecap(true);
    try {
      const payload = {
        guru: selectedGuru,
        kelas: selectedGuruClass,
        mapel: selectedMapel || 'Semua Mapel',
        periode: `${tanggalMulai} s/d ${tanggalAkhir}`,
        tanggal: getLocalDateString(),
        recapRows: classStudentMatrix.map((r) => ({
          nisn: r.nisn,
          nama: r.nama,
          hadir: r.hadir,
          sakit: r.sakit,
          izin: r.izin,
          alpa: r.alpa,
          terlambat: r.terlambat,
          persentase: r.persentase,
          status: r.statusBadge,
        })),
      };

      const res = await apiClient.saveStudentClassRecap(payload);
      alert(res.message || 'Rekap kehadiran siswa per kelas berhasil disimpan ke Spreadsheet!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyimpan rekap: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSavingRecap(false);
    }
  };

  const handleDownloadClassMatrixPDF = () => {
    if (classStudentMatrix.length === 0) {
      alert('Tidak ada data siswa untuk dicetak.');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const primaryColor: [number, number, number] = [30, 41, 59];

    // Official Kop Surat Header
    renderOfficialKopSurat(doc, customization);

    // Title
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`LAPORAN REKAPITULASI KEHADIRAN SISWA KELAS ${selectedGuruClass}`, 105, 40, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${tanggalMulai} s/d ${tanggalAkhir}`, 105, 45, { align: 'center' });

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 49, 190, 15, 2, 2, 'FD');

    const avgRate = classStudentMatrix.length > 0
      ? Math.round(classStudentMatrix.reduce((acc, curr) => acc + curr.persentase, 0) / classStudentMatrix.length)
      : 0;

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Guru Pengampu : ${selectedGuru}`, 14, 54);
    doc.text(`Mata Pelajaran : ${selectedMapel || 'Semua Mata Pelajaran'}`, 14, 59);

    doc.text(`Total Siswa          : ${classStudentMatrix.length} Siswa`, 120, 54);
    doc.text(`Rata-rata Kelas : ${avgRate}% Kehadiran`, 120, 59);

    const tableBody = classStudentMatrix.map((r, i) => [
      i + 1,
      r.nisn || '-',
      r.nama,
      r.gender ? r.gender.charAt(0) : 'L',
      r.totalSessions,
      r.hadir,
      r.sakit,
      r.izin,
      r.alpa,
      r.terlambat,
      `${r.persentase}%`,
      r.statusBadge,
    ]);

    autoTable(doc, {
      startY: 63,
      head: [['No', 'NISN', 'Nama Siswa', 'JK', 'Sesi', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Terl.', '% Hadir', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 22 },
        2: { cellWidth: 48 },
        3: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 12 },
        7: { halign: 'center', cellWidth: 12 },
        8: { halign: 'center', cellWidth: 12 },
        9: { halign: 'center', cellWidth: 12 },
        10: { halign: 'center', cellWidth: 14 },
        11: { halign: 'center', cellWidth: 18 },
      },
      margin: { left: 10, right: 10 },
    });

    let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 180;

    if (finalY + 45 > 280) {
      doc.addPage();
      finalY = 25;
    }

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const leftX = 20;
    const rightX = 135;

    doc.text('Mengetahui,', leftX, finalY);
    doc.text('Kepala Sekolah', leftX, finalY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.text(customization?.kepalaSekolahNama || 'Kepala Sekolah', leftX, finalY + 25);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIP. ${customization?.kepalaSekolahNip || '-'}`, leftX, finalY + 30);

    doc.text(`Palu, ${formattedDateStr}`, rightX, finalY);
    doc.text('Guru Pengampu Mata Pelajaran', rightX, finalY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.text(selectedGuru, rightX, finalY + 25);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIP. ${teachers.find((t) => t.nama === selectedGuru)?.nip || '-'}`, rightX, finalY + 30);

    doc.save(`Rekap_Kehadiran_Siswa_Kelas_${selectedGuruClass}_${selectedGuru.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportClassMatrixExcel = () => {
    if (classStudentMatrix.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const todayStr = getLocalDateString();

    const dataRows = [
      ['REKAPITULASI KEHADIRAN SISWA PER KELAS'],
      [`Sekolah: ${customization?.appName || 'SMP NEGERI 11 PALU'}`],
      [`Guru Pengampu: ${selectedGuru}`, `Mata Pelajaran: ${selectedMapel || 'Semua Mapel'}`, `Kelas: ${selectedGuruClass}`],
      [`Periode: ${tanggalMulai} s/d ${tanggalAkhir}`, `Tanggal Unduh: ${todayStr}`],
      [],
      ['ID_Rekap', 'TanggalRekap', 'GuruPengampu', 'MataPelajaran', 'Kelas', 'NISN', 'NamaSiswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'PersentaseKehadiran', 'Status']
    ];

    classStudentMatrix.forEach((r) => {
      dataRows.push([
        `RKP-${selectedGuruClass}-${r.nisn || '0'}`,
        todayStr,
        selectedGuru,
        selectedMapel || 'Semua Mapel',
        selectedGuruClass,
        r.nisn || '-',
        r.nama,
        r.hadir,
        r.sakit,
        r.izin,
        r.alpa,
        r.terlambat,
        `${r.persentase}%`,
        r.statusBadge
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    ws['!cols'] = [
      { wch: 22 }, // ID_Rekap
      { wch: 14 }, // TanggalRekap
      { wch: 28 }, // GuruPengampu
      { wch: 22 }, // MataPelajaran
      { wch: 10 }, // Kelas
      { wch: 16 }, // NISN
      { wch: 30 }, // NamaSiswa
      { wch: 8 },  // Hadir
      { wch: 8 },  // Sakit
      { wch: 8 },  // Izin
      { wch: 8 },  // Alpa
      { wch: 10 }, // Terlambat
      { wch: 20 }, // PersentaseKehadiran
      { wch: 18 }  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap_Kelas_${selectedGuruClass}`);

    const fileName = `Rekap_Kehadiran_Kelas_${selectedGuruClass}_${selectedGuru.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Fetch Master lists and full history when opening PDF or Rekap Kelas tab
  useEffect(() => {
    if (subTab === 'rekap-pdf' || subTab === 'rekap-kelas-guru') {
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

  const handleApplySiswaFilter = async (targetPeriode = filterSiswaPeriode) => {
    setIsLoadingSiswa(true);
    try {
      const range = getDateRangeForPeriode(targetPeriode, filterSiswaTanggalAwal, filterSiswaTanggalAkhir);
      const queryDate = targetPeriode === 'hari_ini' ? range.startDate : '';
      await onFilterHistory(queryDate, filterSiswaKelas);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSiswa(false);
    }
  };

  const handleApplyGuruFilter = async (targetPeriode = filterGuruPeriode) => {
    setIsLoadingGuru(true);
    try {
      const range = getDateRangeForPeriode(targetPeriode, filterGuruTanggalAwal, filterGuruTanggalAkhir);
      const queryDate = targetPeriode === 'hari_ini' ? range.startDate : '';
      await onFilterTeacher(queryDate);
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
      // Pass empty string to load all records, filtering done in memo
      const [resAbsen, resIzin] = await Promise.all([
        apiClient.getTendikAttendanceHistory(''),
        apiClient.getTendikPermitHistory('')
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

  const handleApplyGuruAbsenFilter = async () => {
    const cachedAbsen = localStorage.getItem('absensi_history_guru_absen');
    let hasCache = false;
    if (cachedAbsen) {
      try {
        let parsed = JSON.parse(cachedAbsen);
        if (filterGuruTanggal) parsed = parsed.filter((h: any) => h.tanggal === filterGuruTanggal);
        setGuruAbsenHistory(parsed);
        hasCache = true;
      } catch (e) {}
    }

    if (!hasCache) {
      setIsLoadingGuru(true);
    }

    try {
      const res = await apiClient.getGuruAttendanceHistory('');
      if (res.status === 'success' && Array.isArray(res.history)) {
        setGuruAbsenHistory(res.history);
      }
    } catch (err) {
      console.error('Failed to load Guru attendance history:', err);
    } finally {
      setIsLoadingGuru(false);
    }
  };

  const handleApplyKioskFilter = async (targetPeriode = filterKioskPeriode) => {
    setIsLoadingKiosk(true);
    try {
      const range = getDateRangeForPeriode(targetPeriode, filterKioskTanggalAwal, filterKioskTanggalAkhir);
      const queryDate = targetPeriode === 'hari_ini' ? range.startDate : '';
      const res = await apiClient.getKioskAttendanceHistory(queryDate, filterKioskKelas);
      if (res.status === 'success' && Array.isArray(res.history)) {
        setKioskHistory(res.history);
      } else {
        setKioskHistory([]);
      }
    } catch (err) {
      console.error('Failed to load Kiosk history:', err);
      setKioskHistory([]);
    } finally {
      setIsLoadingKiosk(false);
    }
  };

  const handleClearKioskCache = async () => {
    if (!window.confirm('Bersihkan data cache lokal & dapatkan ulang dari Spreadsheet database?')) return;
    setIsLoadingKiosk(true);
    try {
      localStorage.setItem('absensi_kiosk_all_scans', '[]');
      localStorage.setItem('absensi_kiosk_today_list', '[]');
      await fetch('/api/kiosk-scans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      }).catch(() => {});
      apiClient.clearCache();
      const res = await apiClient.getKioskAttendanceHistory('', filterKioskKelas);
      if (res.status === 'success' && Array.isArray(res.history)) {
        setKioskHistory(res.history);
      } else {
        setKioskHistory([]);
      }
    } catch (err) {
      console.error(err);
      setKioskHistory([]);
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
    if (subTab === 'guru-absen') {
      handleApplyGuruAbsenFilter();
    }
  }, [subTab, filterGuruTanggal]);

  useEffect(() => {
    if (subTab === 'tendik-absen' || subTab === 'tendik-izin') {
      handleApplyTendikFilter();
    }
  }, [subTab, filterTendikTanggal]);

  const openDeleteConfirmModal = (
    rowIndex: string | number,
    type: 'siswa' | 'kiosk-siswa' | 'guru' | 'guru-absen' | 'tendik-absen' | 'tendik-izin',
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
      } else if (deletingRecordType === 'guru-absen') {
        await apiClient.deleteGuruAttendanceRecord(deletingRowIndex);
        await handleApplyGuruAbsenFilter();
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
    let tgl = item.tanggal || '';
    let wkt = item.waktu || '';
    let ts = item.timestamp || '';

    // If tgl contains raw JS date string (e.g. Sat Aug 15 2026 00:00:00 GM Aug WIB)
    if (tgl.match(/[a-zA-Z]/) && (tgl.includes('00:00:00') || tgl.includes('GMT') || tgl.includes('WIB') || tgl.length > 15)) {
      const p = new Date(tgl);
      if (!isNaN(p.getTime())) {
        tgl = getLocalDateString(p);
      }
    }

    if (wkt.match(/[a-zA-Z]/) && (wkt.includes('00:00:00') || wkt.includes('GMT') || wkt.includes('WIB') || wkt.length > 15)) {
      const p = new Date(wkt);
      if (!isNaN(p.getTime())) {
        wkt = getLocalTimeString(p);
      } else {
        wkt = '-';
      }
    }

    if (!tgl || !wkt || wkt === '-') {
      if (ts) {
        const p = new Date(ts);
        if (!isNaN(p.getTime())) {
          if (!tgl) {
            tgl = getLocalDateString(p);
          }
          if (!wkt || wkt === '-') {
            wkt = getLocalTimeString(p);
          }
        }
      }
    }

    return {
      tanggal: tgl || '-',
      waktu: wkt || '-',
    };
  };

  // 1. Filtered Siswa History
  const filteredSiswaHistory = useMemo(() => {
    return historyList.filter((item) => {
      if (filterSiswaKelas) {
        const targetK = filterSiswaKelas.toLowerCase();
        const itemK = (item.kelas || '').toLowerCase();
        if (itemK !== targetK && itemK !== `kelas ${targetK}` && `kelas ${itemK}` !== targetK) {
          return false;
        }
      }
      const range = getDateRangeForPeriode(filterSiswaPeriode, filterSiswaTanggalAwal, filterSiswaTanggalAkhir);
      if (filterSiswaTanggal && filterSiswaPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterSiswaTanggal, filterSiswaTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });
  }, [historyList, filterSiswaKelas, filterSiswaPeriode, filterSiswaTanggal, filterSiswaTanggalAwal, filterSiswaTanggalAkhir]);

  // 2. Filtered Kiosk History
  const filteredKioskHistory = useMemo(() => {
    return kioskHistory.filter((item) => {
      if (searchKioskNama.trim()) {
        const q = searchKioskNama.toLowerCase().trim();
        const matchN = (item.nama || '').toLowerCase().includes(q);
        const matchId = (item.nisn || '').toLowerCase().includes(q);
        const matchK = (item.kelas || '').toLowerCase().includes(q);
        if (!matchN && !matchId && !matchK) return false;
      }
      if (filterKioskKelas) {
        const targetK = filterKioskKelas.toLowerCase();
        const itemK = (item.kelas || '').toLowerCase();
        if (itemK !== targetK && itemK !== `kelas ${targetK}` && `kelas ${itemK}` !== targetK) {
          return false;
        }
      }
      const range = getDateRangeForPeriode(filterKioskPeriode, filterKioskTanggalAwal, filterKioskTanggalAkhir);
      if (filterKioskTanggal && filterKioskPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterKioskTanggal, filterKioskTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });
  }, [kioskHistory, searchKioskNama, filterKioskKelas, filterKioskPeriode, filterKioskTanggal, filterKioskTanggalAwal, filterKioskTanggalAkhir]);

  // 2.5. Kiosk Class Monthly Summary (Aggregated per student per class)
  const kioskClassMonthlySummary = useMemo(() => {
    if (!kioskHistory) return [];

    const filteredScans = kioskHistory.filter((item) => {
      if (filterKioskKelas) {
        const targetK = filterKioskKelas.toLowerCase().replace(/^kelas\s*/, '').trim();
        const itemK = (item.kelas || '').toLowerCase().replace(/^kelas\s*/, '').trim();
        if (targetK && itemK && targetK !== itemK) return false;
      }
      const range = getDateRangeForPeriode(filterKioskPeriode, filterKioskTanggalAwal, filterKioskTanggalAkhir);
      if (filterKioskTanggal && filterKioskPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterKioskTanggal, filterKioskTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });

    const studentMap = new Map<string, {
      nisn: string;
      nama: string;
      kelas: string;
      hadirTepatWaktu: number;
      terlambat: number;
      totalMenitTerlambat: number;
      totalScan: number;
    }>();

    if (masterSiswaList && masterSiswaList.length > 0) {
      masterSiswaList.forEach((s) => {
        if (filterKioskKelas) {
          const targetK = filterKioskKelas.toLowerCase().replace(/^kelas\s*/, '').trim();
          const sK = (s.kelas || '').toLowerCase().replace(/^kelas\s*/, '').trim();
          if (targetK && sK && targetK !== sK) return;
        }
        const key = (s.nisn && String(s.nisn).trim()) ? String(s.nisn).trim() : String(s.nama).toLowerCase().trim();
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            nisn: s.nisn || '-',
            nama: s.nama,
            kelas: s.kelas || filterKioskKelas || '-',
            hadirTepatWaktu: 0,
            terlambat: 0,
            totalMenitTerlambat: 0,
            totalScan: 0,
          });
        }
      });
    }

    filteredScans.forEach((scan) => {
      const scanNisn = scan.nisn && String(scan.nisn).trim();
      const scanNama = scan.nama && String(scan.nama).trim();
      const key = scanNisn ? scanNisn : (scanNama ? scanNama.toLowerCase() : '');
      if (!key) return;

      let entry = studentMap.get(key);
      if (!entry && scanNama) {
        for (const e of studentMap.values()) {
          if (e.nama.toLowerCase().trim() === scanNama.toLowerCase()) {
            entry = e;
            break;
          }
        }
      }

      if (!entry) {
        entry = {
          nisn: scan.nisn || '-',
          nama: scan.nama || 'Siswa',
          kelas: scan.kelas || filterKioskKelas || '-',
          hadirTepatWaktu: 0,
          terlambat: 0,
          totalMenitTerlambat: 0,
          totalScan: 0,
        };
        studentMap.set(key, entry);
      }

      const statusLower = (scan.status || '').toLowerCase();
      const isLate = statusLower.includes('terlambat') ||
        statusLower.includes('telat') ||
        (scan.keterlambatan && scan.keterlambatan !== '-' && !scan.keterlambatan.toLowerCase().includes('tepat') && !scan.keterlambatan.toLowerCase().includes('0 menit')) ||
        (typeof scan.menitTerlambat === 'number' && scan.menitTerlambat > 0);

      let lateMins = 0;
      if (typeof scan.menitTerlambat === 'number') {
        lateMins = scan.menitTerlambat;
      } else if (scan.keterlambatan && scan.keterlambatan !== '-') {
        const match = String(scan.keterlambatan).match(/(\d+)/);
        if (match) lateMins = parseInt(match[1], 10);
      }

      entry.totalScan += 1;
      if (isLate) {
        entry.terlambat += 1;
        entry.totalMenitTerlambat += lateMins;
      } else {
        entry.hadirTepatWaktu += 1;
      }
    });

    let result = Array.from(studentMap.values());
    if (searchKioskNama.trim()) {
      const q = searchKioskNama.toLowerCase().trim();
      result = result.filter((s) =>
        (s.nama || '').toLowerCase().includes(q) ||
        (s.nisn || '').toLowerCase().includes(q) ||
        (s.kelas || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
      return a.nama.localeCompare(b.nama);
    });

    return result;
  }, [kioskHistory, masterSiswaList, filterKioskKelas, filterKioskPeriode, filterKioskTanggal, filterKioskTanggalAwal, filterKioskTanggalAkhir, searchKioskNama]);

  // 3. Filtered Guru History
  const filteredGuruHistory = useMemo(() => {
    return teacherHistoryList.filter((item) => {
      const range = getDateRangeForPeriode(filterGuruPeriode, filterGuruTanggalAwal, filterGuruTanggalAkhir);
      if (filterGuruTanggal && filterGuruPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterGuruTanggal, filterGuruTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });
  }, [teacherHistoryList, filterGuruPeriode, filterGuruTanggal, filterGuruTanggalAwal, filterGuruTanggalAkhir]);

  // 3.5. Filtered Guru Absen History
  const filteredGuruAbsenHistory = useMemo(() => {
    return guruAbsenHistory.filter((item) => {
      const range = getDateRangeForPeriode(filterGuruAbsenPeriode, filterGuruAbsenTanggalAwal, filterGuruAbsenTanggalAkhir);
      if (filterGuruTanggal && filterGuruAbsenPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterGuruTanggal, filterGuruTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });
  }, [guruAbsenHistory, filterGuruAbsenPeriode, filterGuruTanggal, filterGuruAbsenTanggalAwal, filterGuruAbsenTanggalAkhir]);

  // 4. Filtered Tendik Absen History
  const filteredTendikAbsenHistory = useMemo(() => {
    return tendikAbsenHistory.filter((item) => {
      const range = getDateRangeForPeriode(filterTendikAbsenPeriode, filterTendikAbsenTanggalAwal, filterTendikAbsenTanggalAkhir);
      if (filterTendikTanggal && filterTendikAbsenPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterTendikTanggal, filterTendikTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });
  }, [tendikAbsenHistory, filterTendikAbsenPeriode, filterTendikTanggal, filterTendikAbsenTanggalAwal, filterTendikAbsenTanggalAkhir]);

  // 5. Filtered Tendik Izin History
  const filteredTendikIzinHistory = useMemo(() => {
    return tendikIzinHistory.filter((item) => {
      const range = getDateRangeForPeriode(filterTendikIzinPeriode, filterTendikIzinTanggalAwal, filterTendikIzinTanggalAkhir);
      if (filterTendikTanggal && filterTendikIzinPeriode === 'kustom') {
        return isRecordInDateRange(item.tanggal, filterTendikTanggal, filterTendikTanggal);
      }
      return isRecordInDateRange(item.tanggal, range.startDate, range.endDate);
    });
  }, [tendikIzinHistory, filterTendikIzinPeriode, filterTendikTanggal, filterTendikIzinTanggalAwal, filterTendikIzinTanggalAkhir]);

  // PDF Export 1: Presensi Kelas Siswa
  const handleDownloadSiswaPDF = () => {
    if (filteredSiswaHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor: [number, number, number] = [37, 99, 235]; // Royal Blue

    const periodeLabel = getPeriodeLabelText(filterSiswaPeriode, filterSiswaTanggalAwal, filterSiswaTanggalAkhir);

    // Render Official Kop Surat
    renderOfficialKopSurat(doc, customization);

    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN REKAPITULASI PRESENSI KELAS SISWA', 105, 41, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Periode: ${periodeLabel} | Kelas: ${filterSiswaKelas || 'Semua Kelas'} | Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 46, { align: 'center' });

    let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpa = 0;
    filteredSiswaHistory.forEach(item => {
      totalHadir += Number(item.hadir) || 0;
      totalSakit += Number(item.sakit) || 0;
      totalIzin += Number(item.izin) || 0;
      totalAlpa += Number(item.alpa) || 0;
    });

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 50, 180, 12, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Sesi: ${filteredSiswaHistory.length} | Hadir: ${totalHadir} | Sakit: ${totalSakit} | Izin: ${totalIzin} | Alpa: ${totalAlpa}`, 20, 57.5);

    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Guru Absen']];
    const tableBody = filteredSiswaHistory.map((item, idx) => [
      idx + 1,
      item.tanggal || '-',
      item.waktu || '-',
      item.kelas || '-',
      item.mapel || '-',
      item.hadir || 0,
      item.sakit || 0,
      item.izin || 0,
      item.alpa || 0,
      item.guru || '-'
    ]);

    autoTable(doc, {
      startY: 67,
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
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 35 },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 12, halign: 'center' },
        8: { cellWidth: 12, halign: 'center' },
        9: { cellWidth: 'auto' }
      },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak' }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;
    if (currentY > 230) {
      doc.addPage();
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

    doc.save(`Rekap_Presensi_Kelas_${filterSiswaKelas || 'Semua'}_${filterSiswaPeriode}.pdf`);
  };

  // PDF Export 2: Kiosk Presensi Masuk Siswa
  const handleDownloadKioskPDF = () => {
    if (filteredKioskHistory.length === 0) return;

    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [37, 99, 235]; // Royal Blue

    const periodeLabel = getPeriodeLabelText(filterKioskPeriode, filterKioskTanggalAwal, filterKioskTanggalAkhir);

    renderOfficialKopSurat(doc, customization);

    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI PRESENSI MASUK SISWA (GERBANG/KIOSK)', 105, 40, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Periode: ${periodeLabel} | Kelas: ${filterKioskKelas || 'Semua Kelas'} | Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 45, { align: 'center' });

    // Summary counts
    const totalScan = filteredKioskHistory.length;
    const totalHadir = filteredKioskHistory.filter(h => (h.status || '').toLowerCase() === 'hadir').length;
    const totalTerlambat = filteredKioskHistory.filter(h => (h.status || '').toLowerCase().includes('terlambat')).length;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 49, 180, 12, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Masuk: ${totalScan} Siswa  |  Tepat Waktu (Hadir): ${totalHadir}  |  Terlambat: ${totalTerlambat}`, 20, 56.5);

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
        formatKeterlambatan(item.keterlambatan || item.menitTerlambat)
      ];
    });

    autoTable(doc, {
      startY: 66,
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

    doc.save(`Rekap_Presensi_Masuk_Kiosk_${filterKioskPeriode}.pdf`);
  };

  // PDF Export 2.5: Rekap Bulanan Kiosk Masuk Siswa Per Kelas
  const handleDownloadKioskRekapKelasPDF = () => {
    if (kioskClassMonthlySummary.length === 0) return;

    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [37, 99, 235];

    const periodeLabel = getPeriodeLabelText(filterKioskPeriode, filterKioskTanggalAwal, filterKioskTanggalAkhir);

    renderOfficialKopSurat(doc, customization);

    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI KETEPATAN WAKTU PRESENSI MASUK SISWA (GERBANG/KIOSK)', 105, 40, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Periode: ${periodeLabel} | Kelas: ${filterKioskKelas || 'Semua Kelas'} | Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 45, { align: 'center' });

    const totalSiswa = kioskClassMonthlySummary.length;
    const totalPresensi = kioskClassMonthlySummary.reduce((acc, s) => acc + s.totalScan, 0);
    const totalTepatWaktu = kioskClassMonthlySummary.reduce((acc, s) => acc + s.hadirTepatWaktu, 0);
    const totalTerlambat = kioskClassMonthlySummary.reduce((acc, s) => acc + s.terlambat, 0);
    const avgPunctual = totalPresensi > 0 ? Math.round((totalTepatWaktu / totalPresensi) * 100) : 0;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 49, 180, 12, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Siswa: ${totalSiswa} | Total Scan: ${totalPresensi} | Tepat Waktu: ${totalTepatWaktu} (${avgPunctual}%) | Terlambat: ${totalTerlambat}`, 20, 56.5);

    const tableHeaders = [['No', 'NISN', 'Nama Siswa', 'Kelas', 'Tepat Waktu', 'Terlambat', 'Acc. Terlambat', 'Total Scan', '% Tepat Waktu']];
    const tableBody = kioskClassMonthlySummary.map((item, idx) => {
      const pct = item.totalScan > 0 ? Math.round((item.hadirTepatWaktu / item.totalScan) * 100) : 0;
      return [
        idx + 1,
        item.nisn || '-',
        item.nama || '-',
        item.kelas || '-',
        item.hadirTepatWaktu,
        item.terlambat,
        item.totalMenitTerlambat > 0 ? `${item.totalMenitTerlambat} Mnt` : '-',
        item.totalScan,
        item.totalScan > 0 ? `${pct}%` : '0%'
      ];
    });

    autoTable(doc, {
      startY: 66,
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
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 24, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 22, halign: 'center' },
      },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak' }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;
    if (currentY > 230) {
      doc.addPage();
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

    const kelasLabel = filterKioskKelas ? filterKioskKelas.replace(/\s+/g, '_') : 'Semua_Kelas';
    doc.save(`Rekap_Bulanan_Kiosk_Siswa_${kelasLabel}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Excel Export 2.6: Rekap Bulanan Kiosk Masuk Siswa Per Kelas
  const handleDownloadKioskRekapKelasExcel = () => {
    if (kioskClassMonthlySummary.length === 0) return;

    const dataForSheet = kioskClassMonthlySummary.map((item, idx) => {
      const pct = item.totalScan > 0 ? Math.round((item.hadirTepatWaktu / item.totalScan) * 100) : 0;
      let statusCatatan = 'Belum Ada Scan';
      if (item.totalScan > 0) {
        if (item.terlambat === 0) statusCatatan = 'Sangat Disiplin (100% Tepat Waktu)';
        else if (pct >= 80) statusCatatan = 'Disiplin (Tepat Waktu)';
        else statusCatatan = 'Perlu Pembinaan (Sering Terlambat)';
      }

      return {
        'No': idx + 1,
        'NISN': item.nisn || '-',
        'Nama Siswa': item.nama,
        'Kelas': item.kelas,
        'Presensi Tepat Waktu (Hadir)': item.hadirTepatWaktu,
        'Jumlah Terlambat': item.terlambat,
        'Akumulasi Menit Terlambat': item.totalMenitTerlambat > 0 ? `${item.totalMenitTerlambat} menit` : '0 menit',
        'Total Presensi Masuk (Gerbang)': item.totalScan,
        'Persentase Ketepatan Waktu (%)': `${pct}%`,
        'Catatan Kedisiplinan': statusCatatan,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    const kelasLabel = filterKioskKelas ? filterKioskKelas.replace(/\s+/g, '_') : 'Semua_Kelas';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Bulanan Kiosk');
    XLSX.writeFile(workbook, `Rekap_Bulanan_Kiosk_Masuk_Siswa_${kelasLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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
    const formattedDateStr = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Elegant Color Scheme
    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800 (#1e293b)
    const secondaryColor: [number, number, number] = [59, 130, 246]; // Blue 600

    // Official Kop Surat Header
    renderOfficialKopSurat(doc, customization);

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI KEHADIRAN GURU & SISWA', 105, 40, { align: 'center' });
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Guru: ${selectedGuru} | Mapel: ${selectedMapel} | Periode: ${tanggalMulai} s.d. ${tanggalAkhir}`, 105, 45, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    // Metadata Grid (Teacher and Subject Info)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI LAPORAN:', 15, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Nama Guru Pengampu :  ${selectedGuru}`, 15, 60);
    doc.text(`NIP Guru                      :  ${teachers.find(t => t.nama === selectedGuru)?.nip || '-'}`, 15, 65);
    doc.text(`Mata Pelajaran            :  ${selectedMapel}`, 15, 70);
    doc.text(`Periode Laporan          :  ${tanggalMulai} s.d. ${tanggalAkhir}`, 15, 75);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 80);

    doc.line(15, 84, 195, 84);

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
    if (filteredGuruHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
    const periodeLabel = getPeriodeLabelText(filterGuruPeriode, filterGuruTanggalAwal, filterGuruTanggalAkhir);

    renderOfficialKopSurat(doc, customization);

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI IZIN & KETIDAKHADIRAN GURU', 105, 40, { align: 'center' });
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Periode: ${periodeLabel} | Total Guru Izin/Sakit: ${filteredGuruHistory.length} Orang`, 105, 45, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Periode Rekap            :  ${periodeLabel}`, 15, 60);
    doc.text(`Total Guru Izin/Sakit   :  ${filteredGuruHistory.length} Orang`, 15, 65);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 70);

    doc.line(15, 74, 195, 74);

    let currentY = 80;

    // Render Teacher History logs table
    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'NIP Guru', 'Nama Guru', 'Status / Keterangan', 'Alasan / Detail Izin']];
    const tableBody = filteredGuruHistory.map((item, idx) => [
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
    doc.save(`Rekap_Izin_Guru_${filterGuruPeriode}.pdf`);
  };

  // Download Tendik Presence PDF Report
  const handleDownloadTendikAbsenPDF = () => {
    if (filteredTendikAbsenHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
    const periodeLabel = getPeriodeLabelText(filterTendikAbsenPeriode, filterTendikAbsenTanggalAwal, filterTendikAbsenTanggalAkhir);

    renderOfficialKopSurat(doc, customization);

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI PRESENSI HADIR TENDIK', 105, 40, { align: 'center' });
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Periode: ${periodeLabel} | Total Tendik Hadir: ${filteredTendikAbsenHistory.length} Orang`, 105, 45, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Periode Rekap            :  ${periodeLabel}`, 15, 60);
    doc.text(`Total Tendik Hadir       :  ${filteredTendikAbsenHistory.length} Orang`, 15, 65);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 70);

    doc.line(15, 74, 195, 74);

    let currentY = 80;

    // Table
    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'Tipe Presensi', 'NIP Tendik', 'Nama Lengkap', 'Status']];
    const tableBody = filteredTendikAbsenHistory.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.waktu ? item.waktu.substring(0, 5) : '-',
      item.tipeAbsen === 'Pulang' ? 'Absen Pulang' : 'Absen Datang',
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

    doc.save(`Rekap_Presensi_Hadir_Tendik_${filterTendikAbsenPeriode}.pdf`);
  };

  // Download Guru Presence PDF Report
  const handleDownloadGuruAbsenPDF = () => {
    if (filteredGuruAbsenHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
    const periodeLabel = getPeriodeLabelText(filterGuruAbsenPeriode, filterGuruAbsenTanggalAwal, filterGuruAbsenTanggalAkhir);

    renderOfficialKopSurat(doc, customization);

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI PRESENSI HADIR GURU', 105, 40, { align: 'center' });
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Periode: ${periodeLabel} | Total Guru Hadir: ${filteredGuruAbsenHistory.length} Orang`, 105, 45, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Periode Rekap            :  ${periodeLabel}`, 15, 60);
    doc.text(`Total Guru Hadir         :  ${filteredGuruAbsenHistory.length} Orang`, 15, 65);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 70);

    doc.line(15, 74, 195, 74);

    let currentY = 80;

    // Table
    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'Tipe Presensi', 'NIP Guru', 'Nama Lengkap', 'Status']];
    const tableBody = filteredGuruAbsenHistory.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.waktu ? item.waktu.substring(0, 5) : '-',
      item.tipeAbsen === 'Pulang' ? 'Absen Pulang' : 'Absen Datang',
      item.nip || '-',
      item.namaGuru,
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

    doc.save(`Rekap_Presensi_Hadir_Guru_${filterGuruAbsenPeriode}.pdf`);
  };

  // Download Tendik Permits PDF Report
  const handleDownloadTendikIzinPDF = () => {
    if (filteredTendikIzinHistory.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const formattedDateStr = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo 600
    const periodeLabel = getPeriodeLabelText(filterTendikIzinPeriode, filterTendikIzinTanggalAwal, filterTendikIzinTanggalAkhir);

    renderOfficialKopSurat(doc, customization);

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LAPORAN REKAPITULASI IZIN & CUTI TENDIK', 105, 40, { align: 'center' });
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Periode: ${periodeLabel} | Total Tendik Izin/Cuti: ${filteredTendikIzinHistory.length} Orang`, 105, 45, { align: 'center' });

    // Decorative underline
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    // Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INFORMASI REKAPITULASI:', 15, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Periode Rekap            :  ${periodeLabel}`, 15, 60);
    doc.text(`Total Tendik Izin/Cuti :  ${filteredTendikIzinHistory.length} Orang`, 15, 65);
    doc.text(`Tanggal Cetak             :  ${formattedDateStr}`, 15, 70);

    doc.line(15, 74, 195, 74);

    let currentY = 80;

    // Table
    const tableHeaders = [['No', 'Tanggal', 'Waktu', 'NIP Tendik', 'Nama Lengkap', 'Status', 'Keterangan / Alasan']];
    const tableBody = filteredTendikIzinHistory.map((item, idx) => [
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

    doc.save(`Rekap_Izin_Tendik_${filterTendikIzinPeriode}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Sub tab buttons */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 flex-wrap">
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
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
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
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
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
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
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => {
                setSubTab('guru-absen');
                handleApplyGuruAbsenFilter();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'guru-absen'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Absen Guru</span>
            </button>
          )}
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Tendik') && (
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
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Tendik') && (
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
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
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
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => setSubTab('rekap-kelas-guru')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'rekap-kelas-guru'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Rekap Siswa Per Kelas (Guru)</span>
            </button>
          )}
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Guru') && (
            <button
              type="button"
              onClick={() => setSubTab('rekap-guru')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'rekap-guru'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Rekap Bulanan Guru</span>
            </button>
          )}
          {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || currentUser?.role === 'Tendik') && (
            <button
              type="button"
              onClick={() => setSubTab('rekap-tendik')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                subTab === 'rekap-tendik'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Rekap Bulanan Tendik</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <select
                  value={filterSiswaPeriode}
                  onChange={(e) => {
                    const val = e.target.value as PeriodType;
                    setFilterSiswaPeriode(val);
                    handleApplySiswaFilter(val);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                >
                  <option value="semua">Semua Tanggal</option>
                  <option value="hari_ini">Hari Ini</option>
                  <option value="1_minggu">1 Minggu Terakhir</option>
                  <option value="1_bulan">1 Bulan Terakhir</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {filterSiswaPeriode === 'kustom' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterSiswaTanggalAwal}
                      onChange={(e) => setFilterSiswaTanggalAwal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterSiswaTanggalAkhir}
                      onChange={(e) => setFilterSiswaTanggalAkhir(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </>
              )}

              <div className={filterSiswaPeriode === 'kustom' ? "sm:col-span-2" : "sm:col-span-4"}>
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

              <div className={filterSiswaPeriode === 'kustom' ? "sm:col-span-3 flex items-end gap-2" : "sm:col-span-5 flex items-end gap-2"}>
                <button
                  type="button"
                  onClick={() => handleApplySiswaFilter()}
                  disabled={isLoadingSiswa}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingSiswa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Terapkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSiswaPDF}
                  disabled={filteredSiswaHistory.length === 0}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Unduh Rekap PDF Presensi Kelas"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
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
                  {filteredSiswaHistory.length > 0 ? (
                    filteredSiswaHistory.map((item, idx) => (
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
                            {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-blue-600" />
                  <span>Riwayat Presensi Masuk Siswa (Kiosk / Gerbang)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar pemindaian barcode/QR presensi pagi di gerbang beserta rekapitulasi ketepatan waktu per kelas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setKioskViewMode('log')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      kioskViewMode === 'log'
                        ? 'bg-white text-blue-600 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Log Scan Harian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskViewMode('rekap-kelas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      kioskViewMode === 'rekap-kelas'
                        ? 'bg-white text-blue-600 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Rekap Bulanan Per Kelas</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClearKioskCache}
                  disabled={isLoadingKiosk}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                  title="Bersihkan cache lokal dan muat ulang langsung dari spreadsheet database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKiosk ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync / Clear Cache</span>
                </button>
              </div>
            </div>

            {/* Metric Summary Cards */}
            {kioskViewMode === 'log' ? (
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Total Siswa Terdata</span>
                    <p className="text-2xl font-black text-slate-800 mt-0.5">{kioskClassMonthlySummary.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Presensi Tepat Waktu</span>
                    <p className="text-2xl font-black text-emerald-800 mt-0.5">
                      {kioskClassMonthlySummary.reduce((acc, s) => acc + s.hadirTepatWaktu, 0)} <span className="text-xs font-normal">Kali</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700 uppercase">Jumlah Terlambat</span>
                    <p className="text-2xl font-black text-amber-800 mt-0.5">
                      {kioskClassMonthlySummary.reduce((acc, s) => acc + s.terlambat, 0)} <span className="text-xs font-normal">Kali</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-700 uppercase">Rata-rata Ketepatan</span>
                    <p className="text-2xl font-black text-blue-800 mt-0.5">
                      {(() => {
                        const total = kioskClassMonthlySummary.reduce((a, s) => a + s.totalScan, 0);
                        const tepat = kioskClassMonthlySummary.reduce((a, s) => a + s.hadirTepatWaktu, 0);
                        return total > 0 ? Math.round((tepat / total) * 100) : 0;
                      })()}%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <select
                  value={filterKioskPeriode}
                  onChange={(e) => {
                    const val = e.target.value as PeriodType;
                    setFilterKioskPeriode(val);
                    handleApplyKioskFilter(val);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                >
                  <option value="semua">Semua Tanggal</option>
                  <option value="hari_ini">Hari Ini</option>
                  <option value="1_minggu">1 Minggu Terakhir</option>
                  <option value="1_bulan">1 Bulan Terakhir</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {filterKioskPeriode === 'kustom' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterKioskTanggalAwal}
                      onChange={(e) => setFilterKioskTanggalAwal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterKioskTanggalAkhir}
                      onChange={(e) => setFilterKioskTanggalAkhir(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </>
              )}

              <div className={filterKioskPeriode === 'kustom' ? "sm:col-span-2" : "sm:col-span-3"}>
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

              <div className={filterKioskPeriode === 'kustom' ? "sm:col-span-2" : "sm:col-span-3"}>
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

              <div className={filterKioskPeriode === 'kustom' ? "sm:col-span-3 flex items-end gap-2" : "sm:col-span-3 flex items-end gap-2"}>
                <button
                  type="button"
                  onClick={() => handleApplyKioskFilter()}
                  disabled={isLoadingKiosk}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingKiosk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Filter</span>
                </button>

                {kioskViewMode === 'log' ? (
                  <button
                    type="button"
                    onClick={handleDownloadKioskPDF}
                    disabled={filteredKioskHistory.length === 0}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Unduh Rekap PDF Presensi Masuk Log Harian"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadKioskRekapKelasPDF}
                      disabled={kioskClassMonthlySummary.length === 0}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Unduh PDF Rekap Bulanan Per Kelas"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadKioskRekapKelasExcel}
                      disabled={kioskClassMonthlySummary.length === 0}
                      className="p-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Export Excel Rekap Bulanan Per Kelas"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            {kioskViewMode === 'log' ? (
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
                      {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || isFullAccess) && <th className="p-3.5 pr-4 text-center w-20">Aksi</th>}
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
                                <span>{dt.waktu}</span>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-500 font-semibold whitespace-nowrap">{item.nisn}</td>
                            <td className="p-3.5 font-semibold text-slate-800 text-sm whitespace-nowrap">
                              <StudentNameBadge student={item} name={item.nama} nisn={item.nisn} />
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                                {item.kelas}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              {(() => {
                                const isLate = (item.status || '').toLowerCase().includes('terlambat') ||
                                  (item.status || '').toLowerCase().includes('telat') ||
                                  (item.keterlambatan && item.keterlambatan !== '-' && item.keterlambatan.toLowerCase() !== 'tepat waktu');
                                return (
                                  <span
                                    className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold ${
                                      isLate
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                  >
                                    {isLate ? 'Terlambat' : item.status || 'Hadir'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-3.5 text-center">
                              {(() => {
                                const isLate = (item.status || '').toLowerCase().includes('terlambat') ||
                                  (item.status || '').toLowerCase().includes('telat') ||
                                  (item.keterlambatan && item.keterlambatan !== '-' && item.keterlambatan.toLowerCase() !== 'tepat waktu');
                                const formattedKet = formatKeterlambatan(item.keterlambatan || item.menitTerlambat);
                                const hasValue = formattedKet && formattedKet !== '-';

                                if (isLate || hasValue) {
                                  return (
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black">
                                      {hasValue ? formattedKet : 'Terlambat'}
                                    </span>
                                  );
                                }
                                return <span className="text-slate-400 font-bold">Tepat Waktu</span>;
                              })()}
                            </td>
                            {((currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') || isFullAccess) && (
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
                        <td colSpan={(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') ? 9 : 8} className="p-12 text-center text-slate-400">
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
            ) : (
              /* REKAP BULANAN PER KELAS TABLE */
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pl-4 w-12 text-center">No</th>
                      <th className="p-3.5 w-28">NISN</th>
                      <th className="p-3.5">Nama Siswa</th>
                      <th className="p-3.5 w-20 text-center">Kelas</th>
                      <th className="p-3.5 w-28 text-center">Tepat Waktu</th>
                      <th className="p-3.5 w-28 text-center">Terlambat</th>
                      <th className="p-3.5 w-32 text-center">Acc. Terlambat</th>
                      <th className="p-3.5 w-28 text-center">Total Scan</th>
                      <th className="p-3.5 w-36 text-center">% Ketepatan</th>
                      <th className="p-3.5 pr-4 text-center w-40">Status Kedisiplinan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kioskClassMonthlySummary.length > 0 ? (
                      kioskClassMonthlySummary.map((item, idx) => {
                        const pct = item.totalScan > 0 ? Math.round((item.hadirTepatWaktu / item.totalScan) * 100) : 0;
                        return (
                          <tr key={`rekap-kiosk-${item.nisn || item.nama}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 pl-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3.5 font-mono text-slate-500 font-semibold whitespace-nowrap">{item.nisn || '-'}</td>
                            <td className="p-3.5 font-bold text-slate-800 text-sm whitespace-nowrap">
                              <StudentNameBadge student={item} name={item.nama} nisn={item.nisn} />
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                                {item.kelas}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-bold">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{item.hadirTepatWaktu} Kali</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-bold">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border ${
                                item.terlambat > 0
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>{item.terlambat} Kali</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-mono font-semibold text-slate-700">
                              {item.totalMenitTerlambat > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-extrabold">
                                  {item.totalMenitTerlambat} Mnt
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">-</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-bold">
                              <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs">
                                {item.totalScan} Masuk
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`font-black text-xs ${
                                  pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'
                                }`}>
                                  {pct}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 pr-4 text-center">
                              {(() => {
                                if (item.totalScan === 0) {
                                  return (
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold">
                                      Belum Ada Scan
                                    </span>
                                  );
                                }
                                if (item.terlambat === 0) {
                                  return (
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black">
                                      Sangat Disiplin
                                    </span>
                                  );
                                }
                                if (pct >= 80) {
                                  return (
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                      Disiplin
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black">
                                    Sering Terlambat
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-slate-400">
                          <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-semibold">
                            Tidak ada rekaman rekap bulanan presensi masuk siswa untuk kelas/filter terpilih.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <select
                  value={filterGuruPeriode}
                  onChange={(e) => {
                    const val = e.target.value as PeriodType;
                    setFilterGuruPeriode(val);
                    handleApplyGuruFilter(val);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                >
                  <option value="semua">Semua Tanggal</option>
                  <option value="hari_ini">Hari Ini</option>
                  <option value="1_minggu">1 Minggu Terakhir</option>
                  <option value="1_bulan">1 Bulan Terakhir</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {filterGuruPeriode === 'kustom' && (
                <>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterGuruTanggalAwal}
                      onChange={(e) => setFilterGuruTanggalAwal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterGuruTanggalAkhir}
                      onChange={(e) => setFilterGuruTanggalAkhir(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </>
              )}

              <div className={filterGuruPeriode === 'kustom' ? "sm:col-span-2 flex items-end gap-2" : "sm:col-span-8 flex items-end gap-2"}>
                <button
                  type="button"
                  onClick={() => handleApplyGuruFilter()}
                  disabled={isLoadingGuru}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingGuru ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Terapkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTeacherPDF}
                  disabled={filteredGuruHistory.length === 0}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Unduh Rekap Izin Guru (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
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
                  {filteredGuruHistory.length > 0 ? (
                    filteredGuruHistory.map((item, idx) => (
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
                            {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
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

        {/* SUB TAB 1.5: RIWAYAT ABSEN GURU */}
        {subTab === 'guru-absen' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Riwayat Presensi Hadir Guru (Mandiri)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar log kehadiran harian Guru (datang & pulang) beserta bukti foto diri.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <select
                  value={filterGuruAbsenPeriode}
                  onChange={(e) => {
                    const val = e.target.value as PeriodType;
                    setFilterGuruAbsenPeriode(val);
                    handleApplyGuruAbsenFilter();
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="semua">Semua Waktu</option>
                  <option value="hari_ini">Hari Ini</option>
                  <option value="minggu_ini">7 Hari Terakhir</option>
                  <option value="bulan_ini">Bulan Ini</option>
                  <option value="kustom">Filter Tanggal Spesifik</option>
                </select>
              </div>

              {filterGuruAbsenPeriode === 'kustom' && (
                <>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterGuruAbsenTanggalAwal}
                      onChange={(e) => setFilterGuruAbsenTanggalAwal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterGuruAbsenTanggalAkhir}
                      onChange={(e) => setFilterGuruAbsenTanggalAkhir(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </>
              )}

              <div className={filterGuruAbsenPeriode === 'kustom' ? "sm:col-span-2 flex items-end gap-2" : "sm:col-span-8 flex items-end gap-2"}>
                <button
                  type="button"
                  onClick={() => handleApplyGuruAbsenFilter()}
                  disabled={isLoadingGuru}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
                >
                  {isLoadingGuru ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  <span>Terapkan</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGuruAbsenPDF}
                  disabled={filteredGuruAbsenHistory.length === 0}
                  className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20 whitespace-nowrap"
                  title="Cetak Laporan PDF Presensi Guru"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-40">Waktu Presensi</th>
                    <th className="p-3.5 w-36">Tipe Presensi</th>
                    <th className="p-3.5 w-36">NIP</th>
                    <th className="p-3.5 w-56">Nama Lengkap</th>
                    <th className="p-3.5 text-center w-36">Bukti Foto</th>
                    <th className="p-3.5 pr-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuruAbsenHistory.length > 0 ? (
                    filteredGuruAbsenHistory.map((item, idx) => (
                      <tr key={`g-absen-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {item.tanggal} <span className="text-slate-300">|</span> {String(item.waktu || '').replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim()}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {String(item.tipeAbsen || item.kategori || '').toLowerCase().includes('pulang') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full text-[10px] font-extrabold border border-amber-200">
                              <span>🌙</span> Absen Pulang
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-200">
                              <span>☀️</span> Absen Datang
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">{item.nip || '-'}</td>
                        <td className="p-3.5 font-bold text-slate-800 text-sm">{item.namaGuru}</td>
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
                            {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirmModal(item.rowIndex, 'guru-absen')}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus presensi guru"
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
                        <p className="text-xs font-semibold">Tidak ada riwayat presensi hadir Guru pada tanggal ini.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <select
                  value={filterTendikAbsenPeriode}
                  onChange={(e) => {
                    const val = e.target.value as PeriodType;
                    setFilterTendikAbsenPeriode(val);
                    handleApplyTendikFilter();
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                >
                  <option value="semua">Semua Tanggal</option>
                  <option value="hari_ini">Hari Ini</option>
                  <option value="1_minggu">1 Minggu Terakhir</option>
                  <option value="1_bulan">1 Bulan Terakhir</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {filterTendikAbsenPeriode === 'kustom' && (
                <>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterTendikAbsenTanggalAwal}
                      onChange={(e) => setFilterTendikAbsenTanggalAwal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterTendikAbsenTanggalAkhir}
                      onChange={(e) => setFilterTendikAbsenTanggalAkhir(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </>
              )}

              <div className={filterTendikAbsenPeriode === 'kustom' ? "sm:col-span-2 flex items-end gap-2" : "sm:col-span-8 flex items-end gap-2"}>
                <button
                  type="button"
                  onClick={handleApplyTendikFilter}
                  disabled={isLoadingTendik}
                  className="flex-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingTendik ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Terapkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTendikAbsenPDF}
                  disabled={filteredTendikAbsenHistory.length === 0}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Unduh Rekap Presensi Hadir Tendik (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4 w-40">Waktu Presensi</th>
                    <th className="p-3.5 w-36">Tipe Presensi</th>
                    <th className="p-3.5 w-36">NIP</th>
                    <th className="p-3.5 w-56">Nama Lengkap</th>
                    <th className="p-3.5 text-center w-36">Bukti Foto</th>
                    <th className="p-3.5 pr-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTendikAbsenHistory.length > 0 ? (
                    filteredTendikAbsenHistory.map((item, idx) => (
                      <tr key={`t-absen-${item.rowIndex || 'row'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                          {item.tanggal} <span className="text-slate-300">|</span> {String(item.waktu || '').replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim()}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {String(item.tipeAbsen || item.kategori || '').toLowerCase().includes('pulang') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full text-[10px] font-extrabold border border-amber-200">
                              <span>🌙</span> Absen Pulang
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-extrabold border border-emerald-200">
                              <span>☀️</span> Absen Datang
                            </span>
                          )}
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
                            {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Periode Rekap</label>
                <select
                  value={filterTendikIzinPeriode}
                  onChange={(e) => {
                    const val = e.target.value as PeriodType;
                    setFilterTendikIzinPeriode(val);
                    handleApplyTendikFilter();
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-700"
                >
                  <option value="semua">Semua Tanggal</option>
                  <option value="hari_ini">Hari Ini</option>
                  <option value="1_minggu">1 Minggu Terakhir</option>
                  <option value="1_bulan">1 Bulan Terakhir</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {filterTendikIzinPeriode === 'kustom' && (
                <>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterTendikIzinTanggalAwal}
                      onChange={(e) => setFilterTendikIzinTanggalAwal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterTendikIzinTanggalAkhir}
                      onChange={(e) => setFilterTendikIzinTanggalAkhir(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </>
              )}

              <div className={filterTendikIzinPeriode === 'kustom' ? "sm:col-span-2 flex items-end gap-2" : "sm:col-span-8 flex items-end gap-2"}>
                <button
                  type="button"
                  onClick={handleApplyTendikFilter}
                  disabled={isLoadingTendik}
                  className="flex-1 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingTendik ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  <span>Terapkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTendikIzinPDF}
                  disabled={filteredTendikIzinHistory.length === 0}
                  className="p-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Unduh Rekap Izin Tendik (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
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
                  {filteredTendikIzinHistory.length > 0 ? (
                    filteredTendikIzinHistory.map((item, idx) => (
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
                            {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
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
                  {filteredTeachersForRecap.map((t, idx) => (
                    <option key={`teacher-${t.nama || 'guru'}-${idx}`} value={t.nama}>
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
                  {mapelsTaughtByGuru.map((m, idx) => (
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

        {/* SUB TAB 4: REKAP SISWA PER KELAS GURU MENGAJAR */}
        {subTab === 'rekap-kelas-guru' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-5.5 h-5.5 text-blue-600" />
                  <span>Rekap Kehadiran Siswa Per Kelas (Guru Mengajar)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekap kehadiran siswa per kelas yang diampu oleh masing-masing guru. Data tersimpan ke Spreadsheet Google Sheets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveClassRecapToSpreadsheet}
                  disabled={isSavingRecap || classStudentMatrix.length === 0}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center gap-2"
                >
                  {isSavingRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Ke Spreadsheet</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadClassMatrixPDF}
                  disabled={classStudentMatrix.length === 0}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/15 cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Cetak PDF Kelas</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportClassMatrixExcel}
                  disabled={classStudentMatrix.length === 0}
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200/60 cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Filter Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Guru Pengampu</label>
                <select
                  value={selectedGuru}
                  onChange={(e) => setSelectedGuru(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Guru --</option>
                  {filteredTeachersForRecap.map((t, idx) => (
                    <option key={`gt-${t.nama || 'guru'}-${idx}`} value={t.nama}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Kelas Mengajar</label>
                <select
                  value={selectedGuruClass}
                  onChange={(e) => setSelectedGuruClass(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classesTaughtByGuru.map((k, idx) => (
                    <option key={`ck-${k}-${idx}`} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mata Pelajaran (Opsional)</label>
                <select
                  value={selectedMapel}
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Semua Mapel --</option>
                  {mapelsTaughtByGuru.map((m, idx) => (
                    <option key={`m2-${m}-${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rentang Tanggal</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-1/2 p-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  />
                  <span className="text-slate-400 font-bold text-xs">s.d</span>
                  <input
                    type="date"
                    value={tanggalAkhir}
                    onChange={(e) => setTanggalAkhir(e.target.value)}
                    className="w-1/2 p-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Class Summary Bar */}
            {selectedGuruClass && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Siswa Roster</span>
                  <p className="text-xl font-extrabold text-slate-800">{classStudentMatrix.length} <span className="text-xs font-semibold text-slate-500">Siswa</span></p>
                </div>
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-Rata Kehadiran Kelas</span>
                  <p className="text-xl font-extrabold text-emerald-600">
                    {classStudentMatrix.length > 0
                      ? (classStudentMatrix.reduce((acc, curr) => acc + curr.persentase, 0) / classStudentMatrix.length).toFixed(1)
                      : '0'}%
                  </p>
                </div>
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guru Pengampu</span>
                  <p className="text-sm font-extrabold text-slate-800 truncate" title={selectedGuru}>{selectedGuru || '-'}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">NIP: {teachers.find(t => t.nama === selectedGuru)?.nip || '-'}</p>
                </div>
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kelas Active</span>
                  <p className="text-xl font-extrabold text-blue-600">Kelas {selectedGuruClass}</p>
                </div>
              </div>
            )}

            {/* Matrix Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa / NISN..."
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                </div>

                <div className="text-xs text-slate-500 font-semibold">
                  Menampilkan <span className="font-bold text-slate-800">{classStudentMatrix.filter(s => !searchStudentQuery || s.nama.toLowerCase().includes(searchStudentQuery.toLowerCase()) || s.nisn.includes(searchStudentQuery)).length}</span> dari <span className="font-bold text-slate-800">{classStudentMatrix.length}</span> siswa
                </div>
              </div>

              {isLoadingRoster ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs font-semibold">Memuat daftar siswa kelas {selectedGuruClass}...</p>
                </div>
              ) : classStudentMatrix.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">Belum ada data siswa untuk kelas {selectedGuruClass || 'ini'}</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Pilih guru dan kelas mengajar di atas untuk menampilkan matrix kehadiran per siswa.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4 text-center">No</th>
                        <th className="py-3 px-4">NISN</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4 text-center">Gender</th>
                        <th className="py-3 px-4 text-center">Total Sesi</th>
                        <th className="py-3 px-4 text-center text-emerald-700">Hadir</th>
                        <th className="py-3 px-4 text-center text-amber-700">Sakit</th>
                        <th className="py-3 px-4 text-center text-blue-700">Izin</th>
                        <th className="py-3 px-4 text-center text-rose-700">Alpa</th>
                        <th className="py-3 px-4 text-center text-indigo-700">% Hadir</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudentMatrix
                        .filter(s => !searchStudentQuery || s.nama.toLowerCase().includes(searchStudentQuery.toLowerCase()) || s.nisn.includes(searchStudentQuery))
                        .map((row, idx) => (
                          <tr key={`matrix-${row.id || idx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{row.nisn}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              <StudentNameBadge student={row} name={row.nama} nisn={row.nisn} />
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500 text-[11px]">{row.gender}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">{row.totalSessions}</td>
                            <td className="py-3 px-4 text-center font-black text-emerald-600">{row.hadir}</td>
                            <td className="py-3 px-4 text-center font-bold text-amber-600">{row.sakit}</td>
                            <td className="py-3 px-4 text-center font-bold text-blue-600">{row.izin}</td>
                            <td className="py-3 px-4 text-center font-black text-rose-600">{row.alpa}</td>
                            <td className="py-3 px-4 text-center font-black text-slate-800">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] ${row.persentase >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {row.persentase}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${row.badgeColor}`}>
                                {row.statusBadge}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB TAB 8: REKAP BULANAN GURU (PERSEORANGAN / SEMUA GURU) */}
        {subTab === 'rekap-guru' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                  {rekapGuruNip === 'ALL' ? 'Rekapitulasi Kehadiran Bulanan Semua Guru' : 'Rekapitulasi Kehadiran Bulanan Guru (Perseorangan)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rekapGuruNip === 'ALL'
                    ? 'Laporan rekapitulasi kehadiran seluruh guru dalam satu bulan kerja.'
                    : 'Laporan rekap presensi bulanan perseorangan Guru. Tersimpan otomatis ke sheet Rekap_Kehadiran Guru.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveGuruMonthlyToSheets}
                  disabled={isSavingGuruRecap}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingGuruRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan ke Spreadsheet</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportGuruMonthlyPDF}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Cetak PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportGuruMonthlyExcel}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {savingRecapMsg && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${savingRecapMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                <span>{savingRecapMsg}</span>
              </div>
            )}

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Guru</label>
                <select
                  value={rekapGuruNip}
                  onChange={(e) => setRekapGuruNip(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                >
                  {isFullAccess && (
                    <option value="ALL">⭐ SEMUA GURU (SEMUA NIP - URUT ABJAD A-Z)</option>
                  )}
                  {listGuruUsers.map((g: any, idx: number) => (
                    <option key={`guru-opt-${g.nip || idx}`} value={g.nip || g.nama}>
                      {g.nama} {g.nip && g.nip !== 'ALL' ? `(NIP: ${g.nip})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Bulan & Tahun</label>
                <input
                  type="month"
                  value={rekapGuruMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRekapGuruMonth(val);
                    handleSyncRekapSettings({ rekapGuruMonth: val });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-semibold text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Mulai Tgl / Hari Hitung
                  </label>
                  {!isAdminUtama && (
                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Hanya Admin Utama
                    </span>
                  )}
                </div>
                <select
                  disabled={!isAdminUtama}
                  value={rekapGuruStartDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setRekapGuruStartDay(val);
                    handleSyncRekapSettings({ rekapGuruStartDay: val });
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold ${
                    !isAdminUtama ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800 border-slate-200 cursor-pointer'
                  }`}
                  title={!isAdminUtama ? 'Hanya Admin Utama yang dapat menentukan tanggal awal hitung presensi' : 'Tentukan mulai tanggal berapa presensi dihitung (hari sebelumnya tidak dihitung Alpa)'}
                >
                  {(() => {
                    const parts = (rekapGuruMonth || '2026-08').split('-');
                    const yr = parseInt(parts[0], 10) || 2026;
                    const mo = parseInt(parts[1], 10) || 8;
                    const totalDays = new Date(yr, mo, 0).getDate();
                    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    return Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                      const dObj = new Date(yr, mo - 1, d);
                      const dName = dayNames[dObj.getDay()];
                      return (
                        <option key={`guru-start-day-${d}`} value={d}>
                          Tgl {d} ({dName}) {d === 1 ? '- Awal Bulan' : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Target Hari Kerja
                  </label>
                  {!isAdminUtama && (
                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Hanya Admin Utama
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={!isAdminUtama}
                  value={rekapGuruTargetDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 22;
                    setRekapGuruTargetDays(val);
                    handleSyncRekapSettings({ rekapGuruTargetDays: val });
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold ${
                    !isAdminUtama ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800 border-slate-200'
                  }`}
                  title={!isAdminUtama ? 'Hanya Admin Utama yang dapat mengedit Target Hari Kerja' : 'Edit target hari kerja'}
                />
              </div>
            </div>

            {isAdminUtama && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 px-3.5 py-2.5 rounded-2xl text-xs text-blue-900 mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Pilihan Bulan & Tahun, Mulai Tanggal Hitung, dan Target Hari Kerja <strong>tersimpan & tersinkron terpusat ke Google Sheets</strong>.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncRekapSettings()}
                  className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan & Sync Ke Cloud
                </button>
              </div>
            )}

            {rekapGuruStartDay > 1 && (
              <div className="flex items-center gap-2.5 bg-blue-50/70 border border-blue-200/80 px-4 py-2.5 rounded-xl text-xs text-blue-900 font-medium">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Hitung presensi bulanan aktif dimulai dari <strong>Tanggal {rekapGuruStartDay}</strong>. Tanggal 1 s.d. {rekapGuruStartDay - 1} berstatus <em>Belum Dimulai</em> (tidak dihitung Alpa).
                </span>
              </div>
            )}

            {/* Back to ALL Guru button if looking at individual */}
            {rekapGuruNip !== 'ALL' && isFullAccess && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  <div>
                    <span className="text-xs font-extrabold text-blue-900 block">
                      Rincian Presensi Guru: <span className="underline">{guruMonthlyData.targetNama}</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-mono">
                      NIP: {guruMonthlyData.targetNip || '-'} | Periode: {guruMonthlyData.monthLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRekapGuruNip('ALL');
                    setSelectedGuruDetailNip(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Tutup & Kembali ke Semua Guru (A-Z)</span>
                </button>
              </div>
            )}

            {/* Summary Stat Cards */}
            {rekapGuruNip === 'ALL' ? (
              (() => {
                const totalHadir = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countHadir, 0);
                const totalIzin = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countIzin, 0);
                const totalSakit = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countSakit, 0);
                const totalCutiDL = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countCutiDL, 0);
                const totalAlpa = allGuruMonthlyList.reduce((acc, curr) => acc + curr.countAlpa, 0);
                const avgPersentase = allGuruMonthlyList.length > 0
                  ? Math.round(allGuruMonthlyList.reduce((acc, curr) => acc + curr.persentase, 0) / allGuruMonthlyList.length)
                  : 0;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Guru</span>
                        <p className="text-xl font-extrabold text-blue-600">{allGuruMonthlyList.length} <span className="text-xs font-semibold text-slate-400">Orang</span></p>
                        <p className="text-[10px] text-slate-400 font-medium">Bulan: {guruMonthlyData.monthLabel}</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Hadir</span>
                        <p className="text-xl font-extrabold text-emerald-600">{totalHadir} <span className="text-xs font-semibold text-slate-400">Total Hari</span></p>
                        <p className="text-[10px] text-slate-400 font-medium">Akumulasi Semua Guru</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Izin / Sakit / Cuti</span>
                        <p className="text-xl font-extrabold text-amber-600">
                          {totalIzin + totalSakit + totalCutiDL} <span className="text-xs font-semibold text-slate-400">Hari</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">S: {totalSakit} | I: {totalIzin} | C/DL: {totalCutiDL}</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Alpa / Tanpa Ket.</span>
                        <p className="text-xl font-extrabold text-rose-600">{totalAlpa} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                        <p className="text-[10px] text-slate-400 font-medium">Belum Presensi</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Rata-Rata Kehadiran</span>
                        <p className="text-xl font-extrabold text-indigo-600">{avgPersentase}%</p>
                        <p className="text-[10px] text-slate-400 font-medium">Target: {rekapGuruTargetDays} Hari Kerja</p>
                      </div>
                    </div>

                    {/* Search & View Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100/70 border border-slate-200 rounded-2xl">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari Nama Guru / NIP (contoh: Ahmad, Dede)..."
                          value={searchRekapGuru}
                          onChange={(e) => setSearchRekapGuru(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium placeholder:text-slate-400"
                        />
                        {searchRekapGuru && (
                          <button
                            type="button"
                            onClick={() => setSearchRekapGuru('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          {filteredAllGuruMonthlyList.length} dari {allGuruMonthlyList.length} Guru (Urut A-Z)
                        </span>
                        <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
                          <button
                            type="button"
                            onClick={() => setGuruRekapViewMode('cards')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${guruRekapViewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Kartu Ringkasan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setGuruRekapViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${guruRekapViewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            <List className="w-3.5 h-3.5" />
                            <span>Tabel Matriks</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identitas Guru</span>
                  <p className="text-sm font-extrabold text-slate-800 truncate" title={guruMonthlyData.targetNama}>{guruMonthlyData.targetNama}</p>
                  <p className="text-[10px] text-slate-400 font-medium">NIP: {guruMonthlyData.targetNip || '-'}</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Hadir</span>
                  <p className="text-xl font-extrabold text-emerald-600">{guruMonthlyData.countHadir} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                  <p className="text-[10px] text-slate-400 font-medium">Presensi Mandiri / Kiosk</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Izin / Sakit / Cuti</span>
                  <p className="text-xl font-extrabold text-amber-600">
                    {guruMonthlyData.countIzin + guruMonthlyData.countSakit + guruMonthlyData.countCutiDL} <span className="text-xs font-semibold text-slate-400">Hari</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">S: {guruMonthlyData.countSakit} | I: {guruMonthlyData.countIzin} | DL/C: {guruMonthlyData.countCutiDL}</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Alpa / Tanpa Ket.</span>
                  <p className="text-xl font-extrabold text-rose-600">{guruMonthlyData.countAlpa} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                  <p className="text-[10px] text-slate-400 font-medium">Hari Kerja Belum Presensi</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">% Kehadiran</span>
                  <p className="text-xl font-extrabold text-blue-600">{guruMonthlyData.persentase}%</p>
                  <p className="text-[10px] text-slate-400 font-medium">{guruMonthlyData.countHadir} dari {guruMonthlyData.totalHariKerja} Hari Target</p>
                </div>
              </div>
            )}

            {/* Matrix Table or Card View */}
            {rekapGuruNip === 'ALL' ? (
              guruRekapViewMode === 'cards' ? (
                /* ALL GURU CARD-ROW VIEW (SORTED A TO Z) */
                <div className="space-y-4">
                  {filteredAllGuruMonthlyList.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
                      Tidak ada guru yang sesuai dengan kata kunci "{searchRekapGuru}".
                    </div>
                  ) : (
                    filteredAllGuruMonthlyList.map((g, idx) => {
                      const isExpanded = selectedGuruDetailNip === (g.nip || g.nama);
                      return (
                        <div
                          key={`all-g-card-${g.nip || idx}`}
                          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all space-y-3 ${isExpanded ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}`}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {/* 1. IDENTITAS GURU */}
                            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Identitas Guru #{idx + 1}</span>
                              <p className="text-sm font-extrabold text-slate-800 truncate" title={g.nama}>{g.nama}</p>
                              <p className="text-[10px] font-mono text-slate-500 font-medium">NIP: {g.nip || '-'}</p>
                            </div>

                            {/* 2. HADIR */}
                            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Hadir</span>
                              <p className="text-lg font-black text-emerald-700">{g.countHadir} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                              <p className="text-[10px] text-slate-500 font-medium">Presensi Mandiri / Kiosk</p>
                            </div>

                            {/* 3. IZIN / SAKIT / CUTI */}
                            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider block">Izin / Sakit / Cuti</span>
                              <p className="text-lg font-black text-amber-700">
                                {g.countIzin + g.countSakit + g.countCutiDL} <span className="text-xs font-semibold text-slate-400">Hari</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">S: {g.countSakit} | I: {g.countIzin} | DL/C: {g.countCutiDL}</p>
                            </div>

                            {/* 4. ALPA / TANPA KET. */}
                            <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-wider block">Alpa / Tanpa Ket.</span>
                              <p className="text-lg font-black text-rose-700">{g.countAlpa} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                              <p className="text-[10px] text-slate-500 font-medium">Hari Kerja Belum Presensi</p>
                            </div>

                            {/* 5. % KEHADIRAN */}
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-0.5 col-span-2 md:col-span-1">
                              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block">% Kehadiran</span>
                              <p className="text-lg font-black text-indigo-700">{g.persentase}%</p>
                              <p className="text-[10px] text-slate-500 font-medium">{g.countHadir} dari {g.totalHariKerja} Hari Target</p>
                            </div>
                          </div>

                          {/* Card bottom action bar */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Urutan Abjad: <span className="font-bold text-slate-700">{g.nama}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExpanded) {
                                    setSelectedGuruDetailNip(null);
                                  } else {
                                    setSelectedGuruDetailNip(g.nip || g.nama);
                                  }
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isExpanded ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'}`}
                              >
                                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{isExpanded ? 'Tutup Rincian Harian' : `Lihat Rincian Harian (Tgl 1 - ${g.dayRows.length})`}</span>
                              </button>
                            </div>
                          </div>

                          {/* INLINE DETAILED DAILY BREAKDOWN TABLE (WHEN EXPANDED) */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-blue-100 space-y-3 animate-fade-in">
                              <div className="flex items-center justify-between bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                                <div>
                                  <h5 className="text-xs font-extrabold text-blue-950">
                                    Rincian Harian: {g.nama} ({g.nip || 'Tanpa NIP'})
                                  </h5>
                                  <p className="text-[10px] text-blue-700">
                                    Bulan: {guruMonthlyData.monthLabel} • Hadir: {g.countHadir} Hari • Izin: {g.countIzin} • Sakit: {g.countSakit} • Cuti: {g.countCutiDL} • Alpa: {g.countAlpa}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedGuruDetailNip(null)}
                                  className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Tutup</span>
                                </button>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-xs bg-white">
                                  <thead>
                                    <tr className="bg-slate-100/90 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                                      <th className="py-2.5 px-3 text-center">Tgl</th>
                                      <th className="py-2.5 px-3">Tanggal</th>
                                      <th className="py-2.5 px-3">Hari</th>
                                      <th className="py-2.5 px-3 text-center">Status</th>
                                      <th className="py-2.5 px-3 text-center">Jam Datang</th>
                                      <th className="py-2.5 px-3 text-center">Jam Pulang</th>
                                      <th className="py-2.5 px-3">Keterangan</th>
                                      <th className="py-2.5 px-3 text-center">Foto</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {g.dayRows.map((r: any, rIdx: number) => (
                                      <tr key={`g-inline-${g.nip}-${r.tanggal}-${rIdx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{r.dayNumber}</td>
                                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{r.tanggal}</td>
                                        <td className="py-2.5 px-3 font-bold text-slate-800">{r.dayName}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${r.statusBadge}`}>
                                            {r.status}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">{r.jamDatang}</td>
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">{r.jamPulang}</td>
                                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{r.keterangan}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          {r.photo ? (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedPhoto(r.photo)}
                                              className="px-2 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                                            >
                                              <Eye className="w-3 h-3" />
                                              <span>Foto</span>
                                            </button>
                                          ) : (
                                            <span className="text-slate-300 text-[10px]">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedGuruDetailNip(null)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tutup Rincian Harian</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* ALL GURU TABLE VIEW */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Rekapitulasi Kehadiran Seluruh Guru (Urut Abjad A-Z) - Bulan {guruMonthlyData.monthLabel}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                      Target: <span className="text-blue-600 font-black">{rekapGuruTargetDays} Hari Kerja</span>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4 text-center">No</th>
                          <th className="py-3 px-4">NIP</th>
                          <th className="py-3 px-4">Nama Guru</th>
                          <th className="py-3 px-4 text-center text-emerald-700">Jumlah Hadir</th>
                          <th className="py-3 px-4 text-center text-blue-700">Jumlah Izin</th>
                          <th className="py-3 px-4 text-center text-amber-700">Sakit</th>
                          <th className="py-3 px-4 text-center text-purple-700">Cuti / DL</th>
                          <th className="py-3 px-4 text-center text-rose-700">Alpa / Tanpa Ket.</th>
                          <th className="py-3 px-4 text-center text-indigo-700">% Hadir</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAllGuruMonthlyList.map((g, idx) => (
                          <tr key={`all-g-${g.nip || idx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{g.nip || '-'}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{g.nama}</td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-600">{g.countHadir} Hari</td>
                            <td className="py-3 px-4 text-center font-semibold text-blue-600">{g.countIzin} Hari</td>
                            <td className="py-3 px-4 text-center font-semibold text-amber-600">{g.countSakit} Hari</td>
                            <td className="py-3 px-4 text-center font-semibold text-purple-600">{g.countCutiDL} Hari</td>
                            <td className="py-3 px-4 text-center font-bold text-rose-600">{g.countAlpa} Hari</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${g.persentase >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {g.persentase}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setRekapGuruNip(g.nip || g.nama);
                                  setSelectedGuruDetailNip(g.nip || g.nama);
                                }}
                                className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Lihat Rincian
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 text-right">TOTAL & RATA-RATA:</td>
                          <td className="py-3 px-4 text-center text-emerald-700 font-extrabold">
                            {filteredAllGuruMonthlyList.reduce((acc, curr) => acc + curr.countHadir, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-blue-700">
                            {filteredAllGuruMonthlyList.reduce((acc, curr) => acc + curr.countIzin, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-amber-700">
                            {filteredAllGuruMonthlyList.reduce((acc, curr) => acc + curr.countSakit, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-purple-700">
                            {filteredAllGuruMonthlyList.reduce((acc, curr) => acc + curr.countCutiDL, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-rose-700 font-extrabold">
                            {filteredAllGuruMonthlyList.reduce((acc, curr) => acc + curr.countAlpa, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-indigo-700 font-extrabold">
                            {filteredAllGuruMonthlyList.length > 0
                              ? Math.round(filteredAllGuruMonthlyList.reduce((acc, curr) => acc + curr.persentase, 0) / filteredAllGuruMonthlyList.length)
                              : 0}%
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Rincian Kehadiran: {guruMonthlyData.targetNama} ({guruMonthlyData.totalDaysInMonth} Hari)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      NIP: {guruMonthlyData.targetNip || '-'} • Bulan {guruMonthlyData.monthLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                      Sheet Target: <span className="text-blue-600 font-black">Rekap_Kehadiran Guru</span>
                    </span>
                    {isFullAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          setRekapGuruNip('ALL');
                          setSelectedGuruDetailNip(null);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tutup Rincian</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4 text-center">Tgl</th>
                        <th className="py-3 px-4">Tanggal Lengkap</th>
                        <th className="py-3 px-4">Hari</th>
                        <th className="py-3 px-4 text-center">Status Kehadiran</th>
                        <th className="py-3 px-4 text-center">Jam Datang</th>
                        <th className="py-3 px-4 text-center">Jam Pulang</th>
                        <th className="py-3 px-4">Keterangan / Alasan</th>
                        <th className="py-3 px-4 text-center">Foto Bukti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {guruMonthlyData.dayRows.map((r, idx) => (
                        <tr key={`g-day-${r.tanggal}-${idx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{r.dayNumber}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{r.tanggal}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{r.dayName}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${r.statusBadge}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">{r.jamDatang}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">{r.jamPulang}</td>
                          <td className="py-3 px-4 text-slate-600">{r.keterangan}</td>
                          <td className="py-3 px-4 text-center">
                            {r.photo ? (
                              <button
                                onClick={() => setSelectedPhoto(r.photo)}
                                className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Foto</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isFullAccess && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">
                      Selesai melihat rincian? Klik tombol di samping untuk menutup kembali.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRekapGuruNip('ALL');
                        setSelectedGuruDetailNip(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Rekap Semua Guru (A-Z)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUB TAB 9: REKAP BULANAN TENDIK (PERSEORANGAN / SEMUA TENDIK) */}
        {subTab === 'rekap-tendik' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                  {rekapTendikNip === 'ALL' ? 'Rekapitulasi Kehadiran Bulanan Semua Tendik' : 'Rekapitulasi Kehadiran Bulanan Tendik (Perseorangan)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rekapTendikNip === 'ALL'
                    ? 'Laporan rekapitulasi kehadiran seluruh Tenaga Kependidikan (Tendik) dalam satu bulan kerja.'
                    : 'Laporan rekap presensi bulanan perseorangan Tendik. Tersimpan otomatis ke sheet Rekap_Kehadiran Tendik.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTendikMonthlyToSheets}
                  disabled={isSavingTendikRecap}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingTendikRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan ke Spreadsheet</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportTendikMonthlyPDF}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Cetak PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportTendikMonthlyExcel}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {savingRecapMsg && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${savingRecapMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                <span>{savingRecapMsg}</span>
              </div>
            )}

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Tendik</label>
                <select
                  value={rekapTendikNip}
                  onChange={(e) => setRekapTendikNip(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-semibold text-slate-800"
                >
                  {isFullAccess && (
                    <option value="ALL">⭐ SEMUA TENDIK (SEMUA NIP - URUT ABJAD A-Z)</option>
                  )}
                  {listTendikUsers.map((t: any, idx: number) => (
                    <option key={`tendik-opt-${t.nip || idx}`} value={t.nip || t.nama}>
                      {t.nama} {t.nip && t.nip !== 'ALL' ? `(NIP: ${t.nip})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Bulan & Tahun</label>
                <input
                  type="month"
                  value={rekapTendikMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRekapTendikMonth(val);
                    handleSyncRekapSettings({ rekapTendikMonth: val });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-semibold text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Mulai Tgl / Hari Hitung
                  </label>
                  {!isAdminUtama && (
                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Hanya Admin Utama
                    </span>
                  )}
                </div>
                <select
                  disabled={!isAdminUtama}
                  value={rekapTendikStartDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setRekapTendikStartDay(val);
                    handleSyncRekapSettings({ rekapTendikStartDay: val });
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold ${
                    !isAdminUtama ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800 border-slate-200 cursor-pointer'
                  }`}
                  title={!isAdminUtama ? 'Hanya Admin Utama yang dapat menentukan tanggal awal hitung presensi' : 'Tentukan mulai tanggal berapa presensi dihitung (hari sebelumnya tidak dihitung Alpa)'}
                >
                  {(() => {
                    const parts = (rekapTendikMonth || '2026-08').split('-');
                    const yr = parseInt(parts[0], 10) || 2026;
                    const mo = parseInt(parts[1], 10) || 8;
                    const totalDays = new Date(yr, mo, 0).getDate();
                    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    return Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                      const dObj = new Date(yr, mo - 1, d);
                      const dName = dayNames[dObj.getDay()];
                      return (
                        <option key={`tendik-start-day-${d}`} value={d}>
                          Tgl {d} ({dName}) {d === 1 ? '- Awal Bulan' : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Target Hari Kerja
                  </label>
                  {!isAdminUtama && (
                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Hanya Admin Utama
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={!isAdminUtama}
                  value={rekapTendikTargetDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 22;
                    setRekapTendikTargetDays(val);
                    handleSyncRekapSettings({ rekapTendikTargetDays: val });
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold ${
                    !isAdminUtama ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-800 border-slate-200'
                  }`}
                  title={!isAdminUtama ? 'Hanya Admin Utama yang dapat mengedit Target Hari Kerja' : 'Edit target hari kerja'}
                />
              </div>
            </div>

            {isAdminUtama && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 px-3.5 py-2.5 rounded-2xl text-xs text-emerald-900 mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pilihan Bulan & Tahun, Mulai Tanggal Hitung, dan Target Hari Kerja <strong>tersimpan & tersinkron terpusat ke Google Sheets</strong>.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncRekapSettings()}
                  className="w-full sm:w-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan & Sync Ke Cloud
                </button>
              </div>
            )}

            {rekapTendikStartDay > 1 && (
              <div className="flex items-center gap-2.5 bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 rounded-xl text-xs text-emerald-900 font-medium">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Hitung presensi bulanan aktif dimulai dari <strong>Tanggal {rekapTendikStartDay}</strong>. Tanggal 1 s.d. {rekapTendikStartDay - 1} berstatus <em>Belum Dimulai</em> (tidak dihitung Alpa).
                </span>
              </div>
            )}

            {/* Back to ALL Tendik button if looking at individual */}
            {rekapTendikNip !== 'ALL' && isFullAccess && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <div>
                    <span className="text-xs font-extrabold text-emerald-900 block">
                      Rincian Presensi Tendik: <span className="underline">{tendikMonthlyData.targetNama}</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      NIP: {tendikMonthlyData.targetNip || '-'} | Periode: {tendikMonthlyData.monthLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRekapTendikNip('ALL');
                    setSelectedTendikDetailNip(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Tutup & Kembali ke Semua Tendik (A-Z)</span>
                </button>
              </div>
            )}

            {/* Summary Stat Cards */}
            {rekapTendikNip === 'ALL' ? (
              (() => {
                const totalHadir = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countHadir, 0);
                const totalIzin = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countIzin, 0);
                const totalSakit = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countSakit, 0);
                const totalCutiDL = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countCutiDL, 0);
                const totalAlpa = allTendikMonthlyList.reduce((acc, curr) => acc + curr.countAlpa, 0);
                const avgPersentase = allTendikMonthlyList.length > 0
                  ? Math.round(allTendikMonthlyList.reduce((acc, curr) => acc + curr.persentase, 0) / allTendikMonthlyList.length)
                  : 0;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tendik</span>
                        <p className="text-xl font-extrabold text-emerald-600">{allTendikMonthlyList.length} <span className="text-xs font-semibold text-slate-400">Orang</span></p>
                        <p className="text-[10px] text-slate-400 font-medium">Bulan: {tendikMonthlyData.monthLabel}</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Hadir</span>
                        <p className="text-xl font-extrabold text-emerald-600">{totalHadir} <span className="text-xs font-semibold text-slate-400">Total Hari</span></p>
                        <p className="text-[10px] text-slate-400 font-medium">Akumulasi Semua Tendik</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Izin / Sakit / Cuti</span>
                        <p className="text-xl font-extrabold text-amber-600">
                          {totalIzin + totalSakit + totalCutiDL} <span className="text-xs font-semibold text-slate-400">Hari</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">S: {totalSakit} | I: {totalIzin} | C/DL: {totalCutiDL}</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Alpa / Tanpa Ket.</span>
                        <p className="text-xl font-extrabold text-rose-600">{totalAlpa} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                        <p className="text-[10px] text-slate-400 font-medium">Belum Presensi</p>
                      </div>

                      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Rata-Rata Kehadiran</span>
                        <p className="text-xl font-extrabold text-indigo-600">{avgPersentase}%</p>
                        <p className="text-[10px] text-slate-400 font-medium">Target: {rekapTendikTargetDays} Hari Kerja</p>
                      </div>
                    </div>

                    {/* Search & View Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100/70 border border-slate-200 rounded-2xl">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari Nama Tendik / NIP (contoh: Doni, Rina)..."
                          value={searchRekapTendik}
                          onChange={(e) => setSearchRekapTendik(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium placeholder:text-slate-400"
                        />
                        {searchRekapTendik && (
                          <button
                            type="button"
                            onClick={() => setSearchRekapTendik('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          {filteredAllTendikMonthlyList.length} dari {allTendikMonthlyList.length} Tendik (Urut A-Z)
                        </span>
                        <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
                          <button
                            type="button"
                            onClick={() => setTendikRekapViewMode('cards')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${tendikRekapViewMode === 'cards' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Kartu Ringkasan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTendikRekapViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${tendikRekapViewMode === 'table' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            <List className="w-3.5 h-3.5" />
                            <span>Tabel Matriks</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identitas Tendik</span>
                  <p className="text-sm font-extrabold text-slate-800 truncate" title={tendikMonthlyData.targetNama}>{tendikMonthlyData.targetNama}</p>
                  <p className="text-[10px] text-slate-400 font-medium">NIP: {tendikMonthlyData.targetNip || '-'}</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Hadir</span>
                  <p className="text-xl font-extrabold text-emerald-600">{tendikMonthlyData.countHadir} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                  <p className="text-[10px] text-slate-400 font-medium">Presensi Mandiri / Kiosk</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Izin / Sakit / Cuti</span>
                  <p className="text-xl font-extrabold text-amber-600">
                    {tendikMonthlyData.countIzin + tendikMonthlyData.countSakit + tendikMonthlyData.countCutiDL} <span className="text-xs font-semibold text-slate-400">Hari</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">S: {tendikMonthlyData.countSakit} | I: {tendikMonthlyData.countIzin} | DL/C: {tendikMonthlyData.countCutiDL}</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Alpa / Tanpa Ket.</span>
                  <p className="text-xl font-extrabold text-rose-600">{tendikMonthlyData.countAlpa} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                  <p className="text-[10px] text-slate-400 font-medium">Hari Kerja Belum Presensi</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">% Kehadiran</span>
                  <p className="text-xl font-extrabold text-emerald-600">{tendikMonthlyData.persentase}%</p>
                  <p className="text-[10px] text-slate-400 font-medium">{tendikMonthlyData.countHadir} dari {tendikMonthlyData.totalHariKerja} Hari Target</p>
                </div>
              </div>
            )}

            {/* Daily Matrix Table or All Tendik Table */}
            {rekapTendikNip === 'ALL' ? (
              tendikRekapViewMode === 'cards' ? (
                /* ALL TENDIK CARD-ROW VIEW (SORTED A TO Z) */
                <div className="space-y-4">
                  {filteredAllTendikMonthlyList.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
                      Tidak ada tenaga kependidikan yang sesuai dengan kata kunci "{searchRekapTendik}".
                    </div>
                  ) : (
                    filteredAllTendikMonthlyList.map((t, idx) => {
                      const isExpanded = selectedTendikDetailNip === (t.nip || t.nama);
                      return (
                        <div
                          key={`all-t-card-${t.nip || idx}`}
                          className={`bg-white border rounded-2xl p-4 shadow-sm transition-all space-y-3 ${isExpanded ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'}`}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {/* 1. IDENTITAS TENDIK */}
                            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Identitas Tendik #{idx + 1}</span>
                              <p className="text-sm font-extrabold text-slate-800 truncate" title={t.nama}>{t.nama}</p>
                              <p className="text-[10px] font-mono text-slate-500 font-medium">NIP: {t.nip || '-'}</p>
                            </div>

                            {/* 2. HADIR */}
                            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Hadir</span>
                              <p className="text-lg font-black text-emerald-700">{t.countHadir} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                              <p className="text-[10px] text-slate-500 font-medium">Presensi Mandiri / Kiosk</p>
                            </div>

                            {/* 3. IZIN / SAKIT / CUTI */}
                            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider block">Izin / Sakit / Cuti</span>
                              <p className="text-lg font-black text-amber-700">
                                {t.countIzin + t.countSakit + t.countCutiDL} <span className="text-xs font-semibold text-slate-400">Hari</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">S: {t.countSakit} | I: {t.countIzin} | DL/C: {t.countCutiDL}</p>
                            </div>

                            {/* 4. ALPA / TANPA KET. */}
                            <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-wider block">Alpa / Tanpa Ket.</span>
                              <p className="text-lg font-black text-rose-700">{t.countAlpa} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
                              <p className="text-[10px] text-slate-500 font-medium">Hari Kerja Belum Presensi</p>
                            </div>

                            {/* 5. % KEHADIRAN */}
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-0.5 col-span-2 md:col-span-1">
                              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block">% Kehadiran</span>
                              <p className="text-lg font-black text-indigo-700">{t.persentase}%</p>
                              <p className="text-[10px] text-slate-500 font-medium">{t.countHadir} dari {t.totalHariKerja} Hari Target</p>
                            </div>
                          </div>

                          {/* Card bottom action bar */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Urutan Abjad: <span className="font-bold text-slate-700">{t.nama}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExpanded) {
                                    setSelectedTendikDetailNip(null);
                                  } else {
                                    setSelectedTendikDetailNip(t.nip || t.nama);
                                  }
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isExpanded ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                              >
                                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{isExpanded ? 'Tutup Rincian Harian' : `Lihat Rincian Harian (Tgl 1 - ${t.dayRows.length})`}</span>
                              </button>
                            </div>
                          </div>

                          {/* INLINE DETAILED DAILY BREAKDOWN TABLE (WHEN EXPANDED) */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-emerald-100 space-y-3 animate-fade-in">
                              <div className="flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                                <div>
                                  <h5 className="text-xs font-extrabold text-emerald-950">
                                    Rincian Harian: {t.nama} ({t.nip || 'Tanpa NIP'})
                                  </h5>
                                  <p className="text-[10px] text-emerald-700">
                                    Bulan: {tendikMonthlyData.monthLabel} • Hadir: {t.countHadir} Hari • Izin: {t.countIzin} • Sakit: {t.countSakit} • Cuti: {t.countCutiDL} • Alpa: {t.countAlpa}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTendikDetailNip(null)}
                                  className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Tutup</span>
                                </button>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-xs bg-white">
                                  <thead>
                                    <tr className="bg-slate-100/90 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                                      <th className="py-2.5 px-3 text-center">Tgl</th>
                                      <th className="py-2.5 px-3">Tanggal</th>
                                      <th className="py-2.5 px-3">Hari</th>
                                      <th className="py-2.5 px-3 text-center">Status</th>
                                      <th className="py-2.5 px-3 text-center">Jam Datang</th>
                                      <th className="py-2.5 px-3 text-center">Jam Pulang</th>
                                      <th className="py-2.5 px-3">Keterangan</th>
                                      <th className="py-2.5 px-3 text-center">Foto</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {t.dayRows.map((r: any, rIdx: number) => (
                                      <tr key={`t-inline-${t.nip}-${r.tanggal}-${rIdx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{r.dayNumber}</td>
                                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{r.tanggal}</td>
                                        <td className="py-2.5 px-3 font-bold text-slate-800">{r.dayName}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${r.statusBadge}`}>
                                            {r.status}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">{r.jamDatang}</td>
                                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">{r.jamPulang}</td>
                                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{r.keterangan}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          {r.photo ? (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedPhoto(r.photo)}
                                              className="px-2 py-0.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                                            >
                                              <Eye className="w-3 h-3" />
                                              <span>Foto</span>
                                            </button>
                                          ) : (
                                            <span className="text-slate-300 text-[10px]">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTendikDetailNip(null)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tutup Rincian Harian</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* ALL TENDIK TABLE VIEW */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Rekapitulasi Kehadiran Seluruh Tendik (Urut Abjad A-Z) - Bulan {tendikMonthlyData.monthLabel}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                      Target: <span className="text-emerald-600 font-black">{rekapTendikTargetDays} Hari Kerja</span>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4 text-center">No</th>
                          <th className="py-3 px-4">NIP</th>
                          <th className="py-3 px-4">Nama Tendik</th>
                          <th className="py-3 px-4 text-center text-emerald-700">Jumlah Hadir</th>
                          <th className="py-3 px-4 text-center text-blue-700">Jumlah Izin</th>
                          <th className="py-3 px-4 text-center text-amber-700">Sakit</th>
                          <th className="py-3 px-4 text-center text-purple-700">Cuti / DL</th>
                          <th className="py-3 px-4 text-center text-rose-700">Alpa / Tanpa Ket.</th>
                          <th className="py-3 px-4 text-center text-indigo-700">% Hadir</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAllTendikMonthlyList.map((t, idx) => (
                          <tr key={`all-t-${t.nip || idx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{t.nip || '-'}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{t.nama}</td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-600">{t.countHadir} Hari</td>
                            <td className="py-3 px-4 text-center font-semibold text-blue-600">{t.countIzin} Hari</td>
                            <td className="py-3 px-4 text-center font-semibold text-amber-600">{t.countSakit} Hari</td>
                            <td className="py-3 px-4 text-center font-semibold text-purple-600">{t.countCutiDL} Hari</td>
                            <td className="py-3 px-4 text-center font-bold text-rose-600">{t.countAlpa} Hari</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${t.persentase >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {t.persentase}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setRekapTendikNip(t.nip || t.nama);
                                  setSelectedTendikDetailNip(t.nip || t.nama);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Lihat Rincian
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 text-right">TOTAL & RATA-RATA:</td>
                          <td className="py-3 px-4 text-center text-emerald-700 font-extrabold">
                            {filteredAllTendikMonthlyList.reduce((acc, curr) => acc + curr.countHadir, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-blue-700">
                            {filteredAllTendikMonthlyList.reduce((acc, curr) => acc + curr.countIzin, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-amber-700">
                            {filteredAllTendikMonthlyList.reduce((acc, curr) => acc + curr.countSakit, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-purple-700">
                            {filteredAllTendikMonthlyList.reduce((acc, curr) => acc + curr.countCutiDL, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-rose-700 font-extrabold">
                            {filteredAllTendikMonthlyList.reduce((acc, curr) => acc + curr.countAlpa, 0)} Hari
                          </td>
                          <td className="py-3 px-4 text-center text-indigo-700 font-extrabold">
                            {filteredAllTendikMonthlyList.length > 0
                              ? Math.round(filteredAllTendikMonthlyList.reduce((acc, curr) => acc + curr.persentase, 0) / filteredAllTendikMonthlyList.length)
                              : 0}%
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Rincian Kehadiran: {tendikMonthlyData.targetNama} ({tendikMonthlyData.totalDaysInMonth} Hari)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      NIP: {tendikMonthlyData.targetNip || '-'} • Bulan {tendikMonthlyData.monthLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                      Sheet Target: <span className="text-emerald-600 font-black">Rekap_Kehadiran Tendik</span>
                    </span>
                    {isFullAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          setRekapTendikNip('ALL');
                          setSelectedTendikDetailNip(null);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tutup Rincian</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4 text-center">Tgl</th>
                        <th className="py-3 px-4">Tanggal Lengkap</th>
                        <th className="py-3 px-4">Hari</th>
                        <th className="py-3 px-4 text-center">Status Kehadiran</th>
                        <th className="py-3 px-4 text-center">Jam Datang</th>
                        <th className="py-3 px-4 text-center">Jam Pulang</th>
                        <th className="py-3 px-4">Keterangan / Alasan</th>
                        <th className="py-3 px-4 text-center">Foto Bukti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tendikMonthlyData.dayRows.map((r, idx) => (
                        <tr key={`t-day-${r.tanggal}-${idx}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{r.dayNumber}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{r.tanggal}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{r.dayName}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${r.statusBadge}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">{r.jamDatang}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">{r.jamPulang}</td>
                          <td className="py-3 px-4 text-slate-600">{r.keterangan}</td>
                          <td className="py-3 px-4 text-center">
                            {r.photo ? (
                              <button
                                onClick={() => setSelectedPhoto(r.photo)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Foto</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isFullAccess && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">
                      Selesai melihat rincian? Klik tombol di samping untuk menutup kembali.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRekapTendikNip('ALL');
                        setSelectedTendikDetailNip(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Rekap Semua Tendik (A-Z)</span>
                    </button>
                  </div>
                )}
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
              <h4 className="font-extrabold text-slate-800 text-sm">Foto Bukti Presensi / Dokumentasi</h4>
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
