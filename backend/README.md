# RestaurantOS — Backend

FastAPI + SQLAlchemy 2 + PostgreSQL.

## Requisitos

- Python 3.12+
- PostgreSQL 15+ (local o Docker)

## Setup local

```powershell
# 1. Crear entorno virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Instalar dependencias
pip install --upgrade pip
pip install -e ".[dev]"

# 3. Configurar variables de entorno
copy .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET_KEY

# 4. Crear base de datos (si no usas Docker)
# psql -U postgres -c "CREATE DATABASE restaurantos;"
# psql -U postgres -c "CREATE USER restaurantos WITH PASSWORD 'restaurantos';"
# psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE restaurantos TO restaurantos;"

# 5. Ejecutar migraciones
alembic upgrade head

# 6. (Opcional) Cargar datos demo
python ..\scripts\seed_demo.py

# 7. Arrancar
uvicorn app.main:app --reload --port 8000
```

API en http://localhost:8000
OpenAPI docs en http://localhost:8000/docs
Health en http://localhost:8000/health

## Docker rápido (Postgres local)

```powershell
docker run --name restaurantos-pg `
  -e POSTGRES_PASSWORD=restaurantos `
  -e POSTGRES_USER=restaurantos `
  -e POSTGRES_DB=restaurantos `
  -p 5432:5432 -d postgres:16
```

## Estructura

```
backend/
├── app/
│   ├── main.py              # FastAPI app + middlewares + router mount
│   ├── core/
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # SQLAlchemy engine + session factory
│   │   ├── security.py      # JWT + bcrypt
│   │   └── deps.py          # FastAPI dependencies (get_db, current_user, tenant)
│   ├── models/              # SQLAlchemy 2 models
│   ├── schemas/             # Pydantic request/response
│   ├── api/v1/              # Routers versionados
│   │   ├── auth.py
│   │   ├── admin.py
│   │   ├── employees.py     # (pendiente)
│   │   ├── clock.py         # (pendiente)
│   │   └── manager.py       # (pendiente)
│   └── services/            # Lógica de negocio (clock_service, etc.)
├── alembic/                 # Migraciones
├── tests/                   # Pytest
└── pyproject.toml
```

## Comandos útiles

```powershell
# Tests
pytest

# Lint
ruff check .
ruff format .

# Type check
mypy app

# Generar nueva migración tras cambiar modelos
alembic revision --autogenerate -m "descripcion del cambio"
alembic upgrade head

# Rollback última migración
alembic downgrade -1
```

## Convenciones de código

- **SQLAlchemy 2.0 style** (`Mapped`, `mapped_column`), NO el estilo legacy.
- **Pydantic v2** para schemas.
- **Snake_case** en DB y Python, **camelCase** en JSON de respuesta (alias en Pydantic).
- **Toda tabla operativa** hereda de `TenantScopedMixin` (en `models/base.py`).
- **Toda corrección de fichaje** genera un registro en `clock_corrections` + `audit_logs`.
- **Eventos de fichaje son inmutables**: no exponer DELETE ni UPDATE.

## Deployment (Railway)

1. Conectar repo a Railway.
2. Configurar variables de entorno desde `.env.example`.
3. Railway detecta el `Dockerfile` y construye automáticamente.
4. Las migraciones se ejecutan al arrancar (ver CMD del Dockerfile).
