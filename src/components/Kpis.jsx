import { STATUSES } from '../lib/constants.js';
import { derive } from '../lib/sla.js';

function Kpi({ id, color, count, label, hint, active, onClick }) {
  return (
    <button
      type="button"
      className="kpi"
      style={color ? { '--c': color } : undefined}
      aria-pressed={active}
      onClick={() => onClick(id)}
    >
      <i />
      <span className="n">{count}</span>
      <span className="l">{label}</span>
      <span className="h">{hint}</span>
    </button>
  );
}

/** Conteos por estado. Cada tarjeta también funciona como filtro de la tabla. */
export default function Kpis({ rows, sla, filter, onFilter }) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
  let late = 0;
  for (const r of rows) {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (derive(r, sla).state === 'late') late++;
  }
  // Clic de nuevo sobre el filtro activo lo quita.
  const toggle = (id) => onFilter(filter === id && id !== 'all' ? 'all' : id);

  return (
    <section className="kpis" aria-label="Clientes por estado">
      <Kpi id="all" count={rows.length} label="Todos los clientes" hint="Sin filtro" active={filter === 'all'} onClick={toggle} />
      {STATUSES.map((s) => (
        <Kpi
          key={s.key}
          id={s.key}
          color={`var(--s-${s.key})`}
          count={counts[s.key]}
          label={s.label}
          hint={s.hint}
          active={filter === s.key}
          onClick={toggle}
        />
      ))}
      <Kpi
        id="vencido"
        color="var(--crit)"
        count={late}
        label="SLA vencido"
        hint={`Más de ${sla} días sin contacto`}
        active={filter === 'vencido'}
        onClick={toggle}
      />
    </section>
  );
}
