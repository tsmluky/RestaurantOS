# RestaurantOS — Mobile (Empleado + Tablet kiosko)

Expo SDK 51 + React Native + TypeScript.

## Decisión arquitectónica clave

**Un único binario Expo con dos modos**:

- **Modo empleado**: login personal, ver propio historial, reportar incidencias.
- **Modo tablet (kiosko)**: vinculada a un `restaurant_id` con device token, pantalla numérica para fichar con PIN.

El modo se selecciona al primer inicio (toggle con confirmación de manager) y se persiste en `AsyncStorage`.

## Pendiente de scaffolding

```powershell
cd mobile

# 1. Scaffold Expo (TS, tabs template)
npx create-expo-app@latest . --template blank-typescript

# 2. Dependencias clave
npx expo install expo-router expo-secure-store expo-local-authentication expo-haptics expo-screen-orientation expo-keep-awake
npx expo install react-native-safe-area-context react-native-screens
npm install nativewind tailwindcss
npm install @tanstack/react-query zustand date-fns
npm install lucide-react-native
```

## Estructura objetivo

```
mobile/
├── app/                            # expo-router
│   ├── _layout.tsx                 # Root + provider de auth
│   ├── index.tsx                   # Redirige a /tablet o /(employee) según modo
│   ├── tablet/                     # MODO KIOSKO
│   │   ├── _layout.tsx
│   │   ├── index.tsx               # Pantalla numérica de PIN
│   │   ├── confirm.tsx             # Confirmación in/out con nombre
│   │   └── setup.tsx               # Vincular tablet (login manager)
│   └── (employee)/                 # MODO EMPLEADO
│       ├── _layout.tsx             # Bottom tabs
│       ├── index.tsx               # Home
│       ├── calendar.tsx            # Historial
│       ├── incidents.tsx           # Reportar incidencia
│       └── profile.tsx
├── components/
│   ├── PinPad.tsx
│   ├── ClockButton.tsx
│   ├── ShiftCard.tsx
│   └── StatusBadge.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts                     # SecureStore wrapper
│   ├── offline-queue.ts            # AsyncStorage queue
│   └── format.ts
└── tailwind.config.js
```

## Modo kiosko — Pantalla numérica

Características críticas:

- Teclado numérico grande (botones 80x80px mínimo).
- Hora actual visible arriba a la derecha.
- Logo del restaurante (custom por tenant).
- Haptic feedback en cada tap (`expo-haptics`).
- Sonido suave en confirmación (`expo-av`).
- Pantalla siempre encendida (`expo-keep-awake`).
- Orientación bloqueada en landscape (`expo-screen-orientation`).
- Auto-reset a estado limpio 5s después de cada acción.
- Cache offline (`AsyncStorage`) de hasta 50 eventos pendientes.
- Animación de confirmación: checkmark grande verde + nombre + hora.

## Pantallas mínimas (orden)

### Modo tablet
1. **Setup** — login manager, anclar a `restaurant_id`, registrar `device_id`.
2. **PIN pad** — teclado numérico.
3. **Confirm in** — "Hola María, ¿fichar ENTRADA?".
4. **Confirm out** — "Hasta pronto, María. Hoy 8h 29min".

### Modo empleado
1. **Login** — email+PIN o magic link.
2. **Home** — greeting, próximo turno, total semana.
3. **Calendario** — lista de turnos por día.
4. **Incidencia** — formulario simple.
5. **Perfil** — config básica.

## Detalles de UX que separan producto de prototipo

- **Greeting según hora**: "Buenos días" / "Buenas tardes" / "Buenas noches".
- **Formato horas**: `8h 30min`, NUNCA `8.5h` ni `08:30:00`.
- **Empty states ilustrados**: cada lista vacía con icono Lucide + texto amable.
- **Animaciones** con `react-native-reanimated` solo en aparición de confirmación.
- **Bottom tabs** azul cuando activo, gris cuando no.
- **Card con borde lateral de color** para estados de turno (ver `docs/DESIGN_SYSTEM.md`).
