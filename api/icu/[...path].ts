// File: api/icu/[...path].ts
export const config = { runtime: 'nodejs' };

function toBasic(username: string, password: string) {
  // Edge Runtime hat btoa, aber wir fallbacken robust:
  try {
    // @ts-ignore
    return 'Basic ' + btoa(`${username}:${password}`);
  } catch {
    // Node fallback (falls lokal entwickelt)
    // @ts-ignore
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const upstream = 'https://intervals.icu';
  // Mappe /api/icu/... -> /api/v1/...
  const pathAfter = url.pathname.replace(/^\/api\/icu/, '/api/v1');
  const targetUrl = upstream + pathAfter + (url.search || '');

  // Sicherheit: GPT/Client muss ein Token mitsenden
  const authIn = req.headers.get('authorization') || '';
  const proxyToken = process.env.PROXY_TOKEN;
  if (!proxyToken || !authIn.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing Bearer token' }), { status: 401 });
  }
  const supplied = authIn.substring('Bearer '.length).trim();
  if (supplied !== proxyToken) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
  }

  // Intervals Basic-Auth bauen
  const icuKey = process.env.INTERVALS_API_KEY;
  if (!icuKey) {
    return new Response(JSON.stringify({ error: 'Server not configured: INTERVALS_API_KEY missing' }), { status: 500 });
  }
  const icuAuth = toBasic('API_KEY', icuKey);

  // Forward request (Body nur bei Nicht-GET)
  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  // Content-Type beibehalten oder defaulten
  const incomingCT = req.headers.get('content-type') || (method === 'GET' ? undefined : 'application/json');

  const resp = await fetch(targetUrl, {
    method,
    headers: {
      'Authorization': icuAuth,
      // Leite JSON- oder CSV-Wünsche durch (GPT kann beides anfragen)
      ...(incomingCT ? { 'Content-Type': incomingCT } : {}),
      'Accept': req.headers.get('accept') || '*/*',
    },
    body
  });

  // Direkt streamen
  const outHeaders = new Headers();
  const ct = resp.headers.get('content-type') || 'application/json';
  outHeaders.set('content-type', ct);
  return new Response(resp.body, { status: resp.status, headers: outHeaders });
};
