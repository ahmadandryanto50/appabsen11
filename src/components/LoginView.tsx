/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GraduationCap, User, Lock, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { AppCustomization } from '../types';
import { normalizeImageUrl } from '../utils/imageUrl';

interface LoginViewProps {
  onLogin: (username: string, passwordInput: string) => Promise<void>;
  isLoading: boolean;
  customization?: AppCustomization;
}

export function LoginView({ onLogin, isLoading, customization }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    onLogin(user, pass);
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
      <div className="text-center space-y-3">
        <div className={`w-16 h-16 ${customization?.logoColor || 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20 overflow-hidden`}>
          {customization?.logoUrl?.trim() ? (
            <img
              src={normalizeImageUrl(customization.logoUrl.trim())}
              alt="Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-3xl">{customization?.logoEmoji || '🎓'}</span>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
            {customization?.appName || 'E-Absensi'}
          </h2>
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mt-0.5">
            {customization?.appSubtitle || 'Sekolah Digital'}
          </p>
        </div>
        <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
          Masuk dengan akun Anda untuk mencatat kehadiran siswa & guru secara presisi.
        </p>
      </div>

      {/* Quick Login Simulator */}
      <div className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl space-y-2.5">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
          Uji Coba Cepat (Mode Demo)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin', 'admin123')}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 active:scale-98 transition-all cursor-pointer shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Login Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('guru', 'guru123')}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-98 transition-all cursor-pointer shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Login Guru</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Masukkan username"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Masuk Sekarang</span>
        </button>
      </form>
    </div>
  );
}
