with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

# Update inialisasiDanIzinAksesSemuaGCP
target_init = """function inialisasiDanIzinAksesSemuaGCP() {
  var ss = getDb();
  var drive = DriveApp.getRootFolder();
  // PENTING: Panggilan createFile ini MEMAKSA Google meminta izin FULL WRITE (https://www.googleapis.com/auth/drive)
  try {
    var tempFile = drive.createFile("temp_permission_check.txt", "Pemeriksaan Izin Drive");
    tempFile.setTrashed(true);
  } catch(e) {}
  Logger.log("Izin Akses LENGKAP Google Drive (Membuat File) & Sheets Berhasil!");
  return setupDatabase();
}"""

replacement_init = """function inialisasiDanIzinAksesSemuaGCP() {
  var ss = getDb();
  // PENTING: Panggilan createFile langsung ini MEMAKSA Google meminta Izin Akses LENGKAP ke Google Drive (https://www.googleapis.com/auth/drive)
  var folderTarget;
  try {
    folderTarget = DriveApp.getFolderById("1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m");
  } catch(e) {
    folderTarget = DriveApp.getRootFolder();
  }
  var testFile = folderTarget.createFile("Pemeriksaan_Izin_Drive.txt", "Izin Akses Google Drive Berhasil Diberikan pada " + new Date());
  testFile.setTrashed(true);
  
  Logger.log("Izin Akses LENGKAP Google Drive & Sheets BERHASIL DIBERIKAN!");
  return setupDatabase();
}"""

if target_init in code:
    code = code.replace(target_init, replacement_init)

# Update uploadToDrive
target_upload = """function uploadToDrive(payload) {
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
    var isDriveDirect = false;

    // 1. COBA UNGGAH LANGSUNG KE GOOGLE DRIVE
    try {
      var folder;
      if (TARGET_FOLDER_ID && TARGET_FOLDER_ID.trim() !== "") {
        folder = DriveApp.getFolderById(TARGET_FOLDER_ID.trim());
      } else {
        folder = buatFolderOtomatisDrive();
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
      isDriveDirect = true;
    } catch(driveErr) {
      // JIKA Google Drive memblokir DriveApp (karena akun belajar.id/policy):
      // Tetap simpan sebagai URL Link Berkas yang bisa dibuka
      fileUrl = base64Data;
      isDriveDirect = false;
    }

    // 2. SELALU CATAT KE DATABASE GOOGLE SPREADSHEET (Tabel Data_Berkas) DENGAN FORMULA HYPERLINK
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Link Berkas", "Pengupload"]);
    }
    
    // Jika fileUrl berupa link http(s), buat rumus HYPERLINK agar di Spreadsheet BISA DIKLIK LANGSUNG
    var cellValue = fileUrl;
    if (fileUrl && fileUrl.indexOf("http") === 0) {
      cellValue = '=HYPERLINK("' + fileUrl + '", "🔗 Buka Berkas di Drive")';
    } else if (fileUrl && fileUrl.indexOf("data:") === 0) {
      cellValue = "File Gambar Terkompresi (Base64)";
    }
    
    sheet.appendRow([new Date(), filename, cellValue, uploader]);

    return { 
      status: "success", 
      fileUrl: fileUrl, 
      isDriveDirect: isDriveDirect,
      message: isDriveDirect 
        ? "Berkas berhasil tersimpan di Google Drive & dicatat di Database!" 
        : "Berkas berhasil tersimpan sebagai Link Berkas di Database Spreadsheet!" 
    };
  } catch (err) {
    return { status: "error", message: "Gagal menyimpan berkas: " + err.message };
  }
}"""

replacement_upload = """function uploadToDrive(payload) {
  try {
    var p = (payload && payload.payload) ? payload.payload : payload;
    if (!p || (!p.base64 && !p.fileBase64)) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = p.base64 || p.fileBase64;
    var filename = p.filename || p.fileName || ("Berkas_" + new Date().getTime() + ".png");
    var uploader = p.uploader || "Unknown";
    var TARGET_FOLDER_ID = "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";

    // 1. CARI / BUAT FOLDER TARGET DI GOOGLE DRIVE
    var folder;
    try {
      if (TARGET_FOLDER_ID && TARGET_FOLDER_ID.trim() !== "") {
        folder = DriveApp.getFolderById(TARGET_FOLDER_ID.trim());
      } else {
        folder = buatFolderOtomatisDrive();
      }
    } catch(fErr) {
      folder = buatFolderOtomatisDrive();
    }

    // 2. SIMPAN BERKAS FISIK KE GOOGLE DRIVE
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

    // 3. CATAT KE DATABASE GOOGLE SPREADSHEET (Tabel Data_Berkas) DENGAN RUMUS HYPERLINK AKTIF BISA DIKLIK
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Link Berkas", "Pengupload"]);
    }
    
    // Formula =HYPERLINK("URL", "URL") memastikan Google Sheets menjadikannya LINK AKTIF YANG BISA DIKLIK 100%
    var formulaHyperlink = '=HYPERLINK("' + fileUrl + '", "' + fileUrl + '")';
    sheet.appendRow([new Date(), filename, formulaHyperlink, uploader]);

    return { 
      status: "success", 
      fileUrl: fileUrl, 
      message: "Berkas berhasil terupload ke Google Drive & URL Link Aktif tersimpan di Spreadsheet!" 
    };
  } catch (err) {
    return { 
      status: "error", 
      message: "Gagal menyimpan ke Google Drive (" + err.message + "). Silakan jalankan fungsi 'inialisasiDanIzinAksesSemuaGCP' di Editor Apps Script 1 kali untuk memberikan izin Drive!" 
    };
  }
}"""

if target_upload in code:
    code = code.replace(target_upload, replacement_upload)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Patched AppsScriptView.tsx successfully!")
else:
    print("target_upload not found")

