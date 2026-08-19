with open('src/components/AppsScriptView.tsx', 'r') as f:
    code = f.read()

target_pre = """              <pre className="p-4 overflow-x-auto text-[11px] text-emerald-400 font-mono leading-relaxed bg-slate-900">
                {
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
}
              </pre>"""

replacement_pre = """              <pre className="p-4 overflow-x-auto text-[11px] text-emerald-400 font-mono leading-relaxed bg-slate-900">
{`{
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
}`}
              </pre>"""

code = code.replace(target_pre, replacement_pre)

# Also fix copy button onClick in JSX
target_copy = """onClick={() => navigator.clipboard.writeText(`{
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
}`)}"""

replacement_copy = """onClick={() => navigator.clipboard.writeText(`{\\n  "timeZone": "Asia/Jakarta",\\n  "dependencies": {},\\n  "exceptionLogging": "STACKDRIVER",\\n  "runtimeVersion": "V8",\\n  "webapp": {\\n    "executeAs": "USER_DEPLOYING",\\n    "access": "ANYONE"\\n  },\\n  "oauthScopes": [\\n    "https://www.googleapis.com/auth/spreadsheets",\\n    "https://www.googleapis.com/auth/drive",\\n    "https://www.googleapis.com/auth/script.external_request"\\n  ]\\n}`)}"""

code = code.replace(target_copy, replacement_copy)

with open('src/components/AppsScriptView.tsx', 'w') as f:
    f.write(code)

print("Fixed manifest JSX!")
