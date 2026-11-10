const DAY = 864e5;

export function today0() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const pad = (n) => String(n).padStart(2, '0');

/** Fecha local -> "AAAA-MM-DD" */
export function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function utcIso(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Días completos desde una fecha "AAAA-MM-DD" hasta hoy. null si no hay fecha. */
export function daysSince(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return Math.floor((today0() - new Date(y, m - 1, d)) / DAY);
}

export function daysAgoIso(n) {
  return n == null ? '' : iso(new Date(today0().getTime() - n * DAY));
}

/** Convierte lo que venga de una celda (Date, número de Excel o texto) a "AAAA-MM-DD". */
export function parseDate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : utcIso(v);
  if (typeof v === 'number') return utcIso(new Date(Math.round((v - 25569) * DAY)));
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${pad(m[2])}-${pad(m[1])}`;
  }
  return '';
}