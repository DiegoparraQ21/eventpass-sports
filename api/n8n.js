export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
    const baseUrl = process.env.N8N_PUBLIC_URL?.replace(/\/+$/, '');
    if (!baseUrl) return res.status(500).json({ ok: false, error: { message: 'Falta configurar N8N_PUBLIC_URL en Vercel.' } });

    const path = String(Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || '').replace(/^\/+/, '');
    if (!path) return res.status(400).json({ ok: false, error: { message: 'Falta la ruta del webhook de n8n.' } });

    const upstreamUrl = new URL(`${baseUrl}/${path}`);
    for (const [key, value] of Object.entries(req.query)) {
        if (key === 'path') continue;
        for (const item of Array.isArray(value) ? value : [value]) upstreamUrl.searchParams.append(key, item);
    }

    const headers = { Accept: req.headers.accept || 'application/json', 'ngrok-skip-browser-warning': 'true' };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const method = req.method || 'GET';
    const hasBody = !['GET', 'HEAD'].includes(method);
    if (hasBody) headers['Content-Type'] = 'application/json';
    const body = hasBody && req.body !== undefined ? (typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body)) : undefined;

    try {
        const upstream = await fetch(upstreamUrl, { method, headers, body });
        const responseBody = await upstream.text();
        res.status(upstream.status);
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(responseBody);
    } catch {
        return res.status(502).json({ ok: false, error: { message: 'No fue posible conectar con n8n desde Vercel.' } });
    }
}
