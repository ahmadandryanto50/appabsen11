/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  History,
  ShieldAlert,
  UserCheck,
  School,
  BookOpen,
  Settings,
  LogOut, FileText,
  Menu,
  X,
  Loader2,
  Sparkles,
  Code,
  RefreshCw,
  ScanLine,
  QrCode,
  ExternalLink,
  Home,
  ArrowLeft,
  Download,
} from 'lucide-react';

import { User, AttendanceRecord, TeacherAbsenceRecord, ToastMessage, ViewType, CrudRow, Student, AppCustomization, getLocalDateString, getLocalTimeString } from './types';
import { apiClient, initializeStorage, clearApiCache } from './api';
import { normalizeImageUrl, getUserPhotoUrl, handleImageFallbackError } from './utils/imageUrl';
import { updateAppMetadataAndIcon } from './utils/appIcon';

// Components
import { ToastContainer } from './components/ToastContainer';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { AttendanceView } from './components/AttendanceView';
import { TeacherPermitView } from './components/TeacherPermitView';
import { TeacherAttendanceView } from './components/TeacherAttendanceView';
import { TendikAttendanceView } from './components/TendikAttendanceView';
import { TendikPermitView } from './components/TendikPermitView';
import { HistoryView } from './components/HistoryView';
import { CrudView } from './components/CrudView';
import { SettingsModal } from './components/SettingsModal';
import { CustomizationView } from './components/CustomizationView';
import { AppsScriptView } from './components/AppsScriptView';
import { BerkasView } from './components/BerkasView';
import { ScannerKioskView } from './components/ScannerKioskView';
import { CetakBarcodeView } from './components/CetakBarcodeView';
import { ExternalAppsModal, DEFAULT_APPS } from './components/ExternalAppsModal';
import { HariLiburView } from './components/HariLiburView';

export default function App() {
  // Authentication & Navigation
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Connection config
  const [webAppUrl, setWebAppUrl] = useState(apiClient.getBackendUrl());
  const [isDemoMode, setIsDemoMode] = useState(apiClient.isDemoMode());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showExternalAppsModal, setShowExternalAppsModal] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showHiddenSettings, setShowHiddenSettings] = useState(false);

  const handleLogoClickSecret = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowHiddenSettings(true);
        addToast('Menu Konfigurasi API Terbuka! Silakan klik tombol API Settings di bawah.', 'success');
        return 0;
      }
      return next;
    });
  };

  // Global Lists
  const [kelasList, setKelasList] = useState<string[]>(['X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A', 'XII-B']);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [historyList, setHistoryList] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('absensi_history_siswa');
      if (!saved) return [];
      const parsed: AttendanceRecord[] = JSON.parse(saved);
      if (!apiClient.isDemoMode()) {
        return parsed.filter((r) => r.guru !== 'Budi Santoso, S.Pd.' || r.kelas !== 'X-A' || r.mapel !== 'Matematika');
      }
      return parsed;
    } catch {
      return [];
    }
  });
  const [teacherHistoryList, setTeacherHistoryList] = useState<TeacherAbsenceRecord[]>(() => {
    try {
      if (!apiClient.isDemoMode()) {
        const saved = localStorage.getItem('absensi_history_guru');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return parsed.filter((r: TeacherAbsenceRecord) => r.nip !== '19920815201803');
      }
      const saved = localStorage.getItem('absensi_history_guru');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Master Data CRUD list states
  const [currentCrudSheet, setCurrentCrudSheet] = useState<string>('Master_Guru');
  const [crudHeaders, setCrudHeaders] = useState<string[]>([]);
  const [crudRows, setCrudRows] = useState<CrudRow[]>([]);
  const [crudLoading, setCrudLoading] = useState(false);

  // Digital ticking clock
  const [currentTimeString, setCurrentTimeString] = useState('00:00:00');

  // Customization state
  const [customization, setCustomization] = useState<AppCustomization>({
    appName: 'E-ABSENSI',
    appSubtitle: 'SMP NEGERI 11 PALU',
    logoUrl: '/logo_smpn11.jpg',
    logoEmoji: '🎓',
    logoColor: 'bg-blue-600',
    fullAccessUsernames: [],
    userPhotos: {},
    batasWaktuMasuk: '07:00',
    externalApps: DEFAULT_APPS,
  });

  // Automatically sync document title, favicon, apple touch icon, and web manifest whenever customization changes
  useEffect(() => {
    updateAppMetadataAndIcon(customization);
  }, [customization]);

  const [failedUserPhotos, setFailedUserPhotos] = useState<Record<string, boolean>>({});

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Permission Check Helper
  const hasFullAccess = useCallback((user: User | null): boolean => {
    if (!user) return false;
    if (user.role === 'Admin Utama' || user.role === 'Admin') return true;
    return customization.fullAccessUsernames.includes(user.username) || (user.nip ? customization.fullAccessUsernames.includes(user.nip) : false);
  }, [customization]);

  // TOAST TRIGGER
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Clock ticks
  useEffect(() => {
    const updateClock = () => {
      setCurrentTimeString(getLocalTimeString(new Date()));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch classes dynamically
  const fetchKelasList = useCallback(async () => {
    try {
      const res = await apiClient.getCrud('Master_Kelas');
      if (res && res.status === 'success' && res.rows && res.rows.length > 0) {
        const list = res.rows.map((r) => r.data[1]).filter(Boolean);
        if (list.length > 0) {
          setKelasList([...new Set(list)]);
        }
      }
    } catch (e) {
      console.error('Error fetching kelas list:', e);
    }
  }, []);

  const fetchMapelList = useCallback(async () => {
    try {
      const res = await apiClient.getCrud('Master_Mapel');
      if (res && res.status === 'success' && res.rows && res.rows.length > 0) {
        const list = res.rows.map((r) => r.data[2]).filter(Boolean); // Asumsi indeks ke-2 adalah Nama Mata Pelajaran
        if (list.length > 0) {
          setMapelList([...new Set(list)]);
        }
      }
    } catch (e) {
      console.error('Error fetching mapel list:', e);
    }
  }, []);

  // Fetch student & teacher master data dynamically for stats (in parallel)
  const fetchMasterData = useCallback(async () => {
    try {
      const [studentRes, teacherRes] = await Promise.all([
        apiClient.getCrud('Master_Siswa'),
        apiClient.getCrud('Master_Guru')
      ]);
      if (studentRes && studentRes.status === 'success' && studentRes.rows) {
        setAllStudents(studentRes.rows);
      }
      if (teacherRes && teacherRes.status === 'success' && teacherRes.rows) {
        setAllTeachers(teacherRes.rows);
      }
    } catch (e) {
      console.error('Error fetching master data for stats:', e);
    }
  }, []);

  // Load lists in parallel background without full-screen blocking overlay
  const loadHistoryData = useCallback(async () => {
    try {
      const [classRes, teachRes] = await Promise.all([
        apiClient.getAttendanceHistory('', ''),
        apiClient.getTeacherAbsenceHistory('')
      ]);
      if (classRes && classRes.status === 'success' && Array.isArray(classRes.history)) {
        setHistoryList(classRes.history);
      }
      if (teachRes && teachRes.status === 'success' && Array.isArray(teachRes.history)) {
        setTeacherHistoryList(teachRes.history);
      }
    } catch (err: any) {
      console.warn('Gagal sinkronisasi data riwayat:', err);
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    setIsLoading(true);
    clearApiCache();
    addToast('Menyinkronkan data dengan database...', 'info');
    try {
      await Promise.all([
        fetchKelasList(),
        fetchMapelList(),
        fetchMasterData(),
        loadHistoryData()
      ]);
      addToast('Sinkronisasi data berhasil!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal menyinkronkan data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchKelasList, fetchMapelList, fetchMasterData, loadHistoryData, addToast]);

  // Load app customization from Google Spreadsheet & local storage cache
  const loadCustomization = useCallback(async () => {
    // 1. First read local storage for immediate layout paint
    const savedCustomization = localStorage.getItem('absensi_app_customization');
    if (savedCustomization) {
      try {
        const parsed = JSON.parse(savedCustomization);
        setCustomization((prev) => ({
          ...parsed,
          ...prev,
          logoUrl: prev.logoUrl || parsed.logoUrl || '/logo_smpn11.jpg',
          userPhotos: { ...(parsed.userPhotos || {}), ...(prev.userPhotos || {}) },
          fullAccessUsernames: Array.isArray(prev.fullAccessUsernames) && prev.fullAccessUsernames.length > 0
            ? prev.fullAccessUsernames
            : parsed.fullAccessUsernames,
          externalApps: Array.isArray(prev.externalApps) && prev.externalApps.length > 0
            ? prev.externalApps
            : (parsed.externalApps && parsed.externalApps.length > 0 ? parsed.externalApps : DEFAULT_APPS),
        }));
      } catch (e) {
        console.error('Error loading customization cache:', e);
      }
    }

    // 2. Fetch background live values from Google Spreadsheet
    try {
      const res = await apiClient.getCustomization();
      if (res.status === 'success' && res.customization && typeof res.customization === 'object' && Object.keys(res.customization).length > 0) {
        const c = res.customization;
        const normalizedPhotos: Record<string, string> = {};
        if (c.userPhotos && typeof c.userPhotos === 'object') {
          Object.entries(c.userPhotos).forEach(([k, v]) => {
            if (v && typeof v === 'string') {
              normalizedPhotos[k] = normalizeImageUrl(v.trim());
            }
          });
        }

        setCustomization((prev) => {
          const externalAppsList = Array.isArray(c.externalApps) && c.externalApps.length > 0
            ? c.externalApps
            : (Array.isArray(prev.externalApps) && prev.externalApps.length > 0 ? prev.externalApps : DEFAULT_APPS);

          const merged: AppCustomization = {
            appName: c.appName?.trim() || prev.appName || 'E-ABSENSI',
            appSubtitle: c.appSubtitle?.trim() || prev.appSubtitle || 'SMP NEGERI 11 PALU',
            logoEmoji: c.logoEmoji || prev.logoEmoji || '🎓',
            logoColor: c.logoColor || prev.logoColor || 'bg-blue-600',
            logoUrl: (c.logoUrl ? normalizeImageUrl(c.logoUrl.trim()) : prev.logoUrl) || '/logo_smpn11.jpg',
            fullAccessUsernames: Array.isArray(c.fullAccessUsernames) ? c.fullAccessUsernames : prev.fullAccessUsernames,
            userPhotos: { ...(prev.userPhotos || {}), ...normalizedPhotos },
            kepalaSekolahNama: c.kepalaSekolahNama?.trim() ?? prev.kepalaSekolahNama ?? '',
            kepalaSekolahNip: c.kepalaSekolahNip?.trim() ?? prev.kepalaSekolahNip ?? '',
            batasWaktuMasuk: c.batasWaktuMasuk?.trim() ?? prev.batasWaktuMasuk ?? '07:00',
            externalApps: externalAppsList,
          };

          localStorage.setItem('absensi_app_customization', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.error('Background load customization error:', err);
    }
  }, []);

  // Handle Init App
  useEffect(() => {
    const initApp = async () => {
      // 1. Sync backend URL and settings from server for cross-device & cross-domain persistence
      try {
        const srvConfig = await apiClient.syncConfigFromServer();
        if (srvConfig.webAppUrl) {
          setWebAppUrl(srvConfig.webAppUrl);
          setIsDemoMode(false);
        }
        if (srvConfig.customization) {
          setCustomization((prev) => ({ ...prev, ...srvConfig.customization }));
        }
      } catch (e) {}

      // 2. Check if there is gas_url in query parameters for instant setup
      const params = new URLSearchParams(window.location.search);
      const gasUrlParam = params.get('gas_url');
      if (gasUrlParam) {
        await apiClient.setBackendUrl(gasUrlParam);
        setWebAppUrl(gasUrlParam);
        setIsDemoMode(false);
        addToast('🎉 Berhasil menyinkronkan database & pengaturan via QR Code!', 'success');

        // Clean up URL parameters
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      }

      initializeStorage();

      // Fetch initial datasets in parallel
      Promise.all([
        loadCustomization(),
        fetchKelasList(),
        fetchMapelList(),
        fetchMasterData()
      ]);
    };

    initApp();

    // Auto load session & reset view to main page on reload
    const savedUser = localStorage.getItem('absensi_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
        setActiveView('dashboard');

        // Check if returning from external app
        const returnedFrom = sessionStorage.getItem('returned_from_external_app');
        if (returnedFrom) {
          sessionStorage.removeItem('returned_from_external_app');
          addToast(`Berhasil kembali dari ${returnedFrom} ke Halaman Utama Aplikasi`, 'success');
        }
      } catch (e) {
        localStorage.removeItem('absensi_user');
      }
    }

    // Handle pageshow event for back-forward cache when user clicks browser Go Back button
    const handlePageShow = (event: PageTransitionEvent) => {
      setActiveView('dashboard');
      setShowExternalAppsModal(false);
      const returnedFrom = sessionStorage.getItem('returned_from_external_app');
      if (returnedFrom) {
        sessionStorage.removeItem('returned_from_external_app');
        addToast(`Berhasil kembali dari ${returnedFrom} ke Halaman Utama Aplikasi`, 'success');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [addToast, fetchKelasList, fetchMapelList, fetchMasterData, loadCustomization]);

  // Load history data once logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadHistoryData();
    }
  }, [isLoggedIn, loadHistoryData]);

  // LOGIN FUNCTION
  const handleLogin = async (username: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.login(username, passwordInput);
      if (res.status === 'success' && res.user) {
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        localStorage.setItem('absensi_user', JSON.stringify(res.user));
        addToast(`Selamat datang, ${res.user.nama}! Berhasil masuk ke portal.`, 'success');
      } else {
        addToast(res.message || 'Gagal login. Periksa username dan password.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal login.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // LOGOUT FUNCTION
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('absensi_user');
    addToast('Anda telah berhasil keluar dari sesi.', 'info');
  };

  // SAVE BACKEND SETTINGS
  const handleSaveSettings = async (url: string) => {
    apiClient.setBackendUrl(url);
    setWebAppUrl(url);
    setIsDemoMode(!url.trim());
    setShowConfigModal(false);
    addToast(url.trim() ? 'Berhasil menghubungkan database Cloud!' : 'Beralih ke mode offline (Demo)', 'success');
    
    // Fetch customization from the new URL immediately!
    if (url.trim()) {
      try {
        const res = await apiClient.getCustomization();
        if (res.status === 'success' && res.customization) {
          const c = res.customization;
          setCustomization((prev) => {
            const externalAppsList = Array.isArray(c.externalApps) && c.externalApps.length > 0
              ? c.externalApps
              : (Array.isArray(prev.externalApps) && prev.externalApps.length > 0 ? prev.externalApps : DEFAULT_APPS);

            const merged: AppCustomization = {
              ...prev,
              ...c,
              externalApps: externalAppsList,
            };
            localStorage.setItem('absensi_app_customization', JSON.stringify(merged));
            return merged;
          });
          addToast('Pengaturan identitas berhasil disinkronkan dari database!', 'success');
        }
      } catch (err) {
        console.error('Failed to sync customization on save:', err);
      }
    }
    
    // Reload data
    fetchKelasList();
    loadHistoryData();
  };

  // SAVE APP CUSTOMIZATION SETTINGS
  const handleSaveCustomization = async (newCust: AppCustomization) => {
    clearApiCache();

    // Determine externalApps to save
    const externalAppsToSave = Array.isArray(newCust.externalApps)
      ? newCust.externalApps
      : (Array.isArray(customization.externalApps) && customization.externalApps.length > 0 ? customization.externalApps : DEFAULT_APPS);

    const normalizedPhotos: Record<string, string> = {};
    const userPhotosToUse = newCust.userPhotos || customization.userPhotos || {};
    if (userPhotosToUse && typeof userPhotosToUse === 'object') {
      Object.entries(userPhotosToUse).forEach(([k, v]) => {
        if (v && typeof v === 'string' && v.trim()) {
          normalizedPhotos[k] = normalizeImageUrl(v.trim());
        }
      });
    }

    const targetLogo = newCust.logoUrl !== undefined ? (newCust.logoUrl ? normalizeImageUrl(newCust.logoUrl.trim()) : '') : (customization.logoUrl || '');
    const logoUrlToSave = targetLogo.trim() || '/logo_smpn11.jpg';

    const cleanCust: AppCustomization = {
      ...customization,
      ...newCust,
      logoUrl: logoUrlToSave,
      userPhotos: normalizedPhotos,
      externalApps: externalAppsToSave,
    };

    setCustomization(cleanCust);
    localStorage.setItem('absensi_app_customization', JSON.stringify(cleanCust));

    try {
      const res = await apiClient.saveCustomization(cleanCust);
      if (res.status === 'success') {
        addToast('Pengaturan & tautan aplikasi eksternal tersimpan & tersinkron ke Spreadsheet!', 'success');
      } else if (res.errorType === 'sheet_not_found') {
        addToast('Pengaturan disimpan lokal! Buat Sheet bernama "Pengaturan" di Google Sheets Anda untuk mengaktifkan Cloud Sync.', 'warning');
      } else {
        addToast(res.message || 'Pengaturan disimpan lokal (gagal sinkronisasi cloud).', 'warning');
      }
    } catch (err: any) {
      addToast('Pengaturan disimpan lokal (koneksi cloud terputus).', 'warning');
    }
  };

  // LOAD STUDENT ROSTER FOR CLASS
  const handleLoadStudentsForAttendance = useCallback(async (kelas: string): Promise<Student[]> => {
    const res = await apiClient.getStudents(kelas);
    if (res.status === 'success') {
      return res.students;
    }
    return [];
  }, []);

  // SUBMIT CLASS ATTENDANCE
  const handleSubmitAttendance = async (payload: any) => {
    try {
      const res = await apiClient.submitAttendance(payload);
      if (res.status === 'success') {
        addToast(res.message || `Absensi kelas ${payload.kelas} (${payload.mapel}) berhasil disimpan!`, 'success');
        // Reload history list in background
        loadHistoryData();
      } else {
        addToast(res.message || 'Gagal menyimpan absensi.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Terjadi kesalahan saat menyimpan.', 'error');
    }
  };

  // SUBMIT TEACHER ABSENCE / PERMIT
  const handleSubmitTeacherPermit = async (payload: any) => {
    try {
      const res = await apiClient.submitTeacherAbsence(payload);
      if (res.status === 'success') {
        addToast(res.message || 'Permohonan izin Anda berhasil dikirim ke Kepala Sekolah.', 'success');
        loadHistoryData();
      } else {
        addToast(res.message || 'Gagal mengirim formulir izin.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal memproses permohonan.', 'error');
    }
  };

  // SUBMIT GURU ATTENDANCE (MANDIRI)
  const handleSubmitGuruAttendance = async (payload: any): Promise<boolean> => {
    try {
      const res = await apiClient.submitGuruAttendance(payload);
      if (res.status === 'success') {
        addToast(res.message || 'Presensi hadir Guru berhasil disimpan.', 'success');
        loadHistoryData();
        return true;
      } else {
        addToast(res.message || 'Gagal menyimpan presensi Guru.', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menyimpan presensi Guru.', 'error');
      return false;
    }
  };

  // SUBMIT TENDIK ATTENDANCE
  const handleSubmitTendikAttendance = async (payload: any): Promise<boolean> => {
    try {
      const res = await apiClient.submitTendikAttendance(payload);
      if (res.status === 'success') {
        addToast(res.message || 'Presensi hadir Tendik berhasil disimpan.', 'success');
        loadHistoryData();
        return true;
      } else {
        addToast(res.message || 'Gagal menyimpan presensi.', 'error');
        return false;
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menyimpan presensi.', 'error');
      return false;
    }
  };

  // SUBMIT TENDIK PERMIT
  const handleSubmitTendikPermit = async (payload: any) => {
    try {
      const res = await apiClient.submitTendikPermit(payload);
      if (res.status === 'success') {
        addToast(res.message || 'Formulir izin/sakit Tendik berhasil dikirim.', 'success');
        loadHistoryData();
      } else {
        addToast(res.message || 'Gagal mengirim formulir izin.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal memproses permohonan.', 'error');
    }
  };

  // FILTER LOGS VIA DATE AND CLASS (HISTORY VIEW)
  const handleFilterHistory = async (tanggal: string, kelas: string) => {
    try {
      const res = await apiClient.getAttendanceHistory(tanggal, kelas);
      if (res.status === 'success') {
        setHistoryList(res.history);
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal mengambil rekap data.', 'error');
    }
  };

  // FILTER TEACHER LOGS VIA DATE
  const handleFilterTeacher = async (tanggal: string) => {
    try {
      const res = await apiClient.getTeacherAbsenceHistory(tanggal);
      if (res.status === 'success') {
        setTeacherHistoryList(res.history);
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal mengambil rekap izin guru.', 'error');
    }
  };

  // UPDATE RECORD INDIVIDUAL
  const handleUpdateRecord = async (rowIndex: string | number, newStatus: string, newKeterangan: string) => {
    try {
      const res = await apiClient.updateAttendanceRecord(rowIndex, newStatus, newKeterangan);
      if (res.status === 'success') {
        addToast('Log presensi berhasil diperbarui.', 'success');
      } else {
        addToast(res.message || 'Gagal merubah data.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal mengedit.', 'error');
    }
  };

  // DELETE STUDENT ATTENDANCE RECORD
  const handleDeleteAttendanceRecord = async (rowIndex: string | number) => {
    try {
      const res = await apiClient.deleteAttendanceRecord(rowIndex);
      if (res.status === 'success') {
        addToast('Log presensi berhasil dihapus.', 'info');
      } else {
        addToast(res.message || 'Gagal menghapus data.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menghapus.', 'error');
    }
  };

  // UPDATE TEACHER RECORD INDIVIDUAL
  const handleUpdateTeacherRecord = async (rowIndex: string | number, status: string, alasan: string) => {
    try {
      const res = await apiClient.updateTeacherAbsenceRecord(rowIndex, status, alasan);
      if (res.status === 'success') {
        addToast('Izin guru berhasil diperbarui.', 'success');
      } else {
        addToast(res.message || 'Gagal merubah data.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal mengedit.', 'error');
    }
  };

  // DELETE TEACHER RECORD INDIVIDUAL
  const handleDeleteTeacherRecord = async (rowIndex: string | number) => {
    try {
      const res = await apiClient.deleteTeacherAbsenceRecord(rowIndex);
      if (res.status === 'success') {
        addToast('Izin guru berhasil dihapus.', 'info');
      } else {
        addToast(res.message || 'Gagal menghapus data.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menghapus.', 'error');
    }
  };

  // MASTER CRUD ACTIONS
  const loadCrudTable = useCallback(async (sheetName: string) => {
    setCurrentCrudSheet(sheetName);

    // Instant local cache check
    const cached = localStorage.getItem(`absensi_crud_cache_${sheetName}`);
    let hasCache = false;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.status === 'success' && Array.isArray(parsed.rows)) {
          setCrudHeaders(parsed.headers || []);
          setCrudRows(parsed.rows || []);
          hasCache = true;
        }
      } catch (e) {}
    }

    if (!hasCache) {
      setCrudLoading(true);
    }

    try {
      const res = await apiClient.getCrud(sheetName);
      if (res.status === 'success') {
        setCrudHeaders(res.headers);
        setCrudRows(res.rows);
      }
    } catch (err: any) {
      if (!hasCache) {
        addToast(err.message || 'Gagal memuat tabel master.', 'error');
      }
    } finally {
      setCrudLoading(false);
    }
  }, [addToast]);

  const handleAddCrudRow = async (rowData: string[]) => {
    try {
      const res = await apiClient.saveCrud(currentCrudSheet, rowData, null);
      if (res.status === 'success') {
        addToast('Data baru berhasil ditambahkan.', 'success');
        await loadCrudTable(currentCrudSheet);
        await fetchMasterData();
        if (currentCrudSheet === 'Master_Kelas') {
          await fetchKelasList();
        }
        if (currentCrudSheet === 'Master_Mapel') {
          await fetchMapelList();
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menambahkan data.', 'error');
    }
  };

  const handleEditCrudRow = async (rowIndex: number, rowData: string[]) => {
    try {
      const res = await apiClient.saveCrud(currentCrudSheet, rowData, rowIndex);
      if (res.status === 'success') {
        addToast('Data berhasil diperbarui.', 'success');
        await loadCrudTable(currentCrudSheet);
        await fetchMasterData();
        if (currentCrudSheet === 'Master_Kelas') {
          await fetchKelasList();
        }
        if (currentCrudSheet === 'Master_Mapel') {
          await fetchMapelList();
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal memperbarui data.', 'error');
    }
  };

  const handleDeleteCrudRow = async (rowIndex: number) => {
    try {
      const res = await apiClient.deleteCrud(currentCrudSheet, rowIndex);
      if (res && res.status === 'success') {
        addToast(res.message || 'Data berhasil dihapus.', 'info');
        await loadCrudTable(currentCrudSheet);
        await fetchMasterData();
        if (currentCrudSheet === 'Master_Kelas') {
          await fetchKelasList();
        }
        if (currentCrudSheet === 'Master_Mapel') {
          await fetchMapelList();
        }
      } else {
        addToast(res?.message || 'Gagal menghapus data.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Gagal menghapus data.', 'error');
    }
  };

  const getViewTitle = () => {
    const titles: Record<ViewType, string> = {
      dashboard: 'Dashboard & Ringkasan Presensi',
      'absen-siswa': 'Presensi Siswa di Kelas',
      'absen-guru': 'Formulir Presensi Mandiri Guru',
      'izin-guru': 'Formulir Permohonan Izin Guru',
      riwayat: 'Riwayat Presensi Siswa',
      'crud-guru': 'Kelola Data Master Guru & Tendik',
      'crud-siswa': 'Kelola Data Master Siswa',
      'crud-kelas': 'Kelola Data Master Kelas',
      'crud-mapel': 'Kelola Data Master Mata Pelajaran',
      customization: 'Pengaturan Identitas & Hak Akses',
      'apps-script': 'Kode & Integrasi Google Apps Script',
      'absen-tendik': 'Formulir Presensi Mandiri Tendik',
      'izin-tendik': 'Formulir Permohonan Izin Tendik',
      'kiosk-scanner': 'Kiosk Scanner Otomatis',
      'cetak-barcode': 'Cetak Kartu QR Code Siswa',
      'hari-libur': 'Manajemen Hari Libur & Tanggal Merah',
    };
    return titles[activeView] || `${customization.appName} ${customization.appSubtitle}`;
  };

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Makassar', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('id-ID', options);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-100 text-slate-800 antialiased font-sans">
      {/* Toast Manager */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      {isLoggedIn && (
        <aside className={`bg-slate-900 text-slate-300 w-full md:w-64 flex-shrink-0 flex flex-col justify-between z-20 border-r border-slate-800 ${mobileMenuOpen ? 'h-screen' : 'h-auto'} md:h-full overflow-hidden`}>
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header / Brand Logo */}
            <div className="flex-shrink-0 p-5 flex items-center justify-between border-b border-slate-800">
              <button
                onClick={() => {
                  setActiveView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer group"
                title="Kembali ke Halaman Utama Dashboard"
              >
                <div className="relative w-11 h-11 flex-shrink-0 cursor-pointer active:scale-95 transition-transform">
                  {/* Outer rotating color ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 opacity-80 animate-spin [animation-duration:8s] blur-[1px]" />
                  {/* Pulsing overlay shadow */}
                  <div className="absolute inset-0.5 rounded-full bg-slate-950/90 shadow-inner" />
                  <div className="absolute inset-1.5 rounded-full overflow-hidden bg-white p-0.5 flex items-center justify-center shadow-md border border-slate-800">
                    <img
                      src={normalizeImageUrl(customization.logoUrl?.trim() || '/logo_smpn11.jpg')}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain rounded-full"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo_smpn11.jpg';
                      }}
                    />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-extrabold text-white text-sm leading-tight tracking-tight uppercase truncate max-w-[130px]" title={customization.appName || 'E-ABSENSI'}>
                    {customization.appName || 'E-ABSENSI'}
                  </h1>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase truncate max-w-[130px] group-hover:text-blue-400 transition-colors">
                    {customization.appSubtitle || 'Sekolah Digital'}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-400 hover:text-white p-2 focus:outline-none cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Logged in user detail box */}
            <div className="flex-shrink-0 p-4 bg-slate-850/40 border-b border-slate-800 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${customization.logoColor || 'bg-blue-700'} text-white flex items-center justify-center font-extrabold text-sm shadow-inner uppercase overflow-hidden flex-shrink-0`}>
                {(() => {
                  const photoUrl = getUserPhotoUrl(customization, currentUser);
                  if (currentUser && photoUrl && !failedUserPhotos[currentUser.username]) {
                    return (
                      <img
                        src={photoUrl}
                        alt={currentUser.nama}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          handleImageFallbackError(e, () => {
                            setFailedUserPhotos((prev) => ({
                              ...prev,
                              [currentUser.username]: true,
                            }));
                          });
                        }}
                      />
                    );
                  }
                  return currentUser?.nama ? currentUser.nama.charAt(0) : 'U';
                })()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate" title={currentUser?.nama}>
                  {currentUser?.nama || 'Pengguna'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] text-slate-400 font-bold capitalize tracking-wide">
                    {currentUser?.role === 'Admin Utama'
                      ? 'Admin Utama'
                      : currentUser?.role === 'Admin'
                      ? 'Admin'
                      : currentUser?.role === 'Tendik'
                      ? 'Tendik'
                      : hasFullAccess(currentUser)
                      ? 'Guru (Akses Full)'
                      : 'Guru'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className={`p-3 space-y-1 flex-1 overflow-y-auto ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
              <button
                onClick={() => {
                  setActiveView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                    : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span>Dashboard & Rekap</span>
              </button>

              {currentUser?.role !== 'Tendik' && (
                <>
                  <button
                    onClick={() => {
                      setActiveView('absen-siswa');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'absen-siswa'
                        ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                        : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 flex-shrink-0" />
                    <span>Presensi Siswa</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('absen-guru');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'absen-guru'
                        ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                        : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Absen Guru</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('izin-guru');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'izin-guru'
                        ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                        : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 flex-shrink-0" />
                    <span>Form Izin Guru</span>
                  </button>
                </>
              )}

              {/* Kiosk Scanner & Cetak Barcode: Strictly for Admin Utama and Admin, plus Kiosk for Guru */}
              {(hasFullAccess(currentUser) || currentUser?.role === 'Guru') && (
                <>
                  <button
                    onClick={() => {
                      setActiveView('kiosk-scanner');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'kiosk-scanner'
                        ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                        : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ScanLine className="w-4 h-4 flex-shrink-0" />
                    <span>Kiosk Scanner</span>
                  </button>

                  {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                    <button
                      onClick={() => {
                        setActiveView('cetak-barcode');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'cetak-barcode'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <QrCode className="w-4 h-4 flex-shrink-0" />
                      <span>Cetak Barcode</span>
                    </button>
                  )}
                </>
              )}

              {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin' || currentUser?.role === 'Tendik') && (
                <>
                  <button
                    onClick={() => {
                      setActiveView('absen-tendik');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'absen-tendik'
                        ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                        : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 flex-shrink-0" />
                    <span>Absen Tendik</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('izin-tendik');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'izin-tendik'
                        ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                        : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 flex-shrink-0" />
                    <span>Form Izin Tendik</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setActiveView('riwayat');
                  loadHistoryData();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'riwayat'
                    ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                    : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4 flex-shrink-0" />
                <span>Riwayat Absensi</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('berkas');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'berkas'
                    ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                    : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span>Upload Berkas</span>
              </button>

              {/* Master CRUD Lists Folders (Strictly for Administrator or Full Access Role) */}
              {hasFullAccess(currentUser) && (
                <div className="pt-4 pb-2 border-t border-slate-800/80 mt-2">
                  <p className="px-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Manajemen Master Data
                  </p>
                  <div className="space-y-1">
                    {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                      <button
                        onClick={() => {
                          setActiveView('crud-guru');
                          loadCrudTable('Master_Guru');
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeView === 'crud-guru'
                            ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                            : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 flex-shrink-0 text-slate-500" />
                        <span>Data Guru & Tendik</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveView('crud-siswa');
                        loadCrudTable('Master_Siswa');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'crud-siswa'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <School className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Data Siswa</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('crud-kelas');
                        loadCrudTable('Master_Kelas');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'crud-kelas'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Data Kelas</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('crud-mapel');
                        loadCrudTable('Master_Mapel');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'crud-mapel'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Data Mapel</span>
                    </button>

                    {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                      <button
                        onClick={() => {
                          setShowExternalAppsModal(true);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-amber-400 hover:text-amber-300 hover:bg-slate-850"
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        <span>Lainnya</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                <div className="pt-2 pb-2 mt-1">
                  <p className="px-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Konfigurasi Sistem
                  </p>
                  <div className="space-y-1">
                    {/* App Customization View (Strictly for Admin) */}
                    <button
                      onClick={() => {
                        setActiveView('customization');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'customization'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Pengaturan Aplikasi</span>
                    </button>

                    {/* Hari Libur View */}
                    <button
                      onClick={() => {
                        setActiveView('hari-libur');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'hari-libur'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CalendarRange className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Atur Hari Libur</span>
                    </button>

                    {/* Apps Script Code View */}
                    <button
                      onClick={() => {
                        setActiveView('apps-script');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeView === 'apps-script'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Code className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Kode Apps Script (.gs)</span>
                    </button>
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* Sidebar Footer Settings & Logout */}
          <div className={`flex-shrink-0 p-3 border-t border-slate-800 space-y-1 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <a
              href="/e-absensi.apk"
              download="e-absensi.apk"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span>Download File APK (Manual)</span>
            </a>
            <button
              onClick={() => {
                setShowConfigModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span>Set Database URL</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>Keluar / Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* MAIN LAYOUT CONTENT CONTAINER */}
      {isLoggedIn ? (
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-full">
          {/* TOP STATUS BAR */}
          <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 bg-clip-text text-transparent">
                {getViewTitle()}
              </h2>
              <p className="text-[11px] text-slate-600 mt-1.5 hidden sm:flex items-center gap-2 font-bold">
                <span>{getFormattedDate()}</span>
                <span className="font-bold text-slate-300">•</span>
                <span className="font-mono text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1 shadow-sm">
                  <Clock className="w-3 h-3 text-indigo-500 animate-pulse" />
                  <span>{currentTimeString}</span>
                </span>
                <span className="font-bold text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  disabled={isLoading}
                  title="Sinkronisasikan / Refresh Data"
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeView !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => setActiveView('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
                  title="Kembali ke Dashboard Utama Aplikasi"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Halaman Utama</span>
                </button>
              )}

              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border select-none shadow-sm ${
                  isDemoMode
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isDemoMode ? 'bg-amber-500' : 'bg-emerald-500'}`}
                ></span>
                <span>{isDemoMode ? 'Mode Demo Interaktif' : 'Terhubung Backend'}</span>
              </span>
            </div>
          </header>

          {/* CONTAINER WORKSPACE FOR APP VIEWSTATES */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
            <div>
              {/* VIEW 1: DASHBOARD */}
              {activeView === 'dashboard' && (
                <DashboardView
                  currentUser={currentUser}
                  historyList={historyList}
                  allStudents={allStudents}
                  allTeachers={allTeachers}
                  onNavigate={(view) => setActiveView(view)}
                  customization={customization}
                />
              )}

              {/* VIEW 2: PRESENSI SISWA */}
              {activeView === 'absen-siswa' && (
                <AttendanceView
                  currentUser={currentUser}
                  kelasList={kelasList}
                  mapelList={mapelList}
                  onLoadStudents={handleLoadStudentsForAttendance}
                  onSubmit={handleSubmitAttendance}
                  currentTimeString={currentTimeString}
                  customization={customization}
                />
              )}

              {/* VIEW: KIOSK SCANNER (Strictly for Admin Utama and Admin, plus Guru) */}
              {activeView === 'kiosk-scanner' && (
                (hasFullAccess(currentUser) || currentUser?.role === 'Guru') ? (
                  <ScannerKioskView
                    students={allStudents}
                    customization={customization}
                    onUpdateCustomization={handleSaveCustomization}
                  />
                ) : (
                  <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-8">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4 flex items-center justify-center">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Akses Dibatasi</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Fitur <strong>Kiosk Scanner</strong> hanya dapat diakses dan digunakan oleh <strong>Admin Utama</strong>, <strong>Admin</strong>, dan <strong>Guru</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Kembali ke Dashboard
                    </button>
                  </div>
                )
              )}

              {/* VIEW: CETAK BARCODE (Strictly for Admin Utama and Admin) */}
              {activeView === 'cetak-barcode' && (
                (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') ? (
                  <CetakBarcodeView students={allStudents} kelasList={kelasList} customization={customization} />
                ) : (
                  <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-8">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4 flex items-center justify-center">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Akses Dibatasi</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Fitur <strong>Cetak Barcode</strong> hanya dapat diakses dan digunakan oleh <strong>Admin Utama</strong> dan <strong>Admin</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Kembali ke Dashboard
                    </button>
                  </div>
                )
              )}

              {/* VIEW 2.5: GURU ATTENDANCE (MANDIRI) */}
              {activeView === 'absen-guru' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin' || currentUser?.role === 'Guru') && (
                <TeacherAttendanceView
                  currentUser={currentUser}
                  onSubmit={handleSubmitGuruAttendance}
                  currentTimeString={currentTimeString}
                />
              )}

              {/* VIEW 3: TEACHER PERMIT */}
              {activeView === 'izin-guru' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin' || currentUser?.role === 'Guru') && (
                <TeacherPermitView currentUser={currentUser} onSubmit={handleSubmitTeacherPermit} />
              )}

              {/* VIEW 3.1: TENDIK ATTENDANCE */}
              {activeView === 'absen-tendik' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin' || currentUser?.role === 'Tendik') && (
                <TendikAttendanceView
                  currentUser={currentUser}
                  onSubmit={handleSubmitTendikAttendance}
                  currentTimeString={currentTimeString}
                />
              )}

              {/* VIEW 3.2: TENDIK PERMIT */}
              {activeView === 'izin-tendik' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin' || currentUser?.role === 'Tendik') && (
                <TendikPermitView
                  currentUser={currentUser}
                  onSubmit={handleSubmitTendikPermit}
                  currentTimeString={currentTimeString}
                />
              )}

              {/* VIEW 4: ATTENDANCE HISTORY LIST */}
              {activeView === 'riwayat' && (
                <HistoryView
                  currentUser={currentUser}
                  kelasList={kelasList}
                  historyList={historyList}
                  teacherHistoryList={teacherHistoryList}
                  onFilterHistory={handleFilterHistory}
                  onFilterTeacher={handleFilterTeacher}
                  onUpdateRecord={handleUpdateRecord}
                  onDeleteRecord={handleDeleteAttendanceRecord}
                  onUpdateTeacherRecord={handleUpdateTeacherRecord}
                  onDeleteTeacherRecord={handleDeleteTeacherRecord}
                  customization={customization}
                />
              )}

              {/* VIEW 5: MASTER CRUD FOR ADMINS */}
              {['crud-guru', 'crud-siswa', 'crud-kelas', 'crud-mapel'].includes(activeView) && (
                <CrudView
                  currentCrudSheet={currentCrudSheet}
                  headers={crudHeaders}
                  rows={crudRows}
                  onAddRow={handleAddCrudRow}
                  onEditRow={handleEditCrudRow}
                  onDeleteRow={handleDeleteCrudRow}
                  isLoading={crudLoading}
                  allTeachers={allTeachers}
                />
              )}

              {/* VIEW 6: APP CUSTOMIZATION */}
              {activeView === 'customization' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                <CustomizationView
                  customization={customization}
                  onSave={handleSaveCustomization}
                  currentUser={currentUser}
                  webAppUrl={webAppUrl}
                  onSaveWebAppUrl={handleSaveSettings}
                />
              )}

              {/* VIEW 8: BERKAS UPLOAD */}
              {activeView === 'berkas' && (
                <BerkasView currentUser={currentUser} />
              )}

              {/* VIEW 7: APPS SCRIPT CODE & GUIDE */}
              {activeView === 'apps-script' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                <AppsScriptView customization={customization} />
              )}

              {/* VIEW: HARI LIBUR / TANGGAL MERAH */}
              {activeView === 'hari-libur' && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
                <HariLiburView onAddToast={addToast} />
              )}
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full relative bg-gradient-to-b from-[#09182d] via-[#0d274c] to-[#040c17] overflow-y-auto p-4 select-none">
          {/* Glowing background orbs for modern dark tech look */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-blue-500/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-indigo-500/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

          <div className="w-full max-w-md z-10 relative my-auto">
            <LoginView 
              onLogin={handleLogin} 
              isLoading={isLoading} 
              customization={customization} 
              isDemoMode={isDemoMode}
              onLogoClick={handleLogoClickSecret}
            />

            {/* Config Button below the login box */}
            {(isDemoMode || showHiddenSettings) && (
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer transition-all shadow-md backdrop-blur-sm"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>API Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS BACKEND DIALOG POPUP */}
      {showConfigModal && (
        <SettingsModal
          onClose={() => setShowConfigModal(false)}
          currentUrl={webAppUrl}
          onSave={handleSaveSettings}
        />
      )}

      {/* EXTERNAL APPS / LAINNYA MODAL (Khusus Admin Utama) */}
      {showExternalAppsModal && (currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin') && (
        <ExternalAppsModal
          onClose={() => setShowExternalAppsModal(false)}
          onReturnToMainApp={() => {
            setActiveView('dashboard');
            addToast('success', 'Kembali ke Halaman Utama Dashboard');
          }}
          customization={customization}
          onSaveCustomization={handleSaveCustomization}
          isAdmin={currentUser?.role === 'Admin Utama' || currentUser?.role === 'Admin'}
        />
      )}
      {/* PWA INSTALL INSTRUCTION MODAL */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up relative">
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 pb-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Instal Aplikasi di HP Anda</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Aplikasi ini menggunakan teknologi <strong>Web App (PWA)</strong> modern yang lebih ringan dari APK biasa dan <strong>otomatis update</strong> tanpa perlu didownload ulang.
              </p>

              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-sm font-bold text-slate-700">Cara Instal via Chrome / Safari:</p>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 font-medium">
                  <li>Buka menu browser Anda (titik 3 di pojok kanan atas Chrome, atau tombol Share di Safari).</li>
                  <li>Pilih opsi <strong className="text-slate-800">Tambahkan ke Layar Utama</strong> (Atau <em>Add to Home Screen</em> / <em>Install App</em>).</li>
                  <li>Klik <strong>Tambah</strong> atau <strong>Instal</strong>.</li>
                  <li>Aplikasi akan muncul di layar depan HP Anda seperti aplikasi biasa!</li>
                </ol>
              </div>
            </div>
            <div className="p-6 pt-4">
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Low-level helper to trigger live ticking
function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
