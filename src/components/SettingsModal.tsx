/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Globe, HelpCircle, Save } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  currentUrl: string;
  onSave: (url: string) => void;
}

export function SettingsModal({ onClose, currentUrl, onSave }: SettingsModalProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(urlInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-scale-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <span>Pengaturan URL Database API</span>
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
            Sistem ini mendukung integrasi multi-user secara real-time ke **Google Sheets** menggunakan Google Apps Script.
          </p>
          <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-2 text-blue-800 font-medium">
            <HelpCircle className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <p>
              Kosongkan URL di bawah untuk tetap menggunakan **Mode Demo Interaktif** yang menyimpan seluruh log presensi dan master data secara offline di peramban (Local Storage).
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
