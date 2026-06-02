# Studio32 — Arquitectura de verticales y Core compartido

**Fecha:** 2 de junio de 2026
**Documento:** Spec técnico y estratégico. Versión viva — actualizar en cada decisión cerrada.

---

## El modelo: árbol de sistemas operativos

Studio32 no es una agencia ni un SaaS genérico. Es el tronco tecnológico del que nacen sistemas
operativos verticales para negocios locales. Cada rama es un producto independiente hacia afuera,
pero comparte la misma raíz hacia dentro.

```
                         STUDIO32
                            │
              ┌─────────────┼─────────────┐──────────────┐
              │             │             │              │
        RestaurantOS     HostOS       ClinicOS       RetailOS
        (activo)        (siguiente)   (futuro)       (futuro)
              │
     ┌────────┼────────┐
     │        │        │
  Paffuto  Lateral  (otros)
  Aragón   Izquierdo clientes
   tenant   tenant
```

Cada vertical tiene sus propios módulos de dominio (fichaje, turnos, reservas, carta…), pero
comparte con todos los demás:

- El backend de autenticación (JWT, multi-tenant, roles)
- El modelo de tenants y suscripciones (Stripe, plan_code)
- Las apps móvil y web (una sola descarga, interfaz por rol y vertical)
- El sistema de notificaciones push
- La arquitectura de exports (Excel, PDF, CSV)
- El design system (colors, typography, componentes)

---

## Studio32 Core — módulos compartidos

Estos módulos existen hoy en RestaurantOS y son **reutilizables en cualquier vertical** sin
modificación o con ajuste mínimo de configuración.

| Módulo core | Ubicación actual | Reutilizable en |
|---|---|---|
| Auth (JWT + refresh + magic link) | `backend/app/api/v1/auth.py` | Todos |
| Multi-tenant (tenant_id en tablas, middleware) | `backend/app/core/deps.py` | Todos |
| Gestión de usuarios + roles | `backend/app/models/user.py` | Todos |
| Suscripción + plan_code (Stripe) | `tenants.plan_code`, `tenants.stripe_customer_id` | Todos |
| Push notifications (Expo) | `backend/app/services/push.py` + `mobile/src/lib/notifications.ts` | Todos |
| App móvil shell (routing por rol) | `mobile/app/_layout.tsx` | Todos |
| Web dashboard shell (Next.js App Router) | `web/src/app` | Todos |
| Design system (tokens, componentes) | `mobile/src/lib/colors.ts`, `web/tailwind.config.ts` | Todos |
| Audit log | `backend/app/models/audit.py` | Todos |
| Soft-delete + append-only | Patrón en todos los modelos | Todos |
| Exports (Excel, PDF, CSV) | `backend/app/api/v1/manager.py` | Todos |

---

## Vertical OS — lo que añade cada rama

### RestaurantOS (activo)

Módulos específicos:
- **Módulo 1 — Fichaje** (MVP actual): fichaje GPS/PIN/kiosko, eventos append-only,
  correcciones con motivo obligatorio, incidencias, exports nómina.
- **Módulo 2 — Turnos** (siguiente): drag-and-drop semanal, plantillas, open shifts,
  notificaciones de publicación.
- **Módulo 3 — HR básico** (futuro): contrato, documentos, onboarding empleado.

Dolor del cliente: "Saber quién trabajó, cuándo y cuántas horas tengo que pagar este mes."
Obligación legal: Ley 8/2019 registro horario diario.

### HostOS (siguiente vertical)

Módulos específicos:
- Reserva directa (vs OTAs): motor de disponibilidad + pagos Stripe.
- iCal sync: sincronización con Airbnb, Booking, Google Calendar.
- Guía del huésped digital: check-in, normas, recomendaciones.
- Automatizaciones pre/post estancia: WhatsApp, email.
- Gestión de reseñas post-estancia.

Dolor del cliente: "Reducir dependencia de OTAs y sus comisiones."
Base compartida con RestaurantOS: 100% del Core (auth, tenants, notificaciones, exports).

### ClinicOS (futuro)

Módulos específicos:
- Agenda de citas con recordatorios (SMS/WhatsApp).
- Ficha de paciente básica + historial de visitas.
- Formularios pre-visita (RGPD aplicado a datos de salud).
- Gestión de no-shows y cancelaciones.

Dolor del cliente: "Captar pacientes online y reducir no-shows."

### RetailOS (futuro)

Módulos específicos:
- Catálogo digital con precios y stock básico.
- Pedidos por WhatsApp / formulario.
- Programa de fidelización sencillo.
- Campañas de reactivación de clientes.

Dolor del cliente: "Vender más y activar clientes recurrentes sin depender de redes sociales."

---

## Modelo de roles — una sola app, interfaces distintas

La app móvil y el dashboard web detectan el rol del usuario desde el JWT y enrutan a la interfaz
correcta. **No hay apps separadas. Una descarga, experiencias distintas.**

### Rutas móviles (Expo Router)

```
app/
├── _layout.tsx         → detecta modo (manager | employee | kiosk) y enruta
├── login.tsx           → pantalla de login única
├── (employee)/         → interfaz empleado (4 tabs: Inicio, Calendario, Equipo, Perfil)
│   ├── index.tsx       → fichar entrada/salida + estado
│   ├── schedule.tsx    → calendario de turnos
│   ├── team.tsx        → equipo del turno
│   ├── profile.tsx     → perfil propio
│   ├── history.tsx     → historial de fichajes
│   ├── incidents.tsx   → reportar incidencias
│   └── shift/[id].tsx  → detalle de turno
├── (manager)/          → interfaz manager (4 tabs: En vivo, Fichajes, Equipo, Perfil)
│   ├── index.tsx       → dashboard live (quién está fichado ahora)
│   ├── fichajes.tsx    → sesiones del día con navegación por fecha
│   ├── empleados.tsx   → lista del equipo con filtros y búsqueda
│   └── perfil.tsx      → perfil + link a web dashboard + cerrar sesión
└── kiosk/              → interfaz tablet kiosko (PIN de empleado)
    ├── index.tsx        → pantalla de fichaje por PIN
    └── setup.tsx        → configuración del kiosko
```

### Lógica de routing post-login (`authStore.ts`)

```typescript
// Después de getMe():
const isManager = ["MANAGER", "OWNER", "SUPERVISOR", "SUPERADMIN"].includes(user.role);
const mode = isManager ? "manager" : "employee";
// Kiosk se activa explícitamente desde setup, no por login normal
```

### Modelo de precios — una app, todas las funcionalidades

RestaurantOS **no tiene feature gating por plan**. Todos los clientes acceden a todo.

El precio escala por capacidad operativa, no por funcionalidades:

```
Precio base        → 1 restaurante, hasta ~30 empleados
Precio por sucursal → cada local adicional suma un importe fijo
Precio enterprise   → cadenas de >5 locales o >100 empleados (negociado)
```

El campo `tenant.plan_code` en la base de datos se reserva para uso futuro
(multi-vertical, integraciones de pago avanzadas) pero **no controla ningún feature
en el cliente actualmente**. No implementar `usePlan()` con feature flags — es
complejidad prematura que no aporta valor hasta tener 10+ clientes activos.

---

## Estructura técnica del monorepo

```
restaurantos/                  ← (en el futuro: studio32-platform/)
├── backend/                   ← FastAPI + SQLAlchemy + PostgreSQL
│   └── app/
│       ├── core/              ← Studio32 Core: auth, deps, database
│       ├── models/            ← Modelos de datos (compartidos + verticales)
│       ├── api/v1/            ← Endpoints (auth, clock, shifts, manager…)
│       └── services/          ← Push, exports, lógica de dominio
├── web/                       ← Next.js — panel manager (todos los verticales)
├── mobile/                    ← Expo — app empleado + manager + kiosko
│   └── app/
│       ├── (employee)/        ← Interfaz empleado
│       ├── (manager)/         ← Interfaz manager ← NUEVO
│       └── kiosk/             ← Modo tablet
├── docs/                      ← Especificaciones canónicas
└── scripts/                   ← Seeds, utilidades
```

### Cómo se añade un nuevo vertical (HostOS)

1. **Backend**: crear `app/api/v1/host/` con los endpoints específicos (disponibilidad,
   reservas, iCal). El core (auth, tenants, users) se usa sin modificación.
2. **Web**: crear `web/src/app/(host)/` con las páginas del dashboard del propietario.
3. **Mobile**: añadir `app/(host-manager)/` si el rol lo requiere. Reutilizar
   `(employee)/` si los empleados de un alojamiento necesitan app (limpieza, etc.).
4. **Modelos**: añadir tablas específicas (`reservations`, `units`, `ical_feeds`) en
   `backend/app/models/`. Los modelos core (tenants, users, audit_log) no se tocan.
5. **Plan codes**: añadir `"host-starter"`, `"host-pro"`, `"host-business"` en el
   enum de planes y actualizar `usePlan()`.

El tiempo estimado para tener HostOS en demo: **3-4 semanas** si el Core está estable.

---

## Reglas de diseño del árbol

Estas reglas evitan que el árbol se rompa al crecer:

1. **Nunca modificar Core por un vertical.** Si algo necesita cambiar en auth, tenants o
   users, el cambio debe ser válido para todos los verticales.
2. **Los módulos de dominio no se comparten entre verticales.** Un fichaje de RestaurantOS
   no es una reserva de HostOS aunque tengan estructuras similares. Dos tablas separadas.
3. **Un solo design system.** Los colores, tipografía y componentes base son los mismos en
   todos los verticales. La identidad visual del vertical se aplica con temas/tokens encima.
4. **El routing por rol escala.** Añadir un nuevo rol (`HOST_MANAGER`) es añadir un nuevo
   grupo en Expo Router y una condición en `authStore`. No requiere reescribir nada.
5. **Multi-tenant desde el día 1 en cada vertical.** Ninguna tabla de dominio puede existir
   sin `tenant_id`. Sin excepciones.

---

## Estado actual (2 junio 2026)

| Componente | Estado |
|---|---|
| Studio32 Core (auth, tenants, roles) | ✅ Completo en RestaurantOS |
| RestaurantOS — Módulo 1 Fichaje | ✅ MVP listo para demo |
| App móvil — Interfaz empleado | ✅ Completa (9 pantallas) |
| App móvil — Interfaz manager | ✅ Nueva (4 pantallas, añadida hoy 02/06/2026) |
| App móvil — Kiosko | ✅ Completo |
| Web dashboard — Manager | ✅ Completo (10 páginas) |
| RestaurantOS — Módulo 2 Turnos | ⏳ Pendiente (post primer cliente) |
| HostOS | ⏳ Pendiente (post validación RestaurantOS) |
| ClinicOS / RetailOS | 🔮 Futuro |

---

*Documento técnico de Studio32. Versión viva — refleja decisiones cerradas, no aspiraciones.*
