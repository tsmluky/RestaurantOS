// ─────────────────────────────────────────────────────────────────────────────
// RestaurantOS — API Client
// ─────────────────────────────────────────────────────────────────────────────

import { getRefreshToken, saveRefreshToken, saveToken } from "@/lib/auth";

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  "http://192.168.1.100:8000/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClockStatus = {
  status: "OFF_DUTY" | "CLOCKED_IN" | "MISSING_CLOCK_OUT" | "NEEDS_REVIEW";
  work_session_id: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  clock_in_at: string | null;
  elapsed_minutes: number | null;
  pending_incidents: number;
  flagged_reasons: string[];
};

export type WorkSession = {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  duration_minutes: number | null;
  status: string;
  was_corrected: boolean;
  flagged_reasons: string[] | null;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  tenant_id: string | null;
  email: string | null;
  full_name: string;
  role: "SUPERADMIN" | "OWNER" | "MANAGER" | "SUPERVISOR" | "EMPLOYEE";
  status: "ACTIVE" | "INACTIVE" | "TERMINATED";
  last_login_at: string | null;
  primary_restaurant_id: string | null;
  restaurant_name: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type ClockActionPayload = {
  restaurant_id: string;
  verification_method: "GPS" | "PIN" | "NONE";
  latitude?: number;
  longitude?: number;
  device_id?: string;
  idempotency_key: string;
};

export type ClockActionResponse = {
  status: "OFF_DUTY" | "CLOCKED_IN";
  work_session_id: string;
  event_id: string;
  event_at: string;
  duration_minutes: number | null;
  verification_status: "VERIFIED" | "WARNING" | "FAILED";
  distance_m: number | null;
  flagged_reasons: string[];
};

export type KioskClockPayload = {
  employee_pin: string;
  restaurant_id: string;
  action?: "AUTO" | "CLOCK_IN" | "CLOCK_OUT";
  device_id?: string;
  idempotency_key: string;
};

export type KioskClockResponse = ClockActionResponse & {
  employee_id: string;
  employee_name: string;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string | null;
};

export type ShiftStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "CANCELLED";

export type Shift = {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  restaurant_name: string | null;
  user_id: string;
  user_full_name: string | null;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  role: string | null;
  notes: string | null;
  checkout_reminder_sent_at: string | null;
  status: ShiftStatus;
  created_at: string;
};

export type Teammate = {
  user_id: string;
  full_name: string;
  role: string | null;
  starts_at: string;
  ends_at: string;
};

export type ShiftWithTeammates = Shift & { teammates: Teammate[] };

export type RestaurantWeekRow = {
  user_id: string;
  full_name: string;
  shifts: Shift[];
};

export type RestaurantWeek = {
  restaurant_id: string;
  restaurant_name: string | null;
  starts_at: string;
  ends_at: string;
  rows: RestaurantWeekRow[];
};

export type IncidentPayload = {
  restaurant_id: string;
  type: "FORGOT_CLOCK_OUT" | "FORGOT_CLOCK_IN" | "WRONG_TIME" | "OTHER";
  affected_date: string;
  suggested_clock_in_at?: string | null;
  suggested_clock_out_at?: string | null;
  related_work_session_id?: string | null;
  description?: string | null;
};

export type IncidentResponse = {
  id: string;
  status: string;
};

type ClockHistoryResponse = {
  items: WorkSession[];
};

// ── HTTP helper ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Internal raw fetch — no retry
async function _fetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch { /* ignore */ }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

// Public request — auto-refreshes on 401
export async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await _fetch<T>(path, token, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && token) {
      // Try to refresh
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const refreshed = await _fetch<LoginResponse>("/auth/refresh", null, {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          await saveToken(refreshed.access_token);
          await saveRefreshToken(refreshed.refresh_token);
          // Retry original request with new token
          return await _fetch<T>(path, refreshed.access_token, options);
        } catch {
          // Refresh failed — propagate original 401
        }
      }
    }
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await _fetch<LoginResponse>("/auth/login", null, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // Persist refresh token
  await saveRefreshToken(response.refresh_token);
  return response;
}

export function getMe(token: string): Promise<UserProfile> {
  return apiRequest<UserProfile>("/auth/me", token);
}

// ── Clock ─────────────────────────────────────────────────────────────────────

export function getClockStatus(token: string): Promise<ClockStatus> {
  return apiRequest<ClockStatus>("/clock/status", token);
}

export function clockIn(
  token: string,
  payload: ClockActionPayload
): Promise<ClockActionResponse> {
  return apiRequest("/clock/in", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function clockOut(
  token: string,
  payload: ClockActionPayload
): Promise<ClockActionResponse> {
  return apiRequest("/clock/out", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyHistory(token: string): Promise<WorkSession[]> {
  const response = await apiRequest<ClockHistoryResponse>("/clock/history/me", token);
  return response.items;
}

export function reportIncident(
  token: string,
  payload: IncidentPayload
): Promise<IncidentResponse> {
  return apiRequest("/clock/incidents", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Restaurants ───────────────────────────────────────────────────────────────

export function getRestaurants(token: string): Promise<Restaurant[]> {
  return apiRequest<Restaurant[]>("/restaurants", token);
}

// ── Shifts ────────────────────────────────────────────────────────────────────

type ShiftListResponse = { items: Shift[] };

export async function getMyUpcomingShifts(
  token: string,
  limit = 5
): Promise<Shift[]> {
  const r = await apiRequest<ShiftListResponse>(
    `/shifts/me/upcoming?limit=${limit}`,
    token
  );
  return r.items;
}

export async function getMyShiftsRange(
  token: string,
  from?: Date,
  to?: Date
): Promise<Shift[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from.toISOString());
  if (to) params.set("to", to.toISOString());
  const q = params.toString();
  const r = await apiRequest<ShiftListResponse>(
    `/shifts/me${q ? `?${q}` : ""}`,
    token
  );
  return r.items;
}

export function getShiftDetail(
  token: string,
  shiftId: string
): Promise<ShiftWithTeammates> {
  return apiRequest<ShiftWithTeammates>(`/shifts/${shiftId}`, token);
}

export function getRestaurantWeek(
  token: string,
  restaurantId: string,
  from?: Date,
  to?: Date
): Promise<RestaurantWeek> {
  const params = new URLSearchParams({ restaurant_id: restaurantId });
  if (from) params.set("from", from.toISOString());
  if (to) params.set("to", to.toISOString());
  return apiRequest<RestaurantWeek>(
    `/shifts/restaurant/week?${params.toString()}`,
    token
  );
}

// ── Kiosk ─────────────────────────────────────────────────────────────────────

export function kioskClock(
  token: string,
  payload: KioskClockPayload
): Promise<KioskClockResponse> {
  return apiRequest<KioskClockResponse>("/clock/kiosk", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Manager ───────────────────────────────────────────────────────────────────

export type LiveEmployee = {
  employee_id: string;
  full_name: string;
  primary_restaurant_id: string | null;
  status: "CLOCKED_IN" | "OFF_DUTY";
  work_session_id: string | null;
  clock_in_at: string | null;
  elapsed_minutes: number | null;
  flagged_reasons: string[];
};

export type LiveClockResponse = {
  now: string;
  summary: { clocked_in: number; off_duty: number };
  employees: LiveEmployee[];
};

export type ManagerSession = {
  id: string;
  user_id: string;
  full_name: string;
  restaurant_id: string;
  restaurant_name: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
  duration_minutes: number | null;
  status: "OPEN" | "CLOSED" | "FLAGGED";
  was_corrected: boolean;
  flagged_reasons: string[] | null;
};

export type PendingIncident = {
  id: string;
  user_id: string;
  full_name: string;
  type: string;
  affected_date: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export function getManagerLive(
  token: string,
  restaurantId?: string
): Promise<LiveClockResponse> {
  const q = restaurantId ? `?restaurant_id=${restaurantId}` : "";
  return apiRequest<LiveClockResponse>(`/manager/clock/live${q}`, token);
}

export function getManagerSessions(
  token: string,
  dateFrom: string,
  dateTo: string,
  restaurantId?: string
): Promise<ManagerSession[]> {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
  if (restaurantId) params.set("restaurant_id", restaurantId);
  return apiRequest<ManagerSession[]>(`/manager/work-sessions?${params.toString()}`, token);
}

export function getManagerIncidents(
  token: string,
  status = "PENDING"
): Promise<PendingIncident[]> {
  return apiRequest<PendingIncident[]>(`/manager/incidents?status=${status}`, token);
}

export function approveCorrection(
  token: string,
  correctionId: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  return apiRequest(`/manager/corrections/${correctionId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ approved, notes }),
  });
}

// Cierre manual de una sesión abierta (empleado olvidó fichar salida)
export function closeSessionManually(
  token: string,
  sessionId: string,
  reason: string
): Promise<void> {
  return apiRequest(`/manager/work-sessions/${sessionId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ clock_out_override: true, reason }),
  });
}
