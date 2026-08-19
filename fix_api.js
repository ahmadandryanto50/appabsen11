const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

const replacements = [
  {
    regex: /if \(url\) \{\n\s+const \{ ok, result, error \} = await safeCallGAS\(url, 'submitGuruAttendance', \{ payload: cleanPayload \}, false, 0, 60000\);\n\s+if \(ok && result && result\.status === 'success'\) \{\n\s+return result;\n\s+\}\n\s+serverError = error \|\| result\?\.message \|\| 'Gagal terhubung ke database\.';\n\s+\}\n\n\s+if \(serverError\) \{\n\s+return \{ status: 'success', message: `Disimpan secara luring \(offline\) karena: \$\{serverError\}` \};\n\s+\}\n\s+return \{ status: 'success' \};/,
    replacement: `if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitGuruAttendance', { payload: cleanPayload }, false, 0, 60000);
      if (ok && result && result.status === 'success') {
        return result;
      }
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    if (serverError) {
      try {
        const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_GURU_ABSEN) || '[]';
        let history = JSON.parse(rawHistory);
        history = history.filter((item) => String(item.rowIndex) !== String(newRecord.rowIndex));
        localStorage.setItem(STORAGE_KEYS.HISTORY_GURU_ABSEN, JSON.stringify(history));
      } catch (e) {}
      return { status: 'error', message: serverError };
    }
    return { status: 'success' };`
  },
  {
    regex: /if \(url\) \{\n\s+const \{ ok, result, error \} = await safeCallGAS\(url, 'submitTendikAttendance', \{ payload: cleanPayload \}, false, 0, 60000\);\n\s+if \(ok && result && result\.status === 'success'\) \{\n\s+return result;\n\s+\}\n\s+serverError = error \|\| result\?\.message \|\| 'Gagal terhubung ke database\.';\n\s+\}\n\n\s+if \(serverError\) \{\n\s+return \{ status: 'success', message: `Disimpan secara luring \(offline\) karena: \$\{serverError\}` \};\n\s+\}\n\s+return \{ status: 'success' \};/,
    replacement: `if (url) {
      const { ok, result, error } = await safeCallGAS(url, 'submitTendikAttendance', { payload: cleanPayload }, false, 0, 60000);
      if (ok && result && result.status === 'success') {
        return result;
      }
      serverError = error || result?.message || 'Gagal terhubung ke database.';
    }

    if (serverError) {
      try {
        const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN) || '[]';
        let history = JSON.parse(rawHistory);
        history = history.filter((item) => String(item.rowIndex) !== String(newRecord.rowIndex));
        localStorage.setItem(STORAGE_KEYS.HISTORY_TENDIK_ABSEN, JSON.stringify(history));
      } catch (e) {}
      return { status: 'error', message: serverError };
    }
    return { status: 'success' };`
  }
];

replacements.forEach(({regex, replacement}) => {
  code = code.replace(regex, replacement);
});

fs.writeFileSync('src/api.ts', code);
