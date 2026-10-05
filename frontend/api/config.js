// Vercel Serverless Function: Exposes BACKEND_URL environment variable to the frontend
export default function handler(req, res) {
  const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.status(200).json({
    backend_url: backend,
    configured: Boolean(backend)
  });
}
