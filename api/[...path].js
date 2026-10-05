// Vercel Serverless Function: Catch-all proxy forwarding /api/* to BACKEND_URL with zero 404 errors
export default async function handler(req, res) {
  // Set universal CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();

  // If BACKEND_URL is not yet configured in Vercel Environment Variables, provide graceful default payloads
  if (!backend) {
    const path = req.url.split('?')[0];

    if (path.includes('/api/config/groq') || path.includes('/api/config')) {
      return res.status(200).json({
        groq_configured: false,
        key_preview: 'Not configured'
      });
    }

    if (path.includes('/api/gdrive/status')) {
      return res.status(200).json({
        is_connected: false,
        user_email: '',
        root_folder_name: 'LunorApps',
        synced_file_count: 0
      });
    }

    if (path.includes('/api/workspace/files')) {
      return res.status(200).json({
        workspace_dir: 'cloud',
        total_files: 0,
        files: [],
        gdrive: { is_connected: false }
      });
    }

    if (path.includes('/api/workspace/manifest')) {
      return res.status(200).json({
        status: 'no_manifest',
        message: 'No manifest saved yet'
      });
    }

    if (path.includes('/api/health')) {
      return res.status(200).json({
        status: 'healthy',
        service: 'Lunor Studio API Gateway'
      });
    }

    return res.status(200).json({
      status: 'ready',
      message: 'API Gateway ready'
    });
  }

  // Normalize URL
  if (!backend.startsWith('http://') && !backend.startsWith('https://')) {
    backend = 'https://' + backend;
  }
  backend = backend.replace(/\/+$/, '');

  const targetUrl = `${backend}${req.url}`;

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

    const upstream = await fetch(targetUrl, fetchOptions);

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
      error: 'Bad Gateway: Upstream service unavailable',
      details: error.message
    });
  }
}
