const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const proxyCode = `
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).send('URL is required');
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
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
`;

if (!code.includes('/api/proxy-image')) {
  code = code.replace("app.get('/api/health', (req, res) => {", proxyCode + "\n  app.get('/api/health', (req, res) => {");
  fs.writeFileSync('server.ts', code);
}
