import re

with open('src/api.ts', 'r') as f:
    code = f.read()

# For Guru
guru_regex = r"if \(url\) \{\s*const \{ ok, result, error \} = await safeCallGAS\(url, 'submitGuruAttendance', \{ payload: cleanPayload \}, false, 0, 60000\);\s*if \(ok && result && result\.status === 'success'\) \{\s*return result;\s*\}\s*serverError = error \|\| result\?\.message \|\| 'Gagal terhubung ke database\.';\s*\}\s*if \(serverError\) \{\s*return \{ status: 'success', message: `Disimpan secara luring \(offline\) karena: \$\{serverError\}` \};\s*\}\s*return \{ status: 'success' \};"
guru_repl = """if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitGuruAttendance', { payload: cleanPayload }, false, 0, 60000);
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
    return { status: 'success' };"""

code = re.sub(guru_regex, guru_repl, code, count=1)

# For Tendik
tendik_regex = r"if \(url\) \{\s*const \{ ok, result, error \} = await safeCallGAS\(url, 'submitTendikAttendance', \{ payload: cleanPayload \}, false, 0, 60000\);\s*if \(ok && result && result\.status === 'success'\) \{\s*return result;\s*\}\s*serverError = error \|\| result\?\.message \|\| 'Gagal terhubung ke database\.';\s*\}\s*if \(serverError\) \{\s*return \{ status: 'success', message: `Disimpan secara luring \(offline\) karena: \$\{serverError\}` \};\s*\}\s*return \{ status: 'success' \};"
tendik_repl = """if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTendikAttendance', { payload: cleanPayload }, false, 0, 60000);
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
    return { status: 'success' };"""

code = re.sub(tendik_regex, tendik_repl, code, count=1)

with open('src/api.ts', 'w') as f:
    f.write(code)

