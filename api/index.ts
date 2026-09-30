import { app } from '../src/index';

export default async function handler(req: any, res?: any) {
  // If running in Node.js callback mode (req: IncomingMessage, res: ServerResponse)
  if (res && typeof res.writeHead === 'function') {
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      const rawUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url || '/';
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${protocol}://${host}${rawUrl}`;

      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            val.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, String(val));
          }
        }
      }

      let body: any = null;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          body = Buffer.concat(chunks);
        }
      }

      const webReq = new Request(fullUrl, {
        method: req.method,
        headers,
        body
      });

      const response = await app.fetch(webReq);

      res.statusCode = response.status;
      response.headers.forEach((val: string, key: string) => {
        res.setHeader(key, val);
      });

      const responseBuf = Buffer.from(await response.arrayBuffer());
      res.end(responseBuf);
      return;
    } catch (err: any) {
      console.error('[API Handler] Node.js bridge error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }
  }

  // Web Standard mode (Fetch API / Bun on Vercel)
  try {
    let targetReq = req;
    const url = new URL(req.url);
    const originalPath = req.headers?.get('x-matched-path') || req.headers?.get('x-forwarded-uri');
    if (originalPath && url.pathname.includes('/api/index')) {
      const fixedUrl = new URL(originalPath, req.url);
      targetReq = new Request(fixedUrl.toString(), req);
    }
    return await app.fetch(targetReq);
  } catch (webErr: any) {
    console.error('[API Handler] Web fetch error:', webErr);
    return new Response(JSON.stringify({ success: false, error: webErr.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}

export { app };
