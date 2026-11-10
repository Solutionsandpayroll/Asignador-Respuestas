export async function fetchState() {
  const r = await fetch('/api/state', { cache: 'no-store' });
  if (!r.ok) throw new Error(`Error ${r.status}`);
  return r.json();
}

export async function saveState({ rows, sla, source, note }) {
  const r = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, sla, source, note }),
  });
  return r.json();
}