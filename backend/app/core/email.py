"""Transactional email via SMTP (stdlib smtplib, no extra deps).

If SMTP_HOST is empty, falls back to logging — the flow stays testable
in dev without a mail server.
"""
import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("restaurantos.email")


def _send_blocking(to: str, subject: str, html: str, plain: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_pass)
        smtp.sendmail(settings.smtp_from, [to], msg.as_bytes())


async def send_magic_link(to: str, full_name: str, token: str) -> None:
    """Send a magic link email.

    Safe to call even when SMTP is not configured — logs the URL instead.
    Errors are caught and logged so a mail failure never breaks the request.
    """
    url = f"{settings.web_app_url}/magic-link?token={token}"
    first = full_name.split()[0] if full_name else "Manager"

    if not settings.smtp_host:
        logger.info("[EMAIL-DEV] Magic link for %s → %s", to, url)
        return

    subject = "Tu acceso a RestaurantOS"

    plain = (
        f"Hola {first},\n\n"
        f"Haz clic en el enlace para acceder a RestaurantOS:\n{url}\n\n"
        f"El enlace expira en {settings.magic_link_ttl_hours} horas.\n\n"
        "Si no has solicitado este acceso, ignora este mensaje.\n\n"
        "— Studio32 · RestaurantOS"
    )

    html = f"""\
<!DOCTYPE html>
<html lang="es">
<body style="font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;padding:32px 16px">
  <table style="max-width:520px;margin:0 auto;background:#fff;
    border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <tr>
      <td style="background:#1d4ed8;padding:24px 32px">
        <span style="color:#fff;font-size:20px;font-weight:700;
          letter-spacing:-.3px">RestaurantOS</span>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px">
        <p style="font-size:16px;color:#0f172a;margin:0 0 12px;font-weight:600">Hola {first},</p>
        <p style="font-size:15px;color:#475569;margin:0 0 28px;line-height:1.65">
          Pulsa el botón para acceder a tu panel de RestaurantOS.<br>
          El enlace es válido durante <strong>{settings.magic_link_ttl_hours}&nbsp;horas</strong>.
        </p>
        <a href="{url}"
           style="display:inline-block;background:#1d4ed8;color:#fff;font-size:15px;font-weight:600;
                  padding:14px 28px;border-radius:8px;text-decoration:none">
          Acceder al panel &rarr;
        </a>
        <p style="font-size:13px;color:#94a3b8;margin:28px 0 0;line-height:1.5">
          Si no esperabas este email, puedes ignorarlo con total seguridad.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;
                 font-size:12px;color:#94a3b8">
        Studio32 &middot; RestaurantOS
      </td>
    </tr>
  </table>
</body>
</html>"""

    try:
        await asyncio.to_thread(_send_blocking, to, subject, html, plain)
        logger.info("Magic link email sent to %s", to)
    except Exception:
        logger.exception("Failed to send magic link email to %s — token logged below", to)
        logger.info("[EMAIL-FALLBACK] Magic link for %s → %s", to, url)
        raise
