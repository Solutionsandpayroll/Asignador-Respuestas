/**
 * Mezcla mis cambios sobre las filas más recientes del servidor, para que dos personas
 * que editan a la vez no se borren el trabajo.
 *
 * - serverRows: filas que hay ahora en el servidor.
 * - localRows:  filas que tengo en pantalla.
 * - dirty:      ids de las filas que yo edité o agregué desde el último guardado.
 * - deleted:    ids de las filas que yo borré.
 *
 * Las filas que yo no toqué se quedan como las tiene el servidor (los cambios de los demás).
 */
export function mergeRows(serverRows, localRows, dirty, deleted) {
  const local = new Map(localRows.map((r) => [r.id, r]));
  const out = serverRows.filter((r) => !deleted.has(r.id));
  const index = new Map(out.map((r, i) => [r.id, i]));

  for (const id of dirty) {
    const row = local.get(id);
    if (!row) continue;
    if (index.has(id)) {
      out[index.get(id)] = row;
    } else if (String(id).startsWith('n')) {
      // Fila agregada a mano que el servidor aún no tiene.
      index.set(id, out.length);
      out.push(row);
    }
    // Una fila del Excel que ya no existe en el servidor (alguien cargó otro Excel) se descarta.
  }
  return out;
}

/** ¿Dos listas de filas son iguales (sin importar el orden)? */
export function sameRows(a, b) {
  const key = (rows) => JSON.stringify([...rows].sort((x, y) => String(x.id).localeCompare(String(y.id))));
  return key(a) === key(b);
}