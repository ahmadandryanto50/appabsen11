with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

# 1. Update activeTab type
code = code.replace(
    "const [activeTab, setActiveTab] = useState<'code' | 'guide' | 'schema'>('code');",
    "const [activeTab, setActiveTab] = useState<'code' | 'guide' | 'schema' | 'manifest'>('code');"
)

# 2. Add manifest code state
target_tab_buttons = """        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Struktur Tabel (Headers)</span>
        </button>"""

replacement_tab_buttons = """        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Struktur Tabel (Headers)</span>
        </button>
        <button
          onClick={() => setActiveTab('manifest')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'manifest'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Izin Google Drive (appsscript.json)</span>
        </button>"""

code = code.replace(target_tab_buttons, replacement_tab_buttons)

# 3. Add manifest tab content string
manifest_json = """{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}"""

manifest_render_code = f"""
        {{activeTab === 'manifest' && (
          <div className="space-y-6 animate-fade-in text-slate-600 text-xs sm:text-sm">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Penting Khusus Akun belajar.id / Google Workspace:</span>
                <p className="mt-1">Akun Google Workspace sekolah/organisasi memerlukan file deklarasi izin <code className="bg-amber-100 px-1 rounded font-bold">appsscript.json</code> agar Google Drive mengizinkan pembuatan berkas secara langsung.</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-800">4 Langkah Mudah Mengaktifkan Izin Drive di Apps Script:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 1:</span>
                  <p>Di editor Apps Script, klik ikon <strong>⚙️ Setelan Project</strong> (Project Settings) pada menu bilah kiri.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 2:</span>
                  <p>Centang kotak: <strong>"Tampilkan file manifes 'appsscript.json' di editor"</strong>.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 3:</span>
                  <p>Kembali ke ikon <strong>&lt;&gt; Editor</strong>, klik file <strong>appsscript.json</strong> yang baru muncul di daftar file.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-600">Langkah 4:</span>
                  <p>Hapus isi lamanya, tempel kode JSON di bawah ini, klik <strong>Simpan (Ctrl+S)</strong>, lalu ikuti langkah <strong>Deploy Versi Baru</strong>.</p>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span>appsscript.json (File Manifes Izin Google Drive)</span>
                <button
                  onClick={{() => navigator.clipboard.writeText(`{manifest_json.strip()}`)}}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-sans text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Manifes appsscript.json</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-[11px] text-emerald-400 font-mono leading-relaxed bg-slate-900">
                {manifest_json.strip()}
              </pre>
            </div>
          </div>
        )}}
"""

target_end_tab = "        {activeTab === 'schema' && ("
code = code.replace(target_end_tab, manifest_render_code + "\n\n" + target_end_tab)

with open('src/components/AppsScriptView.tsx', 'w') as f:
    f.write(code)

print("Manifest tab added successfully!")
