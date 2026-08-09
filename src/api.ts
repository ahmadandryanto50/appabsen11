/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, AttendanceRecord, TeacherAbsenceRecord } from './types';

// Pre-seeded local data keys
const STORAGE_KEYS = {
  APP_URL: 'absensi_gas_url',
  USER: 'absensi_user',
  HISTORY_SISWA: 'absensi_history_siswa',
  HISTORY_GURU: 'absensi_history_guru',
  MASTER_GURU: 'absensi_master_guru',
  MASTER_SISWA: 'absensi_master_siswa',
  MASTER_KELAS: 'absensi_master_kelas',
  MASTER_MAPEL: 'absensi_master_mapel',
};

// Seed realistic default data if not already present
export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.MASTER_GURU)) {
    const defaultGuru = [
      { _rowIndex: 2, data: ['G01', '19850101201001', 'Administrator Utama', 'admin', 'Admin', 'Aktif'] },
      { _rowIndex: 3, data: ['G02', '19900202201502', 'Budi Santoso, S.Pd.', 'guru', 'Guru', 'Aktif'] },
      { _rowIndex: 4, data: ['G03', '19920815201803', 'Siti Rahma, M.Pd.', 'sitirahma', 'Guru', 'Aktif'] },
      { _rowIndex: 5, data: ['G04', '19881112201201', 'Hendra Wijaya, S.Si.', 'hendra', 'Guru', 'Aktif'] },
    ];
    localStorage.setItem(STORAGE_KEYS.MASTER_GURU, JSON.stringify(defaultGuru));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MASTER_SISWA)) {
    const defaultSiswa = [
      { _rowIndex: 2, data: ['S01', '0051234561', 'Ahmad Rizky', 'X-A', 'Laki-laki', 'Aktif'] },
      { _rowIndex: 3, data: ['S02', '0051234562', 'Anisa Putri', 'X-A', 'Perempuan', 'Aktif'] },
      { _rowIndex: 4, data: ['S03', '0051234563', 'Bagus Pratama', 'X-A', 'Laki-laki', 'Aktif'] },
      { _rowIndex: 5, data: ['S04', '0051234564', 'Citra Dewi', 'X-A', 'Perempuan', 'Aktif'] },
      { _rowIndex: 6, data: ['S05', '0062345671', 'Dani Ramadhan', 'X-B', 'Laki-laki', 'Aktif'] },
      { _rowIndex: 7, data: ['S06', '0062345672', 'Eka Susanti', 'X-B', 'Perempuan', 'Aktif'] },
      { _rowIndex: 8, data: ['S07', '0062345673', 'Fahmi Idris', 'X-B', 'Laki-laki', 'Aktif'] },
      { _rowIndex: 9, data: ['S08', '0043456781', 'Gita Permata', 'XI-A', 'Perempuan', 'Aktif'] },
      { _rowIndex: 10, data: ['S09', '0043456782', 'Hadi Sucipto', 'XI-A', 'Laki-laki', 'Aktif'] },
      { _rowIndex: 11, data: ['S10', '0043456783', 'Indah Lestari', 'XI-A', 'Perempuan', 'Aktif'] },
      { _rowIndex: 12, data: ['S11', '0034567891', 'Jaka Samudra', 'XII-A', 'Laki-laki', 'Aktif'] },
      { _rowIndex: 13, data: ['S12', '0034567892', 'Kartika Sari', 'XII-A', 'Perempuan', 'Aktif'] },
    ];
    localStorage.setItem(STORAGE_KEYS.MASTER_SISWA, JSON.stringify(defaultSiswa));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MASTER_KELAS)) {
    const defaultKelas = [
      { _rowIndex: 2, data: ['K01', 'X-A', 'Ruang A1 (Lantai 1)', 'Aktif'] },
      { _rowIndex: 3, data: ['K02', 'X-B', 'Ruang A2 (Lantai 1)', 'Aktif'] },
      { _rowIndex: 4, data: ['K03', 'XI-A', 'Ruang B1 (Lantai 2)', 'Aktif'] },
      { _rowIndex: 5, data: ['K04', 'XI-B', 'Ruang B2 (Lantai 2)', 'Aktif'] },
      { _rowIndex: 6, data: ['K05', 'XII-A', 'Ruang C1 (Lantai 3)', 'Aktif'] },
      { _rowIndex: 7, data: ['K06', 'XII-B', 'Ruang C2 (Lantai 3)', 'Aktif'] },
    ];
    localStorage.setItem(STORAGE_KEYS.MASTER_KELAS, JSON.stringify(defaultKelas));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MASTER_MAPEL)) {
    const defaultMapel = [
      { _rowIndex: 2, data: ['M01', 'Matematika', 'Kelompok A', 'Aktif'] },
      { _rowIndex: 3, data: ['M02', 'Bahasa Indonesia', 'Kelompok A', 'Aktif'] },
      { _rowIndex: 4, data: ['M03', 'Bahasa Inggris', 'Kelompok A', 'Aktif'] },
      { _rowIndex: 5, data: ['M04', 'Informatika', 'Kelompok B', 'Aktif'] },
      { _rowIndex: 6, data: ['M05', 'Fisika', 'Peminatan IPA', 'Aktif'] },
      { _rowIndex: 7, data: ['M06', 'Biologi', 'Peminatan IPA', 'Aktif'] },
      { _rowIndex: 8, data: ['M07', 'Kimia', 'Peminatan IPA', 'Aktif'] },
      { _rowIndex: 9, data: ['M08', 'Sejarah', 'Kelompok A', 'Aktif'] },
    ];
    localStorage.setItem(STORAGE_KEYS.MASTER_MAPEL, JSON.stringify(defaultMapel));
  }

  if (!localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA)) {
    const today = new Date().toISOString().split('T')[0];
    const defaultHistorySiswa: AttendanceRecord[] = [
      {
        rowIndex: 2,
        tanggal: today,
        waktu: '07:30:00',
        kelas: 'X-A',
        mapel: 'Matematika',
        hadir: 28,
        sakit: 1,
        izin: 1,
        alpa: 0,
        keterangan: 'Sakit: Anisa Putri (Demam); Izin: Bagus Pratama (Acara Keluarga)',
        guru: 'Budi Santoso, S.Pd.',
      },
      {
        rowIndex: 3,
        tanggal: today,
        waktu: '09:00:00',
        kelas: 'X-B',
        mapel: 'Bahasa Indonesia',
        hadir: 30,
        sakit: 0,
        izin: 0,
        alpa: 0,
        keterangan: 'Semua siswa hadir (100%)',
        guru: 'Siti Rahma, M.Pd.',
      },
      {
        rowIndex: 4,
        tanggal: '2026-08-07',
        waktu: '08:15:00',
        kelas: 'XI-A',
        mapel: 'Informatika',
        hadir: 27,
        sakit: 0,
        izin: 1,
        alpa: 1,
        keterangan: 'Izin: Gita Permata (Dispensasi Lomba); Alpa: Hadi Sucipto (Tanpa Kabar)',
        guru: 'Hendra Wijaya, S.Si.',
      }
    ];
    localStorage.setItem(STORAGE_KEYS.HISTORY_SISWA, JSON.stringify(defaultHistorySiswa));
  }

  if (!localStorage.getItem(STORAGE_KEYS.HISTORY_GURU)) {
    const today = new Date().toISOString().split('T')[0];
    const defaultHistoryGuru: TeacherAbsenceRecord[] = [
      {
        rowIndex: 2,
        tanggal: today,
        waktu: '07:15:00',
        nip: '19920815201803',
        namaGuru: 'Siti Rahma, M.Pd.',
        status: 'Sakit',
        alasan: 'Demam tinggi dan disarankan dokter istirahat total selama 2 hari',
      }
    ];
    localStorage.setItem(STORAGE_KEYS.HISTORY_GURU, JSON.stringify(defaultHistoryGuru));
  }
}

// Low-level HTTP Caller to Google Apps Script Web App (POST text/plain)
async function callGAS(url: string, action: string, data: any = {}) {
  try {
    const body = JSON.stringify({ action, ...data });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: body,
    });
    return await response.json();
  } catch (err: any) {
    console.error('GAS API Error:', err);
    throw new Error(err.message || 'Gagal menghubungi server database');
  }
}

// MAIN API CLIENT
export const apiClient = {
  getBackendUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.APP_URL) || '';
  },

  setBackendUrl(url: string) {
    if (url.trim()) {
      localStorage.setItem(STORAGE_KEYS.APP_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.APP_URL);
    }
  },

  isDemoMode(): boolean {
    return !this.getBackendUrl();
  },

  // 1. LOGIN
  async login(username: string, passwordInput: string) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'login', { username, password: passwordInput });
    }

    // Demo Mode Logic
    const rawGuru = localStorage.getItem(STORAGE_KEYS.MASTER_GURU) || '[]';
    const gurus = JSON.parse(rawGuru);
    const matched = gurus.find((g: any) => g.data[3] === username);

    if (username === 'admin' && passwordInput === 'admin123') {
      return {
        status: 'success',
        user: { id: 'G01', nama: 'Administrator Utama', username: 'admin', role: 'Admin' },
      };
    } else if (username === 'guru' && passwordInput === 'guru123') {
      return {
        status: 'success',
        user: { id: 'G02', nip: '19900202201502', nama: 'Budi Santoso, S.Pd.', username: 'guru', role: 'Guru' },
      };
    } else if (matched) {
      return {
        status: 'success',
        user: {
          id: matched.data[0],
          nip: matched.data[1],
          nama: matched.data[2],
          username: matched.data[3],
          role: matched.data[4],
        },
      };
    }

    return { status: 'error', message: 'Username atau Password salah!' };
  },

  // 2. GET STUDENTS BY CLASS
  async getStudents(kelas: string): Promise<{ status: string; students: Student[] }> {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'getStudents', { kelas });
    }

    // Demo Mode
    const rawStudents = localStorage.getItem(STORAGE_KEYS.MASTER_SISWA) || '[]';
    const parsed: any[] = JSON.parse(rawStudents);
    const filtered = parsed
      .filter((s) => s.data[3] === kelas && s.data[5] === 'Aktif')
      .map((s) => ({
        id: s.data[0],
        nisn: s.data[1],
        nama: s.data[2],
        kelas: s.data[3],
        gender: s.data[4],
      }));

    // Fallback if class has no students yet to make it interactive
    if (filtered.length === 0) {
      return {
        status: 'success',
        students: [
          { id: 'S901', nisn: '0051239991', nama: `Siswa A ${kelas}`, kelas },
          { id: 'S902', nisn: '0051239992', nama: `Siswa B ${kelas}`, kelas },
          { id: 'S903', nisn: '0051239993', nama: `Siswa C ${kelas}`, kelas },
        ],
      };
    }

    return { status: 'success', students: filtered };
  },

  // 3. SUBMIT CLASS ATTENDANCE
  async submitAttendance(payload: any) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'submitAttendance', { payload });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA) || '[]';
    const history: AttendanceRecord[] = JSON.parse(rawHistory);

    const newRecord: AttendanceRecord = {
      rowIndex: Date.now(),
      tanggal: payload.tanggal,
      waktu: payload.waktu,
      kelas: payload.kelas,
      mapel: payload.mapel,
      hadir: payload.countHadir,
      sakit: payload.countSakit,
      izin: payload.countIzin,
      alpa: payload.countAlpa,
      keterangan: payload.keterangan,
      guru: payload.guruPengampu,
      photo: payload.photoBase64 || "",
    };

    history.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.HISTORY_SISWA, JSON.stringify(history));
    return { status: 'success' };
  },

  // 4. SUBMIT TEACHER ABSENCE / SICK PERMIT
  async submitTeacherAbsence(payload: any) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'submitTeacherAbsence', { payload });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU) || '[]';
    const history: TeacherAbsenceRecord[] = JSON.parse(rawHistory);

    const newRecord: TeacherAbsenceRecord = {
      rowIndex: Date.now(),
      tanggal: payload.tanggal,
      waktu: payload.waktu,
      nip: payload.nip,
      namaGuru: payload.namaGuru,
      status: payload.status,
      alasan: payload.alasan,
    };

    history.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.HISTORY_GURU, JSON.stringify(history));
    return { status: 'success' };
  },

  // 5. GET ATTENDANCE HISTORY (WITH FILTERS)
  async getAttendanceHistory(tanggal: string, kelas: string): Promise<{ status: string; history: AttendanceRecord[] }> {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'getAttendanceHistory', { tanggal, kelas });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA) || '[]';
    let history: AttendanceRecord[] = JSON.parse(rawHistory);

    if (tanggal) {
      history = history.filter((h) => h.tanggal === tanggal);
    }
    if (kelas) {
      history = history.filter((h) => h.kelas === kelas);
    }

    return { status: 'success', history };
  },

  // 6. GET TEACHER ABSENCE HISTORY
  async getTeacherAbsenceHistory(tanggal: string): Promise<{ status: string; history: TeacherAbsenceRecord[] }> {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'getTeacherAbsenceHistory', { tanggal });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU) || '[]';
    let history: TeacherAbsenceRecord[] = JSON.parse(rawHistory);

    if (tanggal) {
      history = history.filter((h) => h.tanggal === tanggal);
    }

    return { status: 'success', history };
  },

  // 7. UPDATE SINGLE RECORD IN STUDENT ATTENDANCE HISTORY
  async updateAttendanceRecord(rowIndex: string | number, newStatus: string, newKeterangan: string) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'updateAttendanceRecord', { rowIndex, newStatus, newKeterangan });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA) || '[]';
    const history: AttendanceRecord[] = JSON.parse(rawHistory);

    const index = history.findIndex((h) => String(h.rowIndex) === String(rowIndex));
    if (index !== -1) {
      history[index].keterangan = newKeterangan;
      // We don't recalculate counts easily, but we update the notes field or save it
      localStorage.setItem(STORAGE_KEYS.HISTORY_SISWA, JSON.stringify(history));
    }

    return { status: 'success' };
  },

  // 8. GET MASTER DATA (CRUD TABLES)
  async getCrud(sheetName: string): Promise<{ status: string; headers: string[]; rows: any[] }> {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'getCrud', { sheetName });
    }

    // Demo Mode
    let key = '';
    let headers: string[] = [];
    if (sheetName === 'Master_Guru') {
      key = STORAGE_KEYS.MASTER_GURU;
      headers = ['ID', 'NIP', 'Nama Lengkap', 'Username', 'Role', 'Status'];
    } else if (sheetName === 'Master_Siswa') {
      key = STORAGE_KEYS.MASTER_SISWA;
      headers = ['ID', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Status'];
    } else if (sheetName === 'Master_Kelas') {
      key = STORAGE_KEYS.MASTER_KELAS;
      headers = ['ID', 'Nama Kelas', 'Deskripsi/Lokasi', 'Status'];
    } else if (sheetName === 'Master_Mapel') {
      key = STORAGE_KEYS.MASTER_MAPEL;
      headers = ['ID', 'Nama Pelajaran', 'Kelompok', 'Status'];
    }

    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    return { status: 'success', headers, rows };
  },

  // 9. SAVE CRUD ROW (ADD OR EDIT)
  async saveCrud(sheetName: string, rowData: string[], rowIndex: number | null) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'saveCrud', { sheetName, rowData, rowIndex });
    }

    // Demo Mode
    let key = '';
    if (sheetName === 'Master_Guru') key = STORAGE_KEYS.MASTER_GURU;
    else if (sheetName === 'Master_Siswa') key = STORAGE_KEYS.MASTER_SISWA;
    else if (sheetName === 'Master_Kelas') key = STORAGE_KEYS.MASTER_KELAS;
    else if (sheetName === 'Master_Mapel') key = STORAGE_KEYS.MASTER_MAPEL;

    const rows = JSON.parse(localStorage.getItem(key) || '[]');

    if (rowIndex === null) {
      // Create new row
      const newIndex = rows.length > 0 ? Math.max(...rows.map((r: any) => r._rowIndex)) + 1 : 2;
      rows.push({ _rowIndex: newIndex, data: rowData });
    } else {
      // Update existing
      const idx = rows.findIndex((r: any) => r._rowIndex === rowIndex);
      if (idx !== -1) {
        rows[idx].data = rowData;
      }
    }

    localStorage.setItem(key, JSON.stringify(rows));
    return { status: 'success' };
  },

  // 10. DELETE CRUD ROW
  async deleteCrud(sheetName: string, rowIndex: number) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'deleteCrud', { sheetName, rowIndex });
    }

    // Demo Mode
    let key = '';
    if (sheetName === 'Master_Guru') key = STORAGE_KEYS.MASTER_GURU;
    else if (sheetName === 'Master_Siswa') key = STORAGE_KEYS.MASTER_SISWA;
    else if (sheetName === 'Master_Kelas') key = STORAGE_KEYS.MASTER_KELAS;
    else if (sheetName === 'Master_Mapel') key = STORAGE_KEYS.MASTER_MAPEL;

    let rows = JSON.parse(localStorage.getItem(key) || '[]');
    rows = rows.filter((r: any) => r._rowIndex !== rowIndex);
    localStorage.setItem(key, JSON.stringify(rows));
    return { status: 'success' };
  },

  // 10.1 DELETE STUDENT ATTENDANCE RECORD
  async deleteAttendanceRecord(rowIndex: string | number) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'deleteAttendanceRecord', { rowIndex });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA) || '[]';
    let history: AttendanceRecord[] = JSON.parse(rawHistory);
    history = history.filter((h) => String(h.rowIndex) !== String(rowIndex));
    localStorage.setItem(STORAGE_KEYS.HISTORY_SISWA, JSON.stringify(history));
    return { status: 'success' };
  },

  // 10.2 UPDATE TEACHER ABSENCE RECORD
  async updateTeacherAbsenceRecord(rowIndex: string | number, status: string, alasan: string) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'updateTeacherAbsenceRecord', { rowIndex, status, alasan });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU) || '[]';
    const history: TeacherAbsenceRecord[] = JSON.parse(rawHistory);

    const index = history.findIndex((h) => String(h.rowIndex) === String(rowIndex));
    if (index !== -1) {
      history[index].status = status;
      history[index].alasan = alasan;
      localStorage.setItem(STORAGE_KEYS.HISTORY_GURU, JSON.stringify(history));
    }
    return { status: 'success' };
  },

  // 10.3 DELETE TEACHER ABSENCE RECORD
  async deleteTeacherAbsenceRecord(rowIndex: string | number) {
    const url = this.getBackendUrl();
    if (url) {
      return await callGAS(url, 'deleteTeacherAbsenceRecord', { rowIndex });
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU) || '[]';
    let history: TeacherAbsenceRecord[] = JSON.parse(rawHistory);
    history = history.filter((h) => String(h.rowIndex) !== String(rowIndex));
    localStorage.setItem(STORAGE_KEYS.HISTORY_GURU, JSON.stringify(history));
    return { status: 'success' };
  },

  // 11. GET APP CUSTOMIZATION FROM GOOGLE SPREADSHEET
  async getCustomization(): Promise<{ status: string; customization?: any; errorType?: string; message?: string }> {
    const url = this.getBackendUrl();
    if (!url) {
      const saved = localStorage.getItem('absensi_app_customization');
      if (saved) {
        try {
          return { status: 'success', customization: JSON.parse(saved) };
        } catch (e) {
          return { status: 'error', message: 'Gagal mengurai pengaturan lokal' };
        }
      }
      return { status: 'success' };
    }

    try {
      // Try direct action first (new Apps Script)
      const directRes = await callGAS(url, 'getCustomization', {});
      if (directRes && directRes.status === 'success') {
        return directRes;
      }
    } catch (e) {
      console.warn('Direct getCustomization not supported by Apps Script, using fallback:', e);
    }

    try {
      // Fallback: read via legacy getCrud (old Apps Script)
      const res = await callGAS(url, 'getCrud', { sheetName: 'Pengaturan' });
      if (res.status === 'success' && res.rows) {
        const customRow = res.rows.find((row: any) => row.data && row.data[0] === 'customization');
        if (customRow && customRow.data[1]) {
          try {
            const parsed = JSON.parse(customRow.data[1]);
            return { status: 'success', customization: parsed };
          } catch (e) {
            console.error('Failed to parse JSON customization:', e);
          }
        }
        return { status: 'success' };
      } else {
        const isSheetMissing = res.message && (res.message.includes('tidak ditemukan') || res.message.includes('not found') || res.message.includes('Tabel'));
        return {
          status: 'error',
          message: res.message || 'Sheet Pengaturan tidak ditemukan',
          errorType: isSheetMissing ? 'sheet_not_found' : 'other_error'
        };
      }
    } catch (err: any) {
      return { status: 'error', message: err.message || 'Gagal mengambil pengaturan' };
    }
  },

  // 12. SAVE APP CUSTOMIZATION TO GOOGLE SPREADSHEET
  async saveCustomization(customization: any): Promise<{ status: string; errorType?: string; message?: string }> {
    const url = this.getBackendUrl();
    if (!url) {
      localStorage.setItem('absensi_app_customization', JSON.stringify(customization));
      return { status: 'success' };
    }

    try {
      // Try direct action first (new Apps Script)
      const directRes = await callGAS(url, 'saveCustomization', { customization });
      if (directRes && directRes.status === 'success') {
        return directRes;
      }
    } catch (e) {
      console.warn('Direct saveCustomization not supported by Apps Script, using fallback:', e);
    }

    try {
      // Fallback: write via legacy saveCrud (old Apps Script)
      const getRes = await callGAS(url, 'getCrud', { sheetName: 'Pengaturan' });
      if (getRes.status === 'success' && getRes.rows) {
        const customRow = getRes.rows.find((row: any) => row.data && row.data[0] === 'customization');
        const jsonString = JSON.stringify(customization);
        const rowData = ['customization', jsonString];
        const targetRowIndex = customRow ? customRow._rowIndex : null;

        const saveRes = await callGAS(url, 'saveCrud', {
          sheetName: 'Pengaturan',
          rowData,
          rowIndex: targetRowIndex
        });
        return saveRes;
      } else {
        const isSheetMissing = getRes.message && (getRes.message.includes('tidak ditemukan') || getRes.message.includes('not found') || getRes.message.includes('Tabel'));
        if (isSheetMissing) {
          localStorage.setItem('absensi_app_customization', JSON.stringify(customization));
          return {
            status: 'error',
            message: getRes.message || 'Sheet Pengaturan tidak ditemukan',
            errorType: 'sheet_not_found'
          };
        }
        return getRes;
      }
    } catch (err: any) {
      return { status: 'error', message: err.message || 'Gagal menyimpan pengaturan' };
    }
  },
};
