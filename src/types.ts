/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  nip?: string;
  nama: string;
  username: string;
  role: 'Admin' | 'Guru' | 'Tendik';
  status?: string;
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
  | 'cetak-barcode';

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
}

export interface CrudRow {
  _rowIndex: number;
  data: string[];
}

export function getLocalDateString(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
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

  const tzOffset = 7 * 60; // WIB UTC+7 in minutes
  const localMs = d.getTime() + (d.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localMs);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
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

  const tzOffset = 7 * 60;
  const localMs = d.getTime() + (d.getTimezoneOffset() + tzOffset) * 60000;
  const localDate = new Date(localMs);
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

