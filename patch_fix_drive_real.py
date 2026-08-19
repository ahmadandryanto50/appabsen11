import re

# 1. Patch src/api.ts to sanitize backend URL
with open('src/api.ts', 'r') as f:
    api_code = f.read()

target_url_fn = """  getBackendUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.APP_URL) || (import.meta as any).env?.VITE_GAS_URL || '';
  },"""

replacement_url_fn = """  getBackendUrl(): string {
    let url = localStorage.getItem(STORAGE_KEYS.APP_URL) || (import.meta as any).env?.VITE_GAS_URL || '';
    if (!url) return '';
    url = url.trim();
    if (url.includes('/dev')) {
      url = url.replace(/\/dev(\?|$)/, '/exec$1');
    } else if (url.includes('/edit')) {
      url = url.split('/edit')[0] + '/exec';
    }
    return url;
  },"""

if target_url_fn in api_code:
    api_code = api_code.replace(target_url_fn, replacement_url_fn)
    with open('src/api.ts', 'w') as f:
        f.write(api_code)
    print("Sanitized getBackendUrl in api.ts!")

# 2. Patch src/components/BerkasView.tsx
with open('src/components/BerkasView.tsx', 'r') as f:
    bv_code = f.read()

bv_target = """    try {
      const uploaderName = currentUser?.nama || currentUser?.username || 'Pengguna E-Absensi';
      const res = await apiClient.uploadBerkas(finalFileName, fileBase64, uploaderName);
      
      if (res.status === 'success') {
        setSuccessMsg(res.message || 'Berkas berhasil diupload ke Google Drive!');
        if (res.fileUrl) {
          setUploadedUrl(res.fileUrl);
        }
        setFileBase64(null);
        setFileName('');
      } else {
        setErrorMsg(`Gagal Upload ke Google Drive: ${res.message || 'Aksi uploadToDrive tidak didukung oleh versi Apps Script aktif'}.\\n\\nSilakan ikuti 3 langkah mudah di bawah untuk memperbarui versi Deployment di Google Apps Script.`);
      }
    } catch (err: any) {
      setErrorMsg(`Gagal terhubung ke Apps Script: ${err.message || 'Timeout / Koneksi error'}.\\n\\nPastikan URL Database Apps Script di Pengaturan sudah benar dan di-deploy sebagai Versi Baru.`);
    } finally {
      setIsSubmitting(false);
    }"""

bv_replacement = """    try {
      const uploaderName = currentUser?.nama || currentUser?.username || 'Pengguna E-Absensi';
      const res = await apiClient.uploadBerkas(finalFileName, fileBase64, uploaderName);
      
      if (res.status === 'success' && res.fileUrl) {
        setSuccessMsg(res.message || 'Berkas berhasil diunggah ke Google Drive dan tersimpan di Spreadsheet!');
        setUploadedUrl(res.fileUrl);
        setFileBase64(null);
        setFileName('');
      } else {
        setErrorMsg(`Gagal Upload ke Google Drive: ${res.message || 'Terjadi kesalahan pada Google Apps Script.'}`);
        setUploadedUrl('');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal terhubung ke Google Apps Script: ${err.message || 'Koneksi error'}. Pastikan URL Apps Script di Pengaturan sudah benar.`);
      setUploadedUrl('');
    } finally {
      setIsSubmitting(false);
    }"""

if bv_target in bv_code:
    bv_code = bv_code.replace(bv_target, bv_replacement)
    with open('src/components/BerkasView.tsx', 'w') as f:
        f.write(bv_code)
    print("Updated BerkasView.tsx upload handler!")

