import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

import_code = """import { BerkasView } from './components/BerkasView';\n"""

if 'import { BerkasView }' not in code:
    code = code.replace("import { AppsScriptView }", "import { AppsScriptView }\nimport { BerkasView }")
    with open('src/App.tsx', 'w') as f:
        f.write(code)

