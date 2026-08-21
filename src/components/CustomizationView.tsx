/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppCustomization, User } from '../types';
import { Save, ShieldAlert, Sparkles, Check, RefreshCw, Search, ShieldCheck, Link2, Cloud, Database, AlertCircle, Eye, Clock, DownloadCloud } from 'lucide-react';
import { apiClient } from '../api';
import { normalizeImageUrl, getUserPhotoUrl, handleImageFallbackError } from '../utils/imageUrl';

interface CustomizationViewProps {
  customization: AppCustomization;
  onSave: (newCust: AppCustomization) => void;
  currentUser: User | null;
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
}

const PRESET_EMOJIS = ['🎓', '🏫', '🎒', '📚', '💻', '✏️', '✨', '📊', '🔔', '🛡️'];
const PRESET_COLORS = [
  { name: 'Blue (Standard)', class: 'bg-blue-600', text: 'text-blue-600', ring: 'ring-blue-500/20' },
  { name: 'Indigo (Modern)', class: 'bg-indigo-600', text: 'text-indigo-600', ring: 'ring-indigo-500/20' },
  { name: 'Emerald (Eco)', class: 'bg-emerald-600', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
  { name: 'Violet (Premium)', class: 'bg-violet-600', text: 'text-violet-600', ring: 'ring-violet-500/20' },
  { name: 'Rose (Warm)', class: 'bg-rose-600', text: 'text-rose-600', ring: 'ring-rose-500/20' },
  { name: 'Amber (Alert)', class: 'bg-amber-600', text: 'text-amber-600', ring: 'ring-amber-500/20' },
];

export function CustomizationView({ customization, onSave, currentUser, webAppUrl, onSaveWebAppUrl }: CustomizationViewProps) {
  const [dbUrl, setDbUrl] = useState(webAppUrl);
  const [appName, setAppName] = useState(customization.appName);
  const [appSubtitle, setAppSubtitle] = useState(customization.appSubtitle);
  const [logoEmoji, setLogoEmoji] = useState(customization.logoEmoji);
  const [logoColor, setLogoColor] = useState(customization.logoColor || 'bg-blue-600');
  const [logoUrl, setLogoUrl] = useState(customization.logoUrl || '/logo_smpn11.jpg');
  const [fullAccessUsernames, setFullAccessUsernames] = useState<string[]>(customization.fullAccessUsernames || []);
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>(customization.userPhotos || {});
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState(customization.kepalaSekolahNama || '');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState(customization.kepalaSekolahNip || '');
  const [batasWaktuMasuk, setBatasWaktuMasuk] = useState(customization.batasWaktuMasuk || '07:00');

  // Keep dbUrl in sync when webAppUrl changes from backend
  useEffect(() => {
    setDbUrl(webAppUrl);
  }, [webAppUrl]);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<'demo' | 'checking' | 'synced' | 'sheet_missing' | 'error'>('checking');
  const [syncMessage, setSyncMessage] = useState('');

  // Loaded teachers for granting access
  const [teachers, setTeachers] = useState<{ accessKey: string; username: string; nama: string; nip: string; role: string }[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function checkSyncAndLoadTeachers() {
      setIsLoadingTeachers(true);
      // 1. Check sync status
      if (apiClient.isDemoMode()) {
        setSyncStatus('demo');
      } else {
        try {
          const check = await apiClient.getCustomization();
          if (check.status === 'success') {
            setSyncStatus('synced');
          } else if (check.errorType === 'sheet_not_found') {
            setSyncStatus('sheet_missing');
          } else {
            setSyncStatus('error');
            setSyncMessage(check.message || 'Gagal tersambung');
          }
        } catch (err) {
          setSyncStatus('error');
        }
      }

      // 2. Load teachers list
      try {
        const res = await apiClient.getCrud('Master_Guru');
        if (res.status === 'success' && res.rows) {
          const list = res.rows.map((row: any, idx: number) => {
            const d = row.data || [];
            const is7col = d.length >= 7;
            const nip = (d[1] || '').toString().trim();
            const nama = (d[2] || '').toString().trim();
            const rawUsername = (is7col ? d[4] : d[3] || '').toString().trim();
            const role = (is7col ? d[5] : d[4] || 'Guru').toString().trim();
            const accessKey = rawUsername || nip || `user_${idx}`;
            return {
              accessKey,
              username: rawUsername || nip,
              nama: nama || 'Tanpa Nama',
              nip,
              role: role || 'Guru',
            };
          }).filter((t: any) => t.username.toLowerCase() !== 'admin' && t.accessKey.toLowerCase() !== 'admin' && t.role.toLowerCase() !== 'admin');
          setTeachers(list);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar guru:', err);
      } finally {
        setIsLoadingTeachers(false);
      }
    }
    checkSyncAndLoadTeachers();
  }, []);

  const handleToggleAccess = (teacher: { accessKey: string; username: string; nip: string }) => {
    const keysToCheck = [teacher.accessKey, teacher.username, teacher.nip].filter(Boolean);
    setFullAccessUsernames((prev) => {
      const isAlreadyGranted = keysToCheck.some((k) => prev.includes(k));
      if (isAlreadyGranted) {
        return prev.filter((u) => !keysToCheck.includes(u));
      } else {
        const keyToAdd = teacher.username || teacher.nip || teacher.accessKey;
        return [...prev, keyToAdd];
      }
    });
  };

  const handlePhotoUrlChange = (username: string, url: string) => {
    setUserPhotos((prev) => ({
      ...prev,
      [username]: url,
    }));
  };

  const handleReloadFromCloud = async () => {
    setSyncStatus('checking');
    try {
      const check = await apiClient.getCustomization();
      if (check.status === 'success' && check.customization && Object.keys(check.customization).length > 0) {
        const c = check.customization;
        if (c.appName) setAppName(c.appName);
        if (c.appSubtitle) setAppSubtitle(c.appSubtitle);
        if (c.logoEmoji) setLogoEmoji(c.logoEmoji);
        if (c.logoColor) setLogoColor(c.logoColor);
        if (c.logoUrl !== undefined) setLogoUrl(c.logoUrl || '/logo_smpn11.jpg');
        if (Array.isArray(c.fullAccessUsernames)) setFullAccessUsernames(c.fullAccessUsernames);
        if (c.userPhotos && typeof c.userPhotos === 'object') setUserPhotos(c.userPhotos);
        if (c.kepalaSekolahNama !== undefined) setKepalaSekolahNama(c.kepalaSekolahNama);
        if (c.kepalaSekolahNip !== undefined) setKepalaSekolahNip(c.kepalaSekolahNip);
        if (c.batasWaktuMasuk !== undefined) setBatasWaktuMasuk(c.batasWaktuMasuk);
        setSyncStatus('synced');
      } else if (check.errorType === 'sheet_not_found') {
        setSyncStatus('sheet_missing');
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save Web App URL first to establish connection
    onSaveWebAppUrl(dbUrl.trim());

    const normalizedLogo = normalizeImageUrl(logoUrl.trim()) || '/logo_smpn11.jpg';
    const normalizedPhotos: Record<string, string> = {};
    Object.entries(userPhotos).forEach(([k, v]) => {
      if (v && typeof v === 'string' && v.trim()) {
        normalizedPhotos[k] = normalizeImageUrl(v.trim());
      }
    });

    onSave({
      ...customization,
      appName: appName.trim(),
      appSubtitle: appSubtitle.trim(),
      logoEmoji: logoEmoji,
      logoColor: logoColor,
      logoUrl: normalizedLogo,
      fullAccessUsernames: fullAccessUsernames,
      userPhotos: normalizedPhotos,
      kepalaSekolahNama: kepalaSekolahNama.trim(),
      kepalaSekolahNip: kepalaSekolahNip.trim(),
      batasWaktuMasuk: batasWaktuMasuk.trim(),
      externalApps: Array.isArray(customization.externalApps) ? customization.externalApps : [],
    });
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.nama.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      t.nip.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cloud Sync Status Banner */}
      <div className="max-w-4xl mx-auto">
        {syncStatus === 'checking' && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-800">Memeriksa sinkronisasi cloud...</span>
              <p className="text-slate-500">Mencoba membaca konfigurasi dari Google Spreadsheet Anda.</p>
            </div>
          </div>
        )}

        {syncStatus === 'synced' && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-500 text-white p-1.5 rounded-lg flex-shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                  <span>Tersinkronisasi Cloud Aktif</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                    Connected
                  </span>
                </span>
                <p className="text-emerald-700 font-medium">
                  Semua perubahan identitas, logo, foto profil, dan hak akses guru tersimpan ke sheet <strong>'Pengaturan'</strong> di Google Spreadsheet Anda sehingga otomatis tersinkron saat pindah browser.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReloadFromCloud}
              className="self-end sm:self-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm flex-shrink-0"
              title="Tarik ulang data pengaturan terbaru dari Google Spreadsheet"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Tarik dari Cloud</span>
            </button>
          </div>
        )}

        {syncStatus === 'demo' && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
            <div className="bg-blue-500 text-white p-1.5 rounded-lg flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <span className="font-extrabold text-blue-800">Penyimpanan Lokal (Mode Demo)</span>
              <p className="text-blue-700 font-medium">
                Aplikasi belum dihubungkan ke Google Spreadsheet. Pengaturan disimpan sementara di browser ini. Hubungkan database Spreadsheet via sidebar kiri untuk sinkronisasi cloud penuh.
              </p>
            </div>
          </div>
        )}

        {syncStatus === 'sheet_missing' && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-2">
              <span className="font-extrabold text-amber-800 block">
                Peringatan: Sheet 'Pengaturan' Belum Tersedia di Google Sheets Anda
              </span>
              <p className="text-amber-700 font-medium leading-relaxed">
                Database terhubung, namun kami mendeteksi bahwa sheet baru bernama <strong>'Pengaturan'</strong> belum dibuat di Google Spreadsheet Anda. Agar pengaturan tersimpan permanen di cloud, silakan ikuti langkah mudah ini:
              </p>
              <div className="bg-white/80 border border-amber-200 p-3 rounded-xl space-y-1.5 text-amber-900 font-mono text-[10px]">
                <p>1. Buka spreadsheet database Anda.</p>
                <p>2. Buat sheet baru dan namai tepat: <strong className="text-amber-950 font-bold bg-amber-200/50 px-1 py-0.5 rounded">Pengaturan</strong></p>
                <p>3. Di baris pertama (Header), buat kolom berikut: </p>
                <div className="grid grid-cols-2 max-w-xs border border-amber-300 rounded overflow-hidden">
                  <div className="p-1 bg-amber-100 font-bold border-r border-amber-300">A1: Kunci</div>
                  <div className="p-1 bg-amber-100 font-bold">B1: Nilai</div>
                </div>
              </div>
              <p className="text-amber-700 text-[10px] italic">
                *Sementara ini, sistem akan menyimpan perubahan ke penyimpanan lokal browser Anda agar dapat tetap digunakan.
              </p>
            </div>
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-rose-800">Gagal menghubungkan ke spreadsheet:</span>
              <p className="text-rose-700 mt-0.5">{syncMessage || 'Pastikan Web App URL aktif dan diatur dengan benar.'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>Pengaturan Identitas & Hak Akses Aplikasi</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sesuaikan nama sistem, logo emoji/link gambar, dan atur akun Guru mana saja yang berhak mengelola seluruh master data (Akses Full Admin).
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: branding */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                Identitas Aplikasi
              </h4>

              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-150 space-y-2.5 shadow-inner">
                <label className="block text-xs font-extrabold text-blue-900 uppercase flex items-center gap-1.5">
                  <Database className="w-4.5 h-4.5 text-blue-600 flex-shrink-0 animate-pulse" />
                  <span>Koneksi Database (Web App URL)</span>
                </label>
                <input
                  type="url"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  placeholder="Masukkan link script google.com/macros/s/.../exec"
                  className="w-full p-2.5 rounded-xl border border-blue-250 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-700"
                />
                <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                  INFO: Paste link Web App Google Apps Script Anda di sini. Link ini otomatis tersimpan di cloud server, menjaga aplikasi tetap terhubung di semua HP dan laptop tanpa perlu input ulang!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nama Aplikasi E-Absensi
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  required
                  placeholder="Contoh: E-ABSENSI"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Sub-nama / Slogan Aplikasi
                </label>
                <input
                  type="text"
                  value={appSubtitle}
                  onChange={(e) => setAppSubtitle(e.target.value)}
                  required
                  placeholder="Contoh: Sekolah Digital"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Link Gambar Logo (Kustom)</span>
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Contoh: https://i.imgur.com/your-logo.png atau link Google Drive"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  *Mendukung link langsung (PNG/JPG), link <strong>Google Drive</strong> (otomatis dikonversi), Dropbox, atau Imgur. Jika dikosongkan, logo otomatis menggunakan Emoji di bawah.
                </p>
              </div>

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2 pb-1 border-b border-slate-100 mt-2">
                Identitas Kepala Sekolah (Untuk Tanda Tangan PDF)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Nama Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={kepalaSekolahNama}
                    onChange={(e) => setKepalaSekolahNama(e.target.value)}
                    placeholder="Contoh: Dr. H. Ahmad Fauzi, M.Pd."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={kepalaSekolahNip}
                    onChange={(e) => setKepalaSekolahNip(e.target.value)}
                    placeholder="Contoh: 197501012000031001"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Batas Jam Masuk Siswa (Presensi Pagi)</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded">
                    Saat ini: {batasWaktuMasuk || '07:00'} WIB
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input
                    type="time"
                    value={batasWaktuMasuk}
                    onChange={(e) => setBatasWaktuMasuk(e.target.value)}
                    className="p-2.5 rounded-xl border border-amber-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {['06:45', '07:00', '07:15', '07:30'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBatasWaktuMasuk(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          batasWaktuMasuk === preset
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Siswa yang memindai kartu setelah jam ini akan otomatis dicatat <strong>"Terlambat"</strong> beserta hitungan menit keterlambatannya dan tersimpan langsung ke Google Spreadsheet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Logo Emoji Aplikasi (Fallback)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setLogoEmoji(emoji)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg cursor-pointer transition-all ${
                        logoEmoji === emoji
                          ? 'border-blue-600 bg-blue-50 font-bold scale-105'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customEmojiInput}
                    onChange={(e) => setCustomEmojiInput(e.target.value)}
                    placeholder="Atau ketik emoji kustom..."
                    maxLength={2}
                    className="p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white w-40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customEmojiInput.trim()) {
                        setLogoEmoji(customEmojiInput.trim());
                        setCustomEmojiInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Gunakan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Warna Latar Logo Brand
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.class}
                      type="button"
                      onClick={() => setLogoColor(color.class)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                        logoColor === color.class
                          ? 'border-slate-900 bg-slate-50 ring-2 ' + color.ring
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${color.class}`}></span>
                      <span className="truncate">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Eye className="w-3 h-3 text-slate-400" />
                  <span>Pratinjau Tampilan Header & Icon Aplikasi</span>
                </span>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-2xl border border-slate-800">
                  <div className={`w-10 h-10 rounded-xl ${logoColor} flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden`}>
                    {logoUrl.trim() ? (
                      <img
                        src={normalizeImageUrl(logoUrl.trim())}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback to emoji if URL is invalid or blocked
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xl">{logoEmoji}</span>
                    )}
                  </div>
                  <div>
                    <h1 className="font-extrabold text-white text-base leading-tight tracking-tight uppercase">
                      {appName || 'E-ABSENSI'}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                      {appSubtitle || 'Sekolah Digital'}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Penting:</strong> Logo dan nama aplikasi di atas secara otomatis dijadikan sebagai <strong>Icon Favicon Web</strong>, <strong>Apple Touch Icon</strong>, dan <strong>Icon Aplikasi (Web App Manifest / APK PWA)</strong> saat pengguna memasang aplikasi ke Layar Utama perangkat (Android/iOS).
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Teacher & Tendik access rights */}
            <div className="space-y-4 flex flex-col">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                <span>Hak Akses Guru & Tendik (Akses Full)</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {fullAccessUsernames.length} Akun Terpilih
                </span>
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed">
                Secara default, akun Guru/Tendik hanya memiliki <strong>4 menu utama</strong>. Centang akun di bawah untuk memberikan <strong>Akses Full</strong> (Master Data Siswa, Kelas, Mapel). Menu <em>Data Guru & Tendik</em>, <em>Pengaturan Aplikasi</em>, dan <em>Kode Apps Script</em> tetap khusus untuk <strong>Admin Utama</strong>.
              </p>

              {/* Search Bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari NIP, nama, atau username..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>

              {/* Teachers List Scrollable */}
              <div className="flex-1 min-h-[220px] max-h-[340px] overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white shadow-inner">
                {isLoadingTeachers ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">Memuat daftar akun...</span>
                  </div>
                ) : filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher, idx) => {
                    const keysToCheck = [teacher.accessKey, teacher.username, teacher.nip].filter(Boolean);
                    const isGranted = keysToCheck.some((k) => fullAccessUsernames.includes(k));
                    const itemKey = `${teacher.accessKey}_${teacher.nip || idx}`;
                    return (
                      <div
                        key={itemKey}
                        onClick={() => handleToggleAccess(teacher)}
                        className={`p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer select-none ${
                          isGranted ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{teacher.nama}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                              teacher.role === 'Tendik' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {teacher.role}
                            </span>
                            {isGranted && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[9px] font-extrabold uppercase">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>Akses Full</span>
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIP: {teacher.nip || '-'} <span className="text-slate-300">•</span> Username: <strong className="text-slate-600">{teacher.username || '-'}</strong>
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isGranted
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isGranted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    Tidak ada data pengguna yang cocok.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Foto Profil Akun Guru & Admin */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>Foto Profil Pengguna (Guru & Admin)</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {Object.keys(userPhotos).filter((k) => userPhotos[k]?.trim()).length} Foto Diatur
              </span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Masukkan URL gambar (PNG/JPG) untuk masing-masing akun guru atau admin. Foto profil ini akan menggantikan inisial huruf di sudut kiri atas sidebar saat pengguna tersebut masuk.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
              {/* Special Row: Admin */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${logoColor} text-white flex items-center justify-center font-extrabold text-sm shadow-inner uppercase flex-shrink-0 overflow-hidden`}>
                  {userPhotos['admin']?.trim() ? (
                    <img
                      src={normalizeImageUrl(userPhotos['admin'].trim())}
                      alt="Admin"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageFallbackError(e)}
                    />
                  ) : (
                    'A'
                  )}
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="text-[11px]">
                    <span className="font-extrabold text-slate-800">Admin Utama</span>
                    <span className="text-slate-400 font-mono ml-1">(admin)</span>
                  </div>
                  <input
                    type="url"
                    value={userPhotos['admin'] || ''}
                    onChange={(e) => handlePhotoUrlChange('admin', e.target.value)}
                    placeholder="Link Foto (https://...)"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                </div>
              </div>

              {/* Teachers Rows */}
              {teachers.map((teacher, idx) => {
                const photoKey = teacher.username || teacher.nip || teacher.accessKey;
                const photoVal = userPhotos[teacher.username] || userPhotos[teacher.nip] || userPhotos[teacher.accessKey] || userPhotos[teacher.nama] || '';
                return (
                  <div key={`t-${photoKey}-${idx}`} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-extrabold text-sm shadow-inner uppercase flex-shrink-0 overflow-hidden`}>
                      {photoVal?.trim() ? (
                        <img
                          src={normalizeImageUrl(photoVal.trim())}
                          alt={teacher.nama}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageFallbackError(e)}
                        />
                      ) : (
                        teacher.nama.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="text-[11px] truncate" title={teacher.nama}>
                        <span className="font-extrabold text-slate-800">{teacher.nama}</span>
                        <span className="text-slate-400 font-mono ml-1">({teacher.username || teacher.nip})</span>
                      </div>
                      <input
                        type="url"
                        value={photoVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserPhotos((prev) => ({
                            ...prev,
                            [photoKey]: val,
                            ...(teacher.username ? { [teacher.username]: val } : {}),
                            ...(teacher.nip ? { [teacher.nip]: val } : {}),
                          }));
                        }}
                        placeholder="Link Foto (https://...)"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-start gap-2 text-[11px] text-slate-500 max-w-[70%] leading-normal">
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                Perubahan identitas dan hak akses akan langsung diterapkan ke seluruh halaman setelah disimpan. Sesi akun guru yang aktif akan otomatis beradaptasi.
              </p>
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/15 flex items-center gap-1.5 cursor-pointer hover:scale-102 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
