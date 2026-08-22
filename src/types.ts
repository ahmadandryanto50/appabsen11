/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  nip?: string;
  nama: string;
  username: string;
  role: 'Admin Utama' | 'Admin' | 'Guru' | 'Tendik';
  status?: string;
  photo?: string;
}

export interface Student {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  gender?: string;
  status?: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa';
  keterangan?: string;
  menitTerlambat?: number;
}

export interface AttendanceRecord {
  rowIndex: number | string;
  tanggal: string;
  waktu: string;
  kelas: string;
  mapel: string;
  hadir: number;
  terlambat?: number;
  sakit: number;
  izin: number;
  alpa: number;
  keterangan: string;
  guru: string;
  photo?: string;
}

export interface KioskScanRecord {
  rowIndex?: number | string;
  timestamp: string;
  tanggal?: string;
  waktu?: string;
  nisn: string;
  nama: string;
  kelas: string;
  status: string; // 'Hadir' | 'Terlambat'
  keterlambatan: string; // e.g. '15 menit' or '-'
  menitTerlambat?: number;
}

export interface TeacherAbsenceRecord {
  rowIndex: number | string;
  tanggal: string;
  waktu: string;
  nip: string;
  namaGuru: string;
  status: string;
  alasan: string;
}

export interface TendikAttendanceRecord {
  rowIndex: number | string;
  tanggal: string;
  waktu: string;
  nip: string;
  namaTendik: string;
  photo?: string;
}

export interface GuruAttendanceRecord {
  rowIndex: number | string;
  tanggal: string;
  waktu: string;
  nip: string;
  namaGuru: string;
  tipeAbsen?: string;
  photo?: string;
}

export interface TendikAbsenceRecord {
  rowIndex: number | string;
  tanggal: string;
  waktu: string;
  nip: string;
  namaTendik: string;
  status: string;
  alasan: string;
  photo?: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export type ViewType =
  | 'dashboard'
  | 'absen-siswa'
  | 'absen-guru'
  | 'izin-guru'
  | 'riwayat'
  | 'crud-guru'
  | 'crud-siswa'
  | 'crud-kelas'
  | 'crud-mapel'
  | 'customization'
  | 'apps-script'
  | 'absen-tendik'
  | 'izin-tendik'
  | 'kiosk-scanner'
  | 'cetak-barcode'
  | 'hari-libur';

export interface ExternalAppItem {
  id: string;
  name: string;
  url: string;
  description: string;
  category?: string;
  badge?: string;
}

export interface AppCustomization {
  appName: string;
  appSubtitle: string;
  logoEmoji: string;
  logoColor: string;
  fullAccessUsernames: string[];
  logoUrl?: string;
  userPhotos?: Record<string, string>;
  kepalaSekolahNama?: string;
  kepalaSekolahNip?: string;
  batasWaktuMasuk?: string;
  externalApps?: ExternalAppItem[];
  holidays?: any[];
}

export interface CrudRow {
  _rowIndex: number;
  data: string[];
}

export function getLocalDateString(d: Date | string | number = new Date()): string {
  if (!d) return '';

  if (typeof d === 'string') {
    const trimmed = d.trim();
    // If string starts with YYYY-MM-DD (e.g. 2026-08-20 or 2026-08-20T...), extract directly to avoid UTC shift
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }
    const dObj = new Date(trimmed);
    if (isNaN(dObj.getTime())) {
      return trimmed.split('T')[0] || trimmed;
    }
    d = dObj;
  } else if (typeof d === 'number') {
    d = new Date(d);
  }

  const targetDate = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();

  // Explicitly use WITA (Asia/Makassar, UTC+8) for Palu / Central Sulawesi
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(targetDate);
    let day = '', month = '', year = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
    }
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (e) {}

  // Fallback with explicit WITA (UTC+8) offset in minutes
  const tzOffset = 8 * 60;
  const localMs = targetDate.getTime() + (targetDate.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localMs);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(d: Date | string | number = new Date()): string {
  if (!d) return '';

  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return trimmed;
    }
    const dObj = new Date(trimmed);
    if (isNaN(dObj.getTime())) {
      return trimmed;
    }
    d = dObj;
  } else if (typeof d === 'number') {
    d = new Date(d);
  }

  const targetDate = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();

  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(targetDate);
    let hour = '', minute = '', second = '';
    for (const p of parts) {
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'second') second = p.value;
    }
    if (hour && minute && second) {
      return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    }
  } catch (e) {}

  // Fallback with explicit WITA (UTC+8) offset
  const tzOffset = 8 * 60;
  const localMs = targetDate.getTime() + (targetDate.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localMs);
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

