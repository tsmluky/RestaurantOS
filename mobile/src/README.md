# Mobile App Structure

La app móvil se implementará en dos modos:

- `employee`: login personal, estado actual, fichar entrada/salida, historial e incidencias.
- `kiosk`: tablet compartida, setup manager, PIN empleado y confirmación de entrada/salida.

El backend ya soporta ambos flujos:

- `POST /api/v1/clock/in`
- `POST /api/v1/clock/out`
- `POST /api/v1/clock/kiosk`
