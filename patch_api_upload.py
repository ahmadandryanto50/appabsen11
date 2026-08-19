import re

with open('src/api.ts', 'r') as f:
    code = f.read()

replacement = """  },

  async uploadBerkas(filename: string, base64Data: string, uploader: string): Promise<{ status: string; message?: string; fileUrl?: string }> {
    const url = this.getBackendUrl();
    if (!url) {
      return { status: 'error', message: 'Tidak dapat mengupload dalam Demo Mode. Silakan set Database URL.' };
    }
    const res = await safeCallGAS(url, 'uploadToDrive', {
      filename,
      base64: base64Data,
      folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
      uploader
    });
    if (res.ok && res.result) return res.result;
    return { status: 'error', message: res.error || 'Gagal terhubung ke Apps Script.' };
  },

  async setupDatabase()"""

code = code.replace("  },\n\n  async setupDatabase()", replacement)

with open('src/api.ts', 'w') as f:
    f.write(code)

