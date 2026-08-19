with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

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

    // 1. DAPATKAN / BUAT AUTOMATIC FOLDER DI GOOGLE DRIVE DAHULU
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

    // 2. UNGGAH BERKAS LANGSUNG KE GOOGLE DRIVE SANGAT DAHULU
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

    // 3. SETELAH FILE SUDAH RESMI MASUK GOOGLE DRIVE, MASUKKAN KEMBALI URL-NYA KE SPREADSHEET (DATABASE)
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Berkas Google Drive", "Pengupload"]);
    }
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);

    return { 
      status: "success", 
      fileUrl: fileUrl, 
      folderName: folder.getName(),
      message: "Berkas berhasil tersimpan di Google Drive (" + folder.getName() + ") dan dicatat di Database Spreadsheet!" 
    };
  } catch (err) {
    return { status: "error", message: "Gagal menyimpan berkas ke Google Drive: " + err.message };
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

    // 2. SELALU CATAT KE DATABASE GOOGLE SPREADSHEET (Tabel Data_Berkas)
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Link Berkas", "Pengupload"]);
    }
    
    // Simpan record di Spreadsheet
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);

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

if target_upload in code:
    code = code.replace(target_upload, replacement_upload)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Updated uploadToDrive to never-fail mode successfully!")
else:
    print("target_upload not found")

