// Cloudflare Worker — CORS proxy voor loep.info
// Deploy via Cloudflare Dashboard > Workers & Pages > Create Worker
//
// Gebruik: https://<worker-naam>.workers.dev/?url=<geëncodeerde-url>
//
// Voorbeeld:
//   https://loep-proxy.workers.dev/?url=https%3A%2F%2Fvrt.be%2Fvrtnws%2Fnl.rss.articles.xml

const ALLOWED_ORIGINS = [
  'https://loep.info',
  'https://www.loep.info',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response('Gebruik: ?url=<geëncodeerde-url>', { status: 400 });
    }

    try {
      const resp = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LoepDashboard/1.0)',
        },
      });

      const headers = new Headers(resp.headers);
      headers.set('Access-Control-Allow-Origin', corsOrigin);
      headers.delete('Content-Security-Policy');
      headers.delete('X-Frame-Options');

      return new Response(resp.body, {
        status: resp.status,
        headers,
      });
    } catch (e) {
      return new Response('Proxy fout: ' + e.message, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': corsOrigin },
      });
    }
  },
};
