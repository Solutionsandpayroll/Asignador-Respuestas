import { STATUSES, REPLIES } from '../lib/constants.js';
import { derive } from '../lib/sla.js';
import LockedField from './LockedField.jsx';
function Options({ list }) {
  return list.map((o) => (
    <option key={o.key} value={o.key}>
      {o.label}
    </option>
  ));
}

function Row({ row, sla, onChange, onDelete }) {
  const x = derive(row, sla);
  const set = (field) => (e) => onChange(row.id, field, e.target.value);
  return (
    <tr data-status={row.status}>
      <td className="c-client">
        <input id={`client-${row.id}`} aria-label="Cliente" value={row.client} onChange={set('client')} />
      </td>
      <td>
        <div className="chip">
          <i />
          <select id={`status-${row.id}`} aria-label="Estado" value={row.status} onChange={set('status')}>
            <Options list={STATUSES} />
          </select>
        </div>
      </td>
      <td>
        <input id={`last-${row.id}`} type="date" aria-label="Último contacto" value={row.last} onChange={set('last')} />
      </td>
      <td className="num">{x.days == null ? '—' : x.days}</td>
      <td>
  <LockedField
    id={`owner-${row.id}`}
    label="Responsable"
    placeholder="Sin asignar"
    value={row.owner}
    onSave={(v) => onChange(row.id, 'owner', v)}
  />
</td>
<td>
  <LockedField
    id={`channel-${row.id}`}
    label="Canal"
    placeholder="Sin canal"
    value={row.channel}
    onSave={(v) => onChange(row.id, 'channel', v)}
  />
</td>

      <td>
        <select id={`replied-${row.id}`} aria-label="Respuesta" value={row.replied} onChange={set('replied')}>
          <Options list={REPLIES} />
        </select>
      </td>
      <td>
        <span className={`badge b-${x.state}`}>{x.label}</span>
      </td>
      <td>
        <input id={`notes-${row.id}`} aria-label="Notas" value={row.notes} onChange={set('notes')} />
      </td>
      <td>
        <button
          type="button"
          aria-label={`Borrar ${row.client || 'fila nueva'}`}
          title="Borrar este cliente"
          onClick={() => onDelete(row.id)}
          style={{ cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '4px 8px' }}
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

export default function ClientTable({ rows, total, sla, onChange, onDelete }) {
  return (
    <div className="tablebox">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Último contacto</th>
            <th style={{ textAlign: 'right' }}>Días</th>
            <th>Responsable</th>
            <th>Canal</th>
            <th>Respuesta</th>
            <th>SLA</th>
            <th>Notas</th>
            <th aria-label="Borrar" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="empty">
                {total === 0 ? (
                  <>
                    <b>Aún no hay clientes</b>
                    Carga el Excel con el botón rojo de arriba, o agrega el primero con «Agregar cliente».
                  </>
                ) : (
                  'Ningún cliente coincide con los filtros actuales.'
                )}
              </td>
            </tr>
          ) : (
            rows.map((r) => <Row key={r.id} row={r} sla={sla} onChange={onChange} onDelete={onDelete} />)
          )}
        </tbody>
      </table>
    </div>
  );
}