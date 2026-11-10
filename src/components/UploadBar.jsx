import { useState } from 'react';

/** Franja con el mensaje de origen de los datos. También acepta un .xlsx arrastrado encima. */
export default function UploadBar({ source, note, busy, error, onFile }) {
  const [over, setOver] = useState(false);

  let content;
  if (busy) content = 'Leyendo el archivo…';
  else if (error) content = <b>{error}</b>;
  else if (source === 'vacio') {
    content = (
      <>
        <b>Carga el Excel de clientes.</b> Arrástralo aquí o usa «Cargar Excel». Se lee el color de cada fila: azul oscuro
        firmado, verde en operación, rosado en conversación, azul claro sin contacto.
      </>
    );
  } else if (source === 'manual') {
    content = (
      <>
        <b>Datos ingresados a mano.</b> Puedes cargar un Excel en cualquier momento; reemplaza la tabla actual.
      </>
    );
  } else {
    content = (
      <>
        <b>Datos desde tu Excel.</b> {note}
      </>
    );
  }

  return (
    <div
      id="drop"
      className={over ? 'over' : ''}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <div id="msg">{content}</div>
    </div>
  );
}