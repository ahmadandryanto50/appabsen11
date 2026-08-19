with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

target_upload_gas = """    // 2. SELALU CATAT KE DATABASE GOOGLE SPREADSHEET (Tabel Data_Berkas)
    var ss = getDb();
    var sheet = ss.getSheetByName("Data_Berkas");
    if (!sheet) {
      sheet = ss.insertSheet("Data_Berkas");
      sheet.appendRow(["Tanggal Upload", "Nama File", "URL Link Berkas", "Pengupload"]);
    }
    
    // Simpan record di Spreadsheet
    sheet.appendRow([new Date(), filename, fileUrl, uploader]);"""

replacement_upload_gas = """    // 2. SELALU CATAT KE DATABASE GOOGLE SPREADSHEET (Tabel Data_Berkas) DENGAN FORMULA HYPERLINK
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
    
    sheet.appendRow([new Date(), filename, cellValue, uploader]);"""

if target_upload_gas in code:
    code = code.replace(target_upload_gas, replacement_upload_gas)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Patched HYPERLINK formula in AppsScriptView.tsx successfully!")
else:
    print("target_upload_gas not found")

