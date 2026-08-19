with open('src/components/BerkasView.tsx', 'r') as f:
    bv_code = f.read()

target = """    try {
      const uploaderName = currentUser?.nama || currentUser?.username || 'Pengguna E-Absensi';
      const res = await apiClient.uploadBerkas(finalFileName, fileBase64, uploaderName);
      
      if (res.status === 'success') {
        setSuccessMsg(res.message || 'Berhasil mengupload berkas ke Google Drive!');
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
      
      if (res.status === 'success' && res.fileUrl) {
        setSuccessMsg(res.message || 'Berkas berhasil diunggah ke Google Drive dan tersimpan di Spreadsheet!');
        setUploadedUrl(res.fileUrl);
        setFileBase64(null);
        setFileName('');
      } else {
        setErrorMsg(`Gagal Upload ke Google Drive: ${res.message || 'Respons Apps Script tidak valid'}`);
        setUploadedUrl('');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal terhubung ke Google Apps Script: ${err.message || 'Koneksi error'}`);
      setUploadedUrl('');
    } finally {
      setIsSubmitting(false);
    }"""

if target in bv_code:
    bv_code = bv_code.replace(target, replacement)
    with open('src/components/BerkasView.tsx', 'w') as f:
        f.write(bv_code)
    print("Updated BerkasView.tsx successfully!")
else:
    print("Target not found in BerkasView.tsx")

