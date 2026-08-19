import re

with open('server.ts', 'r') as f:
    code = f.read()

proxy_code = """
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
"""

if '/api/proxy-image' not in code:
    code = code.replace("app.get('/api/health', (req, res) => {", proxy_code + "\n  app.get('/api/health', (req, res) => {")
    with open('server.ts', 'w') as f:
        f.write(code)

