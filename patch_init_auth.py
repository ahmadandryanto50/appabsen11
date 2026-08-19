with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

target = """function getDb() {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "" && SPREADSHEET_ID !== "ID_DARI_URL_SPREADSHEET") {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    Logger.log("Error opening spreadsheet: " + err.message);
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}"""

replacement = """function getDb() {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "" && SPREADSHEET_ID !== "ID_DARI_URL_SPREADSHEET") {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    Logger.log("Error opening spreadsheet: " + err.message);
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

// ===========================================================================
// FUNGSI SATU-KLIK: INISIALISASI DATABASE & OTORISASI IZIN GOOGLE DRIVE + SHEETS
// (JALANKAN FUNGSI INI 1x DENGAN MENGLIK 'JALANKAN' DI EDITOR APPS SCRIPT)
// ===========================================================================
function inialisasiDanIzinAksesSemuaGCP() {
  var ss = getDb();
  var drive = DriveApp.getRootFolder();
  Logger.log("Akses Berhasil Diberikan! Spreadsheet: " + ss.getName() + " | Drive Root: " + drive.getName());
  return setupDatabase();
}"""

if target in code and 'function inialisasiDanIzinAksesSemuaGCP' not in code:
    code = code.replace(target, replacement)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Added inialisasiDanIzinAksesSemuaGCP successfully!")

