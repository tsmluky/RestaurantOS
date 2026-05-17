# RestaurantOS — Sistema de diseño

Tokens y convenciones visuales para mantener coherencia entre web manager (Next.js) y app móvil (Expo).

## Principios

1. **Claridad sobre estética**. El manager y el empleado tienen 3 segundos para entender la pantalla.
2. **Una pantalla, una métrica dominante**. Lo demás es contexto.
3. **Español nativo**, sin traducciones literales del inglés.
4. **Densidad alta en web, densidad baja en móvil**.
5. **Sin modo oscuro en MVP**.

## Color tokens

### Brand

```
--navy:        #0F172A   /* Header principal */
--primary:     #2563EB   /* CTA, links, estado activo */
--primary-fg:  #FFFFFF
```

### Semánticos

```
--success:     #10B981   /* Sesión cerrada OK, fichaje exitoso */
--warning:     #F59E0B   /* Pendiente, día libre, atención */
--danger:      #EF4444   /* Error, incidencia, libre forzado */
--info:        #3B82F6   /* Informativo */
```

### Neutrales

```
--bg:          #F8FAFC   /* Fondo de página */
--surface:     #FFFFFF   /* Cards, modales */
--border:      #E2E8F0   /* Bordes sutiles */
--text:        #0F172A   /* Texto principal */
--text-muted:  #64748B   /* Labels secundarios */
```

## Tipografía

- **Familia**: `Inter` (web), `Inter` o sistema (mobile).
- **Pesos**: 400 (regular), 600 (semibold), 700 (bold).
- **Escala** (px):

| Nivel | Tamaño | Uso |
|---|---|---|
| display | 36 | Greeting personalizado |
| h1 | 28 | Título de pantalla |
| h2 | 22 | Título de card grande |
| h3 | 18 | Título de sección |
| body | 16 | Texto principal |
| body-sm | 14 | Texto secundario |
| caption | 12 | Labels, metadata |

## Spacing

Múltiplos de 4: `4, 8, 12, 16, 24, 32, 48, 64`.

## Border radius

```
--radius-badge:  6px
--radius-button: 8px
--radius-card:   12px
--radius-modal:  16px
```

## Sombras

```
--shadow-sm:   0 1px 2px rgba(15, 23, 42, 0.06)
--shadow-md:   0 4px 12px rgba(15, 23, 42, 0.08)
--shadow-lg:   0 12px 32px rgba(15, 23, 42, 0.12)
```

## Iconografía

- **Librería única**: [Lucide](https://lucide.dev) (web y móvil).
- **Stroke**: 1.5px.
- **Tamaños**: 16, 20, 24.

## Patrones de UI

### Card con borde lateral coloreado

Indica estado de un turno o sesión.

| Borde | Estado |
|---|---|
| `primary` (azul) | Turno normal / sesión abierta |
| `success` (verde) | Sesión cerrada y validada |
| `warning` (amarillo) | Pendiente de revisión, día libre |
| `danger` (rojo) | Incidencia, error, rechazada |

### Hero number

Una pantalla principal tiene un único número grande dominante.
Ejemplo dashboard manager: **"X de Y empleados dentro"**.

### Empty states

Cada lista vacía muestra:
- Icono Lucide en color `text-muted`.
- Mensaje claro en español ("Aún no hay fichajes hoy").
- (Opcional) CTA para la acción más probable.

### Toast contextual con CTA

Para acciones recientes con seguimiento:

```
[icon] [titulo de la accion]
       [CTA: "Revisar"]
```

Aparece flotante sobre el bottom tab bar, dismissible.

## Texto y microcopy

### Reglas de español

- **Nunca** traducir literalmente del inglés.
- Saludos según hora: "Buenos días" (< 14h), "Buenas tardes" (14-20h), "Buenas noches" (> 20h).
- Formato de horas: `8h 30min`, no `8,5h` ni `08:30`.
- Fechas: `mié 20 may`, no `20/05/2026` salvo en exports.
- Acciones: imperativo claro ("Fichar entrada", "Corregir", "Exportar").
- Errores: explicativos, nunca técnicos. ❌ "Error 409" → ✅ "Ya tienes un fichaje abierto desde las 12:00".

### Lista de strings canónicos

| Concepto | Texto |
|---|---|
| Estado dentro | "Dentro" |
| Estado fuera | "Fuera" |
| Acción entrada | "Fichar entrada" |
| Acción salida | "Fichar salida" |
| Día libre | "Libre" |
| Pendiente revisión | "Pendiente" |
| Incidencia | "Incidencia" |
| Sesión corregida | "Corregida" |
| Horas trabajadas | "Trabajadas" |
| Horas programadas | "Programadas" |

## Componentes recomendados

### Web (Next.js + Tailwind)

- **shadcn/ui** como base (Button, Dialog, Sheet, Toast, Table, Form).
- **TanStack Table** para tablas con sticky header y filtros.
- **react-day-picker** para selectores de fecha.
- **Framer Motion** solo para drawers y toasts.

### Mobile (Expo)

- **React Navigation** (bottom tabs + stack).
- **Tamagui** o **NativeWind** (Tailwind para RN).
- **react-native-reanimated** para animaciones de confirmación de fichaje.
- **expo-local-authentication** para futuro (biometría como segundo factor opcional).

## Tabla de tokens en código

### `web/tailwind.config.ts` (preview)

```ts
export default {
  theme: {
    extend: {
      colors: {
        navy: '#0F172A',
        primary: { DEFAULT: '#2563EB', fg: '#FFFFFF' },
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
        bg:      '#F8FAFC',
        surface: '#FFFFFF',
        border:  '#E2E8F0',
        muted:   '#64748B',
      },
      borderRadius: {
        badge:  '6px',
        button: '8px',
        card:   '12px',
        modal:  '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```
