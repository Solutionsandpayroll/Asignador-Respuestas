export default function Filters({ q, onQ, owner, onOwner, owners, sla, onSla }) {
  return (
    <div className="filters">
      <label htmlFor="q">
        Buscar cliente
        <input id="q" type="search" placeholder="Nombre del cliente" value={q} onChange={(e) => onQ(e.target.value)} />
      </label>
      <label htmlFor="own">
        Responsable
        <select id="own" value={owner} onChange={(e) => onOwner(e.target.value)}>
          <option value="">Todos</option>
          <option value="__none">Sin asignar</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="sla">
        SLA (días sin contacto)
        <input
          id="sla"
          type="number"
          min="1"
          max="60"
          value={sla}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v > 0 && v <= 60) onSla(v);
          }}
        />
      </label>
    </div>
  );
}