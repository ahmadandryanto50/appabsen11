import re

with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

setup_target = """    return { status: "success", message: "Setup Database Berhasil! Seluruh tabel dasar telah dibuat." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}"""

setup_replacement = """    // 14. Tabel Data_Berkas
    let sheetBerkas = ss.getSheetByName("Data_Berkas");
    if (!sheetBerkas) {
      sheetBerkas = ss.insertSheet("Data_Berkas");
      sheetBerkas.appendRow(["Tanggal Upload", "Nama File", "URL Berkas", "Pengupload"]);
    }

    return { status: "success", message: "Setup Database Berhasil! Seluruh tabel dasar telah dibuat." };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

// ===========================================================================
// FUNGSI UPLOAD BERKAS KE GOOGLE DRIVE
// ===========================================================================

function uploadToDrive(payload) {
  try {
    if (!payload || !payload.base64) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = payload.base64;
    var filename = payload.filename || ("Berkas_" + new Date().getTime() + ".png");
    var folderId = payload.folderId || "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";
    var uploader = payload.uploader || "Unknown";
    
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

if setup_target in code and 'function uploadToDrive' not in code:
    code = code.replace(setup_target, setup_replacement)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Patched successfully!")
else:
    print("Target not found or function already exists.")

