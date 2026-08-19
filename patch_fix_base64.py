import re

# 1. Patch src/api.ts
with open('src/api.ts', 'r') as f:
    api_code = f.read()

target_api = """    const res = await safeCallGAS(url, 'uploadToDrive', {
      filename,
      base64: base64Data,
      folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
      uploader
    });"""

replacement_api = """    const res = await safeCallGAS(url, 'uploadToDrive', {
      payload: {
        filename,
        base64: base64Data,
        folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
        uploader
      },
      filename,
      base64: base64Data,
      folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
      uploader
    });"""

api_code = api_code.replace(target_api, replacement_api)
with open('src/api.ts', 'w') as f:
    f.write(api_code)

# 2. Patch src/components/AppsScriptView.tsx
with open('src/components/AppsScriptView.tsx', 'r') as f:
    as_code = f.read()

as_code = as_code.replace(
    'case "uploadToDrive":\n        result = uploadToDrive(contents.payload);',
    'case "uploadToDrive":\n        result = uploadToDrive(contents.payload || contents);'
)

upload_func_target = """function uploadToDrive(payload) {
  try {
    if (!payload || !payload.base64) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = payload.base64;
    var filename = payload.filename || ("Berkas_" + new Date().getTime() + ".png");
    var folderId = payload.folderId || "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";
    var uploader = payload.uploader || "Unknown";"""

upload_func_replacement = """function uploadToDrive(payload) {
  try {
    var p = (payload && payload.payload) ? payload.payload : payload;
    if (!p || (!p.base64 && !p.fileBase64)) {
      return { status: "error", message: "Data file (base64) tidak ditemukan." };
    }

    var base64Data = p.base64 || p.fileBase64;
    var filename = p.filename || p.fileName || ("Berkas_" + new Date().getTime() + ".png");
    var folderId = p.folderId || "1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m";
    var uploader = p.uploader || "Unknown";"""

as_code = as_code.replace(upload_func_target, upload_func_replacement)

with open('src/components/AppsScriptView.tsx', 'w') as f:
    f.write(as_code)

print("Patch applied successfully!")
