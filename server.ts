/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxm8xUg47SJqredqBB1koPt5lSgJqlFF3rjsKbjG-9tBQ2GLuOOJYD_iq92dsPZB5jQ/exec';
const CONFIG_FILE = path.join(process.cwd(), '.server-config.json');

// Helper to read server persistent state
function readServerData() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (!data.webAppUrl) {
        data.webAppUrl = DEFAULT_GAS_URL;
      }
      return data;
    }
  } catch (e) {
    console.error('Error reading server config file:', e);
  }
  return {
    webAppUrl: DEFAULT_GAS_URL,
    customization: null,
    kioskScans: [],
    rekapGuruSettings: null,
  };
}

// Helper to write server persistent state
function writeServerData(data: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing server config file:', e);
  }
}

// Fetch customization from Apps Script Database directly
async function fetchCustomizationFromGas(webAppUrl: string): Promise<any> {
  if (!webAppUrl) return null;
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getCustomization' }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    if (!text || text.trim().startsWith('<') || text.includes('<!DOCTYPE html>')) {
      // Try fallback to getCrud for 'Pengaturan' sheet
      const fallbackResponse = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getCrud', sheetName: 'Pengaturan' }),
      });
      if (fallbackResponse.ok) {
        const fallbackText = await fallbackResponse.text();
        const fallbackData = JSON.parse(fallbackText);
        if (fallbackData && fallbackData.status === 'success' && Array.isArray(fallbackData.rows)) {
          const customRow = fallbackData.rows.find((row: any) => row.data && row.data[0] === 'customization');
          if (customRow && customRow.data[1]) {
            return JSON.parse(customRow.data[1]);
          }
        }
      }
      return null;
    }
    const data = JSON.parse(text);
    if (data && data.status === 'success' && data.customization) {
      return data.customization;
    }
    return null;
  } catch (err) {
    console.warn('[Server GAS Customization Fetch Warning]', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // 1. API Health Check
  
  // Proxy endpoint to bypass Google Drive/Browser CORS and hotlinking restrictions
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).send('URL is required');
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }
      });
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(500).send('Error proxying image');
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Global Web App URL & Customization sync across all devices / browsers
  app.get('/api/config', async (req, res) => {
    const data = readServerData();
    
    // Auto-fetch customization from Apps Script if missing
    if (!data.customization && data.webAppUrl) {
      console.log('[Server Config Cache] Fetching customization from Apps Script in background...');
      const fetched = await fetchCustomizationFromGas(data.webAppUrl);
      if (fetched) {
        data.customization = fetched;
        writeServerData(data);
      }
    }

    const cust = data.customization || {};
    if (!cust.logoUrl) {
      cust.logoUrl = '/logo_smpn11.jpg';
    }
    res.json({
      status: 'success',
      webAppUrl: data.webAppUrl || '',
      customization: Object.keys(cust).length > 0 ? cust : null,
      rekapGuruSettings: data.rekapGuruSettings || cust.rekapSettings || null,
    });
  });

  app.post('/api/config', (req, res) => {
    const { webAppUrl, customization, rekapGuruSettings } = req.body || {};
    const data = readServerData();

    if (webAppUrl !== undefined) {
      data.webAppUrl = String(webAppUrl || '').trim();
    }
    if (customization !== undefined) {
      data.customization = customization;
      if (customization && customization.rekapSettings) {
        data.rekapGuruSettings = customization.rekapSettings;
      }
    }
    if (rekapGuruSettings !== undefined) {
      data.rekapGuruSettings = rekapGuruSettings;
      if (data.customization) {
        data.customization.rekapSettings = rekapGuruSettings;
      }
    }

    writeServerData(data);
    res.json({
      status: 'success',
      webAppUrl: data.webAppUrl,
      customization: data.customization,
      rekapGuruSettings: data.rekapGuruSettings,
    });
  });

  // 3. Global Kiosk Scans persistent store
  app.get('/api/kiosk-scans', (req, res) => {
    const data = readServerData();
    const { tanggal, kelas } = req.query;
    let scans = data.kioskScans || [];

    if (tanggal) {
      const t = String(tanggal).trim();
      scans = scans.filter((s: any) => {
        const sTgl = (s.tanggal || (s.timestamp ? String(s.timestamp).split(' ')[0] : '')).trim();
        return sTgl === t || (s.timestamp && String(s.timestamp).includes(t));
      });
    }

    if (kelas) {
      const k = String(kelas).toLowerCase().trim();
      scans = scans.filter((s: any) => (s.kelas || '').toLowerCase().trim() === k);
    }

    res.json({ status: 'success', scans });
  });

  app.post('/api/kiosk-scans', (req, res) => {
    const newScan = req.body;
    if (!newScan) {
      return res.status(400).json({ status: 'error', message: 'Payload data scan kosong.' });
    }

    const data = readServerData();
    if (!Array.isArray(data.kioskScans)) {
      data.kioskScans = [];
    }

    // Prepend new scan (latest first) and keep up to 1000 items
    data.kioskScans.unshift({
      ...newScan,
      rowIndex: newScan.rowIndex || Date.now(),
    });
    if (data.kioskScans.length > 1000) {
      data.kioskScans = data.kioskScans.slice(0, 1000);
    }

    writeServerData(data);
    res.json({ status: 'success', scan: newScan });
  });

  app.delete('/api/kiosk-scans', (req, res) => {
    const { rowIndex, timestamp, nisn, clearAll } = req.body || {};
    const data = readServerData();
    if (Array.isArray(data.kioskScans)) {
      if (clearAll) {
        data.kioskScans = [];
      } else {
        data.kioskScans = data.kioskScans.filter((s: any) => {
          if (rowIndex && String(s.rowIndex) === String(rowIndex)) return false;
          if (timestamp && nisn && s.timestamp === timestamp && s.nisn === nisn) return false;
          if (timestamp && String(s.timestamp).includes(timestamp)) return false;
          return true;
        });
      }
      writeServerData(data);
    }
    res.json({ status: 'success', message: 'Scan record deleted from server.' });
  });

  // 4. Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);

    // Background fetch customization on server boot if missing
    const data = readServerData();
    if (!data.customization && data.webAppUrl) {
      console.log('[Server Boot Loader] Starting background boot fetch for customization...');
      fetchCustomizationFromGas(data.webAppUrl)
        .then((fetched) => {
          if (fetched) {
            const updatedData = readServerData();
            updatedData.customization = fetched;
            writeServerData(updatedData);
            console.log('[Server Boot Loader] Successfully loaded and cached school customization on startup!');
          }
        })
        .catch((e) => console.error('[Server Boot Loader] Failed loading customization:', e));
    }
  });
}

startServer();
