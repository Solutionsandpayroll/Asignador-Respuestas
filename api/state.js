
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// IMPORTANTE: conservar esta clave para no perder acceso
// a los datos que ya están guardados.
const KEY = 'sla-dashboard-state';

async function redis(command) {
  if (!URL_ || !TOKEN) {
    throw new Error('Faltan las credenciales de Upstash Redis');
  }

  const response = await fetch(URL_, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Upstash Redis:', response.status, data);

    throw new Error(
      `Redis ${response.status}: ${
        data?.error || 'Error de autenticación o conexión'
      }`
    );
  }

  if (data?.error) {
    throw new Error(`Redis: ${data.error}`);
  }

  return data?.result;
}

const validRow = (row) =>
  row &&
  typeof row.id === 'string' &&
  typeof row.client === 'string';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (!URL_ || !TOKEN) {
    return res.status(500).json({
      error: 'Faltan UPSTASH_REDIS_REST_URL o UPSTASH_REDIS_REST_TOKEN',
    });
  }

  try {
    // CONSULTAR TABLA
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);

      if (!raw) {
        return res.status(200).json({ rows: null });
      }

      let state;

      try {
        state = JSON.parse(raw);
      } catch {
        throw new Error('Los datos guardados en Redis no tienen formato JSON válido');
      }

      return res.status(200).json(state);
    }

    // GUARDAR TABLA
    if (req.method === 'PUT') {
      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body)
          : req.body;

      if (
        !body ||
        !Array.isArray(body.rows) ||
        !body.rows.every(validRow)
      ) {
        return res.status(400).json({
          error: 'Formato de datos no válido',
        });
      }

      const state = {
        rows: body.rows,
        sla: Number(body.sla) > 0 ? Number(body.sla) : 3,
        source:
          body.source === 'excel'
            ? 'excel'
            : body.source === 'vacio'
              ? 'vacio'
              : 'manual',
        note: String(body.note || ''),
        updatedAt: Date.now(),
      };

      await redis([
        'SET',
        KEY,
        JSON.stringify(state),
      ]);

      return res.status(200).json({
        ok: true,
        updatedAt: state.updatedAt,
      });
    }

    return res.status(405).json({
      error: 'Método no permitido',
    });

  } catch (error) {
    console.error('Error en api/state.js:', error);

    return res.status(500).json({
      error: error.message || 'Error interno del servidor',
    });
  }
}
