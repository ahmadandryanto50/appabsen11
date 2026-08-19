import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

if 'FileText' not in code.split('} from \'lucide-react\'')[0]:
    code = code.replace("LogOut,", "LogOut, FileText,")
    with open('src/App.tsx', 'w') as f:
        f.write(code)

