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
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

