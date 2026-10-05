// Vercel Serverless Function: Catch-all proxy forwarding /api/* to BACKEND_URL
export default async function handler(req, res) {
  const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const url = `${backend}${req.url}`;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(backend).host
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.body) {
        fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      }
    }

    const upstream = await fetch(url, fetchOptions);

    upstream.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'content-encoding' && lower !== 'content-length') {
        res.setHeader(key, val);
      }
    });

    res.status(upstream.status);
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(502).json({
      error: 'Failed to communicate with backend server',
      backend_url: backend,
      details: error.message
    });
  }
}
