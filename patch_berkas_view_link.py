with open('src/components/BerkasView.tsx', 'r') as f:
    code = f.read()

target = """            {uploadedUrl && (
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-6 py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Lihat Berkas di Drive
              </a>
            )}"""

replacement = """            {uploadedUrl && (
              <div className="mt-4 space-y-2">
                {uploadedUrl.startsWith('http') ? (
                  <a
                    href={uploadedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-md transition-all"
                  >
                    <span>🔗 Buka Berkas di Google Drive</span>
                  </a>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <span>💡 Berkas tersimpan di Database Spreadsheet sebagai Tautan Gambar.</span>
                  </div>
                )}
              </div>
            )}"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/components/BerkasView.tsx', 'w') as f:
        f.write(code)
    print("Updated BerkasView.tsx link rendering successfully!")

