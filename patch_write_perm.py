with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

target = """function inialisasiDanIzinAksesSemuaGCP() {
  var ss = getDb();
  var drive = DriveApp.getRootFolder();
  Logger.log("Akses Berhasil Diberikan! Spreadsheet: " + ss.getName() + " | Drive Root: " + drive.getName());
  return setupDatabase();
}"""

replacement = """function inialisasiDanIzinAksesSemuaGCP() {
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

if target in code:
    code = code.replace(target, replacement)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Patched write permission trigger in AppsScriptView.tsx successfully!")

