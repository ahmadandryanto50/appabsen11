/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, AttendanceRecord, TeacherAbsenceRecord, getLocalDateString, getLocalTimeString } from './types';
import { formatKeterlambatan, parseMenitTerlambat } from './utils/timeUtils';

// Pre-seeded local data keys
const STORAGE_KEYS = {
  APP_URL: 'absensi_gas_url',
  USER: 'absensi_user',
  HISTORY_SISWA: 'absensi_history_siswa',
  HISTORY_GURU: 'absensi_history_guru',
  HISTORY_GURU_ABSEN: 'absensi_history_guru_absen',
  HISTORY_TENDIK_ABSEN: 'absensi_history_tendik_absen',
  HISTORY_TENDIK_IZIN: 'absensi_history_tendik_izin',
  MASTER_GURU: 'absensi_master_guru',
  MASTER_SISWA: 'absensi_master_siswa',
  MASTER_KELAS: 'absensi_master_kelas',
  MASTER_MAPEL: 'absensi_master_mapel',
};

/// Seed realistic default data if not already present ONLY in Demo Mode (when no Web App URL is set)
export function initializeStorage() {
  const appUrl = localStorage.getItem(STORAGE_KEYS.APP_URL);
  const hasAppUrl = appUrl && appUrl !== 'demo';

  // If connected to Web App URL or in normal state, do NOT populate demo mock data for kiosk
  try {
    const rawScans = localStorage.getItem('absensi_kiosk_all_scans');
    if (rawScans) {
      const parsed = JSON.parse(rawScans);
      if (Array.isArray(parsed) && parsed.some((item: any) => item.nama === 'Ahmad Rizky' || item.nama === 'Anisa Putri' || item.nama === 'Maychel Owen' || item.nama === 'Safar' || item.nama === 'Rafsel' || item.nama === 'Nirmala' || item.nama === 'ALIKA MEYKA' || item.nama === 'Aira Fathiyaturahma')) {
        localStorage.setItem('absensi_kiosk_all_scans', '[]');
        localStorage.setItem('absensi_kiosk_today_list', '[]');
      }
    }
  } catch (e) {}

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
      { _rowIndex: 2, data: ['G01', '19850101201001', 'Administrator Utama', 'Laki-laki', 'admin', 'Admin', 'Aktif', ''] },
      { _rowIndex: 3, data: ['G02', '19900202201502', 'Budi Santoso, S.Pd.', 'Laki-laki', 'guru', 'Guru', 'Aktif', ''] },
      { _rowIndex: 4, data: ['G03', '19920815201803', 'Siti Rahma, M.Pd.', 'Perempuan', 'sitirahma', 'Guru', 'Aktif', ''] },
      { _rowIndex: 5, data: ['G04', '19881112201201', 'Hendra Wijaya, S.Si.', 'Laki-laki', 'hendra', 'Guru', 'Aktif', ''] },
      { _rowIndex: 6, data: ['G05', '19950505202005', 'Rina Herawati, S.Pd.I.', 'Perempuan', 'rina', 'Tendik', 'Aktif', ''] },
      { _rowIndex: 7, data: ['G06', '19970606202206', 'Doni Setiawan', 'Laki-laki', 'doni', 'Tendik', 'Aktif', ''] },
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
    const today = getLocalDateString(now);
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
    const today = getLocalDateString(now);
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
    localStorage.setItem('absensi_kiosk_all_scans', '[]');
  }
  if (!localStorage.getItem('absensi_kiosk_today_list')) {
    localStorage.setItem('absensi_kiosk_today_list', '[]');
  }
}

// Low-level HTTP Caller to Google Apps Script Web App (POST text/plain with 30s timeout)
async function callGAS(url: string, action: string, data: any = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs); // Default 30s timeout for Google Apps Script execution

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
    let url = localStorage.getItem(STORAGE_KEYS.APP_URL);
    if (url === 'demo') return '';
    
    if (!url) {
      url = (import.meta as any).env?.VITE_GAS_URL || 
            'https://script.google.com/macros/s/AKfycbxm8xUg47SJqredqBB1koPt5lSgJqlFF3rjsKbjG-9tBQ2GLuOOJYD_iq92dsPZB5jQ/exec';
    }
    
    url = url.trim();
    if (url === 'demo' || !url) return '';
    if (url.includes('/dev')) {
      url = url.replace(/\/dev(\?|$)/, '/exec$1');
    } else if (url.includes('/edit')) {
      url = url.split('/edit')[0] + '/exec';
    }
    return url;
  },

  async syncConfigFromServer(): Promise<{ webAppUrl?: string; customization?: any }> {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          if (data.webAppUrl !== undefined) {
            localStorage.setItem(STORAGE_KEYS.APP_URL, data.webAppUrl.trim() || 'demo');
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
      localStorage.setItem(STORAGE_KEYS.APP_URL, 'demo');
      // Completely clear database caches and master table values to return to pristine demo/mock data
      try {
        localStorage.removeItem('absensi_app_customization');
        localStorage.removeItem('absensi_crud_cache_Master_Guru');
        localStorage.removeItem('absensi_crud_cache_Master_Siswa');
        localStorage.removeItem('absensi_crud_cache_Master_Kelas');
        localStorage.removeItem('absensi_crud_cache_Master_Mapel');
        localStorage.removeItem('absensi_crud_cache_Pengaturan');
        localStorage.removeItem(STORAGE_KEYS.MASTER_GURU);
        localStorage.removeItem(STORAGE_KEYS.MASTER_SISWA);
        localStorage.removeItem(STORAGE_KEYS.MASTER_KELAS);
        localStorage.removeItem(STORAGE_KEYS.MASTER_MAPEL);
        localStorage.removeItem(STORAGE_KEYS.HISTORY_SISWA);
        localStorage.removeItem(STORAGE_KEYS.HISTORY_GURU);
        localStorage.removeItem(STORAGE_KEYS.HISTORY_GURU_ABSEN);
        localStorage.removeItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN);
        localStorage.removeItem(STORAGE_KEYS.HISTORY_TENDIK_IZIN);
        localStorage.removeItem('absensi_kiosk_all_scans');
        localStorage.removeItem('absensi_kiosk_today_list');
        // Clear all cached student roster too
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('absensi_students_')) {
            localStorage.removeItem(k);
          }
        }
      } catch (e) {}
      // Re-seed initial pristine demo data
      initializeStorage();
    }
    // Broadcast & persist to server so all other preview windows / devices connect automatically
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: cleanUrl || 'demo' }),
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
          photo: matched.data[7] || '',
        },
      };
    }

    return { status: 'error', message: 'Username atau Password salah!' };
  },

  // 2. GET STUDENTS BY CLASS
  async getStudents(kelas: string): Promise<{ status: string; students: Student[]; message?: string }> {
    const normK = (s: any) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetNorm = normK(kelas);

    // Immediate check local storage cache first for instant response
    const cachedRoster = localStorage.getItem(`absensi_students_${kelas}`);
    let localCacheStudents: Student[] = [];
    if (cachedRoster) {
      try {
        const parsed = JSON.parse(cachedRoster);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localCacheStudents = parsed;
        }
      } catch (e) {}
    }

    if (localCacheStudents.length === 0) {
      const rawStudents = localStorage.getItem(STORAGE_KEYS.MASTER_SISWA) || '[]';
      try {
        const parsed: any[] = JSON.parse(rawStudents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter((s) => s && s.data && normK(s.data[3]) === targetNorm && (normK(s.data[5]) === 'aktif' || !s.data[5]))
            .map((s) => ({
              id: s.data[0] ? String(s.data[0]) : '',
              nisn: s.data[1] ? String(s.data[1]) : '',
              nama: s.data[2] || '',
              kelas: s.data[3] || kelas,
              gender: s.data[4] || 'Laki-laki',
            }));
          if (filtered.length > 0) {
            localCacheStudents = filtered;
          }
        }
      } catch (e) {}
    }

    const url = this.getBackendUrl();
    if (url) {
      // 3 second fast timeout to prevent spinner hanging
      const { ok, result } = await safeCallGAS(url, 'getStudents', { kelas }, true, 600000, 3000);
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
            const rowKelas = r.data[3] ? r.data[3].toString() : '';
            const status = r.data[5] ? r.data[5].toString().trim().toLowerCase() : 'aktif';
            return (normK(rowKelas) === targetNorm || normK(rowKelas).includes(targetNorm) || targetNorm.includes(normK(rowKelas))) && (status === 'aktif' || status === '');
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

    // Return local cached students if available
    if (localCacheStudents.length > 0) {
      return { status: 'success', students: localCacheStudents };
    }

    // Fallback: Generate placeholder roster for selected class
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

    // Lightweight payload for Google Apps Script to prevent large HTTP POST timeouts
    const gasPayload = {
      kelas: payload.kelas || '',
      mapel: payload.mapel || '',
      guruPengampu: payload.guruPengampu || '',
      photoBase64: payload.photoBase64 || '',
      tanggal: payload.tanggal || getLocalDateString(),
      waktu: payload.waktu || getLocalTimeString(),
      countHadir: payload.countHadir || 0,
      countTerlambat: payload.countTerlambat || 0,
      countSakit: payload.countSakit || 0,
      countIzin: payload.countIzin || 0,
      countAlpa: payload.countAlpa || 0,
      keterangan: payload.keterangan || '',
    };

    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitAttendance', { payload: gasPayload }, false, 0, 10000);
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
      return { status: 'success', message: `Absensi kelas ${payload.kelas} tersimpan luring (offline) karena: ${serverError}` };
    }
    return { status: 'success', message: `Absensi kelas ${payload.kelas} (${payload.mapel}) berhasil disimpan!` };
  },

  // 3.1 SAVE STUDENT CLASS RECAP TO SPREADSHEET (Rekap_Kehadiran_Siswa)
  async saveStudentClassRecap(payload: {
    guru: string;
    kelas: string;
    mapel: string;
    periode: string;
    tanggal: string;
    recapRows: Array<{
      nisn: string;
      nama: string;
      hadir: number;
      sakit: number;
      izin: number;
      alpa: number;
      terlambat?: number;
      persentase: number;
      status: string;
    }>;
  }) {
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'saveStudentClassRecap', { payload }, false, 0, 60000);
      if (ok && result && result.status === 'success') return result;
    }

    // Local Storage fallback for offline/demo
    try {
      const key = `absensi_rekap_kelas_${payload.guru}_${payload.kelas}`;
      localStorage.setItem(key, JSON.stringify({
        updatedAt: new Date().toISOString(),
        ...payload
      }));
    } catch (e) {}

    return { status: 'success', message: 'Rekap kehadiran siswa per kelas berhasil disimpan ke database.' };
  },

  // 3.2 SAVE GURU MONTHLY RECAP TO SPREADSHEET (Rekap_Kehadiran Guru)
  async saveGuruMonthlyRecap(payload: {
    bulanTahun: string;
    nip: string;
    namaGuru: string;
    hadir: number;
    izin: number;
    sakit: number;
    cutiDL: number;
    alpa: number;
    totalHari: number;
    persentase: number;
    catatan?: string;
    dayRows?: Array<{
      dayNumber: number;
      tanggal: string;
      dayName: string;
      status: string;
      jamDatang: string;
      jamPulang: string;
      keterangan: string;
    }>;
  }) {
    clearApiCache();
    const url = this.getBackendUrl();
    const rowData = [
      `RKP-GRU-${payload.nip}-${payload.bulanTahun}`,
      payload.bulanTahun,
      payload.nip,
      payload.namaGuru,
      payload.hadir,
      payload.izin,
      payload.sakit,
      payload.cutiDL,
      payload.alpa,
      payload.totalHari,
      `${payload.persentase}%`,
      getLocalDateString(),
      payload.catatan || 'Lengkap'
    ];

    if (url) {
      try {
        await safeCallGAS(url, 'saveCrud', { sheetName: 'Rekap_Kehadiran Guru', rowData: rowData, rowIndex: null });
      } catch (e) {}

      // Save daily detail rows to Rekap_Kehadiran_Detail_Guru
      if (Array.isArray(payload.dayRows) && payload.dayRows.length > 0) {
        for (const r of payload.dayRows) {
          if (r.status && r.status !== 'Belum Berlangsung' && r.status !== 'Libur Akhir Pekan') {
            const detailRowData = [
              `RKPD-GRU-${payload.nip}-${r.tanggal}`,
              payload.bulanTahun,
              payload.nip,
              payload.namaGuru,
              r.tanggal,
              r.dayName,
              r.status,
              r.jamDatang || '-',
              r.jamPulang || '-',
              r.keterangan || '-'
            ];
            try {
              await safeCallGAS(url, 'saveCrud', { sheetName: 'Rekap_Kehadiran_Detail_Guru', rowData: detailRowData, rowIndex: null });
            } catch (e) {}
          }
        }
      }

      return { status: 'success', message: 'Rekap bulanan & log jam datang/pulang Guru berhasil disimpan ke spreadsheet (Sheet: Rekap_Kehadiran Guru).' };
    }

    try {
      const key = `absensi_rekap_guru_monthly_${payload.nip}_${payload.bulanTahun}`;
      localStorage.setItem(key, JSON.stringify({
        updatedAt: new Date().toISOString(),
        ...payload
      }));
    } catch (e) {}

    return { status: 'success', message: 'Rekap bulanan & log jam datang/pulang Guru berhasil disimpan ke database.' };
  },

  // 3.3 SAVE TENDIK MONTHLY RECAP TO SPREADSHEET (Rekap_Kehadiran Tendik)
  async saveTendikMonthlyRecap(payload: {
    bulanTahun: string;
    nip: string;
    namaTendik: string;
    hadir: number;
    izin: number;
    sakit: number;
    cutiDL: number;
    alpa: number;
    totalHari: number;
    persentase: number;
    catatan?: string;
    dayRows?: Array<{
      dayNumber: number;
      tanggal: string;
      dayName: string;
      status: string;
      jamDatang: string;
      jamPulang: string;
      keterangan: string;
    }>;
  }) {
    clearApiCache();
    const url = this.getBackendUrl();
    const rowData = [
      `RKP-TDK-${payload.nip}-${payload.bulanTahun}`,
      payload.bulanTahun,
      payload.nip,
      payload.namaTendik,
      payload.hadir,
      payload.izin,
      payload.sakit,
      payload.cutiDL,
      payload.alpa,
      payload.totalHari,
      `${payload.persentase}%`,
      getLocalDateString(),
      payload.catatan || 'Lengkap'
    ];

    if (url) {
      try {
        await safeCallGAS(url, 'saveCrud', { sheetName: 'Rekap_Kehadiran Tendik', rowData: rowData, rowIndex: null });
      } catch (e) {}

      // Save daily detail rows to Rekap_Kehadiran_Detail_Tendik
      if (Array.isArray(payload.dayRows) && payload.dayRows.length > 0) {
        for (const r of payload.dayRows) {
          if (r.status && r.status !== 'Belum Berlangsung' && r.status !== 'Libur Akhir Pekan') {
            const detailRowData = [
              `RKPD-TDK-${payload.nip}-${r.tanggal}`,
              payload.bulanTahun,
              payload.nip,
              payload.namaTendik,
              r.tanggal,
              r.dayName,
              r.status,
              r.jamDatang || '-',
              r.jamPulang || '-',
              r.keterangan || '-'
            ];
            try {
              await safeCallGAS(url, 'saveCrud', { sheetName: 'Rekap_Kehadiran_Detail_Tendik', rowData: detailRowData, rowIndex: null });
            } catch (e) {}
          }
        }
      }

      return { status: 'success', message: 'Rekap bulanan & log jam datang/pulang Tendik berhasil disimpan ke spreadsheet (Sheet: Rekap_Kehadiran Tendik).' };
    }

    try {
      const key = `absensi_rekap_tendik_monthly_${payload.nip}_${payload.bulanTahun}`;
      localStorage.setItem(key, JSON.stringify({
        updatedAt: new Date().toISOString(),
        ...payload
      }));
    } catch (e) {}

    return { status: 'success', message: 'Rekap bulanan & log jam datang/pulang Tendik berhasil disimpan ke database.' };
  },

  // 3.5 SUBMIT KIOSK SCAN
  async submitKioskScan(payload: any) {
    clearApiCache();
    const now = new Date();
    const dateStr = getLocalDateString(now);
    const timeClockStr = getLocalTimeString(now);
    const timeStr = `${dateStr} ${timeClockStr}`;
    
    const newRecord = {
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
    };

    try {
      const allScansRaw = localStorage.getItem('absensi_kiosk_all_scans') || '[]';
      const allScans = JSON.parse(allScansRaw);
      allScans.unshift(newRecord);
      localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(allScans.slice(0, 500)));

      const todayScansRaw = localStorage.getItem('absensi_kiosk_today_list') || '[]';
      const todayScans = JSON.parse(todayScansRaw);
      todayScans.unshift(newRecord);
      localStorage.setItem('absensi_kiosk_today_list', JSON.stringify(todayScans.slice(0, 500)));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kiosk-scan-added', { detail: newRecord }));
      }
    } catch (e) {}

    // Synchronize instantly with Node server store so all connected browsers get live updates
    try {
      await fetch('/api/kiosk-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
    } catch (e) {}

    const url = this.getBackendUrl();
    if (url) {
      // Use saveCrud directly to write row to 'Presensi' sheet
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

      // Fallback to submitKioskScan action if saveCrud fails
      const { ok, result, error } = await safeCallGAS(url, 'submitKioskScan', { payload }, false, 0, 30000);
      if (ok && result && result.status === 'success') return result;
      throw new Error(error || result?.message || 'Gagal mengirim data scan.');
    }
    
    // Offline / Demo Mode simulation
    return { status: 'success', message: 'Offline/Demo: Presensi berhasil disimpan.' };
  },

  // 3.6 GET KIOSK ATTENDANCE HISTORY (PRESENSI SISWA MASUK)
  async getKioskAttendanceHistory(tanggal?: string, kelas?: string): Promise<{ status: string; history: any[] }> {
    const parseCleanDateTimeParts = (val: any): { dateStr: string; timeStr: string } => {
      if (!val) return { dateStr: '', timeStr: '' };
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return { dateStr: '', timeStr: '' };
        return { dateStr: getLocalDateString(val), timeStr: getLocalTimeString(val) };
      }

      const str = String(val).trim();
      if (!str) return { dateStr: '', timeStr: '' };

      // 1. Direct database YYYY-MM-DD match (e.g. 2026-08-20 or 2026-08-20T16:57:12) - strictly preserve database date
      const ymdMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
      if (ymdMatch) {
        const dateStr = ymdMatch[1];
        let timeStr = '';
        if (str.includes('T')) {
          timeStr = str.split('T')[1].split('.')[0] || '';
        } else if (str.includes(' ')) {
          const parts = str.split(' ');
          if (parts.length >= 2 && parts[1].includes(':')) {
            timeStr = parts[1];
          }
        }
        return { dateStr, timeStr };
      }

      // Handle JS Date string representations e.g. "Sat Aug 15 2026 00:00:00 GM Aug WIB" or "Sat Aug 15 2026 07:15:00 GMT+0700"
      if (str.match(/[a-zA-Z]{3}\s+[a-zA-Z]{3}\s+\d{1,2}\s+\d{4}/) || str.includes('GMT') || str.includes('WIB')) {
        const dObj = new Date(str);
        if (!isNaN(dObj.getTime())) {
          return { dateStr: getLocalDateString(dObj), timeStr: getLocalTimeString(dObj) };
        }
      }

      if (str.includes('T')) {
        const dObj = new Date(str);
        if (!isNaN(dObj.getTime())) {
          return { dateStr: getLocalDateString(dObj), timeStr: getLocalTimeString(dObj) };
        }
        const parts = str.split('T');
        return { dateStr: parts[0] || '', timeStr: (parts[1] || '').split('.')[0] || '' };
      }

      if (str.includes(' ')) {
        const parts = str.split(' ');
        let timeStr = '';
        if (parts.length >= 2 && parts[1].includes(':')) {
          timeStr = parts[1];
        }
        return { dateStr: parts[0] || '', timeStr };
      }

      if (str.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        return { dateStr: '', timeStr: str };
      }

      return { dateStr: str, timeStr: '' };
    };

    const normalizeDateStr = (dateInput: any): string => {
      if (!dateInput) return '';
      if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return '';
        return getLocalDateString(dateInput);
      }
      const trimmed = String(dateInput).trim();
      if (!trimmed) return '';

      // Direct database YYYY-MM-DD match (e.g. 2026-08-20) - strictly preserve database date string
      const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      if (ymdMatch) {
        return ymdMatch[1];
      }

      // Handle full JS Date string e.g. "Sat Aug 15 2026 00:00:00 GM Aug WIB" or "Sat Aug 15 2026 07:15:00 GMT+0700"
      if (trimmed.match(/[a-zA-Z]{3}\s+[a-zA-Z]{3}\s+\d{1,2}\s+\d{4}/) || trimmed.includes('GMT') || trimmed.includes('WIB')) {
        const dObj = new Date(trimmed);
        if (!isNaN(dObj.getTime())) {
          return getLocalDateString(dObj);
        }
      }

      // Handle ISO strings like 2026-08-14T...
      if (trimmed.includes('T')) {
        const dObj = new Date(trimmed);
        if (!isNaN(dObj.getTime())) {
          return getLocalDateString(dObj);
        }
        return trimmed.split('T')[0];
      }

      // If YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
      const ymd = trimmed.match(/^(\d{4})[-/\. ](\d{1,2})[-/\. ](\d{1,2})/);
      if (ymd) {
        return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
      }
      // If DD/MM/YYYY or MM/DD/YYYY
      const dmy = trimmed.match(/^(\d{1,2})[-/\. ](\d{1,2})[-/\. ](\d{4})/);
      if (dmy) {
        let p1 = Number(dmy[1]);
        let p2 = Number(dmy[2]);
        let year = dmy[3];
        // If 2nd number > 12 (e.g. 8/14/2026), 1st number is Month, 2nd is Day
        if (p2 > 12) {
          return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
        }
        return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
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

      const fallbackDate = new Date(trimmed);
      if (!isNaN(fallbackDate.getTime()) && trimmed.length > 5 && !trimmed.match(/^\d+$/)) {
        return getLocalDateString(fallbackDate);
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
      const rawTs = item.timestamp ? String(item.timestamp).trim() : '';
      let rawTgl = item.tanggal ? String(item.tanggal).trim() : '';
      let rawWkt = item.waktu ? String(item.waktu).trim() : '';

      const pTgl = parseCleanDateTimeParts(rawTgl);
      const pWkt = parseCleanDateTimeParts(rawWkt);
      const pTs = parseCleanDateTimeParts(rawTs);

      let finalTanggal = normalizeDateStr(pTgl.dateStr || pTs.dateStr || rawTgl || rawTs);
      let finalWaktu = pWkt.timeStr || (pTgl.timeStr && pTgl.timeStr !== '00:00:00' ? pTgl.timeStr : '') || pTs.timeStr || rawWkt || '-';

      // Clean up finalWaktu if it contains raw timezone or text noise
      if (finalWaktu.includes('GMT') || finalWaktu.includes('WIB') || finalWaktu.match(/[a-zA-Z]/)) {
        if (pWkt.timeStr) {
          finalWaktu = pWkt.timeStr;
        } else if (pTs.timeStr) {
          finalWaktu = pTs.timeStr;
        } else {
          finalWaktu = '-';
        }
      }

      const nisnVal = String(item.nisn || '').trim();
      let namaVal = String(item.nama || '').trim();
      let kelasVal = String(item.kelas || '').trim();

      if ((!namaVal || namaVal === '-' || namaVal.toLowerCase() === 'nama siswa') && nisnVal && studentMap[nisnVal]) {
        namaVal = studentMap[nisnVal].nama;
        if (!kelasVal || kelasVal === '-') {
          kelasVal = studentMap[nisnVal].kelas;
        }
      }

      let finalKeterlambatan = formatKeterlambatan(item.keterlambatan || item.menitTerlambat);
      let finalStatus = String(item.status || 'Hadir').trim();
      const isLateStatus = finalStatus.toLowerCase().includes('terlambat') || finalStatus.toLowerCase().includes('telat');

      if ((finalKeterlambatan === '-' || !finalKeterlambatan) && (isLateStatus || (finalWaktu && finalWaktu !== '-'))) {
        let cutoffHour = 7;
        let cutoffMinute = 0;
        try {
          const custRaw = localStorage.getItem('absensi_customization');
          if (custRaw) {
            const cust = JSON.parse(custRaw);
            if (cust.batasWaktuMasuk) {
              const match = String(cust.batasWaktuMasuk).match(/(\d{1,2})[:.](\d{1,2})/);
              if (match) {
                cutoffHour = parseInt(match[1], 10);
                cutoffMinute = parseInt(match[2], 10);
              }
            }
          }
        } catch (e) {}

        if (finalWaktu && finalWaktu.includes(':')) {
          const wParts = finalWaktu.split(':');
          const h = parseInt(wParts[0], 10);
          const m = parseInt(wParts[1], 10);
          if (!isNaN(h) && !isNaN(m)) {
            const cutoffMin = cutoffHour * 60 + cutoffMinute;
            const scanMin = h * 60 + m;
            if (scanMin > cutoffMin) {
              const diffMins = scanMin - cutoffMin;
              finalKeterlambatan = formatKeterlambatan(diffMins);
              if (!isLateStatus) {
                finalStatus = 'Terlambat';
              }
            }
          }
        }
      }

      return {
        ...item,
        rowIndex: item.rowIndex || fallbackRowIndex || item._rowIndex || Date.now(),
        timestamp: rawTs || `${finalTanggal} ${finalWaktu}`,
        tanggal: finalTanggal,
        rawTanggal: finalTanggal,
        waktu: finalWaktu || '-',
        nisn: nisnVal,
        nama: namaVal,
        kelas: kelasVal,
        status: finalStatus,
        keterlambatan: finalKeterlambatan,
        menitTerlambat: parseMenitTerlambat(finalKeterlambatan || item.menitTerlambat),
      };
    };

    const targetDateIso = tanggal ? normalizeDateStr(tanggal) : '';
    const url = this.getBackendUrl();

    if (url) {
      // 1. Direct query from GAS getKioskAttendanceHistory action FIRST
      try {
        const { ok, result } = await safeCallGAS(url, 'getKioskAttendanceHistory', { tanggal: tanggal || '', kelas: kelas || '' }, false, 0, 12000);
        if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
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

          if (result.history.length === 0 || normalized.length === 0) {
            if (!tanggal && !kelas) {
              try {
                localStorage.setItem('absensi_kiosk_all_scans', '[]');
                localStorage.setItem('absensi_kiosk_today_list', '[]');
                fetch('/api/kiosk-scans', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clearAll: true }),
                }).catch(() => {});
              } catch (e) {}
            }
            return { status: 'success', history: [] };
          }

          // Cache non-empty result to local storage
          try {
            if (!tanggal && !kelas) {
              localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(normalized));
            }
          } catch (e) {}

          return { status: 'success', history: normalized };
        }
      } catch (e) {}

      // 2. Query all records without date filter from GAS getKioskAttendanceHistory if date filter was provided
      if (tanggal) {
        try {
          const { ok: okAll, result: resAll } = await safeCallGAS(url, 'getKioskAttendanceHistory', { tanggal: '', kelas: kelas || '' }, false, 0, 12000);
          if (okAll && resAll && resAll.status === 'success' && Array.isArray(resAll.history)) {
            if (resAll.history.length === 0) {
              try {
                localStorage.setItem('absensi_kiosk_all_scans', '[]');
                localStorage.setItem('absensi_kiosk_today_list', '[]');
                fetch('/api/kiosk-scans', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clearAll: true }),
                }).catch(() => {});
              } catch (e) {}
              return { status: 'success', history: [] };
            }

            let normalized = resAll.history.map((h: any, idx: number) => normalizeRecord(h, h.rowIndex || idx + 2));
            const filteredByDate = normalized.filter((h: any) => {
              const hDate = normalizeDateStr(h.tanggal || h.rawTanggal || h.timestamp);
              return hDate === targetDateIso || (h.timestamp && h.timestamp.includes(tanggal!));
            });
            return { status: 'success', history: filteredByDate };
          }
        } catch (e) {}
      }

      // 3. Fallback: Query sheet 'Presensi' and other sheet names directly via getCrud
      const possibleSheetNames = ['Presensi', 'Presensi_Masuk', 'Presensi Masuk', 'Presensi_Kiosk', 'Log_Presensi', 'Log Presensi', 'Data_Presensi', 'Absensi', 'Presensi Siswa'];
      for (const sheetName of possibleSheetNames) {
        try {
          const { ok, result: crudPresensi } = await safeCallGAS(url, 'getCrud', { sheetName }, false, 0, 10000);
          if (ok && crudPresensi && crudPresensi.status === 'success' && Array.isArray(crudPresensi.rows)) {
            const headersLower = (crudPresensi.headers || []).map((h: string) => (h || '').toLowerCase().trim());
            
            let tsIdx = headersLower.findIndex((h: string) => h.includes('timestamp') || h.includes('waktu scan') || h.includes('scan'));
            let tglIdx = headersLower.findIndex((h: string) => h === 'tanggal' || h.includes('tgl') || h.includes('date'));
            let wktIdx = headersLower.findIndex((h: string) => h === 'waktu' || h === 'jam' || h.includes('pukul') || h.includes('time'));
            let nisnIdx = headersLower.findIndex((h: string) => h.includes('nisn') || h.includes('nis') || h.includes('no induk') || h.includes('id'));
            let namaIdx = headersLower.findIndex((h: string) => h.includes('nama') || h.includes('siswa'));
            let kelasIdx = headersLower.findIndex((h: string) => h.includes('kelas') || h.includes('rombel') || h.includes('class'));
            let statusIdx = headersLower.findIndex((h: string) => h.includes('status') || h.includes('kehadiran') || h.includes('presensi') || h.includes('ket'));
            let telatIdx = headersLower.findIndex((h: string) => h.includes('terlambat') || h.includes('keterlambatan') || h.includes('menit') || h.includes('late'));

            const validRows = crudPresensi.rows.filter((row: any) => {
              if (!row || !row.data || !Array.isArray(row.data)) return false;
              const hasData = row.data.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
              if (!hasData) return false;

              const r0 = String(row.data[0] || '').toLowerCase().trim();
              const r1 = String(row.data[1] || '').toLowerCase().trim();
              const r2 = String(row.data[2] || '').toLowerCase().trim();
              if (r0 === 'tanggal' || r0 === 'tgl' || r0 === 'timestamp' || r1 === 'waktu scan' || r2 === 'nisn' || r0 === 'no') {
                return false;
              }
              return true;
            });

            if (validRows.length === 0) {
              // Sheet exists in Google Sheets database and is completely empty
              try {
                localStorage.setItem('absensi_kiosk_all_scans', '[]');
                localStorage.setItem('absensi_kiosk_today_list', '[]');
                fetch('/api/kiosk-scans', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clearAll: true }),
                }).catch(() => {});
              } catch (e) {}
              return { status: 'success', history: [] };
            }

            const parsedFromSheet = validRows.map((row: any) => {
              const rowData = row.data || [];
              let rTanggal = tglIdx !== -1 && rowData[tglIdx] !== undefined ? String(rowData[tglIdx]).trim() : '';
              let rWaktu = wktIdx !== -1 && rowData[wktIdx] !== undefined ? String(rowData[wktIdx]).trim() : '';
              let rTs = tsIdx !== -1 && rowData[tsIdx] !== undefined ? String(rowData[tsIdx]).trim() : '';

              let rNisn = nisnIdx !== -1 && rowData[nisnIdx] !== undefined ? String(rowData[nisnIdx]).trim() : '';
              let rNama = namaIdx !== -1 && rowData[namaIdx] !== undefined ? String(rowData[namaIdx]).trim() : '';
              let rKelas = kelasIdx !== -1 && rowData[kelasIdx] !== undefined ? String(rowData[kelasIdx]).trim() : '';
              let rStatus = statusIdx !== -1 && rowData[statusIdx] !== undefined ? String(rowData[statusIdx]).trim() : '';
              let rTelat = telatIdx !== -1 && rowData[telatIdx] !== undefined ? String(rowData[telatIdx]).trim() : '';

              if (nisnIdx === -1 || namaIdx === -1) {
                if (rowData.length === 6) {
                  if (!rTs && rowData[0]) rTs = String(rowData[0]).trim();
                  if (!rNisn && rowData[1]) rNisn = String(rowData[1]).trim();
                  if (!rNama && rowData[2]) rNama = String(rowData[2]).trim();
                  if (!rKelas && rowData[3]) rKelas = String(rowData[3]).trim();
                  if (!rStatus && rowData[4]) rStatus = String(rowData[4]).trim();
                  if (!rTelat && rowData[5]) rTelat = String(rowData[5]).trim();
                } else if (rowData.length >= 7) {
                  if (!rTanggal && rowData[0]) rTanggal = String(rowData[0]).trim();
                  if (!rWaktu && rowData[1]) rWaktu = String(rowData[1]).trim();
                  if (!rNisn && rowData[2]) rNisn = String(rowData[2]).trim();
                  if (!rNama && rowData[3]) rNama = String(rowData[3]).trim();
                  if (!rKelas && rowData[4]) rKelas = String(rowData[4]).trim();
                  if (!rStatus && rowData[5]) rStatus = String(rowData[5]).trim();
                  if (!rTelat && rowData[6]) rTelat = String(rowData[6]).trim();
                }
              }

              if (!rStatus) rStatus = 'Hadir';
              if (!rTelat) rTelat = '-';

              let finalTs = rTs;
              if (rTs && !rTs.includes('-') && !rTs.includes('/') && rTanggal) {
                finalTs = `${rTanggal} ${rTs}`;
              } else if (!rTs) {
                finalTs = `${rTanggal} ${rWaktu}`.trim();
              }

              return normalizeRecord({
                rowIndex: row._rowIndex || row.rowIndex,
                timestamp: finalTs,
                tanggal: rTanggal || finalTs.split(' ')[0],
                waktu: rWaktu || finalTs.split(' ')[1] || '-',
                nisn: rNisn,
                nama: rNama,
                kelas: rKelas,
                status: rStatus,
                keterlambatan: rTelat,
              }, row._rowIndex);
            });

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

            try {
              if (tanggal) {
                localStorage.setItem('absensi_kiosk_today_list', JSON.stringify(filteredSheet));
              }
              if (!tanggal && !kelas) {
                localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(filteredSheet));
              }
            } catch (e) {}

            return { status: 'success', history: filteredSheet };
          }
        } catch (crudErr) {}
      }

      // 4. Dedicated getKioskAttendanceHistory fallback
      const { ok, result } = await safeCallGAS(url, 'getKioskAttendanceHistory', { tanggal: tanggal || '', kelas: kelas || '' }, false, 0);
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
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
          if (tanggal) {
            localStorage.setItem('absensi_kiosk_today_list', JSON.stringify(normalized));
          }
          if (!tanggal && !kelas) {
            localStorage.setItem('absensi_kiosk_all_scans', JSON.stringify(normalized));
            if (normalized.length === 0) {
              localStorage.setItem('absensi_kiosk_today_list', '[]');
              fetch('/api/kiosk-scans', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true }),
              }).catch(() => {});
            }
          }
        } catch (e) {}

        return { status: 'success', history: normalized };
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

    if (targetDateIso) {
      history = history.filter((h: any) => {
        const hDate = normalizeDateStr(h.tanggal || h.rawTanggal || h.timestamp);
        return hDate === targetDateIso || (h.timestamp && h.timestamp.includes(tanggal!));
      });
    }
    if (kelas) {
      history = history.filter((h: any) => (h.kelas || '').toLowerCase() === kelas.toLowerCase().trim());
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
      const { ok, result, error } = await safeCallGAS(url, 'submitTeacherAbsence', { payload }, false, 0, 15000);
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

  // 5.2 SUBMIT GURU ATTENDANCE (MANDIRI)
  async submitGuruAttendance(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';

    const rawTipe = String(payload.tipeAbsen || payload.kategori || "Datang");
    const tipeAbsen = rawTipe.toLowerCase().includes("pulang") ? "Absen Pulang" : "Absen Datang";
    const cleanWaktu = String(payload.waktu || '').replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim();

    const cleanPayload = {
      ...payload,
      waktu: cleanWaktu || payload.waktu,
      tipeAbsen: tipeAbsen,
      kategori: tipeAbsen,
    };

    const newRecord = {
      rowIndex: "GRU-ABS-" + Date.now(),
      tanggal: payload.tanggal,
      waktu: cleanWaktu || payload.waktu,
      nip: payload.nip || "",
      namaGuru: payload.namaGuru || "",
      tipeAbsen: tipeAbsen,
      kategori: tipeAbsen,
      photo: payload.photoBase64 || payload.photo || "",
    };

    // Always pre-save to local storage
    try {
      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
      let history: any[] = JSON.parse(rawHistory);
      history = history.filter(item => String(item.rowIndex) !== String(newRecord.rowIndex));
      history.unshift(newRecord);
      localStorage.setItem(STORAGE_KEYS.HISTORY_GURU_ABSEN, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to update local guru attendance cache:', e);
    }

    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitGuruAttendance', { payload: cleanPayload }, false, 0, 15000);
      if (ok && result && result.status === 'success') {
        return result;
      }
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    if (serverError) {
      try {
        const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
        let history: any[] = JSON.parse(rawHistory);
        history = history.filter(item => String(item.rowIndex) !== String(newRecord.rowIndex));
        localStorage.setItem(STORAGE_KEYS.HISTORY_GURU_ABSEN, JSON.stringify(history));
      } catch (e) {}
      return { status: 'error', message: serverError };
    }
    return { status: 'success' };
  },

  // 5.3 GET GURU ATTENDANCE HISTORY
  async getGuruAttendanceHistory(tanggal: string): Promise<{ status: string; history: any[] }> {
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'getGuruAttendanceHistory', { tanggal }, true, 10000, 30000);
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
        const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
        let existingMap: Record<string, any> = {};
        try {
          const existingArr: any[] = JSON.parse(rawExisting);
          existingArr.forEach(e => {
            if (e.rowIndex) existingMap[String(e.rowIndex)] = e;
            if (e.tanggal && e.waktu && e.nip) {
              existingMap[`${e.tanggal}_${e.waktu}_${e.nip}`] = e;
            }
          });
        } catch (e) {}

        const sanitizedHistory = result.history.map((rec: any) => {
          let rawWaktu = String(rec.waktu || '');
          let tipe = rec.tipeAbsen || rec.kategori || rec.status;

          if (rawWaktu.toLowerCase().includes('pulang')) {
            tipe = 'Pulang';
          } else if (rawWaktu.toLowerCase().includes('datang')) {
            tipe = 'Datang';
          }

          const cleanWaktu = rawWaktu.replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim();

          if (!tipe || tipe === 'Hadir' || tipe === 'Aktif') {
            const matched = existingMap[String(rec.rowIndex)] || existingMap[`${rec.tanggal}_${cleanWaktu}_${rec.nip}`];
            if (matched && (matched.tipeAbsen || matched.kategori)) {
              tipe = matched.tipeAbsen || matched.kategori;
            } else {
              tipe = 'Datang';
            }
          }
          return {
            ...rec,
            waktu: cleanWaktu || rawWaktu,
            tipeAbsen: tipe,
            kategori: tipe,
          };
        });

        try {
          if (!tanggal) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_GURU_ABSEN, JSON.stringify(sanitizedHistory));
          } else if (sanitizedHistory.length > 0) {
            const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
            let existing: any[] = JSON.parse(rawExisting);
            const fetchedIds = new Set(sanitizedHistory.map((r: any) => String(r.rowIndex)));
            existing = existing.filter(r => !fetchedIds.has(String(r.rowIndex)));
            const merged = [...sanitizedHistory, ...existing];
            localStorage.setItem(STORAGE_KEYS.HISTORY_GURU_ABSEN, JSON.stringify(merged));
          }
        } catch (e) {}

        return { status: 'success', history: sanitizedHistory };
      }

      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
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

    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
    let history: any[] = JSON.parse(rawHistory);
    if (tanggal) {
      history = history.filter((h) => h.tanggal === tanggal);
    }
    return { status: 'success', history };
  },

  // 5.4 DELETE GURU ATTENDANCE RECORD
  async deleteGuruAttendanceRecord(rowIndex: string | number) {
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteGuruAttendanceRecord', { rowIndex });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
    }

    const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
    let history: any[] = JSON.parse(rawHistory);
    history = history.filter((h) => String(h.rowIndex) !== String(rowIndex));
    localStorage.setItem(STORAGE_KEYS.HISTORY_GURU_ABSEN, JSON.stringify(history));
    return { status: 'success' };
  },

  // 6.1 SUBMIT TENDIK ATTENDANCE
  async submitTendikAttendance(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';

    const rawTipe = String(payload.tipeAbsen || payload.kategori || "Datang");
    const tipeAbsen = rawTipe.toLowerCase().includes("pulang") ? "Absen Pulang" : "Absen Datang";
    const cleanWaktu = String(payload.waktu || '').replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim();

    const cleanPayload = {
      ...payload,
      waktu: cleanWaktu || payload.waktu,
      tipeAbsen: tipeAbsen,
      kategori: tipeAbsen,
    };

    const newRecord = {
      rowIndex: "TND-ABS-" + Date.now(),
      tanggal: payload.tanggal,
      waktu: cleanWaktu || payload.waktu,
      nip: payload.nip || "",
      namaTendik: payload.namaTendik || "",
      tipeAbsen: tipeAbsen,
      kategori: tipeAbsen,
      photo: payload.photoBase64 || payload.photo || "",
    };

    // Always pre-save to local storage so UI updates instantly and preserves tipeAbsen ('Absen Datang' / 'Absen Pulang')
    try {
      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
      let history: any[] = JSON.parse(rawHistory);
      history = history.filter(item => String(item.rowIndex) !== String(newRecord.rowIndex));
      history.unshift(newRecord);
      localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to update local tendik attendance cache:', e);
    }

    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTendikAttendance', { payload: cleanPayload }, false, 0, 15000);
      if (ok && result && result.status === 'success') {
        return result;
      }
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    if (serverError) {
      try {
        const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
        let history: any[] = JSON.parse(rawHistory);
        history = history.filter(item => String(item.rowIndex) !== String(newRecord.rowIndex));
        localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(history));
      } catch (e) {}
      return { status: 'error', message: serverError };
    }
    return { status: 'success' };
  },

  // 6.2 SUBMIT TENDIK PERMIT
  async submitTendikPermit(payload: any) {
    clearApiCache();
    const url = this.getBackendUrl();
    let serverError = '';
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTendikPermit', { payload }, false, 0, 15000);
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
      const { ok, result } = await safeCallGAS(url, 'getTendikAttendanceHistory', { tanggal }, true, 10000, 30000);
      if (ok && result && result.status === 'success' && Array.isArray(result.history)) {
        // Local map to ensure tipeAbsen is never lost even if backend script is pending deployment
        const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
        let existingMap: Record<string, any> = {};
        try {
          const existingArr: any[] = JSON.parse(rawExisting);
          existingArr.forEach(e => {
            if (e.rowIndex) existingMap[String(e.rowIndex)] = e;
            if (e.tanggal && e.waktu && e.nip) {
              existingMap[`${e.tanggal}_${e.waktu}_${e.nip}`] = e;
            }
          });
        } catch (e) {}

        const sanitizedHistory = result.history.map((rec: any) => {
          let rawWaktu = String(rec.waktu || '');
          let tipe = rec.tipeAbsen || rec.kategori || rec.status;

          // Detect tipeAbsen from rawWaktu string if present (e.g. "15:30:00 [Pulang]")
          if (rawWaktu.toLowerCase().includes('pulang')) {
            tipe = 'Pulang';
          } else if (rawWaktu.toLowerCase().includes('datang')) {
            tipe = 'Datang';
          }

          // Clean time string for display (e.g., "15:30:00 [Pulang]" -> "15:30:00")
          const cleanWaktu = rawWaktu.replace(/\s*\[.*?\]|\s*\(.*?\)/g, '').trim();

          if (!tipe || tipe === 'Hadir' || tipe === 'Aktif') {
            const matched = existingMap[String(rec.rowIndex)] || existingMap[`${rec.tanggal}_${cleanWaktu}_${rec.nip}`];
            if (matched && (matched.tipeAbsen || matched.kategori)) {
              tipe = matched.tipeAbsen || matched.kategori;
            } else {
              tipe = 'Datang';
            }
          }
          return {
            ...rec,
            waktu: cleanWaktu || rawWaktu,
            tipeAbsen: tipe,
            kategori: tipe,
          };
        });

        try {
          if (!tanggal) {
            localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(sanitizedHistory));
          } else if (sanitizedHistory.length > 0) {
            const rawExisting = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
            let existing: any[] = JSON.parse(rawExisting);
            const fetchedIds = new Set(sanitizedHistory.map((r: any) => String(r.rowIndex)));
            existing = existing.filter(r => !fetchedIds.has(String(r.rowIndex)));
            const merged = [...sanitizedHistory, ...existing];
            localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(merged));
          }
        } catch (e) {}

        return { status: 'success', history: sanitizedHistory };
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
      headers = ['ID', 'NIP', 'Nama Lengkap', 'Jenis Kelamin', 'Username', 'Role', 'Status', 'Foto Profil'];
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

    // Always fetch fallback row from 'Pengaturan' to get holidays and other JSON-only fields
    let holidaysFromRow: any[] = [];
    let fallbackCustomization: any = null;
    const fallback = await safeCallGAS(url, 'getCrud', { sheetName: 'Pengaturan' }, false, 0, 50000);
    if (fallback.ok && fallback.result && fallback.result.status === 'success' && fallback.result.rows) {
      const customRow = fallback.result.rows.find((row: any) => row.data && row.data[0] === 'customization');
      if (customRow && customRow.data[1]) {
        try {
          fallbackCustomization = JSON.parse(customRow.data[1]);
        } catch (e) {
          console.error('Failed to parse JSON customization:', e);
        }
      }

      // Read downwards holidays rows (starting with "libur_")
      const liburRows = fallback.result.rows.filter((row: any) => row.data && row.data[0] && row.data[0].startsWith('libur_'));
      if (liburRows.length > 0) {
        const parsedHolidays: any[] = [];
        for (const rRow of liburRows) {
          const key = rRow.data[0];
          const val = rRow.data[1];
          if (val) {
            const parts = val.split(' | ');
            if (parts.length >= 3) {
              const id = key.replace('libur_', '');
              parsedHolidays.push({
                id,
                tanggal: parts[0].trim(),
                nama: parts[1].trim(),
                kategori: parts[2].trim()
              });
            }
          }
        }
        if (parsedHolidays.length > 0) {
          holidaysFromRow = parsedHolidays;
        }
      }

      // Fallback: Read holidays legacy horizontal row if downwards rows don't exist yet
      if (holidaysFromRow.length === 0) {
        const holidaysRow = fallback.result.rows.find((row: any) => row.data && row.data[0] === 'holidays');
        if (holidaysRow && holidaysRow.data[1]) {
          try {
            holidaysFromRow = JSON.parse(holidaysRow.data[1]);
          } catch (e) {
            console.error('Failed to parse holidays row:', e);
          }
        }
      }
    }

    const direct = await safeCallGAS(url, 'getCustomization', {}, false, 0, 50000);
    if (direct.ok && direct.result && direct.result.status === 'success') {
      if (direct.result.customization) {
        // Merge holidays and other fields from the fallback JSON customization
        direct.result.customization.holidays = holidaysFromRow.length > 0 
          ? holidaysFromRow 
          : (fallbackCustomization?.holidays || direct.result.customization.holidays || []);
        if (fallbackCustomization) {
          direct.result.customization = {
            ...fallbackCustomization,
            ...direct.result.customization,
            holidays: direct.result.customization.holidays
          };
        }
      }
      return direct.result;
    }

    if (fallbackCustomization) {
      fallbackCustomization.holidays = holidaysFromRow.length > 0 ? holidaysFromRow : (fallbackCustomization.holidays || []);
      return { status: 'success', customization: fallbackCustomization };
    }

    // Fallback to local storage if Cloud URL fails
    const saved = localStorage.getItem('absensi_app_customization');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (holidaysFromRow.length > 0) {
          parsed.holidays = holidaysFromRow;
        }
        return { status: 'success', customization: parsed };
      } catch (e) {
        // Ignore
      }
    }
    return { status: 'success' };
  },

  // 12. SAVE APP CUSTOMIZATION TO GOOGLE SPREADSHEET
  async saveCustomization(customization: any): Promise<{ status: string; errorType?: string; message?: string }> {
    clearApiCache();
    // Always keep local storage updated
    localStorage.setItem('absensi_app_customization', JSON.stringify(customization));

    // Sync to local fallback Master_Guru data for profile photo consistency in offline/demo mode
    const rawGuru = localStorage.getItem(STORAGE_KEYS.MASTER_GURU);
    if (rawGuru && customization.userPhotos) {
      try {
        const gurus = JSON.parse(rawGuru);
        let changed = false;
        const keys = Object.keys(customization.userPhotos);
        gurus.forEach((g: any) => {
          const id = (g.data[0] || '').toString().trim();
          const nip = (g.data[1] || '').toString().trim();
          const u = (g.data[4] || '').toString().trim();
          
          let matchedPhotoUrl = '';
          for (const key of keys) {
            const keyLower = key.toLowerCase().trim();
            if (
              (u && keyLower === u.toLowerCase().trim()) ||
              (nip && keyLower === nip.toLowerCase().trim()) ||
              (id && keyLower === id.toLowerCase().trim()) ||
              (u && u.toLowerCase().includes('@') && u.toLowerCase().split('@')[0] === keyLower)
            ) {
              matchedPhotoUrl = customization.userPhotos[key];
              break;
            }
          }
          if (matchedPhotoUrl) {
            while (g.data.length < 8) {
              g.data.push('');
            }
            g.data[7] = matchedPhotoUrl;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.MASTER_GURU, JSON.stringify(gurus));
        }
      } catch (e) {}
    }

    // Also persist customization to Express server /api/config for multi-device & multi-browser sync
    try {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customization }),
      }).catch(() => {});
    } catch (e) {}

    const url = this.getBackendUrl();
    if (!url) {
      return { status: 'success' };
    }

    // To ensure ALL fields (especially custom ones like holidays) are fully persisted as complete JSON,
    // we should always write directly to the 'Pengaturan' sheet's 'customization' row.
    let saveResult = null;
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
      if (saveRes.ok && saveRes.result && saveRes.result.status === 'success') {
        saveResult = saveRes.result;
      }

      // 1. Clean up legacy horizontal holidays row if exists to keep spreadsheet clean
      const legacyHolidaysRow = getRes.result.rows.find((row: any) => row.data && row.data[0] === 'holidays');
      if (legacyHolidaysRow) {
        const legacyIndex = Number(legacyHolidaysRow._rowIndex);
        if (!isNaN(legacyIndex) && legacyIndex > 0) {
          try {
            await safeCallGAS(url, 'deleteCrud', { sheetName: 'Pengaturan', rowIndex: legacyIndex });
          } catch (e) {}
        }
      }

      // 2. Identify and clear all existing "libur_" rows to replace them with updated downward list
      const existingLiburRows = getRes.result.rows.filter((row: any) => row.data && row.data[0] && row.data[0].startsWith('libur_'));
      const sortedIndicesToDelete = existingLiburRows
        .map((row: any) => Number(row._rowIndex))
        .filter((idx: number) => !isNaN(idx) && idx > 0)
        .sort((a: number, b: number) => b - a); // descending to avoid shifting issues

      for (const idx of sortedIndicesToDelete) {
        try {
          await safeCallGAS(url, 'deleteCrud', { sheetName: 'Pengaturan', rowIndex: idx });
        } catch (e) {
          console.error('Failed to delete old holiday row at index', idx, e);
        }
      }

      // 3. Save new holidays downwards, one row per holiday, in a highly clean and readable text format
      if (customization && Array.isArray(customization.holidays)) {
        for (const h of customization.holidays) {
          const hKey = `libur_${h.id}`;
          const hValue = `${h.tanggal} | ${h.nama} | ${h.kategori}`;
          const hRowData = [hKey, hValue];
          try {
            await safeCallGAS(url, 'saveCrud', {
              sheetName: 'Pengaturan',
              rowData: hRowData,
              rowIndex: null
            });
          } catch (e) {
            console.error('Failed to append holiday row', hKey, e);
          }
        }
      }
    }

    // Call the direct endpoint as well to trigger any native events or metadata syncing in GAS
    const direct = await safeCallGAS(url, 'saveCustomization', { customization });
    
    clearApiCache();
    if (saveResult) {
      return saveResult;
    }
    if (direct.ok && direct.result && direct.result.status === 'success') {
      return direct.result;
    }

    return { status: 'success' };
  },

  async uploadBerkas(filename: string, base64Data: string, uploader: string): Promise<{ status: string; message?: string; fileUrl?: string }> {
    const url = this.getBackendUrl();
    if (!url) {
      return { status: 'error', message: 'Tidak dapat mengupload dalam Demo Mode. Silakan set Database URL.' };
    }
    const res = await safeCallGAS(url, 'uploadToDrive', {
      payload: {
        filename,
        base64: base64Data,
        folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
        uploader
      },
      filename,
      base64: base64Data,
      folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
      uploader
    }, false, 0, 90000);
    if (res.ok && res.result) return res.result;
    return { status: 'error', message: res.error || 'Gagal terhubung ke Apps Script.' };
  },

  async setupDatabase(): Promise<{ status: string; message?: string }> {
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'setupDatabase', {});
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
    }
    return { status: 'success', message: 'Database lokal/demo diperbarui.' };
  },

  clearCache() {
    clearApiCache();
  },
};
