"""Reset the local demo database and seed it again.

This is intentionally guarded for local development only.

Run from the repo root:
    python scripts/reset_demo.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.core.config import settings  # noqa: E402


def _assert_local_database() -> None:
    url = make_url(str(settings.database_url))
    host = url.host or ""
    database = url.database or ""
    if host not in {"localhost", "127.0.0.1"} or "restaurantos" not in database:
        raise RuntimeError(
            "reset_demo.py solo puede ejecutarse contra la base local restaurantos."
        )


def main() -> None:
    _assert_local_database()
    engine = create_engine(str(settings.database_url), isolation_level="AUTOCOMMIT")
    with engine.connect() as connection:
        connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
        connection.execute(text("GRANT ALL ON SCHEMA public TO public"))

    # Arguments are static and the database guard above prevents non-local resets.
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND, check=True)  # noqa: S603
    subprocess.run([sys.executable, str(ROOT / "scripts" / "seed_demo.py")], cwd=ROOT, check=True)  # noqa: S603


if __name__ == "__main__":
    main()
