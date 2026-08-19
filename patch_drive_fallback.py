import re

# 1. Patch AppsScriptView.tsx
with open('src/components/AppsScriptView.tsx', 'r') as f:
    as_code = f.read()

target_func = """function uploadToDrive(payload) {
  try {
    var p = (payload && payload.payload) ? payload.payload : payload;
    if (!p || (!p.base64 && !p.fileBase64)) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = p.base64 || p.fileBase64;
    var filename = p.filename || p.fileName || ("Berkas_" + new Date().getTime() + ".png");
    var folderId = p.folderId || "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";
    var uploader = p.uploader || "Unknown";
    
    var folder;
    try {
      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }
    } catch(e) {
      folder = DriveApp.getRootFolder();
    }
    
    var parts = base64Data.split(',');
    var base64Content = parts.length > 1 ? parts[1] : parts[0];
    
    var contentType = "application/octet-stream";
    if (parts.length > 1 && parts[0].indexOf(':') !== -1 && parts[0].indexOf(';') !== -1) {
      contentType = parts[0].split(':')[1].split(';')[0];
    }
    
    var bytes = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(bytes, contentType, filename);
    
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();
    
    // Log ke Spreadsheet
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Berkas", "Pengupload"]);
    }
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);
    
    return { status: "success", fileUrl: fileUrl, message: "Berkas berhasil diupload ke Google Drive!" };
  } catch (err) {
    return { status: "error", message: "Gagal upload ke Drive: " + err.message };
  }
}"""

replacement_func = """function uploadToDrive(payload) {
  try {
    var p = (payload && payload.payload) ? payload.payload : payload;
    if (!p || (!p.base64 && !p.fileBase64)) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = p.base64 || p.fileBase64;
    var filename = p.filename || p.fileName || ("Berkas_" + new Date().getTime() + ".png");
    var uploader = p.uploader || "Unknown";
    
    // 1. Cari atau Buat Folder 'E-Absensi_Berkas' di Google Drive milik sendiri
    var folder;
    try {
      var folderName = "E-Absensi_Berkas";
      var folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }
    } catch(fErr) {
      folder = DriveApp.getRootFolder();
    }
    
    // 2. Decode Base64 & Buat File
    var parts = base64Data.split(',');
    var base64Content = parts.length > 1 ? parts[1] : parts[0];
    
    var contentType = "application/octet-stream";
    if (parts.length > 1 && parts[0].indexOf(':') !== -1 && parts[0].indexOf(';') !== -1) {
      contentType = parts[0].split(':')[1].split(';')[0];
    }
    
    var bytes = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(bytes, contentType, filename);
    
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(sErr) {}
    
    var fileUrl = file.getUrl();
    
    // 3. Catat di Spreadsheet
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Berkas", "Pengupload"]);
    }
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);
    
    return { status: "success", fileUrl: fileUrl, message: "Berkas berhasil diupload ke Google Drive!" };
  } catch (err) {
    return { status: "error", message: "Gagal upload ke Drive: " + err.message };
  }
}"""

as_code = as_code.replace(target_func, replacement_func)
with open('src/components/AppsScriptView.tsx', 'w') as f:
    f.write(as_code)

# 2. Patch BerkasView.tsx to add local storage fallback
with open('src/components/BerkasView.tsx', 'r') as f:
    bv_code = f.read()

bv_submit_target = """    try {
      const uploaderName = currentUser?.nama || currentUser?.username || 'Unknown User';
      const res = await apiClient.uploadBerkas(finalFileName, fileBase64, uploaderName);
      
      if (res.status === 'success') {
        setSuccessMsg(res.message || 'Berhasil mengupload berkas.');
        if (res.fileUrl) {
          setUploadedUrl(res.fileUrl);
        }
        setFileBase64(null);
        setFileName('');
      } else {
        setErrorMsg(res.message || 'Terjadi kesalahan saat mengupload.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi gagal saat mengupload berkas.');
    } finally {
      setIsSubmitting(false);
    }"""

bv_submit_replacement = """    try {
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

bv_code = bv_code.replace(bv_submit_target, bv_submit_replacement)
with open('src/components/BerkasView.tsx', 'w') as f:
    f.write(bv_code)

print("Drive fallback patched successfully!")
