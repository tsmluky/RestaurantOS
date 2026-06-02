"""Exercise the local clock-in/out flow through the HTTP API.

Prerequisites:
    1. alembic upgrade head
    2. python scripts/seed_demo.py
    3. uvicorn app.main:app --reload --port 8000

Run from repo root:
    python scripts/test_clock_flow.py
"""
from __future__ import annotations

from datetime import date
from uuid import uuid4

import httpx

BASE_URL = "http://localhost:8000/api/v1"
MANAGER_EMAIL = "manager@demo.dev"
MANAGER_PASSWORD = "demo-manager"  # noqa: S105 - local demo credential.
EMPLOYEE_NAME = "Francisco Iannicelli"
EMPLOYEE_EMAIL = "francisco.iannicelli@demo.dev"
EMPLOYEE_PASSWORD = "demo-employee"  # noqa: S105 - local demo credential.
DEMO_LATITUDE = 41.3809
DEMO_LONGITUDE = 2.1892


def _login(client: httpx.Client, email: str, password: str) -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    response.raise_for_status()
    return str(response.json()["access_token"])


def main() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        manager_token = _login(client, MANAGER_EMAIL, MANAGER_PASSWORD)
        manager_headers = {"Authorization": f"Bearer {manager_token}"}

        live = client.get("/manager/clock/live", headers=manager_headers)
        live.raise_for_status()
        employee = next(
            item
            for item in live.json()["employees"]
            if item["full_name"] == EMPLOYEE_NAME
        )
        restaurant_id = employee["primary_restaurant_id"]

        employee_token = _login(client, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
        employee_headers = {"Authorization": f"Bearer {employee_token}"}

        status = client.get("/clock/status", headers=employee_headers)
        status.raise_for_status()
        if status.json()["status"] == "CLOCKED_IN":
            out = client.post(
                "/clock/out",
                headers=employee_headers,
                json={
                    "restaurant_id": restaurant_id,
                    "verification_method": "GPS",
                    "latitude": DEMO_LATITUDE,
                    "longitude": DEMO_LONGITUDE,
                    "device_id": "local-test",
                    "idempotency_key": str(uuid4()),
                },
            )
            out.raise_for_status()

        clock_in = client.post(
            "/clock/in",
            headers=employee_headers,
            json={
                "restaurant_id": restaurant_id,
                "verification_method": "GPS",
                "latitude": DEMO_LATITUDE,
                "longitude": DEMO_LONGITUDE,
                "device_id": "local-test",
                "idempotency_key": str(uuid4()),
            },
        )
        clock_in.raise_for_status()
        print("CLOCK IN:", clock_in.json())

        clock_out = client.post(
            "/clock/out",
            headers=employee_headers,
            json={
                "restaurant_id": restaurant_id,
                "verification_method": "GPS",
                "latitude": DEMO_LATITUDE,
                "longitude": DEMO_LONGITUDE,
                "device_id": "local-test",
                "idempotency_key": str(uuid4()),
            },
        )
        clock_out.raise_for_status()
        print("CLOCK OUT:", clock_out.json())

        sessions = client.get(
            "/manager/work-sessions",
            headers=manager_headers,
            params={"date_from": date.today().isoformat(), "date_to": date.today().isoformat()},
        )
        sessions.raise_for_status()
        print("SESSIONS TODAY:", len(sessions.json()))

        export = client.get(
            "/manager/exports/hours",
            headers=manager_headers,
            params={
                "date_from": date.today().replace(day=1).isoformat(),
                "date_to": date.today().isoformat(),
                "format": "CSV",
            },
        )
        export.raise_for_status()
        print("EXPORT CSV PREVIEW:")
        print(export.text.splitlines()[0])
        print(export.text.splitlines()[1] if len(export.text.splitlines()) > 1 else "(sin filas)")


if __name__ == "__main__":
    main()
