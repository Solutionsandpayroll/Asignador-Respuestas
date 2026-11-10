// Reemplaza a server.cjs en Vercel: guarda el estado compartido en Upstash Redis.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'sla-dashboard-state';

async function redis(command) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`Redis ${r.status}`);
  return (await r.json()).result;
}

const validRow = (r) => r && typeof r.id === 'string' && typeof r.client === 'string';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (!URL_ || !TOKEN) {
    return res.status(500).json({ error: 'Falta conectar la base de datos en Vercel' });
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);
      return res.status(200).json(raw ? JSON.parse(raw) : { rows: null });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !Array.isArray(body.rows) || !body.rows.every(validRow)) {
        return res.status(400).json({ error: 'Formato de datos no válido' });
      }
      const state = {
        rows: body.rows,
        sla: Number(body.sla) > 0 ? Number(body.sla) : 3,
        source: body.source === 'excel' ? 'excel' : body.source === 'vacio' ? 'vacio' : 'manual',
        note: String(body.note || ''),
        updatedAt: Date.now(),
      };
      await redis(['SET', KEY, JSON.stringify(state)]);
      return res.status(200).json({ ok: true, updatedAt: state.updatedAt });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};