import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { STATUSES, REPLIES } from './constants.js';

// Colores por estado: los mismos que lee el lector de Excel, así el archivo descargado se puede volver a cargar.
const FILL = {
  operacion: 'FF00B050', // verde
  firmado: 'FF0070C0', // azul oscuro
  conversacion: 'FFF99FE8', // rosado
  sin_contacto: 'FFBDD7EE', // azul claro
};

const label = (list, key) => list.find((o) => o.key === key)?.label ?? key ?? '';

const REPLY_TEXT = { si: 'Sí', no: 'No', pendiente: 'Pendiente' };

/** Descarga la tabla actual como .xlsx (copia de seguridad). */
export async function downloadExcel(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Clientes');
  ws.columns = [
    { header: 'Cliente', key: 'client', width: 32 },
    { header: 'Estado', key: 'status', width: 18 },
    { header: 'Último contacto', key: 'last', width: 18, style: { numFmt: 'yyyy-mm-dd' } },
    { header: 'Responsable', key: 'owner', width: 22 },
    { header: 'Canal', key: 'channel', width: 18 },
    { header: 'Respuesta', key: 'replied', width: 14 },
    { header: 'Notas', key: 'notes', width: 60 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  for (const r of rows) {
    if (!String(r.client ?? '').trim()) continue;
    const date = r.last ? new Date(`${r.last}T00:00:00Z`) : null;
    const row = ws.addRow({
      client: r.client,
      status: label(STATUSES, r.status),
      last: date && !Number.isNaN(date.getTime()) ? date : '',
      owner: r.owner || '',
      channel: r.channel || '',
      replied: REPLY_TEXT[r.replied] ?? label(REPLIES, r.replied),
      notes: r.notes || '',
    });
    const argb = FILL[r.status];
    if (argb) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
        if (r.status === 'firmado') cell.font = { color: { argb: 'FFFFFFFF' } };
      });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}