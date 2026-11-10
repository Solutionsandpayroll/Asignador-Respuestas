import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { parseDate } from './dates.js';
import { norm } from './sla.js';

/* ---------- celdas ---------- */

function cellValue(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.result !== undefined) return v.result;
    if (v.text !== undefined) return v.text;
    return '';
  }
  return v;
}

const asText = (v) => (v instanceof Date ? '' : String(v ?? '').trim());

/* ---------- fechas ("mayo 25, 2026", serial de Excel, Date) ---------- */

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

function parseLastContact(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const t = norm(asText(v)).replace(/\./g, '');
  const m = t.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m && MESES[m[1]] !== undefined) {
    return `${m[3]}-${String(MESES[m[1]] + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return parseDate(v);
}

/** ¿El valor parece una fecha? (Date, serial de Excel o "mayo 25, 2026"). */
function isDateLike(v) {
  if (v instanceof Date) return true;
  if (typeof v === 'number') return v > 20000 && v < 80000;
  const t = norm(asText(v)).replace(/\./g, '');
  const m = t.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  return Boolean(m && MESES[m[1]] !== undefined);
}

/* ---------- estado por color ---------- */

// Paleta de tema de este Excel (índice de tema -> RGB). ExcelJS entrega {theme, tint} sin argb.
const THEME = ['FFFFFF', '000000', 'E7E6E6', '44546A', '5B9BD5', 'ED7D31', 'A5A5A5', 'FFC000', '4472C4', '70AD47'];

function rgbToHls(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d) return [0, l, 0];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  if (h < 0) h += 1;
  return [h, l, s];
}

function hlsToRgb(h, l, s) {
  if (!s) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** Devuelve el color de relleno como 'RRGGBB' (argb o tema con tinte), o null. */
function fillHex(fg) {
  if (!fg) return null;
  if (fg.argb && fg.argb.length >= 6) return fg.argb.slice(-6);
  if (typeof fg.theme === 'number' && THEME[fg.theme]) {
    const base = THEME[fg.theme];
    const [h, l0, s] = rgbToHls(
      parseInt(base.slice(0, 2), 16) / 255,
      parseInt(base.slice(2, 4), 16) / 255,
      parseInt(base.slice(4, 6), 16) / 255
    );
    const t = fg.tint || 0;
    const l = t < 0 ? l0 * (1 + t) : l0 * (1 - t) + t;
    return hlsToRgb(h, l, s)
      .map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return null;
}

/**
 * Clasifica un color de relleno ('RRGGBB' o ARGB) en uno de los cuatro estados.
 * Ajusta aquí los rangos de tono (h) si los colores del Excel son distintos.
 */
export function colorStatus(argb) {
  if (!argb || argb.length < 6) return null;
  const hex = argb.slice(-6);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d < 0.08 || l > 0.94) return null; // blanco o gris
  const s = d / (1 - Math.abs(2 * l - 1));
  if (s < 0.12) return null;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  if (h >= 75 && h <= 170) return 'operacion'; // verde
  // azul: oscuro (0070C0, 2F75B5...) = firmado; claro (BDD7EE, DEEBF7) = sin contacto
  if (h >= 185 && h <= 260) return l < 0.6 ? 'firmado' : 'sin_contacto';
  if (h >= 285 || h <= 20) return 'conversacion'; // rosado / magenta
  return null;
}

/* ---------- estado por texto ---------- */

/** Columna de etapa (sin encabezado en este Excel): Por contactar / Contactados / Negociación / Contrato Firmado / Operación. */
function stageStatus(t) {
  const s = norm(t);
  if (!s) return null;
  if (/^(por contactar|sin contacto)/.test(s)) return 'sin_contacto';
  if (/^(contactad|negociaci)/.test(s)) return 'conversacion';
  if (/^(contrato|firmad)/.test(s)) return 'firmado';
  if (/^operaci/.test(s)) return 'operacion';
  return null;
}

/** Columna "Status" (texto libre, español o inglés). Solo se usa si la fila no tiene etapa. */
function textStatus(t) {
  const s = norm(t);
  if (!s) return null;
  if (/sin contacto|no contact|sin respuesta|por contactar/.test(s)) return 'sin_contacto';
  if (/firm/.test(s)) return 'firmado';
  if (/operaci|operati|operand|activo/.test(s)) return 'operacion';
  if (/convers|hablad|negoci|proceso|propuesta|contacto|contacted|reconect|nda|agreement|referral|review|msa/.test(s)) return 'conversacion';
  return null;
}

/* ---------- encabezados ---------- */

// [campo, peso, regex]: gana el encabezado de mayor peso para cada campo.
const FIELD_RULES = [
  ['client', 3, /global provider/],
  ['client', 2, /client|empresa|compan|proveedor|provider/],
  ['client', 1, /razon|nombre/],
  ['last', 3, /^date$|ultim|ult\.|last contact/],
  ['last', 1, /fecha/],
  ['owner', 2, /respons|encarg|atiende|asignad|owner|lider|gestor/],
  ['replied', 2, /respond|respuesta/],
  ['channel', 2, /canal|medio|via\b/],
  ['notes', 2, /nota|observ|coment|comment/],
  ['status', 2, /estado|status|etapa|fase/],
];

function headerField(header) {
  const s = norm(header);
  if (!s) return null;
  let best = null;
  for (const [field, weight, re] of FIELD_RULES) {
    if (re.test(s) && (!best || weight > best.weight)) best = { field, weight };
  }
  return best;
}

/** La fila de encabezados es la que reconoce más columnas (la fila 1 de este Excel es solo una banda de grupos). */
function findHeaderRow(ws, maxc) {
  let best = 0;
  let bestScore = 0;
  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
    const row = ws.getRow(r);
    let score = 0;
    for (let c = 1; c <= maxc; c++) if (headerField(asText(cellValue(row.getCell(c))))) score++;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  if (bestScore >= 2) return best;
  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
    const row = ws.getRow(r);
    let n = 0;
    for (let c = 1; c <= maxc; c++) if (asText(cellValue(row.getCell(c)))) n++;
    if (n >= 2) return r;
  }
  return 0;
}

/** Busca una columna (aunque no tenga encabezado) cuyos valores sean casi todos etapas conocidas. */
function findStageCol(ws, hr, maxc, skip) {
  let best = 0;
  let bestHits = 0;
  const last = Math.min(ws.rowCount, hr + 300);
  for (let c = 1; c <= maxc; c++) {
    if (skip.has(c)) continue;
    let hits = 0;
    let total = 0;
    for (let r = hr + 1; r <= last; r++) {
      const t = asText(cellValue(ws.getRow(r).getCell(c)));
      if (!t) continue;
      total++;
      if (stageStatus(t)) hits++;
    }
    if (hits >= 3 && hits / total >= 0.8 && hits > bestHits) {
      best = c;
      bestHits = hits;
    }
  }
  return best;
}

/* ---------- hoja ---------- */

export function parseSheet(ws) {
  const maxc = ws.columnCount || 20;
  const hr = findHeaderRow(ws, maxc);
  if (!hr) return null;

  const map = {};
  const weights = {};
  const headerRow = ws.getRow(hr);
  for (let c = 1; c <= maxc; c++) {
    const f = headerField(asText(cellValue(headerRow.getCell(c))));
    if (f && (!map[f.field] || f.weight > weights[f.field])) {
      map[f.field] = c;
      weights[f.field] = f.weight;
    }
  }
  if (!map.client) map.client = 1;
  const stageCol = findStageCol(ws, hr, maxc, new Set([map.client]));

  const rows = [];
  let byStage = 0;
  let byColor = 0;
  let byText = 0;
  let none = 0;
  let shifted = 0;

  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const rw = ws.getRow(r);
    const client = asText(cellValue(rw.getCell(map.client)));
    if (!client) continue;

    // Algunas filas de la hoja 2026 quedaron 2 columnas a la izquierda del encabezado
    // (sin "Fecha inicio" / "Fecha finalización"): la fecha cae en J y "Date" trae un Yes/No.
    let shift = 0;
    if (map.last && map.last > 3) {
      const own = cellValue(rw.getCell(map.last));
      const two = cellValue(rw.getCell(map.last - 2));
      if (asText(own) && !isDateLike(own) && isDateLike(two)) {
        shift = 2;
        shifted++;
      }
    }
    const at = (c) => cellValue(rw.getCell(map.last && c >= map.last ? c - shift : c));

    let status = null;
    let via = '';
    // 1) Color de la fila: es la fuente de verdad (así lo pinta el equipo).
    for (let c = 1; c <= maxc && !status; c++) {
      const fill = rw.getCell(c).fill;
      if (fill?.type === 'pattern' && fill.pattern !== 'none') {
        const hex = fillHex(fill.fgColor);
        if (hex) {
          status = colorStatus(hex);
          if (status) via = 'color';
        }
      }
    }
    // 2) Etapa (columna sin título) y 3) texto de "Status", solo si la fila no tiene color.
    if (!status && stageCol) {
      status = stageStatus(asText(cellValue(rw.getCell(stageCol))));
      if (status) via = 'stage';
    }
    if (!status && map.status) {
      status = textStatus(asText(cellValue(rw.getCell(map.status))));
      if (status) via = 'text';
    }
    if (via === 'stage') byStage++;
    else if (via === 'text') byText++;
    else if (via === 'color') byColor++;
    else {
      none++;
      status = 'sin_contacto';
    }

    let replied = 'pendiente';
    if (map.replied) {
      const t = norm(asText(at(map.replied)));
      if (/^(si|resp|ok|x)/.test(t)) replied = 'si';
      else if (/^no/.test(t)) replied = 'no';
    }

    rows.push({
      id: `x${rows.length}`,
      client,
      status,
      last: map.last ? parseLastContact(at(map.last)) : '',
      owner: map.owner ? asText(at(map.owner)) : '',
      replied,
      channel: map.channel ? asText(at(map.channel)) : '',
      notes: map.notes ? asText(at(map.notes)) : '',
    });
  }
  if (!rows.length) return null;
  return { rows, byStage, byColor, byText, none, shifted, name: ws.name, hasLast: Boolean(map.last) };
}

// Hojas que son resúmenes, no listas de clientes.
const SKIP_SHEET = /indicador|resumen|dashboard/i;

/**
 * Lee un archivo .xlsx y devuelve { rows, note, sheets }.
 * Por defecto usa la hoja con nombre de año más reciente ("2026"); pasa `sheetName` para elegir otra (p. ej. "Sheet1").
 * Lanza un Error con mensaje para el usuario si falla.
 */
export async function readWorkbook(file, sheetName) {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error('Formato no compatible. Guarda el archivo como .xlsx e inténtalo de nuevo.');
  }
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error('No pude leer ese archivo. Ábrelo en Excel, guárdalo de nuevo como .xlsx e inténtalo otra vez.');
  }
  const sheets = wb.worksheets.filter((ws) => !SKIP_SHEET.test(ws.name)).map((ws) => ws.name);
  // Por defecto: la hoja con nombre de año más reciente (p. ej. "2026"); si no hay, el orden del libro.
  const byYear = (ws) => (/^20\d\d$/.test(ws.name.trim()) ? Number(ws.name.trim()) : 0);
  const candidates = sheetName
    ? wb.worksheets.filter((ws) => ws.name === sheetName)
    : [...wb.worksheets].sort((a, b) => byYear(b) - byYear(a));
  let res = null;
  for (const ws of candidates) {
    if (SKIP_SHEET.test(ws.name)) continue;
    res = parseSheet(ws);
    if (res) break;
  }
  if (!res) {
    throw new Error('No encontré clientes. Revisa que la hoja tenga una fila de encabezados y una columna con el nombre del cliente.');
  }
  const parts = [
    `${res.rows.length} clientes leídos de la hoja "${res.name}".`,
    `Estado por color: ${res.byColor}. Por etapa: ${res.byStage}. Por texto: ${res.byText}.`,
  ];
  if (res.shifted) parts.push(`${res.shifted} filas tenían las columnas corridas en el Excel y las acomodé.`);
  if (res.none) parts.push(`${res.none} sin color, etapa ni estado reconocido quedaron como Sin contacto; cámbialos en la tabla.`);
  if (!res.hasLast) parts.push('No encontré una columna de último contacto; complétala en la tabla.');
  return { rows: res.rows, note: parts.join(' '), sheets };
}