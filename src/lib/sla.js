import { STATUSES } from './constants.js';
import { daysSince } from './dates.js';

/**
 * Estado del SLA de un cliente:
 * - none: no hay fecha de último contacto
 * - late: pasaron más de `sla` días desde el último contacto
 * - wait: contacto reciente, pero la respuesta sigue pendiente
 * - ok: contacto reciente y respondido
 */
export function derive(row, sla) {
  const days = daysSince(row.last);
  if (days == null) return { days: null, state: 'none', label: 'Sin registro' };
  if (days > sla) return { days, state: 'late', label: 'Vencido' };
  if (row.replied !== 'si') return { days, state: 'wait', label: 'Por responder' };
  return { days, state: 'ok', label: 'Al día' };
}

export function statusOrder(key) {
  const i = STATUSES.findIndex((s) => s.key === key);
  return i < 0 ? 9 : i;
}

export function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Aplica filtros y ordena: primero las filas nuevas (cliente vacío, para llenarlas),
 * luego por estado y, dentro de cada uno, más días sin contacto primero.
 */
export function filterAndSort(rows, { filter, owner, q }, sla) {
  const query = norm(q);
  return rows
    .filter((r) => {
      if (filter === 'vencido') {
        if (derive(r, sla).state !== 'late') return false;
      } else if (filter !== 'all' && r.status !== filter) return false;
      if (owner === '__none') {
        if (r.owner) return false;
      } else if (owner && r.owner !== owner) return false;
      if (query && !norm(r.client).includes(query)) return false;
      return true;
    })
    .sort((a, b) => {
      const blankA = String(a.client ?? '').trim() === '' ? 0 : 1;
      const blankB = String(b.client ?? '').trim() === '' ? 0 : 1;
      if (blankA !== blankB) return blankA - blankB;
      const o = statusOrder(a.status) - statusOrder(b.status);
      if (o) return o;
      const da = daysSince(a.last);
      const db = daysSince(b.last);
      return (db ?? -1) - (da ?? -1);
    });
}