/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GraduationCap, User, Lock, Loader2, ShieldCheck, UserCheck, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { AppCustomization } from '../types';
import { normalizeImageUrl } from '../utils/imageUrl';

interface LoginViewProps {
  onLogin: (username: string, passwordInput: string) => Promise<void>;
  isLoading: boolean;
  customization?: AppCustomization;
  isDemoMode?: boolean;
  onLogoClick?: () => void;
}

export function LoginView({ onLogin, isLoading, customization, isDemoMode, onLogoClick }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Light & Dark theme state for login screen
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('absensi_login_theme');
    return saved ? saved === 'dark' : true; // Default to dark mode as it was
  });

  useEffect(() => {
    localStorage.setItem('absensi_login_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Slideshow state for admin profile photos and school logo
  const [photoIndex, setPhotoIndex] = useState(0);

  const adminPhotos = useMemo(() => {
    const list: string[] = [];
    
    // 1. School Logo (always index 0)
    if (customization?.logoUrl?.trim()) {
      list.push(normalizeImageUrl(customization.logoUrl.trim()));
    } else {
      list.push('/logo_smpn11.jpg');
    }

    // 2. Scan customization?.userPhotos for keys related to admin/utama/rizaldy
    if (customization?.userPhotos) {
      Object.entries(customization.userPhotos).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim()) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes('admin') || 
            lowerKey.includes('utama') || 
            lowerKey.includes('rizaldy') || 
            lowerKey.includes('mohammad') ||
            lowerKey.includes('pengelola') ||
            lowerKey.includes('kepala') ||
            lowerKey.includes('1984')
          ) {
            const norm = normalizeImageUrl(value.trim());
            if (norm && !list.includes(norm)) {
              list.push(norm);
            }
          }
        }
      });
    }

    // 3. Scan local storage for master guru photos of Admin
    try {
      const masterGuruStr = localStorage.getItem('absensi_master_guru') || localStorage.getItem('Master_Guru_data');
      if (masterGuruStr) {
        const parsed = JSON.parse(masterGuruStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((g: any) => {
            let role = '';
            let photo = '';
            if (Array.isArray(g.data)) {
              role = String(g.data[3] || g.data[4] || '').trim();
              photo = String(g.data[7] || g.data[6] || g.data[5] || '').trim();
            } else if (typeof g === 'object' && g) {
              role = String(g.role || g.Role || g['Role / Jabatan'] || '').trim();
              photo = String(g.photo || g.Photo || g.foto || g.Foto || '').trim();
            }
            if (role.toLowerCase().includes('admin') || role.toLowerCase().includes('utama') || role.toLowerCase().includes('kepala')) {
              if (photo && photo.startsWith('http')) {
                const norm = normalizeImageUrl(photo);
                if (norm && !list.includes(norm)) {
                  list.push(norm);
                }
              }
            }
          });
        }
      }
    } catch (e) {}

    // 4. Fallback: if we only have the logo, cycle with other key profiles if available
    if (list.length < 2 && customization?.userPhotos) {
      Object.values(customization.userPhotos).forEach((val) => {
        if (val && typeof val === 'string' && val.trim()) {
          const norm = normalizeImageUrl(val.trim());
          if (norm && !list.includes(norm) && list.length < 4) {
            list.push(norm);
          }
        }
      });
    }

    return list;
  }, [customization]);

  // Rotate every 10 seconds smoothly
  useEffect(() => {
    if (adminPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % adminPhotos.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [adminPhotos]);

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
    <>
      {/* Light Mode Full-Screen Background Overlay matching image perfectly */}
      {!isDarkMode && (
        <div className="fixed inset-0 bg-[#e6ebf4] z-[-1] transition-all duration-300 pointer-events-none" />
      )}

      {/* Slightly smaller max-w-[330px] wrapper for neatness and perfect screen balance */}
      <div className={`max-w-[330px] w-full mx-auto my-4 rounded-[36px] p-6 space-y-4 backdrop-blur-md transition-all duration-300 relative border ${
        isDarkMode 
          ? 'bg-[#111e32] border-white/[0.03] text-slate-200 shadow-[20px_20px_40px_rgba(3,8,17,0.7),_-10px_-10px_30px_rgba(255,255,255,0.02)]' 
          : 'bg-[#e6ebf4] border-white/40 text-slate-700 shadow-[15px_15px_30px_#c8d0e0,_-15px_-15px_30px_#ffffff]'
      }`}>
        
        {/* Absolute Theme Toggle Switch on Card Header */}
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`absolute top-5 right-5 p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            isDarkMode
              ? 'bg-[#111e32] text-amber-400 shadow-[2px_2px_5px_rgba(0,0,0,0.4),_-2px_-2px_5px_rgba(255,255,255,0.02)] active:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] hover:text-amber-300'
              : 'bg-[#e6ebf4] text-indigo-600 shadow-[3px_3px_6px_#c8d0e0,_-3px_-3px_6px_#ffffff] active:shadow-[inset_1px_1px_3px_#c8d0e0] hover:text-indigo-800'
          }`}
          title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <div className="text-center space-y-3">
          {/* Embossed Circular Logo Container matching the image */}
          <div 
            className={`relative w-20 h-20 mx-auto rounded-full flex items-center justify-center p-2 transition-transform active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'bg-[#111e32] shadow-[6px_6px_12px_rgba(3,8,17,0.6),_-6px_-6px_12px_rgba(255,255,255,0.03)]'
                : 'bg-[#e6ebf4] shadow-[5px_5px_10px_#c8d0e0,_-5px_-5px_10px_#ffffff]'
            }`}
            onClick={onLogoClick}
            title="Ketuk 5 kali untuk membuka API Settings rahasia"
          >
            {/* Inner crisp logo container with smooth cross-fade */}
            <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${
              isDarkMode
                ? 'bg-[#0a121e] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]'
                : 'bg-[#e6ebf4] shadow-[inset_2px_2px_4px_#c8d0e0,_inset_-2px_-2px_4px_#ffffff]'
            }`}>
              {adminPhotos.map((src, idx) => (
                <img
                  key={src + '-' + idx}
                  src={src}
                  alt="Logo Sekolah"
                  className={`absolute inset-0 w-full h-full rounded-full transition-all duration-1000 ease-in-out ${
                    idx === 0 ? 'p-2.5 object-contain' : 'object-cover'
                  } ${idx === photoIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-90 z-0 pointer-events-none'}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo_smpn11.jpg';
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className={`text-xl font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-[#1e293b]'
            }`}>
              Welcome back
            </h1>
            <p className={`text-[11px] font-medium ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Please sign in to continue
            </p>
          </div>

          {/* Dynamic customized organization title */}
          <div className={`pt-2 border-t ${
            isDarkMode ? 'border-white/[0.04]' : 'border-black/[0.04]'
          }`}>
            <h2 className={`text-xs font-bold tracking-wider uppercase ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {customization?.appName || 'E-Absensi'}
            </h2>
            <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {customization?.appSubtitle || 'Sekolah Digital'}
            </p>
          </div>
        </div>

        {/* Quick Login Simulator for Demo Mode - beautifully styled with neumorphic buttons */}
        {isDemoMode !== false && (
          <div className={`p-3 rounded-2xl border space-y-2 ${
            isDarkMode
              ? 'bg-[#0a121e]/40 border-white/[0.01] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]'
              : 'bg-[#dce3f0]/60 border-white/30 shadow-[inset_1px_1px_3px_#c8d0e0]'
          }`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider text-center ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Uji Coba Cepat (Mode Demo)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className={`flex items-center justify-center gap-1 p-2 rounded-xl border transition-all cursor-pointer text-[10px] font-semibold ${
                  isDarkMode
                    ? 'bg-[#111e32] border-white/[0.02] text-slate-300 hover:text-white shadow-[3px_3px_6px_rgba(0,0,0,0.5),_-2px_-2px_6px_rgba(255,255,255,0.02)] active:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]'
                    : 'bg-[#e6ebf4] border-white/60 text-[#1e293b] hover:text-[#1e293b] shadow-[2px_2px_5px_#c8d0e0,_-2px_-2px_5px_#ffffff] active:shadow-[inset_1px_1px_3px_#c8d0e0]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('guru', 'guru123')}
                className={`flex items-center justify-center gap-1 p-2 rounded-xl border transition-all cursor-pointer text-[10px] font-semibold ${
                  isDarkMode
                    ? 'bg-[#111e32] border-white/[0.02] text-slate-300 hover:text-white shadow-[3px_3px_6px_rgba(0,0,0,0.5),_-2px_-2px_6px_rgba(255,255,255,0.02)] active:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]'
                    : 'bg-[#e6ebf4] border-white/60 text-[#1e293b] hover:text-[#1e293b] shadow-[2px_2px_5px_#c8d0e0,_-2px_-2px_5px_#ffffff] active:shadow-[inset_1px_1px_3px_#c8d0e0]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Guru</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username/Email address field - debossed inner shadow container matching the image */}
          <div className="space-y-1">
            <label className={`block text-[9px] font-bold uppercase tracking-wider pl-1 ${
              isDarkMode ? 'text-slate-400' : 'text-[#8a9bb4]'
            }`}>
              Username / Email
            </label>
            <div className={`relative flex items-center rounded-[22px] px-3.5 py-3 transition-all border ${
              isDarkMode
                ? 'bg-[#0a121e] border-white/[0.01] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),_inset_-2px_-2px_5px_rgba(255,255,255,0.03)] focus-within:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),_inset_-2px_-2px_5px_rgba(255,255,255,0.03),_0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'bg-[#e6ebf4] border-white/20 shadow-[inset_3px_3px_6px_#c8d0e0,_inset_-3px_-3px_6px_#ffffff] focus-within:shadow-[inset_3px_3px_6px_#c8d0e0,_inset_-3px_-3px_6px_#ffffff,_0_0_0_1px_rgba(59,130,246,0.25)]'
            }`}>
              <span className={`mr-2.5 pointer-events-none ${
                isDarkMode ? 'text-slate-500' : 'text-[#8a9bb4]'
              }`}>
                <User className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Email address"
                style={{
                  WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                  WebkitTextFillColor: isDarkMode ? '#f1f5f9' : '#1e293b',
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  caretColor: isDarkMode ? '#60a5fa' : '#2563eb',
                }}
                className={`w-full bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-[11px] ${
                  isDarkMode ? 'text-slate-100 placeholder-slate-500' : 'text-[#1e293b] placeholder-[#8a9bb4]'
                }`}
              />
            </div>
          </div>

          {/* Password field - debossed inner shadow container matching the image */}
          <div className="space-y-1">
            <label className={`block text-[9px] font-bold uppercase tracking-wider pl-1 ${
              isDarkMode ? 'text-slate-400' : 'text-[#8a9bb4]'
            }`}>
              Password
            </label>
            <div className={`relative flex items-center rounded-[22px] px-3.5 py-3 transition-all border ${
              isDarkMode
                ? 'bg-[#0a121e] border-white/[0.01] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),_inset_-2px_-2px_5px_rgba(255,255,255,0.03)] focus-within:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),_inset_-2px_-2px_5px_rgba(255,255,255,0.03),_0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'bg-[#e6ebf4] border-white/20 shadow-[inset_3px_3px_6px_#c8d0e0,_inset_-3px_-3px_6px_#ffffff] focus-within:shadow-[inset_3px_3px_6px_#c8d0e0,_inset_-3px_-3px_6px_#ffffff,_0_0_0_1px_rgba(59,130,246,0.25)]'
            }`}>
              <span className={`mr-2.5 pointer-events-none ${
                isDarkMode ? 'text-slate-500' : 'text-[#8a9bb4]'
              }`}>
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Password"
                style={{
                  WebkitBoxShadow: '0 0 0px 1000px transparent inset',
                  WebkitTextFillColor: isDarkMode ? '#f1f5f9' : '#1e293b',
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  caretColor: isDarkMode ? '#60a5fa' : '#2563eb',
                }}
                className={`w-full bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-[11px] pr-8 ${
                  isDarkMode ? 'text-slate-100 placeholder-slate-500' : 'text-[#1e293b] placeholder-[#8a9bb4]'
                }`}
              />
              {/* Embossed soft action button for eye icon as seen in the image */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#111e32] border-white/[0.02] shadow-[2px_2px_5px_rgba(0,0,0,0.4),_-2px_-2px_5px_rgba(255,255,255,0.03)] active:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)] text-slate-400 hover:text-slate-200'
                    : 'bg-[#e6ebf4] border-white/60 shadow-[2px_2px_5px_#c8d0e0,_-2px_-2px_5px_#ffffff] active:shadow-[inset_1px_1px_3px_#c8d0e0] text-[#8a9bb4] hover:text-[#1e293b]'
                }`}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Submit Button - Gradient for Dark, elegant raised neumorphic for Light matching the image */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 font-bold rounded-[20px] text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] mt-4 ${
              isDarkMode
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[4px_4px_10px_rgba(3,8,17,0.5)]'
                : 'bg-[#e6ebf4] text-[#1e293b] shadow-[4px_4px_8px_#c8d0e0,_-4px_-4px_8px_#ffffff] hover:bg-[#e0e8f6] hover:shadow-[2px_2px_4px_#c8d0e0,_-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#c8d0e0,_inset_-2px_-2px_4px_#ffffff]'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Sign In</span>
          </button>
        </form>
      </div>
    </>
  );
}

