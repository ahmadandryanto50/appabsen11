/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, AttendanceRecord, TeacherAbsenceRecord } from './types';
import { formatKeterlambatan, parseMenitTerlambat } from './utils/timeUtils';

// Pre-seeded local data keys
const STORAGE_KEYS = {
  APP_URL: 'absensi_gas_url',
  USER: 'absensi_user',
  HISTORY_SISWA: 'absensi_history_siswa',
  HISTORY_GURU: 'absensi_history_guru',
  HISTORY_TENDIK_ABSEN: 'absensi_history_tendik_absen',
  HISTORY_TENDIK_IZIN: 'absensi_history_tendik_izin',
  MASTER_GURU: 'absensi_master_guru',
  MASTER_SISWA: 'absensi_master_siswa',
  MASTER_KELAS: 'absensi_master_kelas',
  MASTER_MAPEL: 'absensi_master_mapel',
};

/// Seed realistic default data if not already present ONLY in Demo Mode (when no Web App URL is set)
export function initializeStorage() {
  const hasAppUrl = !!localStorage.getItem(STORAGE_KEYS.APP_URL);

  // If connected to Web App URL, do NOT populate demo mock data
  if (hasAppUrl) {
    return;
  }

  // Migrate any existing 6-column Master_Guru rows to 7-column rows with Gender
  try {
    const existingGuruStr = localStorage.getItem(STORAGE_KEYS.MASTER_GURU);
    if (existingGuruStr) {
      const existingGuru = JSON.parse(existingGuruStr);
      let migrated = false;
      const updatedGuru = existingGuru.map((row: any) => {
        if (row && row.data && row.data.length === 6) {
          migrated = true;
          const nama = row.data[2] || '';
          let gender = 'Laki-laki';
          const lower = nama.toLowerCase();
          if (
            lower.includes('siti') ||
            lower.includes('rina') ||
            lower.includes('dewi') ||
            lower.includes('ibu') ||
            lower.includes('herawati') ||
            lower.includes('putri') ||
            lower.includes('rahma') ||
            lower.includes('susanti') ||
            lower.includes('lestari') ||
            lower.includes('kartika') ||
            lower.includes('sari')
          ) {
            gender = 'Perempuan';
          }
          const newData = [...row.data];
          newData.splice(3, 0, gender); // Insert 'Jenis Kelamin' at index 3
          return { ...row, data: newData };
        }
        return row;
      });
      if (migrated) {
        localStorage.setItem(STORAGE_KEYS.MASTER_GURU, JSON.stringify(updatedGuru));
      }
    }
  } catch (e) {
    console.error('Error migrating Master_Guru local storage:', e);
  }

  if (!localStorage.getItem(STORAGE_KEYS.MASTER_GURU)) {
    const defaultGuru = [
      { _rowIndex: 2, data: ['G01', '19850101201001', 'Administrator Utama', 'Laki-laki', 'admin', 'Admin', 'Aktif'] },
      { _rowIndex: 3, data: ['G02', '19900202201502', 'Budi Santoso, S.Pd.', 'Laki-laki', 'guru', 'Guru', 'Aktif'] },
      { _rowIndex: 4, data: ['G03', '19920815201803', 'Siti Rahma, M.Pd.', 'Perempuan', 'sitirahma', 'Guru', 'Aktif'] },
      { _rowIndex: 5, data: ['G04', '19881112201201', 'Hendra Wijaya, S.Si.', 'Laki-laki', 'hendra', 'Guru', 'Aktif'] },
      { _rowIndex: 6, data: ['G05', '19950505202005', 'Rina Herawati, S.Pd.I.', 'Perempuan', 'rina', 'Tendik', 'Aktif'] },
      { _rowIndex: 7, data: ['G06', '19970606202206', 'Doni Setiawan', 'Laki-laki', 'doni', 'Tendik', 'Aktif'] },
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

  if (!localStorage.getItem('absensi_kiosk_all_scans')) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const defaultKioskScans = [
      {
        rowIndex: 2,
        timestamp: `${today} 15:52:33`,
        tanggal: today,
        waktu: '15:52:33',
        nisn: '0124567574',
        nama: 'Maychel Owen',
        kelas: 'IX. Diponegoro',
        status: 'Terlambat',
        keterlambatan: '8 jam 52 menit',
        menitTerlambat: 532,
      },
      {
        rowIndex: 3,
        timestamp: `${today} 15:52:27`,
        tanggal: today,
        waktu: '15:52:27',
        nisn: '3135465222',
        nama: 'Dalisya Lulu Mumtaza',
        kelas: 'VIII. Ki Hadjar Dewantara',
        status: 'Terlambat',
        keterlambatan: '8 jam 52 menit',
        menitTerlambat: 532,
      },
      {
        rowIndex: 4,
        timestamp: `${today} 15:52:12`,
        tanggal: today,
        waktu: '15:52:12',
        nisn: '3136743658',
        nama: 'Abizar Putra Ramadhan',
        kelas: 'VII. Ahmad Yani',
        status: 'Terlambat',
        keterlambatan: '8 jam 52 menit',
        menitTerlambat: 532,
      },
    ];
    localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(defaultKioskScans));
  }
}

// Low-level HTTP Caller to Google Apps Script Web App (POST text/plain with 15s timeout)
async function callGAS(url: string, action: string, data: any = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs); // Default 15s timeout for Google Apps Script execution

  try {
    const body = JSON.stringify({ action, ...data });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await response.text();
    if (!text || text.trim().startsWith('<') || text.includes('<!DOCTYPE html>')) {
      throw new Error('Respon dari Apps Script berupa HTML. Pastikan Deployment Web App di-setting ke "Anyone" (Siapa saja) dan URL akhiran /exec.');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Respon dari Apps Script bukan format JSON. Mohon periksa URL Apps Script Anda.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutSec = Math.round(timeoutMs / 1000);
      throw new Error(`Koneksi Apps Script terlalu lambat / Timeout (${timeoutSec} detik). Mohon periksa jaringan atau spreadsheet.`);
    }
    throw new Error(err.message || 'Gagal menghubungi server database');
  }
}

// In-flight request deduplication and short-term response cache
const inFlightRequests = new Map<string, Promise<any>>();
const cacheStore = new Map<string, { data: any; timestamp: number }>();

export function clearApiCache() {
  cacheStore.clear();
}

// Safe wrapper for callGAS to prevent app crash on invalid Apps Script URLs with caching & deduplication
async function safeCallGAS(
  url: string, 
  action: string, 
  data: any = {}, 
  useCache = false, 
  ttlMs = 4000,
  timeoutMs = 15000
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const cacheKey = `${url}:${action}:${JSON.stringify(data)}`;

  if (useCache && cacheStore.has(cacheKey)) {
    const cached = cacheStore.get(cacheKey)!;
    if (Date.now() - cached.timestamp < ttlMs) {
      return { ok: true, result: cached.data };
    }
  }

  // Deduplicate identical pending requests
  if (inFlightRequests.has(cacheKey)) {
    try {
      const res = await inFlightRequests.get(cacheKey);
      return { ok: true, result: res };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  const promise = (async () => {
    try {
      const res = await callGAS(url, action, data, timeoutMs);
      if (useCache) {
        cacheStore.set(cacheKey, { data: res, timestamp: Date.now() });
      }
      return res;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const res = await promise;
    return { ok: true, result: res };
  } catch (err: any) {
    console.warn(`[Apps Script API Warning] Action '${action}' via Cloud URL failed (${err.message}). Beralih ke data lokal (Demo Mode).`);
    return { ok: false, error: err.message };
  }
}

// MAIN API CLIENT
export const apiClient = {
  getBackendUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.APP_URL) || import.meta.env.VITE_GAS_URL || '';
  },

  async syncConfigFromServer(): Promise<{ webAppUrl?: string; customization?: any }> {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          if (data.webAppUrl && data.webAppUrl.trim()) {
            localStorage.setItem(STORAGE_KEYS.APP_URL, data.webAppUrl.trim());
          }
          return data;
        }
      }
    } catch (e) {
      // Ignore if offline / static
    }
    return {};
  },

  async setBackendUrl(url: string) {
    const cleanUrl = url.trim();
    if (cleanUrl) {
      localStorage.setItem(STORAGE_KEYS.APP_URL, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.APP_URL);
    }
    // Broadcast & persist to server so all other preview windows / devices connect automatically
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: cleanUrl }),
      });
    } catch (e) {}
  },

  isDemoMode(): boolean {
    return !this.getBackendUrl();
  },

  // 1. LOGIN
  async login(username: string, passwordInput: string) {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'login', { username, password: passwordInput });
      if (ok && result) return result;
    }

    // Demo Mode Logic
    const rawGuru = localStorage.getItem(STORAGE_KEYS.MASTER_GURU) || '[]';
    const gurus = JSON.parse(rawGuru);
    const matched = gurus.find((g: any) => g.data[4] === username);

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
      // Validate password (defaulting to username + '123' if not explicitly set)
      const expectedPassword = matched.data[4] + '123';
      if (passwordInput !== expectedPassword) {
        return { status: 'error', message: 'Kata sandi salah!' };
      }

      // Check status (index 6 is Status)
      const status = matched.data[6] || 'Aktif';
      if (status.toLowerCase() !== 'aktif') {
        return { status: 'error', message: 'Akun Anda sedang dinonaktifkan.' };
      }

      return {
        status: 'success',
        user: {
          id: matched.data[0],
          nip: matched.data[1],
          nama: matched.data[2],
          username: matched.data[4],
          role: matched.data[5],
        },
      };
    }

    return { status: 'error', message: 'Username atau Password salah!' };
  },

  // 2. GET STUDENTS BY CLASS
  async getStudents(kelas: string): Promise<{ status: string; students: Student[]; message?: string }> {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'getStudents', { kelas }, true, 600000); // 10 minutes cache
      if (ok && result && result.status === 'success' && Array.isArray(result.students) && result.students.length > 0) {
        try {
          localStorage.setItem(`absensi_students_${kelas}`, JSON.stringify(result.students));
        } catch (e) {}
        return result;
      }

      // Fallback 1: Try getCrud('Master_Siswa')
      const crudRes = await this.getCrud('Master_Siswa');
      if (crudRes.status === 'success' && Array.isArray(crudRes.rows) && crudRes.rows.length > 0) {
        const filtered = crudRes.rows
          .filter((r: any) => {
            if (!r || !r.data) return false;
            const rowKelas = r.data[3] ? r.data[3].toString().trim() : '';
            const status = r.data[5] ? r.data[5].toString().trim().toLowerCase() : 'aktif';
            return rowKelas === kelas && (status === 'aktif' || status === '');
          })
          .map((r: any) => ({
            id: r.data[0] ? r.data[0].toString() : '',
            nisn: r.data[1] ? r.data[1].toString() : '',
            nama: r.data[2] || '',
            kelas: r.data[3] || kelas,
            gender: r.data[4] || 'Laki-laki',
          }));

        if (filtered.length > 0) {
          try {
            localStorage.setItem(`absensi_students_${kelas}`, JSON.stringify(filtered));
          } catch (e) {}
          return { status: 'success', students: filtered };
        }
      }
    }

    // Fallback 2: Check per-class local storage cache
    const cachedRoster = localStorage.getItem(`absensi_students_${kelas}`);
    if (cachedRoster) {
      try {
        const parsed = JSON.parse(cachedRoster);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { status: 'success', students: parsed };
        }
      } catch (e) {}
    }

    // Fallback 3: Demo Mode / Local Storage MASTER_SISWA
    const rawStudents = localStorage.getItem(STORAGE_KEYS.MASTER_SISWA) || '[]';
    try {
      const parsed: any[] = JSON.parse(rawStudents);
      const filtered = parsed
        .filter((s) => s && s.data && s.data[3] === kelas && (s.data[5] === 'Aktif' || !s.data[5]))
        .map((s) => ({
          id: s.data[0],
          nisn: s.data[1],
          nama: s.data[2],
          kelas: s.data[3],
          gender: s.data[4],
        }));

      if (filtered.length > 0) {
        return { status: 'success', students: filtered };
      }
    } catch (e) {}

    // Fallback 4: Generate placeholder roster for selected class
    return {
      status: 'success',
      students: [
        { id: `S_${kelas}_1`, nisn: '0051239991', nama: `Siswa 1 (${kelas})`, kelas, gender: 'Laki-laki' },
        { id: `S_${kelas}_2`, nisn: '0051239992', nama: `Siswa 2 (${kelas})`, kelas, gender: 'Perempuan' },
        { id: `S_${kelas}_3`, nisn: '0051239993', nama: `Siswa 3 (${kelas})`, kelas, gender: 'Laki-laki' },
      ],
    };
  },

  // 3. SUBMIT CLASS ATTENDANCE
  async submitAttendance(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitAttendance', { payload }, false, 0, 60000);
      if (ok && result && result.status === 'success') return result;
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    // Demo Mode / Offline Fallback
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
    
    if (serverError) {
      return { status: 'success', message: `Disimpan secara luring (offline) karena: ${serverError}` };
    }
    return { status: 'success' };
  },

  // 3.5 SUBMIT KIOSK SCAN
  async submitKioskScan(payload: any) {
    clearApiCache();
    // Also save to local all scans cache for immediate offline viewing in Riwayat
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeClockStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const timeStr = `${dateStr} ${timeClockStr}`;
    
    try {
      const allScansRaw = localStorage.getItem('absensi_kiosk_all_scans') || '[]';
      const allScans = JSON.parse(allScansRaw);
      allScans.unshift({
        rowIndex: Date.now(),
        timestamp: timeStr,
        tanggal: dateStr,
        waktu: timeClockStr,
        nisn: payload.nisn || '',
        nama: payload.nama || '',
        kelas: payload.kelas || '',
        status: payload.status || 'Hadir',
        keterlambatan: payload.keterlambatan || '-',
        menitTerlambat: payload.menitTerlambat || 0,
      });
      localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(allScans.slice(0, 500)));
    } catch (e) {}

    const url = this.getBackendUrl();
    if (url) {
      // Use saveCrud directly to force exactly matching the user's requested columns in the 'Presensi' sheet
      const rowData = [
        dateStr,                          // 1. Tanggal
        timeClockStr,                     // 2. Waktu Scan
        payload.nisn || '',               // 3. NISN
        payload.nama || '',               // 4. Nama Siswa
        payload.kelas || '',              // 5. Kelas
        payload.status || 'Hadir',        // 6. Status Masuk
        payload.keterlambatan || '-'      // 7. Keterlambatan
      ];
      
      try {
        const crudRes = await safeCallGAS(url, 'saveCrud', { sheetName: 'Presensi', rowData: rowData, rowIndex: null });
        if (crudRes.ok && crudRes.result && crudRes.result.status === 'success') {
          return { status: 'success', message: 'Presensi berhasil disimpan ke Spreadsheet.' };
        }
      } catch (e) {}

      // Fallback to old native GAS action if saveCrud fails
      const { ok, result, error } = await safeCallGAS(url, 'submitKioskScan', { payload }, false, 0, 30000);
      if (ok && result && result.status === 'success') return result;
      throw new Error(error || result?.message || 'Gagal mengirim data scan.');
    }
    
    // Offline / Demo Mode simulation
    return { status: 'success', message: 'Offline/Demo: Presensi berhasil disimpan.' };
  },

  // 3.6 GET KIOSK ATTENDANCE HISTORY (PRESENSI SISWA MASUK)
  async getKioskAttendanceHistory(tanggal?: string, kelas?: string): Promise<{ status: string; history: any[] }> {
    const normalizeDateStr = (dateInput: any): string => {
      if (!dateInput) return '';
      if (dateInput instanceof Date) {
        const y = dateInput.getFullYear();
        const m = String(dateInput.getMonth() + 1).padStart(2, '0');
        const d = String(dateInput.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const trimmed = String(dateInput).trim();
      if (!trimmed) return '';

      // If YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
      const ymd = trimmed.match(/^(\d{4})[-/\. ](\d{1,2})[-/\. ](\d{1,2})/);
      if (ymd) {
        return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
      }
      // If DD/MM/YYYY or DD-MM-YYYY
      const dmy = trimmed.match(/^(\d{1,2})[-/\. ](\d{1,2})[-/\. ](\d{4})/);
      if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      }

      // Indonesian month names fallback (e.g. 14 Agustus 2026)
      const indoMonths: Record<string, string> = {
        jan: '01', januari: '01', feb: '02', februari: '02', mar: '03', maret: '03',
        apr: '04', april: '04', mei: '05', may: '05', jun: '06', juni: '06',
        jul: '07', juli: '07', agu: '08', agt: '08', agustus: '08', aug: '08',
        sep: '09', september: '09', okt: '10', oktober: '10', oct: '10',
        nov: '11', november: '11', des: '12', desember: '12', dec: '12'
      };
      const textMatch = trimmed.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
      if (textMatch && indoMonths[textMatch[2]]) {
        return `${textMatch[3]}-${indoMonths[textMatch[2]]}-${textMatch[1].padStart(2, '0')}`;
      }

      return trimmed.split(' ')[0] || trimmed;
    };

    // Load student database cache for resolving student names/class if missing in Presensi sheet
    let studentMap: Record<string, { nama: string; kelas: string }> = {};
    try {
      const cachedSiswa = localStorage.getItem('absensi_master_siswa');
      if (cachedSiswa) {
        const list = JSON.parse(cachedSiswa);
        if (Array.isArray(list)) {
          list.forEach((s: any) => {
            const sNisn = String(s.nisn || s.data?.[1] || '').trim();
            const sNama = String(s.nama || s.data?.[2] || '').trim();
            const sKelas = String(s.kelas || s.data?.[3] || '').trim();
            if (sNisn) {
              studentMap[sNisn] = { nama: sNama, kelas: sKelas };
            }
          });
        }
      }
    } catch (e) {}

    const normalizeRecord = (item: any, fallbackRowIndex?: number) => {
      const raw = item.timestamp ? String(item.timestamp).trim() : '';
      let itemTanggal = item.tanggal ? String(item.tanggal).trim() : '';
      let itemWaktu = item.waktu ? String(item.waktu).trim() : '';

      if (!itemTanggal || !itemWaktu) {
        const parsedDate = new Date(raw);
        if (!isNaN(parsedDate.getTime()) && raw.match(/[a-zA-Z]/) && raw.includes(':')) {
          const y = parsedDate.getFullYear();
          const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const d = String(parsedDate.getDate()).padStart(2, '0');
          itemTanggal = `${y}-${m}-${d}`;
          const h = String(parsedDate.getHours()).padStart(2, '0');
          const min = String(parsedDate.getMinutes()).padStart(2, '0');
          const s = String(parsedDate.getSeconds()).padStart(2, '0');
          itemWaktu = `${h}:${min}:${s}`;
        } else if (raw.includes('T')) {
          const parts = raw.split('T');
          itemTanggal = parts[0] || '';
          itemWaktu = (parts[1] || '').split('.')[0] || '';
        } else if (raw.includes(' ')) {
          const parts = raw.split(' ');
          if (parts.length >= 2 && parts[1].includes(':')) {
            itemTanggal = parts[0] || '';
            itemWaktu = parts[1] || '';
          } else {
            itemTanggal = raw;
            itemWaktu = '-';
          }
        } else {
          itemTanggal = raw;
          itemWaktu = '-';
        }
      }

      const stdDate = normalizeDateStr(itemTanggal || raw);
      const nisnVal = String(item.nisn || '').trim();
      let namaVal = String(item.nama || '').trim();
      let kelasVal = String(item.kelas || '').trim();

      if ((!namaVal || namaVal === '-' || namaVal.toLowerCase() === 'nama siswa') && nisnVal && studentMap[nisnVal]) {
        namaVal = studentMap[nisnVal].nama;
        if (!kelasVal || kelasVal === '-') {
          kelasVal = studentMap[nisnVal].kelas;
        }
      }

      return {
        ...item,
        rowIndex: item.rowIndex || fallbackRowIndex || item._rowIndex || Date.now(),
        timestamp: raw || `${itemTanggal} ${itemWaktu}`,
        tanggal: stdDate || itemTanggal,
        rawTanggal: itemTanggal,
        waktu: itemWaktu || '-',
        nisn: nisnVal,
        nama: namaVal,
        kelas: kelasVal,
        status: String(item.status || 'Hadir').trim(),
        keterlambatan: formatKeterlambatan(item.keterlambatan || item.menitTerlambat),
        menitTerlambat: parseMenitTerlambat(item.menitTerlambat || item.keterlambatan),
      };
    };

    const targetDateIso = tanggal ? normalizeDateStr(tanggal) : '';
    const url = this.getBackendUrl();

    if (url) {
      // 1. Try dedicated getKioskAttendanceHistory action from GAS
      const { ok, result } = await safeCallGAS(url, 'getKioskAttendanceHistory', { tanggal: tanggal || '', kelas: kelas || '' }, true, 2000);
      if (ok && result && result.status === 'success' && Array.isArray(result.history) && result.history.length > 0) {
        let normalized = result.history.map((h: any, idx: number) => normalizeRecord(h, h.rowIndex || idx + 2));

        if (targetDateIso) {
          normalized = normalized.filter((h: any) => {
            const hDate = normalizeDateStr(h.tanggal || h.rawTanggal || h.timestamp);
            return hDate === targetDateIso || (h.timestamp && h.timestamp.includes(tanggal!));
          });
        }
        if (kelas) {
          normalized = normalized.filter((h: any) => (h.kelas || '').toLowerCase() === kelas.toLowerCase().trim());
        }

        try {
          if (!tanggal && !kelas) {
            localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(normalized));
          }
        } catch (e) {}

        if (normalized.length > 0) {
          return { status: 'success', history: normalized };
        }
      }

      // 1b. If filtered by tanggal returned 0, try fetching all to handle any GAS date format mismatch
      if (tanggal) {
        const { ok: okAll, result: resAll } = await safeCallGAS(url, 'getKioskAttendanceHistory', { tanggal: '', kelas: '' }, true, 2000);
        if (okAll && resAll && resAll.status === 'success' && Array.isArray(resAll.history) && resAll.history.length > 0) {
          let normalizedAll = resAll.history.map((h: any, idx: number) => normalizeRecord(h, h.rowIndex || idx + 2));
          try {
            localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(normalizedAll));
          } catch (e) {}

          let filteredAll = normalizedAll.filter((h: any) => {
            const hDate = normalizeDateStr(h.tanggal || h.rawTanggal || h.timestamp);
            return hDate === targetDateIso || (h.timestamp && h.timestamp.includes(tanggal));
          });
          if (kelas) {
            filteredAll = filteredAll.filter((h: any) => (h.kelas || '').toLowerCase() === kelas.toLowerCase().trim());
          }
          if (filteredAll.length > 0) {
            return { status: 'success', history: filteredAll };
          }
        }
      }

      // 2. Direct Fallback: Read directly from sheet 'Presensi' (or synonyms) via getCrud
      const possibleSheetNames = ['Presensi', 'Presensi_Kiosk', 'Presensi_Masuk', 'Presensi Masuk', 'Log_Presensi'];
      for (const sheetName of possibleSheetNames) {
        try {
          const crudPresensi = await this.getCrud(sheetName);
          if (crudPresensi.status === 'success' && Array.isArray(crudPresensi.rows) && crudPresensi.rows.length > 0) {
            const headersLower = (crudPresensi.headers || []).map((h: string) => (h || '').toLowerCase().trim());
            
            let tsIdx = headersLower.findIndex((h: string) => h.includes('timestamp') || h.includes('waktu scan'));
            if (tsIdx === -1) tsIdx = 0;
            const tglIdx = headersLower.findIndex((h: string) => h === 'tanggal' || h.includes('tgl'));
            const wktIdx = headersLower.findIndex((h: string) => h === 'waktu' || h === 'jam' || h.includes('pukul'));
            let nisnIdx = headersLower.findIndex((h: string) => h.includes('nisn') || h.includes('nis') || h.includes('no induk'));
            if (nisnIdx === -1) nisnIdx = 1;
            let namaIdx = headersLower.findIndex((h: string) => h.includes('nama'));
            if (namaIdx === -1) namaIdx = 2;
            let kelasIdx = headersLower.findIndex((h: string) => h.includes('kelas') || h.includes('rombel'));
            if (kelasIdx === -1) kelasIdx = 3;
            let statusIdx = headersLower.findIndex((h: string) => h.includes('status') || h.includes('kehadiran') || h.includes('presensi'));
            if (statusIdx === -1) statusIdx = 4;
            let telatIdx = headersLower.findIndex((h: string) => h.includes('terlambat') || h.includes('keterlambatan') || h.includes('menit'));
            if (telatIdx === -1) telatIdx = 5;

            const parsedFromSheet = crudPresensi.rows.map((row: any) => {
              const rowData = row.data || [];
              const rawTs = rowData[tsIdx] ? String(rowData[tsIdx]).trim() : '';
              const rawTgl = tglIdx !== -1 && rowData[tglIdx] ? String(rowData[tglIdx]).trim() : '';
              const rawWkt = wktIdx !== -1 && rowData[wktIdx] ? String(rowData[wktIdx]).trim() : '';

              let finalTs = rawTs;
              if (rawTs && !rawTs.includes('-') && !rawTs.includes('/') && rawTgl) {
                // rawTs is just a time string, prepend the date
                finalTs = `${rawTgl} ${rawTs}`;
              } else if (!rawTs) {
                finalTs = `${rawTgl} ${rawWkt}`;
              }

              return normalizeRecord({
                rowIndex: row._rowIndex || row.rowIndex,
                timestamp: finalTs,
                tanggal: rawTgl || finalTs.split(' ')[0],
                waktu: rawWkt || finalTs.split(' ')[1] || '-',
                nisn: rowData[nisnIdx] ? String(rowData[nisnIdx]).trim() : '',
                nama: rowData[namaIdx] ? String(rowData[namaIdx]).trim() : '',
                kelas: rowData[kelasIdx] ? String(rowData[kelasIdx]).trim() : '',
                status: rowData[statusIdx] ? String(rowData[statusIdx]).trim() : 'Hadir',
                keterlambatan: rowData[telatIdx] ? String(rowData[telatIdx]).trim() : '-',
              }, row._rowIndex);
            });

            // Sort latest first
            let filteredSheet = parsedFromSheet.reverse();

            if (targetDateIso) {
              filteredSheet = filteredSheet.filter((h: any) => {
                const hDate = normalizeDateStr(h.tanggal || h.rawTanggal || h.timestamp);
                return hDate === targetDateIso || (h.timestamp && h.timestamp.includes(tanggal!));
              });
            }
            if (kelas) {
              filteredSheet = filteredSheet.filter((h: any) => (h.kelas || '').toLowerCase() === kelas.toLowerCase().trim());
            }

            if (filteredSheet.length > 0) {
              try {
                if (!tanggal && !kelas) {
                  localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(filteredSheet));
                }
              } catch (e) {}
              return { status: 'success', history: filteredSheet };
            }
          }
        } catch (crudErr) {
          // continue checking next possible sheet
        }
      }
    }

    // 3. Server Store & Local Storage Cache / Offline Fallback
    try {
      const srvRes = await fetch(`/api/kiosk-scans?tanggal=${encodeURIComponent(tanggal || '')}&kelas=${encodeURIComponent(kelas || '')}`);
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData.status === 'success' && Array.isArray(srvData.scans) && srvData.scans.length > 0) {
          const normalizedSrv = srvData.scans.map((h: any, idx: number) => normalizeRecord(h, h.rowIndex || idx + 2));
          return { status: 'success', history: normalizedSrv };
        }
      }
    } catch (e) {}

    const raw = localStorage.getItem('absensi_kiosk_all_scans') || '[]';
    let history: any[] = [];
    try {
      history = JSON.parse(raw);
    } catch (e) {}

    history = history.map((h, i) => normalizeRecord(h, i + 2));

    if (targetDateIso) {
      history = history.filter((h: any) => {
        const hDate = normalizeDateStr(h.tanggal || h.rawTanggal || h.timestamp);
        return hDate === targetDateIso || (h.timestamp && h.timestamp.includes(tanggal!));
      });
    }
    if (kelas) {
      history = history.filter((h) => (h.kelas || '').toLowerCase() === kelas.toLowerCase().trim());
    }

    return { status: 'success', history };
  },

  // 3.7 DELETE KIOSK ATTENDANCE RECORD
  async deleteKioskAttendanceRecord(rowIndex: string | number, timestamp?: string, nisn?: string) {
    clearApiCache();
    // Delete from server store
    try {
      fetch('/api/kiosk-scans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, timestamp, nisn }),
      }).catch(() => {});
    } catch (e) {}

    const url = this.getBackendUrl();
    if (url) {
      let isDeleted = false;

      // 1. Force use deleteCrud on all possible kiosk sheet names to ensure it deletes from the spreadsheet
      const possibleSheets = ['Presensi_Masuk', 'Presensi Masuk', 'Presensi', 'Log_Presensi', 'Presensi_Kiosk'];
      let actualRowIndex = Number(rowIndex);

      for (const sheetName of possibleSheets) {
        if (isDeleted) break;
        try {
          // Find the exact row by NISN and Timestamp first (rowIndex might be a generated Date.now() ID)
          if (nisn && timestamp) {
            const crudData = await this.getCrud(sheetName);
            if (crudData && crudData.status === 'success' && Array.isArray(crudData.rows)) {
              const headersLower = (crudData.headers || []).map((h: string) => (h || '').toLowerCase().trim());
              let nIdx = headersLower.findIndex((h: string) => h.includes('nisn') || h.includes('nis') || h.includes('no induk'));
              if (nIdx === -1) nIdx = 1;
              let tIdx = headersLower.findIndex((h: string) => h.includes('timestamp') || h.includes('waktu scan'));
              if (tIdx === -1) tIdx = 0;

              const matchRow = crudData.rows.find((r: any) => {
                if (!r || !r.data) return false;
                const rNisn = String(r.data[nIdx] || '').trim();
                const rTs = String(r.data[tIdx] || '').trim();
                const timeMatch1 = timestamp ? timestamp.match(/(\d{2}:\d{2})/) : null;
                const timeMatch2 = rTs.match(/(\d{2}:\d{2})/);
                const isTimeMatch = timeMatch1 && timeMatch2 && timeMatch1[1] === timeMatch2[1];
                return rNisn === String(nisn).trim() && (rTs === timestamp || rTs.includes(timestamp!) || timestamp!.includes(rTs) || isTimeMatch);
              });

              if (matchRow && matchRow._rowIndex) {
                // Try deleteCrud first
                const delRes = await this.deleteCrud(sheetName, Number(matchRow._rowIndex));
                if (delRes && delRes.status === 'success') {
                  isDeleted = true;
                  break;
                }
                
                // Fallback to deleteAttendanceRecord if it's the Presensi sheet
                if (sheetName === 'Presensi' || sheetName === 'Presensi Masuk' || sheetName === 'Presensi_Masuk') {
                  const altRes = await safeCallGAS(url, 'deleteAttendanceRecord', { rowIndex: Number(matchRow._rowIndex) });
                  if (altRes.ok && altRes.result && altRes.result.status === 'success') {
                    isDeleted = true;
                    break;
                  }
                }
              }
            }
          }

          // Fallback to direct rowIndex if not found above, and rowIndex looks like a genuine sheet row (< 1000000)
          if (!isDeleted && !isNaN(actualRowIndex) && actualRowIndex > 0 && actualRowIndex < 1000000) {
            const crudRes = await this.deleteCrud(sheetName, actualRowIndex);
            if (crudRes && crudRes.status === 'success') {
              isDeleted = true;
              break;
            }
            if (sheetName === 'Presensi' || sheetName === 'Presensi Masuk' || sheetName === 'Presensi_Masuk') {
              const altRes = await safeCallGAS(url, 'deleteAttendanceRecord', { rowIndex: actualRowIndex });
              if (altRes.ok && altRes.result && altRes.result.status === 'success') {
                isDeleted = true;
                break;
              }
            }
          }
        } catch (e) {}
      }

      // 2. Also try dedicated GAS action as a fallback just in case
      const { ok, result, error } = await safeCallGAS(url, 'deleteKioskAttendanceRecord', { rowIndex, timestamp, nisn });
      if (ok && result && result.status === 'success') {
        isDeleted = true;
      }

      if (isDeleted) {
        this.removeKioskLocalScan(rowIndex, timestamp, nisn);
        return { status: 'success', message: 'Data presensi berhasil dihapus.' };
      }

      if (error) {
        console.warn('deleteKioskAttendanceRecord warning:', error);
      }
    }

    this.removeKioskLocalScan(rowIndex, timestamp, nisn);
    return { status: 'success', message: 'Data presensi berhasil dihapus.' };
  },

  removeKioskLocalScan(rowIndex?: string | number, timestamp?: string, nisn?: string) {
    try {
      const raw = localStorage.getItem('absensi_kiosk_all_scans') || '[]';
      let history: any[] = JSON.parse(raw);
      history = history.filter((h) => {
        if (rowIndex && String(h.rowIndex) === String(rowIndex)) return false;
        if (timestamp && nisn && String(h.timestamp) === String(timestamp) && String(h.nisn) === String(nisn)) return false;
        return true;
      });
      localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(history));
    } catch (e) {}
  },

  // 4. SUBMIT TEACHER ABSENCE / SICK PERMIT
  async submitTeacherAbsence(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTeacherAbsence', { payload }, false, 0, 60000);
      if (ok && result && result.status === 'success') return result;
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    // Demo Mode / Offline Fallback
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

    if (serverError) {
      return { status: 'success', message: `Disimpan secara luring (offline) karena: ${serverError}` };
    }
    return { status: 'success' };
  },

  // 5. GET ATTENDANCE HISTORY (WITH FILTERS)
  async getAttendanceHistory(tanggal: string, kelas: string): Promise<{ status: string; history: AttendanceRecord[] }> {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'getAttendanceHistory', { tanggal, kelas }, true, 300000); // 5 minutes cache
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
        try {
          if (!tanggal && !kelas) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_SISWA, JSON.stringify(result.history));
          } else if (result.history.length > 0) {
            const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA) || '[]';
            let existing: AttendanceRecord[] = JSON.parse(rawExisting);
            const fetchedIds = new Set(result.history.map((r: AttendanceRecord) => String(r.rowIndex)));
            existing = existing.filter(r => !fetchedIds.has(String(r.rowIndex)));
            const merged = [...result.history, ...existing];
            localStorage.setItem(STORAGE_KEYS.HISTORY_SISWA, JSON.stringify(merged));
          }
        } catch (e) {}
        return result;
      }
    }

    // Local Fallback / Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_SISWA) || '[]';
    let history: AttendanceRecord[] = [];
    try {
      history = JSON.parse(rawHistory);
    } catch (e) {}

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
      const { ok, result } = await safeCallGAS(url, 'getTeacherAbsenceHistory', { tanggal }, true, 300000); // 5 minutes cache
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
        try {
          if (!tanggal) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_GURU, JSON.stringify(result.history));
          } else if (result.history.length > 0) {
            const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU) || '[]';
            let existing: TeacherAbsenceRecord[] = JSON.parse(rawExisting);
            const fetchedIds = new Set(result.history.map((r: TeacherAbsenceRecord) => String(r.rowIndex)));
            existing = existing.filter(r => !fetchedIds.has(String(r.rowIndex)));
            const merged = [...result.history, ...existing];
            localStorage.setItem(STORAGE_KEYS.HISTORY_GURU, JSON.stringify(merged));
          }
        } catch (e) {}
        return result;
      }
    }

    // Local Fallback / Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU) || '[]';
    let history: TeacherAbsenceRecord[] = [];
    try {
      history = JSON.parse(rawHistory);
    } catch (e) {}

    if (tanggal) {
      history = history.filter((h) => h.tanggal === tanggal);
    }

    return { status: 'success', history };
  },

  // 6.1 SUBMIT TENDIK ATTENDANCE
  async submitTendikAttendance(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTendikAttendance', { payload }, false, 0, 60000);
      if (ok && result && result.status === 'success') return result;
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    // Demo Mode / Offline Fallback
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
    const history: any[] = JSON.parse(rawHistory);

    const newRecord = {
      rowIndex: Date.now(),
      tanggal: payload.tanggal,
      waktu: payload.waktu,
      nip: payload.nip || "",
      namaTendik: payload.namaTendik || "",
      photo: payload.photoBase64 || "",
    };

    history.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(history));

    if (serverError) {
      return { status: 'success', message: `Disimpan secara luring (offline) karena: ${serverError}` };
    }
    return { status: 'success' };
  },

  // 6.2 SUBMIT TENDIK PERMIT
  async submitTendikPermit(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTendikPermit', { payload }, false, 0, 60000);
      if (ok && result && result.status === 'success') return result;
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    // Demo Mode / Offline Fallback
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN) || '[]';
    const history: any[] = JSON.parse(rawHistory);

    const newRecord = {
      rowIndex: Date.now(),
      tanggal: payload.tanggal,
      waktu: payload.waktu,
      nip: payload.nip || "",
      namaTendik: payload.namaTendik || "",
      status: payload.status || "Sakit",
      alasan: payload.alasan || "",
      photo: payload.photoBase64 || "",
    };

    history.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN, JSON.stringify(history));

    if (serverError) {
      return { status: 'success', message: `Disimpan secara luring (offline) karena: ${serverError}` };
    }
    return { status: 'success' };
  },

  // 6.3 GET TENDIK ATTENDANCE HISTORY
  async getTendikAttendanceHistory(tanggal: string): Promise<{ status: string; history: any[] }> {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'getTendikAttendanceHistory', { tanggal }, true, 10000);
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
        try {
          if (!tanggal) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(result.history));
          } else if (result.history.length > 0) {
            const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
            let existing: any[] = JSON.parse(rawExisting);
            const fetchedIds = new Set(result.history.map((r: any) => String(r.rowIndex)));
            existing = existing.filter(r => !fetchedIds.has(String(r.rowIndex)));
            const merged = [...result.history, ...existing];
            localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(merged));
          }
        } catch (e) {}
        return result;
      }

      // Fallback gracefully to local cache
      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
      try {
        let history: any[] = JSON.parse(rawHistory);
        if (tanggal) {
          history = history.filter((h) => h.tanggal === tanggal);
        }
        return { status: 'success', history };
      } catch (e) {
        return { status: 'success', history: [] };
      }
    }

    // Local Fallback / Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
    let history: any[] = JSON.parse(rawHistory);

    if (tanggal) {
      history = history.filter((h) => h.tanggal === tanggal);
    }

    return { status: 'success', history };
  },

  // 6.4 GET TENDIK PERMIT HISTORY
  async getTendikPermitHistory(tanggal: string): Promise<{ status: string; history: any[] }> {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'getTendikPermitHistory', { tanggal }, true, 10000);
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
        try {
          if (!tanggal) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN, JSON.stringify(result.history));
          } else if (result.history.length > 0) {
            const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN) || '[]';
            let existing: any[] = JSON.parse(rawExisting);
            const fetchedIds = new Set(result.history.map((r: any) => String(r.rowIndex)));
            existing = existing.filter(r => !fetchedIds.has(String(r.rowIndex)));
            const merged = [...result.history, ...existing];
            localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN, JSON.stringify(merged));
          }
        } catch (e) {}
        return result;
      }

      // Fallback gracefully to local cache
      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN) || '[]';
      try {
        let history: any[] = JSON.parse(rawHistory);
        if (tanggal) {
          history = history.filter((h) => h.tanggal === tanggal);
        }
        return { status: 'success', history };
      } catch (e) {
        return { status: 'success', history: [] };
      }
    }

    // Local Fallback / Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN) || '[]';
    let history: any[] = JSON.parse(rawHistory);

    if (tanggal) {
      history = history.filter((h) => h.tanggal === tanggal);
    }

    return { status: 'success', history };
  },

  // 6.5 DELETE TENDIK ATTENDANCE RECORD
  async deleteTendikAttendanceRecord(rowIndex: string | number) {
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteTendikAttendanceRecord', { rowIndex });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
    let history: any[] = JSON.parse(rawHistory);
    history = history.filter((h) => String(h.rowIndex) !== String(rowIndex));
    localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(history));
    return { status: 'success' };
  },

  // 6.6 DELETE TENDIK PERMIT RECORD
  async deleteTendikPermitRecord(rowIndex: string | number) {
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteTendikPermitRecord', { rowIndex });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
    }

    // Demo Mode
    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN) || '[]';
    let history: any[] = JSON.parse(rawHistory);
    history = history.filter((h) => String(h.rowIndex) !== String(rowIndex));
    localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN, JSON.stringify(history));
    return { status: 'success' };
  },

  // 7. UPDATE SINGLE RECORD IN STUDENT ATTENDANCE HISTORY
  async updateAttendanceRecord(rowIndex: string | number, newStatus: string, newKeterangan: string) {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'updateAttendanceRecord', { rowIndex, newStatus, newKeterangan });
      if (ok && result) return result;
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
      const { ok, result } = await safeCallGAS(url, 'getCrud', { sheetName }, true, 2000); // 2 seconds cache
      if (ok && result && result.status === 'success' && Array.isArray(result.rows)) {
        try {
          localStorage.setItem(`absensi_crud_cache_${sheetName}`, JSON.stringify(result));
        } catch (e) {}
        return result;
      }
    }

    // Fast check local storage cache for this sheet
    const localCached = localStorage.getItem(`absensi_crud_cache_${sheetName}`);
    if (localCached) {
      try {
        const parsed = JSON.parse(localCached);
        if (parsed && parsed.status === 'success' && Array.isArray(parsed.rows)) {
          return parsed;
        }
      } catch (e) {}
    }

    // Demo Mode / Default Fallback
    let key = '';
    let headers: string[] = [];
    if (sheetName === 'Master_Guru') {
      key = STORAGE_KEYS.MASTER_GURU;
      headers = ['ID', 'NIP', 'Nama Lengkap', 'Jenis Kelamin', 'Username', 'Role', 'Status'];
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
    clearApiCache();
    try {
      localStorage.removeItem(`absensi_crud_cache_${sheetName}`);
      if (sheetName === 'Master_Siswa') {
        // Clear all cached student class rosters
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('absensi_students_')) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {}

    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'saveCrud', { sheetName, rowData, rowIndex: rowIndex !== null ? Number(rowIndex) : null });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
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
      const newIndex = rows.length > 0 ? Math.max(...rows.map((r: any) => Number(r._rowIndex) || 0)) + 1 : 2;
      rows.push({ _rowIndex: newIndex, data: rowData });
    } else {
      // Update existing
      const idx = rows.findIndex((r: any) => Number(r._rowIndex) === Number(rowIndex));
      if (idx !== -1) {
        rows[idx].data = rowData;
      }
    }

    localStorage.setItem(key, JSON.stringify(rows));
    return { status: 'success' };
  },

  // 10. DELETE CRUD ROW
  async deleteCrud(sheetName: string, rowIndex: number) {
    clearApiCache();
    try {
      localStorage.removeItem(`absensi_crud_cache_${sheetName}`);
      if (sheetName === 'Master_Siswa') {
        // Clear all cached student class rosters
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('absensi_students_')) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {}

    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteCrud', { sheetName, rowIndex: Number(rowIndex) });
      if (ok && result) {
        // Also update local storage if present
        let key = '';
        if (sheetName === 'Master_Guru') key = STORAGE_KEYS.MASTER_GURU;
        else if (sheetName === 'Master_Siswa') key = STORAGE_KEYS.MASTER_SISWA;
        else if (sheetName === 'Master_Kelas') key = STORAGE_KEYS.MASTER_KELAS;
        else if (sheetName === 'Master_Mapel') key = STORAGE_KEYS.MASTER_MAPEL;

        if (key) {
          let rows = JSON.parse(localStorage.getItem(key) || '[]');
          rows = rows.filter((r: any) => Number(r._rowIndex) !== Number(rowIndex));
          localStorage.setItem(key, JSON.stringify(rows));
        }
        return result;
      }
      if (error) return { status: 'error', message: error };
    }

    // Demo Mode
    let key = '';
    if (sheetName === 'Master_Guru') key = STORAGE_KEYS.MASTER_GURU;
    else if (sheetName === 'Master_Siswa') key = STORAGE_KEYS.MASTER_SISWA;
    else if (sheetName === 'Master_Kelas') key = STORAGE_KEYS.MASTER_KELAS;
    else if (sheetName === 'Master_Mapel') key = STORAGE_KEYS.MASTER_MAPEL;

    let rows = JSON.parse(localStorage.getItem(key) || '[]');
    rows = rows.filter((r: any) => Number(r._rowIndex) !== Number(rowIndex));
    localStorage.setItem(key, JSON.stringify(rows));
    return { status: 'success' };
  },

  // 10.1 DELETE STUDENT ATTENDANCE RECORD
  async deleteAttendanceRecord(rowIndex: string | number) {
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteAttendanceRecord', { rowIndex });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
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
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'updateTeacherAbsenceRecord', { rowIndex, status, alasan });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
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
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteTeacherAbsenceRecord', { rowIndex });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
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

    const direct = await safeCallGAS(url, 'getCustomization', {}, true, 6000, 50000);
    if (direct.ok && direct.result && direct.result.status === 'success') {
      return direct.result;
    }

    const fallback = await safeCallGAS(url, 'getCrud', { sheetName: 'Pengaturan' }, true, 6000, 50000);
    if (fallback.ok && fallback.result && fallback.result.status === 'success' && fallback.result.rows) {
      const customRow = fallback.result.rows.find((row: any) => row.data && row.data[0] === 'customization');
      if (customRow && customRow.data[1]) {
        try {
          const parsed = JSON.parse(customRow.data[1]);
          return { status: 'success', customization: parsed };
        } catch (e) {
          console.error('Failed to parse JSON customization:', e);
        }
      }
    }

    // Fallback to local storage if Cloud URL fails
    const saved = localStorage.getItem('absensi_app_customization');
    if (saved) {
      try {
        return { status: 'success', customization: JSON.parse(saved) };
      } catch (e) {
        // Ignore
      }
    }
    return { status: 'success' };
  },

  // 12. SAVE APP CUSTOMIZATION TO GOOGLE SPREADSHEET
  async saveCustomization(customization: any): Promise<{ status: string; errorType?: string; message?: string }> {
    // Always keep local storage updated
    localStorage.setItem('absensi_app_customization', JSON.stringify(customization));

    const url = this.getBackendUrl();
    if (!url) {
      return { status: 'success' };
    }

    const direct = await safeCallGAS(url, 'saveCustomization', { customization });
    if (direct.ok && direct.result && direct.result.status === 'success') {
      return direct.result;
    }

    const getRes = await safeCallGAS(url, 'getCrud', { sheetName: 'Pengaturan' });
    if (getRes.ok && getRes.result && getRes.result.status === 'success' && getRes.result.rows) {
      const customRow = getRes.result.rows.find((row: any) => row.data && row.data[0] === 'customization');
      const jsonString = JSON.stringify(customization);
      const rowData = ['customization', jsonString];
      const targetRowIndex = customRow ? customRow._rowIndex : null;

      const saveRes = await safeCallGAS(url, 'saveCrud', {
        sheetName: 'Pengaturan',
        rowData,
        rowIndex: targetRowIndex
      });
      if (saveRes.ok && saveRes.result) {
        return saveRes.result;
      }
    }

    return { status: 'success' };
  },
};
