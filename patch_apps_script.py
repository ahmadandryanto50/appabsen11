import re

with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

switch_code = """      case "saveStudentClassRecap":
        result = saveStudentClassRecap(contents.payload);
        break;
      case "uploadToDrive":
        result = uploadToDrive(contents);
        break;"""

code = code.replace("""      case "saveStudentClassRecap":
        result = saveStudentClassRecap(contents.payload);
        break;""", switch_code)


function_code = """

// ===========================================================================
// FUNGSI UPLOAD BERKAS KE GOOGLE DRIVE
// ===========================================================================

function uploadToDrive(payload) {
  try {
    var base64Data = payload.base64;
    var filename = payload.filename || "Berkas_Baru.png";
    var folderId = payload.folderId; // "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m"
    var uploader = payload.uploader || "Unknown";
    
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch(e) {
      folder = DriveApp.getRootFolder();
    }
    
    // Validasi data base64
    if (!base64Data || base64Data.indexOf(',') === -1) {
      return { status: "error", message: "Data base64 tidak valid." };
    }

    var splitBase = base64Data.split(',');
    var contentTypeMatch = splitBase[0].match(/:(.*?);/);
    var contentType = contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream";
    
    var bytes = Utilities.base64Decode(splitBase[1]);
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
    return { status: "error", message: err.message };
  }
}
"""

if 'uploadToDrive' not in code:
    code = code.replace("""// FUNGSI SETUP OTOMATIS TABEL SPREADSHEET""", function_code + """\n// FUNGSI SETUP OTOMATIS TABEL SPREADSHEET""")
    
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)

