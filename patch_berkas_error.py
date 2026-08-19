with open('src/components/BerkasView.tsx', 'r') as f:
    bv_code = f.read()

target = """    try {
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
        // Fallback: simpan lokal jika GAS mengalami masalah versi/izin
        const localSavedItems = JSON.parse(localStorage.getItem('local_uploaded_berkas') || '[]');
        const newItem = {
          id: Date.now(),
          filename: finalFileName,
          uploader: uploaderName,
          date: new Date().toLocaleString('id-ID'),
          dataUrl: fileBase64
        };
        localSavedItems.unshift(newItem);
        localStorage.setItem('local_uploaded_berkas', JSON.stringify(localSavedItems));

        setSuccessMsg('Berkas berhasil disimpan di aplikasi! (Catatan: Untuk kirim ke Drive, pastikan Deploy Apps Script menggunakan Versi Baru).');
        setUploadedUrl(fileBase64);
        setFileBase64(null);
        setFileName('');
      }
    } catch (err: any) {
      // Fallback lokal jika jaringan offline / timeout
      const localSavedItems = JSON.parse(localStorage.getItem('local_uploaded_berkas') || '[]');
      const newItem = {
        id: Date.now(),
        filename: finalFileName,
        uploader: currentUser?.nama || 'Pengguna',
        date: new Date().toLocaleString('id-ID'),
        dataUrl: fileBase64
      };
      localSavedItems.unshift(newItem);
      localStorage.setItem('local_uploaded_berkas', JSON.stringify(localSavedItems));

      setSuccessMsg('Berkas berhasil tersimpan secara lokal di aplikasi!');
      setUploadedUrl(fileBase64);
      setFileBase64(null);
      setFileName('');
    } finally {
      setIsSubmitting(false);
    }"""

replacement = """    try {
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

bv_code = bv_code.replace(target, replacement)
with open('src/components/BerkasView.tsx', 'w') as f:
    f.write(bv_code)

print("BerkasView error messaging updated successfully!")
