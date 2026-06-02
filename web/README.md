# RestaurantOS — Web (Manager dashboard)

Next.js 14 (App Router) + TailwindCSS + shadcn/ui.

## Pendiente de scaffolding

Esta carpeta está reservada. El scaffolding inicial se hace con la CLI oficial (más rápido y mantenible que escribirlo a mano).

## Setup inicial (a ejecutar cuando arranquemos Fase 1.2 del frontend)

```powershell
# Desde la raíz del monorepo
cd web

# 1. Scaffold Next.js (App Router, TS, Tailwind, ESLint)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm

# 2. Añadir shadcn/ui
pnpm dlx shadcn@latest init

# 3. Componentes base que vamos a necesitar
pnpm dlx shadcn@latest add button card dialog dropdown-menu form input label select sheet sonner table tabs toast

# 4. Cliente API tipado desde el OpenAPI del backend
pnpm add -D openapi-typescript
pnpm dlx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts

# 5. React Query
pnpm add @tanstack/react-query

# 6. Auth client + Zustand para estado mínimo
pnpm add zustand jose
```

## Después del scaffold

Sobreescribir `tailwind.config.ts` con los tokens definidos en `docs/DESIGN_SYSTEM.md`.

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F172A",
        primary: { DEFAULT: "#2563EB", fg: "#FFFFFF" },
        success: "#10B981",
        warning: "#F59E0B",
        danger:  "#EF4444",
        info:    "#3B82F6",
        bg:      "#F8FAFC",
        surface: "#FFFFFF",
        border:  "#E2E8F0",
        muted:   "#64748B",
      },
      borderRadius: {
        badge:  "6px",
        button: "8px",
        card:   "12px",
        modal:  "16px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
```

## Estructura objetivo de la app

```
web/src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/magic-link/page.tsx
│   ├── (manager)/
│   │   ├── layout.tsx              # Sidebar + topbar
│   │   ├── page.tsx                # Dashboard live (redirect from /)
│   │   ├── fichajes/page.tsx       # Vista diaria
│   │   ├── empleados/page.tsx      # CRUD empleados
│   │   ├── empleados/[id]/page.tsx # Vista por empleado
│   │   ├── correcciones/page.tsx   # Pendientes
│   │   ├── incidencias/page.tsx
│   │   ├── exports/page.tsx
│   │   └── config/page.tsx
│   └── (admin)/
│       └── tenants/page.tsx        # Solo SUPERADMIN
├── components/
│   ├── ui/                          # shadcn (auto-generated)
│   ├── layout/                      # Sidebar, Topbar
│   └── manager/                     # ClockLiveCard, EmployeeRow, etc.
├── lib/
│   ├── api.ts                       # Fetch client + auth
│   ├── api-types.ts                 # Generado desde OpenAPI
│   ├── auth-store.ts                # Zustand (token, user)
│   └── format.ts                    # formatDuration, formatDate
└── styles/globals.css
```

## Pantallas mínimas (orden recomendado de implementación)

1. **Login** (`/login`) — form email+pass.
2. **Magic link landing** (`/magic-link?token=...`) — set password + login.
3. **Dashboard live** (`/`) — quién está dentro ahora.
4. **Fichajes diarios** (`/fichajes`) — tabla con filtros.
5. **Empleados** (`/empleados`) — CRUD + reset PIN.
6. **Correcciones** (`/correcciones`) — corregir sesión con motivo.
7. **Exportaciones** (`/exports`) — generar CSV.
8. **Configuración** (`/config`) — local, tolerancia, max sesión.
