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

  if (!localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN)) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const defaultHistoryTendik = [
      {
        rowIndex: 2,
        tanggal: today,
        waktu: '06:45:00',
        nip: '19850312201001',
        namaTendik: 'Bambang Suryono, S.Kom.',
        photo: '',
      }
    ];
    localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(defaultHistoryTendik));
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
      const { ok, result } = await safeCallGAS(url, 'getCrud', { sheetName }, true, 600000); // 10 minutes cache
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
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result } = await safeCallGAS(url, 'saveCrud', { sheetName, rowData, rowIndex });
      if (ok && result) return result;
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
    clearApiCache();
    const url = this.getBackendUrl();
    if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'deleteCrud', { sheetName, rowIndex });
      if (ok && result) return result;
      if (error) return { status: 'error', message: error };
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
