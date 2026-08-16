/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Globe, ArrowRight, Plus, Trash2, Sparkles, Home, ArrowLeft } from 'lucide-react';
import { AppCustomization } from '../types';

export interface ExternalAppItem {
  id: string;
  name: string;
  url: string;
  description: string;
  category?: string;
  badge?: string;
}

interface ExternalAppsModalProps {
  onClose: () => void;
  onReturnToMainApp?: () => void;
  customization?: AppCustomization;
  onSaveCustomization?: (newCustomization: AppCustomization) => void;
  isAdmin?: boolean;
}

export const DEFAULT_APPS: ExternalAppItem[] = [
  {
    id: 'dapodik11',
    name: 'Dapodik 11',
    url: 'https://dapodik11.vercel.app/',
    description: 'Aplikasi Integrasi Data Pokok Pendidikan (Dapodik 11) Sekolah',
    category: 'Sistem Informasi Sekolah',
    badge: 'Hosting Vercel',
  },
];

export function ExternalAppsModal({
  onClose,
  onReturnToMainApp,
  customization,
  onSaveCustomization,
  isAdmin = false,
}: ExternalAppsModalProps) {
  // Get external apps list from customization or fallback to default
  const savedApps: ExternalAppItem[] = (customization as any)?.externalApps?.length
    ? (customization as any).externalApps
    : DEFAULT_APPS;

  const [apps, setApps] = useState<ExternalAppItem[]>(savedApps);
  const [redirectingApp, setRedirectingApp] = useState<ExternalAppItem | null>(null);

  // Sync state if customization changes from live database
  useEffect(() => {
    if (customization?.externalApps && customization.externalApps.length > 0) {
      setApps(customization.externalApps);
    }
  }, [customization?.externalApps]);

  // Form for adding new custom app link (for Admin)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleOpenApp = (app: ExternalAppItem, openInNewTab = false) => {
    if (openInNewTab) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Save flag that we navigated to external app so returning via Back button shows welcome toast
    try {
      sessionStorage.setItem('returned_from_external_app', app.name);
    } catch (e) {}

    // Redirect current tab cleanly (closes current app cleanly and opens the second app)
    setRedirectingApp(app);
    setTimeout(() => {
      let targetUrl = app.url;
      try {
        const currentOrigin = window.location.href;
        const urlObj = new URL(targetUrl);
        if (!urlObj.searchParams.has('return_url')) {
          urlObj.searchParams.set('return_url', currentOrigin);
          targetUrl = urlObj.toString();
        }
      } catch (e) {}

      window.location.href = targetUrl;
    }, 600);
  };

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    let formattedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newItem: ExternalAppItem = {
      id: `app-${Date.now()}`,
      name: newName.trim(),
      url: formattedUrl,
      description: newDesc.trim() || 'Aplikasi Sekolah Eksternal',
      category: newCategory.trim() || 'Aplikasi Lainnya',
      badge: 'Tautan Tambahan',
    };

    const updated = [...apps, newItem];
    setApps(updated);

    if (customization && onSaveCustomization) {
      onSaveCustomization({
        ...customization,
        externalApps: updated as any,
      });
    }

    setNewName('');
    setNewUrl('');
    setNewDesc('');
    setNewCategory('');
    setShowAddForm(false);
  };

  const handleDeleteApp = (id: string) => {
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
    if (customization && onSaveCustomization) {
      onSaveCustomization({
        ...customization,
        externalApps: updated as any,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-100 animate-scale-up max-h-[90vh] overflow-y-auto relative">
        {/* Loading / Redirect Overlay */}
        {redirectingApp && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/10">
              <Globe className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-800">Menutup & Mengarahkan...</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Aplikasi ini akan tertutup secara rapi dan Anda akan berpindah ke <span className="font-bold text-blue-600">{redirectingApp.name}</span> ({redirectingApp.url})
              </p>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Tautan & Menu Aplikasi Lainnya</h3>
              <p className="text-xs text-slate-500">Pilih aplikasi yang ingin Anda buka atau kembali ke utama</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onReturnToMainApp && (
              <button
                type="button"
                onClick={() => {
                  onReturnToMainApp();
                  onClose();
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-blue-200/80 cursor-pointer"
                title="Kembali ke Dashboard Utama Aplikasi"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Halaman Utama</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* App Links Cards */}
        <div className="space-y-3.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Daftar Aplikasi Eksternal Terhubung
          </p>

          {apps.map((app) => (
            <div
              key={app.id}
              className="group p-4 bg-slate-50/80 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl transition-all duration-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                    {app.name}
                  </span>
                  {app.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200/60">
                      {app.badge}
                    </span>
                  )}
                  {app.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/70 text-slate-600">
                      {app.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{app.description}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-mono font-medium truncate pt-0.5">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{app.url}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                <button
                  onClick={() => handleOpenApp(app, false)}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
                  title="Tutup aplikasi ini dan buka link ini"
                >
                  <span>Buka Aplikasi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleOpenApp(app, true)}
                  className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                {isAdmin && apps.length > 1 && (
                  <button
                    onClick={() => handleDeleteApp(app.id)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Hapus Tautan Aplikasi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
          <Sparkles className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
          <p>
            Saat tombol <strong>Buka Aplikasi</strong> diklik, aplikasi presensi saat ini akan berpindah ke aplikasi kedua. Anda dapat menekan tombol <strong>Kembali (Back)</strong> pada peramban peramban kapan saja untuk kembali ke aplikasi utama ini secara mulus.
          </p>
        </div>

        {/* Admin Add Custom Link Section */}
        {isAdmin && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Tambah Tautan Aplikasi Lainnya (Admin)</span>
              </button>
            ) : (
              <form onSubmit={handleAddApp} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Tambah Tautan Aplikasi Baru</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Aplikasi</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: E-Rapor / CBT"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">URL / Link</label>
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kategori (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Akademik / Portal"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deskripsi Ringkas</label>
                    <input
                      type="text"
                      placeholder="Keterangan aplikasi..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Simpan Tautan
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-3.5 gap-2.5">
          {onReturnToMainApp ? (
            <button
              type="button"
              onClick={() => {
                onReturnToMainApp();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/10 cursor-pointer active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Halaman Utama Aplikasi</span>
            </button>
          ) : (
            <div></div>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup Window
          </button>
        </div>
      </div>
    </div>
  );
}
