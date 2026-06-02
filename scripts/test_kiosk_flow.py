"""Exercise the local tablet kiosk fallback through the HTTP API.

Run from repo root while the backend is running:
    python scripts/test_kiosk_flow.py
"""
from __future__ import annotations

from uuid import uuid4

import httpx

BASE_URL = "http://localhost:8000/api/v1"
MANAGER_EMAIL = "manager@demo.dev"
MANAGER_PASSWORD = "demo-manager"  # noqa: S105 - local demo credential.
EMPLOYEE_NAME = "Joana Liberti"
EMPLOYEE_PIN = "1005"  # noqa: S105 - local demo PIN.


def main() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        login = client.post(
            "/auth/login",
            json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
        )
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        live = client.get("/manager/clock/live", headers=headers)
        live.raise_for_status()
        employee = next(
            item for item in live.json()["employees"] if item["full_name"] == EMPLOYEE_NAME
        )
        restaurant_id = employee["primary_restaurant_id"]

        clock_in = client.post(
            "/clock/kiosk",
            headers=headers,
            json={
                "restaurant_id": restaurant_id,
                "employee_pin": EMPLOYEE_PIN,
                "action": "CLOCK_IN",
                "device_id": "tablet-demo-1",
                "idempotency_key": str(uuid4()),
            },
        )
        clock_in.raise_for_status()
        print("KIOSK IN:", clock_in.json())

        clock_out = client.post(
            "/clock/kiosk",
            headers=headers,
            json={
                "restaurant_id": restaurant_id,
                "employee_pin": EMPLOYEE_PIN,
                "action": "CLOCK_OUT",
                "device_id": "tablet-demo-1",
                "idempotency_key": str(uuid4()),
            },
        )
        clock_out.raise_for_status()
        print("KIOSK OUT:", clock_out.json())


if __name__ == "__main__":
    main()
