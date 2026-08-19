import re

with open('src/types.ts', 'r') as f:
    code = f.read()

if "'berkas'" not in code:
    code = code.replace("  | 'apps-script';", "  | 'apps-script'\n  | 'berkas';")
    with open('src/types.ts', 'w') as f:
        f.write(code)

