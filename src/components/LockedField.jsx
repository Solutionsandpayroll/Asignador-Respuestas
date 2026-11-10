import { useEffect, useRef, useState } from 'react';

export default function LockedField({ id, label, value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const start = () => {
    setDraft(value || '');
    setEditing(true);
  };
  const save = () => {
    onSave(draft.trim());
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  return (
    <div className="locked-field">
      <input
        ref={inputRef}
        id={id}
        aria-label={label}
        value={editing ? draft : value || ''}
        placeholder={placeholder}
        disabled={!editing}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
      />
      {editing ? (
        <>
          <button type="button" className="lf-save" onClick={save}>
            Guardar
          </button>
          <button type="button" onClick={cancel}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" onClick={start}>
          Editar
        </button>
      )}
    </div>
  );
}