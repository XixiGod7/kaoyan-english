import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'ai-proxy-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/ai-proxy', async (req: any, res: any) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.statusCode = 200;
            res.end();
            return;
          }
          if (req.method === 'POST') {
            let rawBody = '';
            req.on('data', (chunk: any) => { rawBody += chunk; });
            req.on('end', async () => {
              try {
                const { url, headers: forwardHeaders, body: payload } = JSON.parse(rawBody);
                const fetchFn = (globalThis as any).fetch;
                const resp = await fetchFn(url, {
                  method: 'POST',
                  headers: forwardHeaders,
                  body: JSON.stringify(payload),
                });
                res.statusCode = resp.status;
                res.setHeader('Content-Type', resp.headers.get('content-type') || (payload?.stream ? 'text/event-stream; charset=utf-8' : 'application/json'));
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                if (typeof res.flushHeaders === 'function') {
                  res.flushHeaders();
                }
                if (resp.body) {
                  const reader = resp.body.getReader();
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                  }
                }
                res.end();
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: { message: e.message } }));
              }
            });
          } else {
            res.statusCode = 200;
            res.end();
          }
        });
      }
    }
  ],
  base: './',
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
