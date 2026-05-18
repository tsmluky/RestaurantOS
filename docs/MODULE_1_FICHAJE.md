# Módulo 1 — Fichaje / Time Clock

Documento canónico. Decisiones cerradas. Esta es la referencia que prevalece sobre cualquier conversación o intuición posterior.

## Objetivo

Resolver el problema operativo más universal de cualquier restaurante de 5-30 empleados: **saber con certeza quién trabajó, cuándo y cuántas horas hay que pagar este mes**. Sustituye Excel, cuadernos en la barra y sistemas enterprise sobredimensionados.

Es el core del MVP porque:

- Es dolor diario, no mensual.
- Tiene ROI medible en horas y €.
- No requiere integraciones externas para ser útil.
- Genera el dato fundacional para futuros módulos (Turnos, HR).

## Roles

| Rol | Puede | NO puede |
|---|---|---|
| `SUPERADMIN` | Crear/desactivar tenants, crear manager inicial, impersonar con log | Editar datos operativos sin dejar audit log |
| `MANAGER` | Gestionar empleados, corregir fichajes, aprobar incidencias, exportar | Ver otros tenants, borrar `time_clock_events` |
| `SUPERVISOR` | Corregir fichajes con log, aprobar incidencias menores | Crear/eliminar empleados, exportar para nómina |
| `EMPLOYEE` | Fichar, ver historial propio, reportar incidencias | Ver a compañeros, editar fichajes propios |

> En MVP solo se implementan `SUPERADMIN`, `MANAGER`, `EMPLOYEE`. `SUPERVISOR` queda en v1.2.

## Decisiones arquitectónicas cerradas

### 1. Multi-tenant: `tenant_id` compartido

`tenant_id` en cada tabla operativa, middleware obligatorio que lo inyecta desde JWT, tests automáticos de aislamiento. Schema-per-tenant descartado por coste operativo para 1 dev.

### 2. Verificación: móvil del empleado + kiosk fallback

- App móvil personal para empleados.
- Geolocalización solo en el momento exacto de fichar entrada/salida.
- Radio por defecto: 100m por sucursal.
- No tracking continuo, no rutas, no background location.
- Si falta GPS o está fuera de zona, el fichaje puede quedar con warning para revisión.
- Tablet kiosko con PIN de empleado queda incluido como fallback MVP.
- QR dinámico queda para futuro configurable.

### 3. Eventos vs sesiones

- `time_clock_events`: **append-only**. Fuente legal. Nunca se borra ni modifica.
- `work_sessions`: derivada. Mutable solo vía `clock_corrections` documentadas.

### 4. Append-only + soft-delete

- Eventos de fichaje nunca se borran.
- Tablas con `deleted_at` para soft-delete: `tenants`, `restaurants`, `users`, `employee_profiles`.

## Modelo de datos

Todas las tablas tienen `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

### `tenants`

| Campo | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| name | VARCHAR(120) | NO | — | |
| slug | VARCHAR(60) | NO | — | UNIQUE |
| status | ENUM | NO | 'ACTIVE' | ACTIVE / SUSPENDED / CANCELLED |
| plan_code | VARCHAR(30) | NO | 'starter' | |
| stripe_customer_id | VARCHAR(60) | YES | — | UNIQUE |
| timezone | VARCHAR(60) | NO | 'Europe/Madrid' | IANA |
| deleted_at | TIMESTAMPTZ | YES | — | Soft delete |

### `restaurants`

| Campo | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| tenant_id | UUID | NO | — | FK, idx |
| name | VARCHAR(120) | NO | — | |
| address | TEXT | YES | — | |
| timezone | VARCHAR(60) | NO | — | Override del tenant |
| latitude | NUMERIC(10,7) | YES | — | Centro geofence |
| longitude | NUMERIC(10,7) | YES | — | Centro geofence |
| geofence_radius_m | INT | NO | 100 | Radio permitido |
| late_tolerance_min | INT | NO | 10 | |
| max_session_hours | INT | NO | 14 | Auto-flag si supera |
| open_time | TIME | YES | — | |
| close_time | TIME | YES | — | |
| deleted_at | TIMESTAMPTZ | YES | — | |

UNIQUE (tenant_id, name).

### `users`

| Campo | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| tenant_id | UUID | YES | NULL | NULL solo SUPERADMIN |
| email | CITEXT | YES | NULL | UNIQUE parcial |
| phone | VARCHAR(20) | YES | — | |
| full_name | VARCHAR(120) | NO | — | idx |
| password_hash | VARCHAR(255) | YES | NULL | NULL para empleados solo-PIN |
| pin_hash | VARCHAR(255) | YES | NULL | bcrypt del PIN |
| role | ENUM | NO | 'EMPLOYEE' | SUPERADMIN / MANAGER / SUPERVISOR / EMPLOYEE |
| status | ENUM | NO | 'ACTIVE' | ACTIVE / INACTIVE / TERMINATED |
| last_login_at | TIMESTAMPTZ | YES | — | |
| deleted_at | TIMESTAMPTZ | YES | — | |

UNIQUE (tenant_id, email) WHERE email IS NOT NULL.
PIN único por tenant validado en aplicación.

### `employee_profiles`

| Campo | Tipo | Null | Default | Notas |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | — | FK UNIQUE |
| tenant_id | UUID | NO | — | FK redundante por velocidad |
| primary_restaurant_id | UUID | YES | — | FK |
| employee_code | VARCHAR(30) | YES | — | Para gestoría |
| hourly_rate_cents | INT | YES | — | Solo visible a manager |
| contract_hours_week | INT | YES | — | |
| hired_at | DATE | YES | — | |
| terminated_at | DATE | YES | — | |
| notes | TEXT | YES | — | |

### `time_clock_events` (append-only)

| Campo | Tipo | Null | Notas |
|---|---|---|---|
| id | UUID | NO | PK |
| tenant_id | UUID | NO | FK, idx |
| restaurant_id | UUID | NO | FK, idx |
| user_id | UUID | NO | FK, idx |
| event_type | ENUM | NO | CLOCK_IN / CLOCK_OUT |
| event_at | TIMESTAMPTZ | NO | Server time, idx desc |
| client_event_at | TIMESTAMPTZ | YES | Cliente (auditoría) |
| source | ENUM | NO | TABLET / MOBILE_APP / WEB / MANAGER_CORRECTION |
| verification_method | ENUM | NO | GPS / PIN / QR / HYBRID / NONE |
| verification_status | ENUM | NO | VERIFIED / WARNING / FAILED |
| device_id | VARCHAR(120) | YES | idx |
| ip_address | INET | YES | |
| user_agent | TEXT | YES | |
| latitude | NUMERIC(9,6) | YES | |
| longitude | NUMERIC(9,6) | YES | |
| distance_m | INT | YES | Distancia a sucursal |
| idempotency_key | VARCHAR(120) | NO | Evita doble tap |
| work_session_id | UUID | YES | FK, idx |

Sin `deleted_at`. Sin endpoints DELETE/UPDATE. Inmutable.

### `work_sessions`

| Campo | Tipo | Null | Notas |
|---|---|---|---|
| id | UUID | NO | PK |
| tenant_id | UUID | NO | FK, idx |
| restaurant_id | UUID | NO | FK, idx |
| user_id | UUID | NO | FK, idx |
| clock_in_event_id | UUID | NO | FK |
| clock_out_event_id | UUID | YES | FK, NULL si OPEN |
| clock_in_at | TIMESTAMPTZ | NO | |
| clock_out_at | TIMESTAMPTZ | YES | |
| duration_minutes | INT | YES | Calculado |
| status | ENUM | NO | OPEN / CLOSED / CORRECTED / NEEDS_REVIEW / REJECTED |
| was_corrected | BOOL | NO | FALSE |
| flagged_reasons | TEXT[] | YES | Array de razones |

UNIQUE (user_id) WHERE status = 'OPEN'.

### `clock_corrections`

| Campo | Tipo | Null | Notas |
|---|---|---|---|
| id | UUID | NO | PK |
| tenant_id | UUID | NO | FK, idx |
| work_session_id | UUID | NO | FK, idx |
| corrected_by_user_id | UUID | NO | FK |
| previous_clock_in_at | TIMESTAMPTZ | YES | |
| previous_clock_out_at | TIMESTAMPTZ | YES | |
| new_clock_in_at | TIMESTAMPTZ | YES | |
| new_clock_out_at | TIMESTAMPTZ | YES | |
| reason | TEXT | NO | Obligatorio |
| incident_id | UUID | YES | FK opcional |

### `clock_incidents`

| Campo | Tipo | Null | Notas |
|---|---|---|---|
| id | UUID | NO | PK |
| tenant_id | UUID | NO | FK, idx |
| user_id | UUID | NO | FK |
| restaurant_id | UUID | NO | FK |
| type | ENUM | NO | FORGOT_CLOCK_OUT / FORGOT_CLOCK_IN / WRONG_TIME / OTHER |
| affected_date | DATE | NO | idx |
| suggested_clock_in_at | TIMESTAMPTZ | YES | |
| suggested_clock_out_at | TIMESTAMPTZ | YES | |
| description | TEXT | YES | |
| status | ENUM | NO | PENDING / APPROVED / REJECTED / RESOLVED |
| resolved_by_user_id | UUID | YES | FK |
| resolved_at | TIMESTAMPTZ | YES | |
| resolution_note | TEXT | YES | |
| related_work_session_id | UUID | YES | FK |

### `export_batches`

| Campo | Tipo | Null | Notas |
|---|---|---|---|
| id | UUID | NO | PK |
| tenant_id | UUID | NO | FK, idx |
| requested_by_user_id | UUID | NO | FK |
| date_from | DATE | NO | |
| date_to | DATE | NO | |
| format | ENUM | NO | CSV / XLSX |
| status | ENUM | NO | PROCESSING / READY / FAILED |
| file_url | TEXT | YES | URL firmada |
| row_count | INT | YES | |
| error_message | TEXT | YES | |
| completed_at | TIMESTAMPTZ | YES | |

### `audit_logs`

| Campo | Tipo | Null | Notas |
|---|---|---|---|
| id | BIGSERIAL | NO | PK |
| tenant_id | UUID | YES | idx |
| actor_user_id | UUID | YES | idx |
| action | VARCHAR(80) | NO | idx |
| target_type | VARCHAR(60) | YES | |
| target_id | UUID | YES | idx |
| payload | JSONB | YES | GIN |
| ip_address | INET | YES | |
| user_agent | TEXT | YES | |
| created_at | TIMESTAMPTZ | NO | idx desc |

## API REST (resumen)

Prefijo: `/api/v1`. Auth: `Bearer <JWT>`. Tenant siempre desde claim del JWT.

| Método | Path | Rol |
|---|---|---|
| POST | `/auth/login` | público |
| POST | `/auth/magic-link` | público |
| POST | `/auth/magic-link/verify` | público |
| GET | `/auth/me` | cualquiera |
| POST | `/auth/refresh` | cualquiera |
| GET | `/employees` | manager |
| POST | `/employees` | manager |
| PATCH | `/employees/{id}` | manager |
| POST | `/employees/{id}/reset-pin` | manager |
| DELETE | `/employees/{id}` | manager |
| POST | `/clock/in` | tablet/empleado |
| POST | `/clock/out` | tablet/empleado |
| POST | `/clock/kiosk` | manager/supervisor |
| GET | `/clock/status` | empleado |
| GET | `/clock/history/me` | empleado |
| POST | `/clock/incidents` | empleado |
| GET | `/manager/clock/live` | manager |
| GET | `/manager/clock/events` | manager |
| GET | `/manager/work-sessions` | manager |
| PATCH | `/manager/work-sessions/{id}` | manager |
| GET | `/manager/incidents` | manager |
| PATCH | `/manager/incidents/{id}` | manager |
| GET | `/manager/exports/hours` | manager |
| GET | `/manager/exports/{id}` | manager |
| POST | `/admin/tenants` | superadmin |
| POST | `/admin/tenants/{id}/managers` | superadmin |

Schemas detallados de request/response en el código (`backend/app/schemas/`).

## Reglas de negocio

1. No clock-in dos veces sin clock-out: constraint UNIQUE sesión OPEN por user.
2. No clock-out sin sesión abierta: 409 NO_OPEN_SESSION.
3. Olvido de salida: job futuro cada 30min flaggea sesiones > `max_session_hours` como `NEEDS_REVIEW`.
4. Fichaje fuera de geofence: aceptado con `verification_status='WARNING'` y `flagged_reasons=['outside_geofence']`.
5. Fichaje sin GPS: aceptado con warning `missing_gps` para no bloquear operación.
6. Kiosk tablet: requiere sesión de manager/supervisor y PIN del empleado.
6. Sin turno asignado: MVP no requiere turno previo.
7. Corrección genera registro en `clock_corrections` + audit log.
8. Solo sesiones `CLOSED` o `CORRECTED` cuentan para nómina.
9. Eventos de fichaje son inmutables.
10. Toda corrección requiere `reason` no vacío.

## Estados

### Sesión

```
OPEN ──┬──→ CLOSED ────→ CORRECTED
       ├──→ NEEDS_REVIEW ──→ CORRECTED
       └──→ REJECTED
```

### Incidencia

```
PENDING ──→ APPROVED ──→ RESOLVED
       └──→ REJECTED
```

## MVP scope (estricto)

### Incluir

- Tenants + varias sucursales por tenant desde día 1.
- Roles SUPERADMIN, MANAGER, EMPLOYEE.
- Login web manager + login móvil empleado.
- App móvil empleado con geolocalización puntual.
- Kiosk tablet básico con PIN para empleados que no quieran usar móvil personal.
- Endpoints listados arriba.
- Dashboard live + vista diaria + correcciones + export CSV/XLSX/PDF (sync).
- Audit log.
- Onboarding manual por superadmin con magic link.

### Excluir

- Tracking continuo de ubicación.
- Rol SUPERVISOR.
- Push notifications (solo email transaccional).
- Foto en fichaje.
- Cuenta bancaria / nómina / HR documental.
- NFC, QR dinámico.
- WhatsApp/Twilio.
- Métricas analytics.
- Multi-idioma.
- Auto-suspensión Stripe.

### Posponer (v1.1 / v1.2)

- v1.1: device token específico para tablet, QR dinámico, foto fichaje, push, exports async.
- v1.2: rol SUPERVISOR, alertas configurables, auto-suspensión Stripe, integraciones gestoría, PostgreSQL RLS.

## Plan de implementación

| Fase | Duración | Entregable |
|---|---|---|
| 1. Base | 2 semanas | Auth, tenants, users, isolation tests, deploys |
| 2. Clock-in/out | 2 semanas | Tablet kiosko funcionando, eventos + sesiones |
| 3. Dashboard | 2 semanas | Live + diaria + CRUD empleados + config |
| 4. Correcciones + Export | 2 semanas | Correcciones, incidencias, CSV |
| 5. Piloto real | 2 semanas | 1-2 restaurantes piloto + soporte intensivo |

## Preguntas críticas pendientes de respuesta

Antes de pasar de Fase 1 a Fase 2, Studio32 debe cerrar:

1. Restaurante piloto: 2 sucursales.
2. Empleados ficharán desde móvil personal.
3. Formato inicial: CSV/XLSX/PDF mensual.
4. Turnos partidos: sí, ocasionales.
5. Objetivo: control operativo interno con trazabilidad básica.
6. Geolocalización: puntual al fichar, radio 100m, sin tracking continuo.
7. Tablet kiosko básico se incluye como fallback MVP; device token dedicado queda para v1.1.
8. ¿Máximo de empleados real entre los 5 primeros clientes?
9. ¿Prueba gratis 14d o solo venta directa con setup fee?
10. ¿Política tras impago: read-only, congelado, o borrado tras X meses?
