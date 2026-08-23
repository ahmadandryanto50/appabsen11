import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AppCustomization } from '../types';
import { MonitorSmartphone, Database, Globe, Home, Info, IdCard, Users, Wallet, Archive, LayoutGrid, ShieldCheck, Box, BookOpen, Layers, Laptop, Settings, X, Save, Link } from 'lucide-react';

interface PintasDapodikViewProps {
  customization?: AppCustomization;
  onSaveCustomization?: (customization: AppCustomization) => Promise<{ status: string; message?: string }>;
  onAddToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface DapodikLink {
  title: string;
  url: string;
  icon: React.ReactNode;
  color: string;
  iconColor: string;
}

const dapodikLinks: DapodikLink[] = [
  { title: 'Login Dapodik', url: 'https://dapo.kemdikbud.go.id/login', icon: <MonitorSmartphone className="w-5 h-5" />, color: 'bg-indigo-500', iconColor: 'text-indigo-500' },
  { title: 'PTK Datadik', url: 'https://ptk.datadik.kemdikbud.go.id/', icon: <Database className="w-5 h-5" />, color: 'bg-pink-500', iconColor: 'text-pink-500' },
  { title: 'Area Member', url: 'https://dapo.kemdikbud.go.id/unduhan', icon: <Globe className="w-5 h-5" />, color: 'bg-indigo-600', iconColor: 'text-indigo-600' },
  { title: 'SP Datadik', url: 'https://sp.datadik.kemdikbud.go.id/', icon: <Home className="w-5 h-5" />, color: 'bg-blue-500', iconColor: 'text-blue-500' },
  { title: 'Info GTK', url: 'https://info.gtk.kemdikbud.go.id/', icon: <Info className="w-5 h-5" />, color: 'bg-sky-400', iconColor: 'text-sky-400' },
  { title: 'Prefill 1', url: 'https://dapo.kemdikbud.go.id/unduhan', icon: <Archive className="w-5 h-5" />, color: 'bg-blue-600', iconColor: 'text-blue-600' },
  { title: 'Verval PD', url: 'https://vervalpd.data.kemdikbud.go.id/', icon: <Users className="w-5 h-5" />, color: 'bg-pink-600', iconColor: 'text-pink-600' },
  { title: 'NISN', url: 'https://nisn.data.kemdikbud.go.id/', icon: <IdCard className="w-5 h-5" />, color: 'bg-orange-500', iconColor: 'text-orange-500' },
  { title: 'Prefill 2', url: 'https://dapo.kemdikbud.go.id/unduhan', icon: <Archive className="w-5 h-5" />, color: 'bg-blue-500', iconColor: 'text-blue-500' },
  { title: 'Verval PTK', url: 'https://vervalptk.data.kemdikbud.go.id/', icon: <LayoutGrid className="w-5 h-5" />, color: 'bg-amber-400 text-slate-800', iconColor: 'text-amber-500' },
  { title: 'BOSP Salur', url: 'https://bos.kemdikbud.go.id/', icon: <Wallet className="w-5 h-5" />, color: 'bg-teal-500', iconColor: 'text-teal-500' },
  { title: 'Login SDM', url: 'https://sdm.data.kemdikbud.go.id/', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-sky-500', iconColor: 'text-sky-500' },
  { title: 'Verval SP', url: 'https://vervalsp.data.kemdikbud.go.id/', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-indigo-500', iconColor: 'text-indigo-500' },
  { title: 'RSDM', url: 'https://sdm.data.kemdikbud.go.id/', icon: <Box className="w-5 h-5" />, color: 'bg-amber-600', iconColor: 'text-amber-600' },
  { title: 'Web Dapodik', url: 'https://dapo.kemdikbud.go.id/', icon: <Laptop className="w-5 h-5" />, color: 'bg-red-500', iconColor: 'text-red-500' },
];

export function PintasDapodikView({ customization, onSaveCustomization, onAddToast }: PintasDapodikViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [linksState, setLinksState] = useState<Record<string, string>>(customization?.dapodikLinks || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenSettings = () => {
    setLinksState(customization?.dapodikLinks || {});
    setShowSettings(true);
  };

  const handleLinkChange = (title: string, value: string) => {
    setLinksState(prev => ({
      ...prev,
      [title]: value
    }));
  };

  const handleSave = async () => {
    if (!onSaveCustomization || !customization) return;
    setIsSaving(true);
    
    try {
      const newCustomization = {
        ...customization,
        dapodikLinks: linksState
      };
      
      const res = await onSaveCustomization(newCustomization);
      if (res.status === 'success') {
        if (onAddToast) onAddToast('Tautan Pintas Dapodik berhasil disimpan.', 'success');
        setShowSettings(false);
      } else {
        if (onAddToast) onAddToast(res.message || 'Gagal menyimpan tautan.', 'error');
      }
    } catch (e: any) {
      if (onAddToast) onAddToast(e.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Portal Pintasan Dapodik
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Kumpulan tautan cepat ke berbagai layanan Data Pokok Pendidikan dan aplikasi terkait.
            </p>
          </div>
          <button
            onClick={handleOpenSettings}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Settings className="w-4 h-4" />
            Pengaturan Link
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dapodikLinks.map((link, index) => {
            const isDarkText = link.color.includes('amber-400');
            const customUrl = customization?.dapodikLinks?.[link.title];
            const finalUrl = (customUrl && customUrl.trim() !== '') ? customUrl : link.url;
            
            return (
              <motion.a
                key={link.title}
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${link.color} ${isDarkText ? 'text-slate-800' : 'text-white'} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer`}
              >
                <div className={`bg-white rounded-lg p-2.5 flex items-center justify-center ${link.iconColor}`}>
                  {link.icon}
                </div>
                <span className="font-bold text-[15px]">{link.title}</span>
              </motion.a>
            );
          })}
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800">Atur Tautan Pintasan</h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Kosongkan form jika ingin menggunakan link bawaan (default).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {dapodikLinks.map((link) => (
                <div key={link.title} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <div className={`p-1 bg-white rounded flex items-center justify-center ${link.iconColor} border border-slate-100`}>
                        {link.icon}
                      </div>
                      {link.title}
                    </label>
                    <input
                      type="url"
                      placeholder={`Default: ${link.url}`}
                      value={linksState[link.title] || ''}
                      onChange={(e) => handleLinkChange(link.title, e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Menyimpan...' : 'Simpan Tautan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
