with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

target_func = """function uploadToDrive(payload) {
  try {
    var p = (payload && payload.payload) ? payload.payload : payload;
    if (!p || (!p.base64 && !p.fileBase64)) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = p.base64 || p.fileBase64;
    var filename = p.filename || p.fileName || ("Berkas_" + new Date().getTime() + ".png");
    var uploader = p.uploader || "Unknown";
    var fileUrl = "";

    // 1. Coba Upload ke Google Drive
    try {
      var folder;
      var folderName = "E-Absensi_Berkas";
      var folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
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
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(sErr) {}
      
      fileUrl = file.getUrl();
    } catch (driveErr) {
      // JIKA Google Drive diblokir izin oleh Akun Belajar.id / Workspace,
      // Otomatis simpan gambar/berkas LANGSUNG ke dalam Google Spreadsheet (Tabel Data_Berkas)!
      fileUrl = base64Data;
    }

    // 2. Catat di Spreadsheet (Tabel Data_Berkas)
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL / Data Berkas", "Pengupload"]);
    }
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);

    return { 
      status: "success", 
      fileUrl: fileUrl, 
      message: fileUrl.indexOf("http") === 0 
        ? "Berkas berhasil diupload ke Google Drive & tersimpan di Spreadsheet!" 
        : "Berkas berhasil tersimpan langsung di Spreadsheet (Tabel Data_Berkas)!" 
    };
  } catch (err) {
    return { status: "error", message: "Gagal menyimpan berkas: " + err.message };
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
    var TARGET_FOLDER_ID = "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";
    var fileUrl = "";

    // 1. Hubungkan ke Folder Google Drive Khusus Pilihan Anda
    var folder;
    try {
      if (TARGET_FOLDER_ID) {
        folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
      } else {
        folder = DriveApp.getRootFolder();
      }
    } catch(fErr) {
      try {
        var folders = DriveApp.getFoldersByName("E-Absensi_Berkas");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("E-Absensi_Berkas");
        }
      } catch(fErr2) {
        folder = DriveApp.getRootFolder();
      }
    }

    // 2. Decode Base64 & Simpan File Ke Folder Google Drive Tersebut
    try {
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

      fileUrl = file.getUrl();
    } catch (driveErr) {
      // Cadangan otomatis jika izin drive terhalang
      fileUrl = base64Data;
    }

    // 3. Catat di Spreadsheet (Tabel Data_Berkas)
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL / Data Berkas", "Pengupload"]);
    }
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);

    return { 
      status: "success", 
      fileUrl: fileUrl, 
      message: fileUrl.indexOf("http") === 0 
        ? "Berkas berhasil diupload langsung ke Folder Google Drive Spesifik & tersimpan di Spreadsheet!" 
        : "Berkas berhasil tersimpan di Spreadsheet (Tabel Data_Berkas)!" 
    };
  } catch (err) {
    return { status: "error", message: "Gagal menyimpan berkas: " + err.message };
  }
}"""

if target_func in code:
    code = code.replace(target_func, replacement_func)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Patched target folder ID 1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m in AppsScriptView.tsx successfully!")
else:
    print("target_func not found in AppsScriptView.tsx")

