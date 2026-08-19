import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

render_code = """              {/* VIEW 8: BERKAS UPLOAD */}
              {activeView === 'berkas' && (
                <BerkasView currentUser={currentUser} />
              )}
"""

if '<BerkasView' not in code:
    code = code.replace("""              {/* VIEW 7: APPS SCRIPT CODE & GUIDE */}""", render_code + """\n              {/* VIEW 7: APPS SCRIPT CODE & GUIDE */}""")
    
    with open('src/App.tsx', 'w') as f:
        f.write(code)

