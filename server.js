const next = require('next');
const { createServer } = require('http');
const { URL } = require('url');

const port = parseInt(process.env.PORT, 10) || 3000;
const demo = process.env.DEMO === 'true' || process.env.NODE_ENV === 'demo';
const dev = !demo && process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: '.' });
const handle = app.getRequestHandler();

// Simple demo data
const sampleProducts = [
  { id: 1, name: 'Demo Product', price: 9.99 },
  { id: 2, name: 'Demo Subscription', price: 4.99 }
];

function sendJson(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

app.prepare().then(() => {
  createServer((req, res) => {
    if (demo) {
      try {
        const host = req.headers.host || 'localhost';
        const fullUrl = `http://${host}${req.url}`;
        const url = new URL(fullUrl);
        const pathname = url.pathname;

        // Health check
        if (pathname === '/api/health' && req.method === 'GET') {
          return sendJson(res, { ok: true, demo: true, time: Date.now() });
        }

        // Demo products
        if (pathname === '/api/products' && req.method === 'GET') {
          return sendJson(res, sampleProducts);
        }

        // Demo checkout - echoes body and returns fake order id
        if (pathname === '/api/checkout' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            let parsed = null;
            try { parsed = body ? JSON.parse(body) : null; } catch (e) { /* ignore */ }
            return sendJson(res, { ok: true, demo: true, orderId: 'demo-ORDER-1234', request: parsed });
          });
          return;
        }

        // Fallback for other /api routes in demo mode
        if (pathname.startsWith('/api/')) {
          return sendJson(res, { ok: false, demo: true, message: 'Demo mode: endpoint not implemented', path: pathname });
        }

        // Otherwise fall through to Next.js handler (serves frontend)
      } catch (err) {
        console.error('Demo handler error', err);
        // fall through to Next handler on error
      }
    }

    // Proxy to Node backend
    if (req.url.startsWith('/api')) {
      const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: 5000,
        path: req.url,
        method: req.method,
        headers: req.headers
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      req.pipe(proxyReq, { end: true }).on('error', (err) => {
        console.error('Proxy request error', err);
        res.writeHead(500);
        res.end('Internal Server Error');
      });

      return;
    }

    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port} ${demo ? '(DEMO MODE)' : ''}`);
  });
});
