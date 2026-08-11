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
  status?: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  keterangan?: string;
}

export interface AttendanceRecord {
  rowIndex: number | string;
  tanggal: string;
  waktu: string;
  kelas: string;
  mapel: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  keterangan: string;
  guru: string;
  photo?: string;
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
  | 'izin-guru'
  | 'riwayat'
  | 'crud-guru'
  | 'crud-siswa'
  | 'crud-kelas'
  | 'crud-mapel'
  | 'customization'
  | 'apps-script'
  | 'absen-tendik'
  | 'izin-tendik';

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
}

export interface CrudRow {
  _rowIndex: number;
  data: string[];
}
