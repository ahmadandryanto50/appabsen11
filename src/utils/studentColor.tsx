import React from 'react';
import { Student, CrudRow } from '../types';

export interface StudentColorInfo {
  isPondok: boolean;
  tipe: string;
  originalName: string;
  cleanName: string;
  textColor?: string;
  bgColor?: string;
  fontColor?: string;
  badgeLabel: string;
  hasCustomColor: boolean;
}

// Preset color options for student categories/tags
export const STUDENT_COLOR_PRESETS = [
  { id: 'pondok_emerald', name: 'Hijau Pondok (Emerald)', hex: '#059669', bgHex: '#ecfdf5', borderHex: '#a7f3d0' },
  { id: 'pondok_teal', name: 'Teal Santri', hex: '#0d9488', bgHex: '#f0fdfa', borderHex: '#99f6e4' },
  { id: 'blue_reguler', name: 'Biru Reguler', hex: '#2563eb', bgHex: '#eff6ff', borderHex: '#bfdbfe' },
  { id: 'amber_khusus', name: 'Kuning Amber', hex: '#d97706', bgHex: '#fffbeb', borderHex: '#fde68a' },
  { id: 'purple_asrama', name: 'Ungu Asrama', hex: '#7c3aed', bgHex: '#f5f3ff', borderHex: '#ddd6fe' },
  { id: 'rose_khusus', name: 'Merah Muda (Rose)', hex: '#e11d48', bgHex: '#fff1f2', borderHex: '#fecdd3' },
];

/**
 * Robust extractor of student identity, color, and pondok affiliation.
 * Supports Google Sheets cell fontColor/bgColor, column 7 (Tipe Siswa), and name markers.
 */
export function getStudentColorInfo(
  studentOrName: any,
  secondaryData?: any,
  fontColorParam?: string,
  bgColorParam?: string
): StudentColorInfo {
  let rawName = '';
  let tipe = '';
  let fontColor = fontColorParam || '';
  let bgColor = bgColorParam || '';

  if (typeof studentOrName === 'string') {
    rawName = studentOrName;
    if (typeof secondaryData === 'string') {
      tipe = secondaryData;
    } else if (Array.isArray(secondaryData)) {
      tipe = secondaryData[6] || '';
      fontColor = fontColor || secondaryData[7] || '';
      bgColor = bgColor || secondaryData[8] || '';
    }
  } else if (studentOrName && typeof studentOrName === 'object') {
    // Could be Student object or CrudRow or KioskScanRecord
    if (Array.isArray(studentOrName.data)) {
      // CrudRow
      rawName = studentOrName.data[2] || '';
      tipe = studentOrName.data[6] || '';
      fontColor = fontColor || studentOrName.fontColor || studentOrName.data[7] || '';
      bgColor = bgColor || studentOrName.bgColor || studentOrName.data[8] || '';
    } else {
      // Student or similar
      rawName = studentOrName.nama || studentOrName.studentName || studentOrName.name || '';
      tipe = studentOrName.tipe || studentOrName.kategori || studentOrName.asal || '';
      fontColor = fontColor || studentOrName.fontColor || studentOrName.warna || '';
      bgColor = bgColor || studentOrName.bgColor || '';
    }
  }

  const cleanRawName = String(rawName || '').trim();
  const lowerName = cleanRawName.toLowerCase();
  const lowerTipe = String(tipe || '').toLowerCase();

  // Detect if Pondok/Santri
  const isPondokByName =
    lowerName.includes('(pondok)') ||
    lowerName.includes('[pondok]') ||
    lowerName.includes(' pondok') ||
    lowerName.startsWith('pondok ') ||
    lowerName.includes('(santri)') ||
    lowerName.includes('[santri]') ||
    lowerName.includes(' santri') ||
    lowerName.includes('(asrama)') ||
    lowerName.includes('[asrama]');

  const isPondokByTipe =
    lowerTipe.includes('pondok') ||
    lowerTipe.includes('santri') ||
    lowerTipe.includes('asrama') ||
    lowerTipe.includes('pesantren');

  // Check if saved in localStorage quick tags
  let isPondokByCache = false;
  try {
    const pondokListRaw = localStorage.getItem('absensi_pondok_names');
    if (pondokListRaw) {
      const list = JSON.parse(pondokListRaw);
      if (Array.isArray(list) && list.includes(cleanRawName)) {
        isPondokByCache = true;
      }
    }
  } catch (e) {}

  const isPondok = isPondokByName || isPondokByTipe || isPondokByCache;

  // Clean name without trailing tags for neat display
  let cleanName = cleanRawName
    .replace(/\(pondok\)/gi, '')
    .replace(/\[pondok\]/gi, '')
    .replace(/\(santri\)/gi, '')
    .replace(/\[santri\]/gi, '')
    .replace(/\(asrama\)/gi, '')
    .replace(/\[asrama\]/gi, '')
    .trim();

  if (!cleanName) cleanName = cleanRawName;

  // Determine final badge and colors
  let badgeLabel = '';
  let finalTextColor = fontColor;
  let finalBgColor = bgColor;
  let hasCustomColor = !!(fontColor || bgColor);

  if (isPondok) {
    badgeLabel = 'Pondok';
    if (!finalTextColor) {
      finalTextColor = '#047857'; // Emerald 700
    }
    hasCustomColor = true;
  } else if (tipe && tipe.trim()) {
    badgeLabel = tipe.trim();
  }

  return {
    isPondok,
    tipe: isPondok ? (tipe || 'Pondok') : (tipe || 'Reguler'),
    originalName: cleanRawName,
    cleanName,
    textColor: finalTextColor || undefined,
    bgColor: finalBgColor || undefined,
    fontColor: fontColor || undefined,
    badgeLabel,
    hasCustomColor,
  };
}

interface StudentNameBadgeProps {
  student?: any;
  name?: string;
  tipe?: string;
  fontColor?: string;
  bgColor?: string;
  nisn?: string;
  showBadge?: boolean;
  className?: string;
  nameClassName?: string;
  badgeClassName?: string;
  subText?: React.ReactNode;
}

export function StudentNameBadge({
  student,
  name,
  tipe,
  fontColor,
  bgColor,
  nisn,
  showBadge = true,
  className = '',
  nameClassName = '',
  badgeClassName = '',
  subText,
}: StudentNameBadgeProps) {
  const info = getStudentColorInfo(student || name, tipe, fontColor, bgColor);

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span
          style={{ color: info.textColor }}
          className={`font-bold transition-colors ${
            info.isPondok
              ? 'text-emerald-700 dark:text-emerald-400'
              : info.hasCustomColor
              ? ''
              : 'text-slate-800'
          } ${nameClassName}`}
        >
          {info.cleanName || name || 'Siswa'}
        </span>

        {showBadge && info.isPondok && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 ${badgeClassName}`}
            title="Siswa dari Pondok Pesantren"
          >
            <span className="text-[10px]">🕌</span>
            <span>Pondok</span>
          </span>
        )}

        {showBadge && !info.isPondok && info.badgeLabel && info.badgeLabel.toLowerCase() !== 'reguler' && (
          <span
            style={{
              color: info.textColor,
              backgroundColor: info.bgColor || undefined,
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 ${badgeClassName}`}
          >
            {info.badgeLabel}
          </span>
        )}
      </div>

      {subText && <div className="mt-0.5">{subText}</div>}
    </div>
  );
}
