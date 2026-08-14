/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Globe, HelpCircle, Save, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

interface SettingsModalProps {
  onClose: () => void;
  currentUrl: string;
  onSave: (url: string) => void;
}

export function SettingsModal({ onClose, currentUrl, onSave }: SettingsModalProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const syncUrl = typeof window !== 'undefined' && urlInput.trim()
    ? `${window.location.origin}${window.location.pathname}?gas_url=${encodeURIComponent(urlInput.trim())}`
    : '';

  useEffect(() => {
    if (syncUrl && showQr) {
      QRCode.toDataURL(syncUrl, {
        width: 300,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch((e) => console.error('Error generating sync QR:', e));
    }
  }, [syncUrl, showQr]);

  const handleCopyLink = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy sync link:', e);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(urlInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <span>Pengaturan URL Database & Sinkronisasi Cloud</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-500 leading-relaxed space-y-2">
          <p>
            Sistem ini mendukung integrasi multi-user secara real-time ke <strong>Google Sheets</strong> menggunakan Google Apps Script.
          </p>
          <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-2 text-blue-800 font-medium">
            <HelpCircle className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <p>
              Kosongkan URL di bawah untuk tetap menggunakan <strong>Mode Demo Interaktif</strong> yang menyimpan seluruh log presensi dan master data secara offline di peramban (Local Storage).
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Google Apps Script Web App URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-medium"
            />
          </div>

          {/* Quick sync sharing for other browsers & devices */}
          {urlInput.trim() && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sinkronkan ke Browser / Perangkat Lain</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQr ? 'Tutup QR' : 'Lihat QR'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Salin link di bawah atau scan QR Code di browser HP / laptop lain agar otomatis terhubung ke database dan logo sekolah yang sama tanpa konfigurasi ulang:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={syncUrl}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-mono text-slate-600 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>

              {showQr && qrDataUrl && (
                <div className="pt-2 text-center flex flex-col items-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm inline-block">
                    <img src={qrDataUrl} alt="QR Code Sinkronisasi" className="w-40 h-40 object-contain mx-auto" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Scan dengan kamera HP untuk langsung membuka aplikasi terkonfigurasi.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Status: {urlInput.trim() ? '🔌 Siap Menghubungkan' : '🏠 Offline (Mode Demo)'}
            </span>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan & Muat Ulang</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
