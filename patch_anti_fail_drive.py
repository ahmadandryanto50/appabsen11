with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

# 1. Update header comment with @oauthScope
target_header = """  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT - BACKEND E-ABSENSI SEKOLAH DIGITAL
 * Author: AI Coding Agent & Admin
 * Spreadsheet ID: ID_DARI_URL_SPREADSHEET
 */"""

replacement_header = """  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT - BACKEND E-ABSENSI SEKOLAH DIGITAL
 * Author: AI Coding Agent & Admin
 * Spreadsheet ID: ID_DARI_URL_SPREADSHEET
 * 
 * @oauthScope https://www.googleapis.com/auth/spreadsheets
 * @oauthScope https://www.googleapis.com/auth/drive
 * @oauthScope https://www.googleapis.com/auth/script.external_request
 */"""

if target_header in code:
    code = code.replace(target_header, replacement_header)

# 2. Replace uploadToDrive with anti-fail version
target_upload = """function uploadToDrive(payload) {
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

replacement_upload = """function uploadToDrive(payload) {
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

if target_upload in code:
    code = code.replace(target_upload, replacement_upload)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Patched anti-fail uploadToDrive in AppsScriptView.tsx successfully!")
else:
    print("target_upload not found in AppsScriptView.tsx")

