/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const CONFIG_FILE = path.join(process.cwd(), '.server-config.json');

// Helper to read server persistent state
function readServerData() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading server config file:', e);
  }
  return {
    webAppUrl: '',
    customization: null,
    kioskScans: [],
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // 1. API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Global Web App URL & Customization sync across all devices / browsers
  app.get('/api/config', (req, res) => {
    const data = readServerData();
    const cust = data.customization || {};
    if (!cust.logoUrl) {
      cust.logoUrl = '/logo_smpn11.jpg';
    }
    res.json({
      status: 'success',
      webAppUrl: data.webAppUrl || '',
      customization: Object.keys(cust).length > 0 ? cust : null,
    });
  });

  app.post('/api/config', (req, res) => {
    const { webAppUrl, customization } = req.body || {};
    const data = readServerData();

    if (webAppUrl !== undefined) {
      data.webAppUrl = String(webAppUrl || '').trim();
    }
    if (customization !== undefined) {
      data.customization = customization;
    }

    writeServerData(data);
    res.json({
      status: 'success',
      webAppUrl: data.webAppUrl,
      customization: data.customization,
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
  });
}

startServer();
