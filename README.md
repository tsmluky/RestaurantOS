# RestaurantOS

> Sistema digital de gestión operativa para restaurantes, bares y cafeterías.
> Producto SaaS de **Studio32** — *Digital Systems for real businesses.*

## Estado actual

**Fase 1 — Base** (en construcción).
MVP centrado en **Módulo 1: Fichaje / Time Clock**.

## Estructura del monorepo

```
restaurantos/
├── backend/           FastAPI + SQLAlchemy + PostgreSQL
├── web/               Next.js (panel manager)
├── mobile/            Expo (app empleado + tablet kiosko)
├── docs/              Especificaciones y decisiones de producto
└── scripts/           Utilidades (seed demo, etc.)
```

## Quick start

### Requisitos

- Python 3.12+
- Node.js 20+ (con pnpm o npm)
- PostgreSQL 15+ (local o Docker)
- Git

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env       # edita la DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

Abre http://localhost:8000/docs para la API.

### Web

```powershell
cd web
# Scaffolding inicial pendiente — ver web/README.md
```

### Mobile

```powershell
cd mobile
# Scaffolding inicial pendiente — ver mobile/README.md
```

## Documentación clave

- [Especificación Módulo 1 — Fichaje](docs/MODULE_1_FICHAJE.md)
- [Sistema de diseño](docs/DESIGN_SYSTEM.md)
- [Análisis competitivo](docs/COMPETITIVE_ANALYSIS.md)

## Stack confirmado

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL 16 |
| Web | Next.js 14 (App Router), TailwindCSS, shadcn/ui, React Query |
| Mobile | Expo SDK 51, React Native, TypeScript |
| Auth | JWT (access 15min + refresh 7d), magic links |
| Pagos | Stripe |
| Hosting | Railway (backend + DB), Vercel (web) |

## Decisiones cerradas

1. **Multi-tenant**: `tenant_id` compartido en tablas, middleware de aislamiento obligatorio.
2. **Verificación de fichaje**: Tablet del local en modo kiosko + PIN bcrypt de 4 dígitos.
3. **Append-only**: `time_clock_events` jamás se modifica ni borra.
4. **Correcciones**: siempre con motivo obligatorio + log en `clock_corrections`.

Detalles completos en [docs/MODULE_1_FICHAJE.md](docs/MODULE_1_FICHAJE.md).
