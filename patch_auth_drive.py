with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

target = """    return { status: "success", fileUrl: fileUrl, message: "Berkas berhasil diupload ke Google Drive!" };
  } catch (err) {
    return { status: "error", message: "Gagal upload ke Drive: " + err.message };
  }
}"""

replacement = """    return { status: "success", fileUrl: fileUrl, message: "Berkas berhasil diupload ke Google Drive!" };
  } catch (err) {
    return { status: "error", message: "Gagal upload ke Drive: " + err.message };
  }
}

// ===========================================================================
// FUNGSI UNTUK MEMBERIKAN IZIN GOOGLE DRIVE (JALANKAN SEKALI DI APPS SCRIPT EDITOR)
// ===========================================================================

function izinkanAksesGoogleDrive() {
  var folder = DriveApp.getRootFolder();
  Logger.log("Akses Google Drive Berhasil Diberikan! Nama Folder Root: " + folder.getName());
}"""

if target in code and 'function izinkanAksesGoogleDrive' not in code:
    code = code.replace(target, replacement)
    with open('src/components/AppsScriptView.tsx', 'w') as f:
        f.write(code)
    print("Drive auth function added!")

