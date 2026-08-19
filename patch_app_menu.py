import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

menu_code = """                    </button>

                    <button
                      onClick={() => {
                        setActiveView('berkas');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeView === 'berkas'
                          ? `${customization.logoColor || 'bg-blue-600'} text-white shadow`
                          : 'hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span>Upload Berkas</span>
                    </button>"""

if 'Upload Berkas' not in code:
    code = code.replace("""                    </button>

                    {currentUser?.role === 'Admin' && (""", menu_code + """\n\n                    {currentUser?.role === 'Admin' && (""")
    
    with open('src/App.tsx', 'w') as f:
        f.write(code)

