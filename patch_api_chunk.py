import re

with open('src/api.ts', 'r') as f:
    code = f.read()

# Replace saveCustomization to chunk the JSON if needed
old_save = """    const direct = await safeCallGAS(url, 'saveCustomization', { customization });
    if (direct.ok && direct.result && direct.result.status === 'success') {
      return direct.result;
    }"""

new_save = """    let direct;
    const jsonStr = JSON.stringify(customization);
    if (jsonStr.length > 40000) {
      // JSON is too large for a single Google Sheets cell.
      // Use saveCrud to append it as a raw row instead.
      const timeStr = new Date().toISOString();
      const chunks = jsonStr.match(/.{1,40000}/g) || [];
      for (let i = 0; i < chunks.length; i++) {
        await this.saveCrud('Pengaturan', [`customization_chunk_${timeStr}_${i}`, chunks[i]], null);
      }
      direct = { ok: true, result: { status: 'success' } };
    } else {
      direct = await safeCallGAS(url, 'saveCustomization', { customization });
    }

    if (direct.ok && direct.result && direct.result.status === 'success') {
      return direct.result;
    }"""

code = code.replace(old_save, new_save)


# Replace getCustomization fallback to read chunks if needed
old_get = """    const fallback = await safeCallGAS(url, 'getCrud', { sheetName: 'Pengaturan' }, true, 6000, 50000);
    if (fallback.ok && fallback.result && fallback.result.status === 'success' && fallback.result.rows) {
      const row = fallback.result.rows.find((r: any) => String(r[0]).toLowerCase() === 'customization');
      if (row && row[1]) {
        try {
          return { status: 'success', customization: JSON.parse(row[1]) };
        } catch (e) { }
      }
    }"""

new_get = """    const fallback = await safeCallGAS(url, 'getCrud', { sheetName: 'Pengaturan' }, true, 6000, 50000);
    if (fallback.ok && fallback.result && fallback.result.status === 'success' && fallback.result.rows) {
      // Check for single row customization
      const row = fallback.result.rows.find((r: any) => String(r[0]).toLowerCase() === 'customization');
      
      // Check for chunked customization
      const chunkRows = fallback.result.rows.filter((r: any) => String(r[0]).toLowerCase().startsWith('customization_chunk_'));
      
      if (chunkRows.length > 0) {
        // Sort by timestamp and index
        chunkRows.sort((a: any, b: any) => String(a[0]).localeCompare(String(b[0])));
        // Only keep the latest timestamp chunks
        const latestTimestamp = String(chunkRows[chunkRows.length - 1][0]).split('_')[2];
        const latestChunks = chunkRows.filter((r: any) => String(r[0]).includes(latestTimestamp));
        const combinedJson = latestChunks.map((r: any) => r[1]).join('');
        
        try {
          const parsed = JSON.parse(combinedJson);
          return { status: 'success', customization: parsed };
        } catch (e) { console.error('Failed to parse chunked customization'); }
      } else if (row && row[1]) {
        try {
          return { status: 'success', customization: JSON.parse(row[1]) };
        } catch (e) { }
      }
    }"""

code = code.replace(old_get, new_get)

with open('src/api.ts', 'w') as f:
    f.write(code)

