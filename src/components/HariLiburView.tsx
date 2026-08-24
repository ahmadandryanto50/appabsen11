/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Plus, Info, CheckCircle, ShieldAlert, Sparkles, Smile, Sunset } from 'lucide-react';
import { getLocalDateString, AppCustomization } from '../types';

export interface Holiday {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nama: string;
  kategori: 'Nasional' | 'Sekolah' | 'Khusus';
}

interface HariLiburViewProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  customization?: AppCustomization;
  onSaveCustomization?: (newCust: AppCustomization) => Promise<any> | any;
}

export function HariLiburView({ onAddToast, customization, onSaveCustomization }: HariLiburViewProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newTanggal, setNewTanggal] = useState(getLocalDateString());
  const [newNama, setNewNama] = useState('');
  const [newKategori, setNewKategori] = useState<'Nasional' | 'Sekolah' | 'Khusus'>('Nasional');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Load holidays on mount and when customization changes
  useEffect(() => {
    let rawList: Holiday[] = [];
    if (customization?.holidays && Array.isArray(customization.holidays)) {
      rawList = customization.holidays;
    } else {
      const stored = localStorage.getItem('absensi_hari_libur');
      if (stored) {
        try {
          rawList = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse holidays:', e);
        }
      }
    }

    // Filter out default holidays if present ("Hari Kemerdekaan RI" and "Hari Raya Natal")
    const cleaned = rawList.filter((h) => {
      const nameLow = (h.nama || '').toLowerCase();
      return !nameLow.includes('kemerdekaan') && !nameLow.includes('natal');
    });

    setHolidays(cleaned);
    if (cleaned.length !== rawList.length) {
      localStorage.setItem('absensi_hari_libur', JSON.stringify(cleaned));
      if (onSaveCustomization && customization) {
        onSaveCustomization({
          ...customization,
          holidays: cleaned,
        });
      }
    }
  }, [customization?.holidays]);

  const saveHolidays = (list: Holiday[]) => {
    setHolidays(list);
    localStorage.setItem('absensi_hari_libur', JSON.stringify(list));
    if (onSaveCustomization) {
      const updatedCust: AppCustomization = {
        ...(customization || {
          appName: 'E-ABSENSI',
          appSubtitle: 'SMP NEGERI 11 PALU',
          logoEmoji: '🎓',
          logoColor: 'bg-blue-600',
          fullAccessUsernames: [],
        }),
        holidays: list,
      };
      onSaveCustomization(updatedCust);
    }
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !newTanggal) {
      onAddToast('Nama libur dan tanggal wajib diisi!', 'error');
      return;
    }

    // Check duplicate date
    if (holidays.some((h) => h.tanggal === newTanggal)) {
      onAddToast('Tanggal tersebut sudah diatur sebagai hari libur!', 'warning');
      return;
    }

    const newHoliday: Holiday = {
      id: String(Date.now()),
      tanggal: newTanggal,
      nama: newNama.trim(),
      kategori: newKategori,
    };

    const updated = [...holidays, newHoliday].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    saveHolidays(updated);
    setNewNama('');
    onAddToast(`Berhasil menetapkan ${newNama} sebagai Hari Libur!`, 'success');
  };

  const handleDeleteHoliday = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus hari libur "${name}"?`)) {
      const filtered = holidays.filter((h) => h.id !== id);
      saveHolidays(filtered);
      onAddToast(`Hari libur "${name}" telah dihapus.`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="bg-white/20 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full backdrop-blur-sm shadow-sm inline-block">
            Sistem Kalender Akademik
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Manajemen Hari Libur & Tanggal Merah
          </h2>
          <p className="text-xs text-white/90 leading-relaxed font-medium">
            Atur hari libur nasional atau khusus sekolah di sini. Ketika hari libur aktif, seluruh proses absensi (Guru, Tendik, Siswa di Kelas, & Kiosk Scanner) pada tanggal tersebut akan otomatis terkoneksi dan diliburkan secara serentak.
          </p>
        </div>
        <Sunset className="w-48 h-48 text-white/10 absolute -right-4 -bottom-12 pointer-events-none transform -rotate-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ADD HOLIDAY FORM */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-150 pb-3 mb-4">
            <Plus className="w-4 h-4 text-rose-500" />
            <span>Tambah Hari Libur Baru</span>
          </h3>

          <form onSubmit={handleAddHoliday} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Pilih Tanggal Merah
              </label>
              <input
                type="date"
                required
                value={newTanggal}
                onChange={(e) => setNewTanggal(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Keterangan / Nama Libur
              </label>
              <input
                type="text"
                required
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                placeholder="Contoh: Libur Idul Fitri, Libur Semester"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all text-slate-700 placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Kategori Libur
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Nasional', 'Sekolah', 'Khusus'] as const).map((kat) => (
                  <button
                    key={kat}
                    type="button"
                    onClick={() => setNewKategori(kat)}
                    className={`p-2.5 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      newKategori === kat
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Tetapkan Hari Libur</span>
            </button>
          </form>
        </div>

        {/* HOLIDAY LIST */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Daftar Tanggal Merah Terdaftar</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
              {holidays.length} Hari Libur
            </span>
          </div>

          {holidays.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
                <Smile className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-800 font-bold text-xs">Belum Ada Hari Libur</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Silakan tambahkan tanggal merah menggunakan formulir di sebelah kiri untuk mengaktifkan sinkronisasi libur.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {holidays.map((h) => {
                const dateParts = h.tanggal.split('-');
                let indonesianDate = h.tanggal;
                if (dateParts.length === 3) {
                  const months = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                  ];
                  const y = dateParts[0];
                  const m = months[parseInt(dateParts[1], 10) - 1] || dateParts[1];
                  const d = parseInt(dateParts[2], 10);
                  indonesianDate = `${d} ${m} ${y}`;
                }

                return (
                  <div
                    key={h.id}
                    className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between hover:bg-slate-100/50 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-slate-800">
                          {h.nama}
                        </p>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            h.kategori === 'Nasional'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : h.kategori === 'Sekolah'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {h.kategori}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{indonesianDate}</span>
                      </p>
                    </div>

                    {confirmDeleteId === h.id ? (
                      <div className="flex items-center gap-1.5 animate-scale-up">
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = holidays.filter((item) => item.id !== h.id);
                            saveHolidays(filtered);
                            onAddToast(`Hari libur "${h.nama}" telah dihapus.`, 'info');
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(h.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                        title="Hapus Hari Libur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
