# SLA Dashboard | Solutions & Payroll (React)

Seguimiento de clientes por estado y SLA. Lee el Excel del equipo, organiza cada cliente por color de estado y muestra último contacto, responsable y si ya se respondió. Los cambios se guardan en el servidor, así que todos ven lo mismo.

Stack: React 18 + Vite en el frontend, un servidor Node sin dependencias para guardar los datos, y ExcelJS para leer el .xlsx (incluidos los colores de relleno).

## Requisitos

- Node.js 18 o superior.

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Arranca dos procesos: Vite en el puerto 3000 (interfaz con recarga en vivo) y el servidor de datos en el 3001. Vite reenvía las llamadas `/api` al servidor.

## Producción (un solo puerto)

```bash
npm install
npm run build
npm start
```

Abre http://localhost:3000. El servidor sirve la carpeta `dist` y la API. Para otro puerto: `PORT=4000 npm start`. Para que otros compañeros entren, deben estar en la misma red y abrir `http://IP-DEL-COMPUTADOR:3000`.

## Cómo funciona

- **Cargar Excel:** botón "Cargar Excel" o arrastrar el .xlsx a la franja punteada. Reemplaza la tabla actual.
- **Colores:** se lee el color de relleno de cada fila (azul oscuro firmado, verde en operación, rosado en conversación, azul claro sin contacto). Si el Excel trae una columna `Estado` en texto, tiene prioridad.
- **Columnas reconocidas** (por el nombre del encabezado): cliente/empresa, estado, último contacto/fecha, responsable, respuesta/respondido, canal, notas. Si no hay encabezado de cliente, usa la primera columna.
- **SLA:** *Vencido* cuando pasan más de N días desde el último contacto (3 por defecto, editable en pantalla). *Por responder* cuando el contacto es reciente pero la respuesta sigue pendiente.
- **Equipo:** el campo *Responsable* y el filtro *Sin asignar* evitan que dos personas respondan al mismo cliente.

## Estructura

```
server.cjs                    Servidor HTTP: sirve dist/ y la API /api/state
index.html                    Entrada de Vite
vite.config.js                Puerto 3000 y proxy de /api
src/main.jsx                  Arranque de React
src/App.jsx                   Estado, guardado con retardo y refresco cada 10 s
src/components/Kpis.jsx       Conteos por estado (también filtran)
src/components/Filters.jsx    Búsqueda, responsable y SLA
src/components/ClientTable.jsx  Tabla editable
src/components/UploadBar.jsx  Mensaje de origen de datos y arrastrar archivo
src/lib/excel.js              Lectura del .xlsx y detección de color (ajusta aquí los tonos)
src/lib/sla.js                Reglas de SLA, filtros y orden
src/lib/dates.js              Manejo de fechas
src/lib/sample.js             Datos de ejemplo
src/lib/api.js                Llamadas al servidor
src/styles.css                Estilos con tema claro y oscuro
data/state.json               Datos compartidos (se crea solo; fuera de git)
```

## API

- `GET /api/state` devuelve `{ rows, sla, source, note, updatedAt }`.
- `PUT /api/state` reemplaza el estado completo con `{ rows, sla, source, note }`.

Cada fila: `{ id, client, status, last, owner, replied, channel, notes }`, con `status` en `firmado | operacion | conversacion | sin_contacto`, `last` como `AAAA-MM-DD` y `replied` en `si | pendiente | no`.

## Límites actuales

- Si dos personas editan al mismo tiempo, gana el último guardado.
- No hay inicio de sesión: cualquiera con acceso a la dirección puede editar.
- Los colores de tema de Excel (no los RGB directos) pueden no detectarse; la fila queda como *Sin contacto* y se corrige en la tabla.
- Al editar el estado o la fecha de un cliente, su fila puede cambiar de posición porque la tabla se ordena por estado y días sin contacto.
