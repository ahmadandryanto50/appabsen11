/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GraduationCap, User, Lock, Loader2, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="max-w-sm w-full mx-auto my-4 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-slate-200 backdrop-blur-md">
      <div className="text-center space-y-3">
        {/* Animated Circular Logo Container */}
        <div className="relative w-20 h-20 mx-auto">
          {/* Outer rotating color ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 opacity-80 animate-spin [animation-duration:8s] blur-[1px]" />
          {/* Pulsing overlay shadow */}
          <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse [animation-duration:3s]" />
          {/* Inner crisp logo container */}
          <div className="absolute inset-[3px] rounded-full bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
            <img
              src={normalizeImageUrl(customization?.logoUrl?.trim() || '/logo_smpn11.jpg')}
              alt="Logo Sekolah SMPN 11 Palu"
              className="w-[85%] h-[85%] object-contain rounded-full transition-transform hover:scale-110 duration-500"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo_smpn11.jpg';
              }}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            {customization?.appName || 'E-Absensi'}
          </h2>
          <p className="text-[10px] font-bold text-blue-400 tracking-wider uppercase mt-0.5">
            {customization?.appSubtitle || 'Sekolah Digital'}
          </p>
        </div>
        <p className="text-[11px] text-slate-400 max-w-xs mx-auto font-medium">
          Masuk dengan akun Anda untuk mencatat kehadiran siswa & guru secara presisi.
        </p>
      </div>

      {/* Quick Login Simulator */}
      <div className="p-3 bg-slate-800/40 border border-slate-800/80 rounded-2xl space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          Uji Coba Cepat (Mode Demo)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin', 'admin123')}
            className="flex items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-600 active:scale-98 transition-all cursor-pointer shadow-md"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Login Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('guru', 'guru123')}
            className="flex items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-600 active:scale-98 transition-all cursor-pointer shadow-md"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Login Guru</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
            Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <User className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Masukkan username"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-slate-100 placeholder-slate-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Lock className="w-3.5 h-3.5" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan password"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-slate-100 placeholder-slate-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99] mt-2"
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Masuk Sekarang</span>
        </button>
      </form>
    </div>
  );
}
