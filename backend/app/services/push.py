"""Expo Push Notification service.

Wraps the Expo Push API (https://exp.host/--/api/v2/push/send).
Handles batching (max 100 per request), error logging, and invalid token cleanup.

Usage:
    from app.services.push import send_push

    send_push(db, user_ids=[uuid1, uuid2], title="Horario disponible",
              body="Tus turnos de la semana del 26/5 están listos.")
"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.notification import DeviceToken

logger = logging.getLogger("restaurantos.push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
BATCH_SIZE = 100  # Expo limit per request


def _build_message(token: str, title: str, body: str, data: dict[str, Any] | None = None) -> dict:
    return {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
        "priority": "high",
    }


def _send_batch(messages: list[dict], db: Session) -> None:
    """POST one batch to Expo and handle ticket responses."""
    try:
        resp = httpx.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])

        invalid_tokens: list[str] = []
        for ticket, msg in zip(data, messages, strict=False):
            if ticket.get("status") == "error":
                details = ticket.get("details", {})
                error = ticket.get("message", "unknown")
                logger.warning("Push ticket error for token %s: %s", msg["to"], error)
                # DeviceNotRegistered = token is stale, remove it
                if details.get("error") == "DeviceNotRegistered":
                    invalid_tokens.append(msg["to"])

        if invalid_tokens:
            db.execute(
                delete(DeviceToken).where(DeviceToken.token.in_(invalid_tokens))
            )
            db.commit()
            logger.info("Removed %d invalid device token(s)", len(invalid_tokens))

    except httpx.HTTPError as exc:
        logger.error("Failed to reach Expo Push API: %s", exc)
    except Exception:
        logger.exception("Unexpected error sending push batch")


def send_push(
    db: Session,
    *,
    user_ids: list[UUID],
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> int:
    """Send a push notification to all registered devices for a list of user_ids.

    Returns the number of messages attempted.
    """
    if not user_ids:
        return 0

    tokens = db.scalars(
        select(DeviceToken).where(DeviceToken.user_id.in_(user_ids))
    ).all()

    if not tokens:
        logger.debug("No device tokens for users %s — skipping push", user_ids)
        return 0

    messages = [
        _build_message(dt.token, title, body, data)
        for dt in tokens
    ]

    # Batch into chunks of BATCH_SIZE
    for i in range(0, len(messages), BATCH_SIZE):
        _send_batch(messages[i : i + BATCH_SIZE], db)

    logger.info(
        'Sent push "%s" to %d device(s) for %d user(s)',
        title, len(messages), len(user_ids),
    )
    return len(messages)


def send_push_to_tenant(
    db: Session,
    *,
    tenant_id: UUID,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> int:
    """Send to ALL registered devices in a tenant (e.g. broadcast announcements)."""
    tokens = db.scalars(
        select(DeviceToken).where(DeviceToken.tenant_id == tenant_id)
    ).all()

    if not tokens:
        return 0

    messages = [_build_message(dt.token, title, body, data) for dt in tokens]
    for i in range(0, len(messages), BATCH_SIZE):
        _send_batch(messages[i : i + BATCH_SIZE], db)

    return len(messages)
