# RestaurantOS — Mobile

App Expo SDK 51 + React Native + TypeScript para empleados y kiosk tablet.

## Requisitos

- Node 18+
- Expo CLI (`npm install -g expo-cli`)
- Dispositivo físico o emulador iOS/Android

## Instalación

```bash
cd mobile
npm install
```

## Configuración

Crea un fichero `.env` en `mobile/`:

```env
EXPO_PUBLIC_API_URL=http://<IP-DEL-SERVIDOR>:8000/api/v1
```

> **Importante:** En desarrollo local con dispositivo físico, usa la IP de red de tu máquina (no `127.0.0.1`). Ejemplo: `192.168.1.10:8000`.

## Arrancar

```bash
npm start           # Menú interactivo de Expo
npm run android     # Emulador Android
npm run ios         # Simulador iOS (solo macOS)
```

Escanea el QR con Expo Go (iOS/Android) para probar en dispositivo real.

## Credenciales demo

| Rol      | Email                              | Contraseña    |
|----------|------------------------------------|---------------|
| Manager  | manager@demo.dev                   | demo-manager  |
| Empleado | francisco.iannicelli@demo.dev      | demo-employee |
| Kiosk PIN demo | —                          | 1004          |

## Estructura del proyecto

```
mobile/
├── app/                          # expo-router (rutas = ficheros)
│   ├── _layout.tsx               # Root layout — inicializa auth y redirige
│   ├── login.tsx                 # Login empleado + enlace a kiosk setup
│   ├── (employee)/               # Modo empleado (bottom tabs)
│   │   ├── _layout.tsx           # Tabs: Inicio / Historial / Incidencia / Perfil
│   │   ├── index.tsx             # Home — estado actual + botón fichar
│   │   ├── history.tsx           # Historial de jornadas
│   │   ├── incidents.tsx         # Reportar incidencia
│   │   └── profile.tsx           # Perfil y cierre de sesión
│   └── kiosk/                    # Modo kiosk tablet
│       ├── _layout.tsx
│       ├── setup.tsx             # Login manager + selección de sucursal
│       └── index.tsx             # PIN pad + confirmación entrada/salida
└── src/
    ├── components/               # Componentes reutilizables
    │   ├── ClockButton.tsx       # Botón grande fichar entrada/salida
    │   ├── StatusCard.tsx        # Card de estado actual con borde de color
    │   ├── PinPad.tsx            # Teclado numérico para kiosk
    │   ├── WorkSessionCard.tsx   # Card de jornada en historial
    │   └── ErrorBanner.tsx       # Banner de error dismissible
    ├── lib/
    │   ├── api.ts                # Cliente API — todos los endpoints
    │   ├── auth.ts               # SecureStore: token, modo, sucursal kiosk
    │   ├── location.ts           # GPS puntual (solo al fichar)
    │   ├── format.ts             # Formatos de fecha/hora/duración en español
    │   └── colors.ts             # Paleta de colores compartida
    └── store/
        ├── authStore.ts          # Zustand: usuario, token, modo
        └── clockStore.ts         # Zustand: estado de fichaje e historial
```

## Flujos de la app

### Modo empleado
1. Login con email + contraseña → token guardado en SecureStore
2. Home muestra estado actual (OFF_DUTY / CLOCKED_IN / MISSING_CLOCK_OUT)
3. Botón "Fichar entrada" / "Fichar salida" — pide ubicación en ese momento
4. Historial de jornadas propias
5. Formulario de incidencia (tipo + descripción)
6. Perfil con cierre de sesión

### Modo kiosk (tablet compartida)
1. Manager inicia sesión en `/kiosk/setup` y selecciona la sucursal
2. La tablet queda en pantalla de PIN
3. Empleado introduce su PIN → la app decide entrada o salida según estado
4. Pantalla de confirmación 4 segundos → vuelve al PIN pad
5. Estados de error: PIN incorrecto, ya fichado, sin conexión

## Endpoints usados

| Método | Ruta                     | Uso                              |
|--------|--------------------------|----------------------------------|
| POST   | /auth/login              | Login empleado y manager kiosk   |
| GET    | /auth/me                 | Perfil del usuario autenticado   |
| GET    | /clock/status            | Estado actual del empleado       |
| POST   | /clock/in                | Fichar entrada (modo empleado)   |
| POST   | /clock/out               | Fichar salida (modo empleado)    |
| GET    | /clock/history/me        | Historial de jornadas propias    |
| POST   | /clock/incidents         | Reportar incidencia              |
| POST   | /clock/kiosk             | Fichar vía PIN (modo kiosk)      |
| GET    | /restaurants             | Lista de sucursales para kiosk   |

---

## API contracts

La app móvil consume los contratos reales del backend FastAPI. Si cambian los
schemas de backend, actualizar primero `src/lib/api.ts`.

### `GET /api/v1/auth/me`

**Estado:** implementado e integrado.

Devuelve `full_name`, `role`, `primary_restaurant_id` y `restaurant_name`. La app
usa estos campos para saludar al empleado, mostrar su perfil y saber en qué
sucursal debe fichar.

### `GET /api/v1/restaurants`

**Estado:** implementado e integrado.

Lo usa `app/kiosk/setup.tsx` para seleccionar la sucursal de una tablet.

### `GET /api/v1/clock/history/me`

**Estado:** implementado e integrado.

El backend devuelve `{ "items": [...] }`; `src/lib/api.ts` normaliza la respuesta
a una lista de `WorkSession` para las pantallas.

### `POST /api/v1/clock/incidents`

**Estado:** implementado e integrado.

La app envía `restaurant_id`, `type`, `affected_date`, descripción y sesión
relacionada cuando existe.

### `POST /api/v1/clock/kiosk`

**Estado:** implementado e integrado.

La app envía `employee_pin`, `restaurant_id`, `action: "AUTO"` e `idempotency_key`.
Errores relevantes: PIN incorrecto o empleado inactivo → HTTP `401`; acción
incompatible con sesión actual → HTTP `409`.

---

## Detalles de UX implementados

- Saludo dinámico según hora: "Buenos días / Buenas tardes / Buenas noches"
- Duración siempre en formato `8h 30min` (nunca `8.5h`)
- Empty states con icono Lucide + mensaje amable en todas las listas
- StatusCard con borde lateral de color según estado del turno
- Ubicación solicitada solo en el momento de fichar (no en background)
- Token persistido en SecureStore (cifrado en el dispositivo)
- Modo kiosk configurado una sola vez; persiste entre reinicios
- PIN pad con tecla de borrar, máximo 6 dígitos
- Pantalla de resultado kiosk se resetea sola a los 4 segundos
