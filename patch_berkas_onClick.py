import re

with open('src/components/BerkasView.tsx', 'r') as f:
    code = f.read()

code = code.replace("onClick={startCamera}", "onClick={() => startCamera()}")

with open('src/components/BerkasView.tsx', 'w') as f:
    f.write(code)

