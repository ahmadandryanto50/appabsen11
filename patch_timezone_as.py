with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

# Replace Session.getScriptTimeZone() with "Asia/Jakarta"
code = code.replace("Session.getScriptTimeZone()", '"Asia/Jakarta"')

with open('src/components/AppsScriptView.tsx', 'w') as f:
    f.write(code)

print("Replaced all Session.getScriptTimeZone() in AppsScriptView.tsx with 'Asia/Jakarta'!")
