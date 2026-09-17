/**
 * Cloudflare Worker for Kaoyan English:
 * Serves static assets and transparently proxies /api/ai-proxy to overcome browser CORS
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle AI Proxy route
    if (url.pathname === '/api/ai-proxy') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      if (request.method === 'POST') {
        try {
          const payload = await request.json();
          const targetUrl = payload.url;
          const targetHeaders = payload.headers || {};
          const dataBody = payload.body;

          if (!targetUrl) {
            return new Response(JSON.stringify({ error: { message: 'Missing target url' } }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }

          const forwardHeaders = { 'Content-Type': 'application/json' };
          for (const [k, v] of Object.entries(targetHeaders)) {
            if (['authorization', 'content-type'].includes(k.toLowerCase())) {
              forwardHeaders[k] = v;
            }
          }

          const forwardResp = await fetch(targetUrl, {
            method: 'POST',
            headers: forwardHeaders,
            body: JSON.stringify(dataBody),
          });

          const respHeaders = new Headers(forwardResp.headers);
          respHeaders.set('Access-Control-Allow-Origin', '*');

          return new Response(forwardResp.body, {
            status: forwardResp.status,
            statusText: forwardResp.statusText,
            headers: respHeaders,
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: { message: 'Proxy error: ' + String(err) } }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }

      return new Response('Method not allowed', { status: 405 });
    }

    // Otherwise serve static asset
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
