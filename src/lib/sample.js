import { daysAgoIso } from './dates.js';

/** Datos de ejemplo (no son clientes reales). */
export function sampleRows() {
  const d = [
    ['Andina Logística', 'operacion', 2, 'Sharon Amaya', 'si', 'Correo', 'Revisión mensual de nómina'],
    ['Grupo Cordillera', 'operacion', 6, 'Vanessa Martinez', 'si', 'WhatsApp', 'Ajuste de novedades de octubre'],
    ['Textiles del Valle', 'firmado', 4, 'Sharon Amaya', 'pendiente', 'Correo', 'Falta agendar inicio de operación'],
    ['Servicios Meridian', 'firmado', 1, 'Vanessa Martinez', 'si', 'Teléfono', ''],
    ['Global Provider Ltd.', 'conversacion', 1, '', 'pendiente', 'Correo, LinkedIn, WhatsApp', 'Escribió por todos los canales; definir quién responde'],
    ['Constructora Altavista', 'conversacion', 9, 'Sharon Amaya', 'no', 'Correo', 'Propuesta enviada, sin respuesta'],
    ['Distribuidora Páramo', 'conversacion', 3, 'Vanessa Martinez', 'si', 'Reunión', 'Negociando alcance del servicio'],
    ['Clínica del Norte', 'sin_contacto', 14, 'Sharon Amaya', 'no', 'Correo', 'Se intentó dos veces'],
    ['Agroexportadora Sabana', 'sin_contacto', 21, '', 'no', 'Teléfono', ''],
    ['Tecnoparque Andes', 'operacion', 0, 'Sharon Amaya', 'si', 'Correo', ''],
    ['Hotelera Bahía', 'sin_contacto', null, '', 'pendiente', '', 'Sin primer contacto registrado'],
    ['Transportes Horizonte', 'firmado', 7, 'Vanessa Martinez', 'pendiente', 'WhatsApp', 'Esperando documentos'],
  ];
  return d.map((x, i) => ({
    id: `r${i}`,
    client: x[0],
    status: x[1],
    last: daysAgoIso(x[2]),
    owner: x[3],
    replied: x[4],
    channel: x[5],
    notes: x[6],
  }));
}
