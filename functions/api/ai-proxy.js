/**
 * Cloudflare Pages Function: /api/ai-proxy
 * Transparently proxies chat completion requests to endpoints like SenseNova
 * resolving browser CORS restrictions natively at the edge.
 */
export async function onRequest(context) {
  const { request } = context;

  // Handle CORS OPTIONS preflight
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const forwardHeaders = {
        'Content-Type': 'application/json',
      };
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
      return new Response(JSON.stringify({ error: { message: 'Edge proxy error: ' + String(err) } }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
