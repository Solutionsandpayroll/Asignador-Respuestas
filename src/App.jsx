import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Kpis from './components/Kpis.jsx';
import Filters from './components/Filters.jsx';
import ClientTable from './components/ClientTable.jsx';
import UploadBar from './components/UploadBar.jsx';
import { fetchState, saveState } from './lib/api.js';
import { downloadExcel } from './lib/downloadExcel.js';
import { readWorkbook } from './lib/excel.js';
import { filterAndSort } from './lib/sla.js';
import { DEFAULT_SLA_DAYS } from './lib/constants.js';

const EMPTY = { rows: [], sla: DEFAULT_SLA_DAYS, source: 'vacio', note: '', updatedAt: 0 };
const POLL_MS = 10000;
const SAVE_DEBOUNCE_MS = 300;

function editingTable() {
  const a = document.activeElement;
  return Boolean(a && a.closest?.('table') && (a.tagName === 'INPUT' || a.tagName === 'SELECT'));
}

export default function App() {
  const [data, setData] = useState(null); // { rows, sla, source, note, updatedAt }
  const [filter, setFilter] = useState('all');
  const [owner, setOwner] = useState('');
  const [q, setQ] = useState('');
  const [saveMsg, setSaveMsg] = useState({ text: '', bad: false });
  const [upload, setUpload] = useState({ busy: false, error: '' });
  const [showHelp, setShowHelp] = useState(false);

  const dataRef = useRef(null); // último estado, para guardar y comparar versiones
  const pending = useRef(false); // hay un guardado en curso o programado
  const timer = useRef(null);

  /* ---------- carga inicial y refresco periódico ---------- */
  useEffect(() => {
    let alive = true;
    fetchState()
      .then((j) => {
        if (!alive) return;
        // Un guardado de la versión anterior con datos de ejemplo se descarta.
        const hasData = j.rows && j.rows.length > 0 && j.source !== 'ejemplo';
        const next = hasData ? j : { ...EMPTY, sla: j.sla || DEFAULT_SLA_DAYS, updatedAt: j.updatedAt || 0 };
        dataRef.current = next;
        setData(next);
        if (hasData) setSaveMsg({ text: 'Guardado para todo el equipo', bad: false });
      })
      .catch(() => {
        if (!alive) return;
        dataRef.current = EMPTY;
        setData(EMPTY);
        setSaveMsg({ text: 'Sin conexión con el servidor. Los cambios no se guardarán.', bad: true });
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (pending.current || editingTable() || !dataRef.current) return;
      fetchState()
        .then((j) => {
          if (j.rows && j.source !== 'ejemplo' && (j.updatedAt || 0) > (dataRef.current?.updatedAt || 0) && !pending.current && !editingTable()) {
            dataRef.current = j;
            setData(j);
          }
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  /* ---------- cerrar la ayuda con Escape ---------- */
  useEffect(() => {
    if (!showHelp) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowHelp(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHelp]);

  /* ---------- guardado ---------- */
  const scheduleSave = useCallback(() => {
    pending.current = true;
    setSaveMsg({ text: 'Guardando…', bad: false });
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const j = await saveState(dataRef.current);
        pending.current = false;
        if (j.ok) {
          dataRef.current = { ...dataRef.current, updatedAt: j.updatedAt };
          setSaveMsg({ text: 'Guardado para todo el equipo', bad: false });
        } else {
          setSaveMsg({ text: `No se pudo guardar: ${j.error || ''}`, bad: true });
        }
      } catch {
        pending.current = false;
        setSaveMsg({ text: 'Sin conexión con el servidor. Los cambios no se guardaron.', bad: true });
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const commit = useCallback(
    (next) => {
      dataRef.current = next;
      setData(next);
      scheduleSave();
    },
    [scheduleSave]
  );

  /* ---------- acciones ---------- */
  const changeRow = (id, field, value) =>
    commit({ ...data, rows: data.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) });

  const changeSla = (sla) => commit({ ...data, sla });

  // Borra una fila. Si ya tiene nombre de cliente pide confirmación; si está vacía, la quita directo.
  const deleteRow = (id) => {
    const row = data.rows.find((r) => r.id === id);
    if (!row) return;
    const name = String(row.client ?? '').trim();
    if (name && !window.confirm(`¿Borrar a "${name}"? Se borra para todo el equipo.`)) return;
    commit({ ...data, rows: data.rows.filter((r) => r.id !== id) });
  };

  // Crea una fila con todas las casillas vacías, la sube al inicio de la tabla
  // (ver filterAndSort en lib/sla.js) y deja el cursor en el nombre del cliente.
  const addRow = () => {
    const row = {
      id: `n${Date.now()}`,
      client: '',
      status: 'sin_contacto',
      last: '',
      owner: '',
      replied: 'pendiente',
      channel: '',
      notes: '',
    };
    setFilter('all');
    setOwner('');
    setQ('');
    commit({ ...data, rows: [...data.rows, row], source: data.source === 'excel' ? 'excel' : 'manual' });
    setTimeout(() => {
      const input = document.getElementById(`client-${row.id}`);
      input?.scrollIntoView({ block: 'center' });
      input?.focus();
    }, 50);
  };

  const handleFile = async (file) => {
    // Cargar un Excel reemplaza toda la tabla: si ya hay clientes, pedir confirmación.
    if (
      data.rows.length > 0 &&
      !window.confirm(
        `Ya hay ${data.rows.length} clientes en la aplicación. Si cargas este Excel se reemplaza toda la tabla y se pierde lo que el equipo haya cambiado, agregado o borrado. ¿Quieres continuar?`
      )
    ) {
      return;
    }
    setUpload({ busy: true, error: '' });
    try {
      const { rows, note } = await readWorkbook(file);
      setFilter('all');
      setOwner('');
      setUpload({ busy: false, error: '' });
      commit({ ...data, rows, source: 'excel', note });
    } catch (e) {
      setUpload({ busy: false, error: e.message });
    }
  };

  // Quita el archivo cargado: vacía la tabla para todo el equipo y vuelve al estado inicial.
  const removeFile = () => {
    const total = data.rows.length;
    if (
      !window.confirm(
        `Se va a quitar el archivo cargado y vaciar la tabla (${total} clientes) para todo el equipo. Esta acción no se puede deshacer. ¿Quieres continuar?`
      )
    ) {
      return;
    }
    setFilter('all');
    setOwner('');
    setQ('');
    setUpload({ busy: false, error: '' });
    commit({ ...data, rows: [], source: 'vacio', note: '' });
  };

  /* ---------- derivados ---------- */
  const owners = useMemo(
    () => (data ? [...new Set(data.rows.map((r) => r.owner).filter(Boolean))].sort() : []),
    [data]
  );
  const effectiveOwner = owner === '__none' || owners.includes(owner) ? owner : '';
  const visible = useMemo(
    () => (data ? filterAndSort(data.rows, { filter, owner: effectiveOwner, q }, data.sla) : []),
    [data, filter, effectiveOwner, q]
  );

  if (!data) return <div className="wrap">Cargando…</div>;

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <small>Solutions &amp; Payroll</small>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/imagen.png" alt="Logo" style={{ display: 'block', height: 44, width: 'auto' }} />
            Asignador | Respuestas
          </h1>
        </div>
        <div className="actions">
          <label className="btn primary" htmlFor="file">
            Cargar Excel
          </label>
          <input
            id="file"
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handleFile(f);
            }}
          />
          {data.source === 'excel' && (
            <button type="button" onClick={removeFile}>
              Quitar archivo
            </button>
          )}
          <button type="button" onClick={addRow}>
            Agregar cliente
          </button>
          <button type="button" onClick={() => downloadExcel(data.rows)}>
            Descargar Excel
          </button>
          <button type="button" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
            {showHelp ? 'Cerrar ayuda' : '¿Cómo se usa?'}
          </button>
        </div>
      </header>

      {showHelp && (
        <section className="help" aria-label="Cómo se usa">
          <div className="help-head">
            <h2>¿Cómo se usa?</h2>
            <button type="button" onClick={() => setShowHelp(false)}>
              Cerrar
            </button>
          </div>
          <ol>
            <li>
              <b>Cargar Excel:</b> pulsa «Cargar Excel» y elige un archivo <code>.xlsx</code>. Esto reemplaza toda la
              tabla actual, por eso te pedirá confirmación si ya hay clientes.
            </li>
            <li>
              <b>Agregar cliente:</b> pulsa «Agregar cliente». Aparece una fila vacía arriba de la tabla con el cursor
              en el nombre.
            </li>
            <li>
              <b>Editar:</b> escribe directamente en las casillas (estado, último contacto, responsable, respuesta,
              canal y notas). Todo se guarda solo y se comparte con el equipo.
            </li>
            <li>
              <b>Filtrar:</b> pulsa una tarjeta de estado para ver solo esos clientes. También puedes buscar por texto
              y filtrar por responsable.
            </li>
            <li>
              <b>Días de SLA:</b> cambia el número de días en los filtros para definir cuánto tiempo se espera una
              respuesta antes de marcarla como atrasada.
            </li>
            <li>
              <b>Borrar:</b> usa el botón de borrar de la fila. Se borra para todo el equipo.
            </li>
            <li>
              <b>Descargar Excel:</b> exporta la tabla tal como está en este momento.
            </li>
            <li>
              <b>Quitar archivo:</b> vacía la tabla para todo el equipo. No se puede deshacer.
            </li>
          </ol>
          <p className="help-note">La tabla se actualiza sola cada 10 segundos con los cambios de tus compañeros.</p>
        </section>
      )}

      <UploadBar source={data.source} note={data.note} busy={upload.busy} error={upload.error} onFile={handleFile} />
      <Kpis rows={data.rows} sla={data.sla} filter={filter} onFilter={setFilter} />
      <Filters q={q} onQ={setQ} owner={effectiveOwner} onOwner={setOwner} owners={owners} sla={data.sla} onSla={changeSla} />
      <ClientTable rows={visible} total={data.rows.length} sla={data.sla} onChange={changeRow} onDelete={deleteRow} />

      <p className="foot">
        <span style={saveMsg.bad ? { color: 'var(--crit)' } : undefined}>{saveMsg.text}</span> · La tabla se actualiza sola
        cada 10 segundos. Al cargar un Excel nuevo se reemplaza la tabla actual.
      </p>
    </div>
  );
}