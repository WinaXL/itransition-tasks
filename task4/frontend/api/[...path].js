/**
 * Vercel serverless proxy: forwards /api/* to the Render backend.
 * Set BACKEND_URL on Vercel (e.g. https://your-app.onrender.com) — no /api suffix.
 */
export default async function handler(req, res) {
  const backend = process.env.BACKEND_URL || process.env.VITE_API_URL?.replace(/\/api\/?$/, '');

  if (!backend) {
    return res.status(503).json({
      message: 'API proxy is not configured. Set BACKEND_URL on Vercel.',
    });
  }

  const pathSegments = req.query.path;
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : (pathSegments || '');
  const queryIndex = req.url?.indexOf('?') ?? -1;
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
  const targetUrl = `${backend.replace(/\/$/, '')}/api/${path}${query}`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const init = { method: req.method, headers };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, init);
    const text = await response.text();

    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.end(text);
  } catch (err) {
    console.error('API proxy error:', err);
    res.status(503).json({
      message: 'Cannot reach the API server. Check that the backend is running on Render.',
    });
  }
}
