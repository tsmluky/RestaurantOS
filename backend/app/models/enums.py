"""Enum types used across models. Stored as VARCHAR in DB for forward compatibility."""
from enum import StrEnum


class TenantStatus(StrEnum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    CANCELLED = "CANCELLED"


class UserRole(StrEnum):
    SUPERADMIN = "SUPERADMIN"
    MANAGER = "MANAGER"
    SUPERVISOR = "SUPERVISOR"
    EMPLOYEE = "EMPLOYEE"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    TERMINATED = "TERMINATED"


class ClockEventType(StrEnum):
    CLOCK_IN = "CLOCK_IN"
    CLOCK_OUT = "CLOCK_OUT"


class ClockEventSource(StrEnum):
    TABLET = "TABLET"
    MOBILE_APP = "MOBILE_APP"
    WEB = "WEB"
    MANAGER_CORRECTION = "MANAGER_CORRECTION"


class SessionStatus(StrEnum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CORRECTED = "CORRECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REJECTED = "REJECTED"


class IncidentType(StrEnum):
    FORGOT_CLOCK_OUT = "FORGOT_CLOCK_OUT"
    FORGOT_CLOCK_IN = "FORGOT_CLOCK_IN"
    WRONG_TIME = "WRONG_TIME"
    OTHER = "OTHER"


class IncidentStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"


class ExportFormat(StrEnum):
    CSV = "CSV"
    XLSX = "XLSX"


class ExportStatus(StrEnum):
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"
