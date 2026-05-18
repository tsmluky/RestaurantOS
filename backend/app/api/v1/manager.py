"""Manager dashboard, corrections, incidents and exports."""
import csv
from datetime import UTC, date, datetime, time
from io import BytesIO, StringIO
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, TenantId, require_manager
from app.models.audit import AuditLog
from app.models.correction import ClockCorrection
from app.models.employee import EmployeeProfile
from app.models.enums import ExportFormat, IncidentStatus, SessionStatus
from app.models.export import ExportBatch
from app.models.incident import ClockIncident
from app.models.restaurant import Restaurant
from app.models.time_clock import TimeClockEvent, WorkSession
from app.models.user import User
from app.schemas.clock import (
    ClockCorrectionRequest,
    ClockCorrectionResponse,
    IncidentResponse,
    IncidentUpdateRequest,
    WorkSessionPatchRequest,
    WorkSessionResponse,
)

router = APIRouter(dependencies=[Depends(require_manager)])


def _date_bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(date_from, time.min, tzinfo=UTC),
        datetime.combine(date_to, time.max, tzinfo=UTC),
    )


def _format_hours(minutes: int | None) -> str:
    if minutes is None:
        return ""
    hours, mins = divmod(minutes, 60)
    return f"{hours}h {mins:02d}min"


def _sessions_query(tenant_id, date_from: date | None, date_to: date | None):
    stmt = select(WorkSession).where(WorkSession.tenant_id == tenant_id)
    if date_from is not None and date_to is not None:
        start, end = _date_bounds(date_from, date_to)
        stmt = stmt.where(WorkSession.clock_in_at.between(start, end))
    elif date_from is not None:
        stmt = stmt.where(WorkSession.clock_in_at >= datetime.combine(date_from, time.min, UTC))
    elif date_to is not None:
        stmt = stmt.where(WorkSession.clock_in_at <= datetime.combine(date_to, time.max, UTC))
    return stmt


@router.get("/clock/live")
def clock_live(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
    restaurant_id: UUID | None = None,
) -> dict:
    employees = db.execute(
        select(User, EmployeeProfile)
        .join(EmployeeProfile, EmployeeProfile.user_id == User.id)
        .where(User.tenant_id == tenant_id, User.deleted_at.is_(None))
        .order_by(User.full_name.asc())
    ).all()

    open_stmt = select(WorkSession).where(
        WorkSession.tenant_id == tenant_id,
        WorkSession.status == SessionStatus.OPEN.value,
    )
    if restaurant_id is not None:
        open_stmt = open_stmt.where(WorkSession.restaurant_id == restaurant_id)
    open_sessions = {session.user_id: session for session in db.scalars(open_stmt).all()}

    now = datetime.now(UTC)
    rows = []
    for user, profile in employees:
        if restaurant_id is not None and (
            profile.primary_restaurant_id != restaurant_id and user.id not in open_sessions
        ):
            continue
        session = open_sessions.get(user.id)
        rows.append(
            {
                "employee_id": str(user.id),
                "full_name": user.full_name,
                "primary_restaurant_id": str(profile.primary_restaurant_id)
                if profile.primary_restaurant_id
                else None,
                "status": "CLOCKED_IN" if session else "OFF_DUTY",
                "work_session_id": str(session.id) if session else None,
                "clock_in_at": session.clock_in_at.isoformat() if session else None,
                "elapsed_minutes": round((now - session.clock_in_at).total_seconds() / 60)
                if session
                else None,
                "flagged_reasons": session.flagged_reasons if session else [],
            }
        )

    return {
        "now": now.isoformat(),
        "summary": {
            "clocked_in": len(open_sessions),
            "off_duty": max(len(rows) - len(open_sessions), 0),
        },
        "employees": rows,
    }


@router.get("/clock/events")
def clock_events(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
    date_from: date | None = None,
    date_to: date | None = None,
    restaurant_id: UUID | None = None,
    user_id: UUID | None = None,
) -> list[dict]:
    stmt = (
        select(TimeClockEvent, User.full_name)
        .join(User, User.id == TimeClockEvent.user_id)
        .where(TimeClockEvent.tenant_id == tenant_id)
    )
    if date_from is not None and date_to is not None:
        start, end = _date_bounds(date_from, date_to)
        stmt = stmt.where(TimeClockEvent.event_at.between(start, end))
    if restaurant_id is not None:
        stmt = stmt.where(TimeClockEvent.restaurant_id == restaurant_id)
    if user_id is not None:
        stmt = stmt.where(TimeClockEvent.user_id == user_id)

    rows = db.execute(stmt.order_by(TimeClockEvent.event_at.desc()).limit(500)).all()
    return [
        {
            "id": str(event.id),
            "employee_id": str(event.user_id),
            "employee_name": name,
            "restaurant_id": str(event.restaurant_id),
            "event_type": event.event_type,
            "event_at": event.event_at.isoformat(),
            "source": event.source,
            "verification_status": event.verification_status,
            "distance_m": event.distance_m,
        }
        for event, name in rows
    ]


@router.get("/work-sessions", response_model=list[WorkSessionResponse])
def work_sessions(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
    date_from: date | None = None,
    date_to: date | None = None,
    restaurant_id: UUID | None = None,
    user_id: UUID | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[WorkSession]:
    stmt = _sessions_query(tenant_id, date_from, date_to)
    if restaurant_id is not None:
        stmt = stmt.where(WorkSession.restaurant_id == restaurant_id)
    if user_id is not None:
        stmt = stmt.where(WorkSession.user_id == user_id)
    if status_filter is not None:
        stmt = stmt.where(WorkSession.status == status_filter)
    return list(db.scalars(stmt.order_by(WorkSession.clock_in_at.desc()).limit(500)).all())


@router.patch("/work-sessions/{session_id}", response_model=WorkSessionResponse)
def patch_work_session(
    session_id: UUID,
    payload: WorkSessionPatchRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkSession:
    session = db.scalar(
        select(WorkSession).where(WorkSession.id == session_id, WorkSession.tenant_id == tenant_id)
    )
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")

    before = {"status": session.status, "flagged_reasons": session.flagged_reasons}
    if payload.status is not None:
        session.status = payload.status
    if payload.flagged_reasons is not None:
        session.flagged_reasons = payload.flagged_reasons

    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="work_session.updated",
            target_type="work_session",
            target_id=session.id,
            payload={"before": before, "after": payload.model_dump(exclude_unset=True)},
        )
    )
    db.commit()
    db.refresh(session)
    return session


@router.post("/clock-corrections", response_model=ClockCorrectionResponse)
def create_correction(
    payload: ClockCorrectionRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ClockCorrectionResponse:
    session = db.scalar(
        select(WorkSession).where(
            WorkSession.id == payload.work_session_id,
            WorkSession.tenant_id == tenant_id,
        )
    )
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")

    new_in = payload.new_clock_in_at or session.clock_in_at
    new_out = (
        payload.new_clock_out_at
        if payload.new_clock_out_at is not None
        else session.clock_out_at
    )
    if new_out is not None and new_out <= new_in:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La salida debe ser posterior",
        )

    correction = ClockCorrection(
        tenant_id=tenant_id,
        work_session_id=session.id,
        corrected_by_user_id=actor.id,
        previous_clock_in_at=session.clock_in_at,
        previous_clock_out_at=session.clock_out_at,
        new_clock_in_at=payload.new_clock_in_at,
        new_clock_out_at=payload.new_clock_out_at,
        reason=payload.reason,
        incident_id=payload.incident_id,
    )
    db.add(correction)

    session.clock_in_at = new_in
    session.clock_out_at = new_out
    session.duration_minutes = (
        round((new_out - new_in).total_seconds() / 60) if new_out is not None else None
    )
    session.status = SessionStatus.CORRECTED.value
    session.was_corrected = True

    if payload.incident_id is not None:
        incident = db.scalar(
            select(ClockIncident).where(
                ClockIncident.id == payload.incident_id,
                ClockIncident.tenant_id == tenant_id,
            )
        )
        if incident is not None:
            incident.status = IncidentStatus.RESOLVED.value
            incident.resolved_by_user_id = actor.id
            incident.resolved_at = datetime.now(UTC)
            incident.resolution_note = payload.reason

    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="clock.correction.created",
            target_type="work_session",
            target_id=session.id,
            payload={
                "previous_clock_in_at": correction.previous_clock_in_at.isoformat(),
                "previous_clock_out_at": correction.previous_clock_out_at.isoformat()
                if correction.previous_clock_out_at
                else None,
                "new_clock_in_at": new_in.isoformat(),
                "new_clock_out_at": new_out.isoformat() if new_out else None,
                "reason": payload.reason,
            },
        )
    )
    db.commit()
    db.refresh(correction)
    db.refresh(session)
    return ClockCorrectionResponse(correction_id=correction.id, work_session=session)


@router.get("/incidents", response_model=list[IncidentResponse])
def list_incidents(
    tenant_id: TenantId,
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[ClockIncident]:
    stmt = select(ClockIncident).where(ClockIncident.tenant_id == tenant_id)
    if status_filter is not None:
        stmt = stmt.where(ClockIncident.status == status_filter)
    return list(db.scalars(stmt.order_by(ClockIncident.created_at.desc()).limit(200)).all())


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: UUID,
    payload: IncidentUpdateRequest,
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ClockIncident:
    incident = db.scalar(
        select(ClockIncident).where(
            ClockIncident.id == incident_id,
            ClockIncident.tenant_id == tenant_id,
        )
    )
    if incident is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Incidencia no encontrada")

    incident.status = payload.status.value
    incident.resolution_note = payload.resolution_note
    incident.resolved_by_user_id = actor.id
    incident.resolved_at = datetime.now(UTC)
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="incident.updated",
            target_type="clock_incident",
            target_id=incident.id,
            payload=payload.model_dump(mode="json"),
        )
    )
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/exports/hours")
def export_hours(
    tenant_id: TenantId,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    date_from: date,
    date_to: date,
    format: ExportFormat = ExportFormat.CSV,
    restaurant_id: UUID | None = None,
) -> Response:
    stmt = _sessions_query(tenant_id, date_from, date_to)
    if restaurant_id is not None:
        stmt = stmt.where(WorkSession.restaurant_id == restaurant_id)
    sessions = list(db.scalars(stmt.order_by(WorkSession.clock_in_at.asc())).all())

    users = {
        user.id: user
        for user in db.scalars(select(User).where(User.tenant_id == tenant_id)).all()
    }
    restaurants = {
        restaurant.id: restaurant
        for restaurant in db.scalars(
            select(Restaurant).where(Restaurant.tenant_id == tenant_id)
        ).all()
    }

    rows = [
        {
            "empleado": users[session.user_id].full_name,
            "sucursal": restaurants[session.restaurant_id].name,
            "fecha": session.clock_in_at.date().isoformat(),
            "entrada": session.clock_in_at.isoformat(),
            "salida": session.clock_out_at.isoformat() if session.clock_out_at else "",
            "minutos": session.duration_minutes if session.duration_minutes is not None else "",
            "horas": _format_hours(session.duration_minutes),
            "estado": session.status,
            "corregido": "sí" if session.was_corrected else "no",
            "incidencias": ", ".join(session.flagged_reasons or []),
        }
        for session in sessions
    ]

    batch = ExportBatch(
        tenant_id=tenant_id,
        requested_by_user_id=actor.id,
        date_from=date_from,
        date_to=date_to,
        format=format.value,
        status="READY",
        row_count=len(rows),
        completed_at=datetime.now(UTC),
    )
    db.add(batch)
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor.id,
            action="hours.exported",
            target_type="export_batch",
            target_id=batch.id,
            payload={
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "format": format.value,
            },
        )
    )
    db.commit()

    filename = f"restaurantos-horas-{date_from.isoformat()}-{date_to.isoformat()}"
    if format == ExportFormat.XLSX:
        return _xlsx_response(rows, filename)
    if format == ExportFormat.PDF:
        return _pdf_response(rows, filename)
    return _csv_response(rows, filename)


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "empleado",
            "sucursal",
            "fecha",
            "entrada",
            "salida",
            "minutos",
            "horas",
            "estado",
            "corregido",
            "incidencias",
        ],
    )
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )


def _xlsx_response(rows: list[dict], filename: str) -> Response:
    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            detail="openpyxl no instalado",
        ) from exc

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Horas"
    headers = (
        list(rows[0].keys())
        if rows
        else ["empleado", "sucursal", "fecha", "entrada", "salida", "horas"]
    )
    sheet.append(headers)
    for row in rows:
        sheet.append([row.get(header, "") for header in headers])
    stream = BytesIO()
    workbook.save(stream)
    return Response(
        stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
    )


def _pdf_response(rows: list[dict], filename: str) -> Response:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            detail="reportlab no instalado",
        ) from exc

    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4)
    width, height = A4
    y = height - 48
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(48, y, "RestaurantOS - Resumen mensual de horas")
    y -= 28
    pdf.setFont("Helvetica", 9)
    for row in rows[:45]:
        line = (
            f"{row['fecha']} | {row['empleado']} | {row['sucursal']} | "
            f"{row['entrada']} - {row['salida']} | {row['horas']} | {row['estado']}"
        )
        pdf.drawString(48, y, line[:130])
        y -= 14
        if y < 48:
            pdf.showPage()
            pdf.setFont("Helvetica", 9)
            y = height - 48
    pdf.save()
    return Response(
        stream.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )
