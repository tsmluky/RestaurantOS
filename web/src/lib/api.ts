"use client";

import type {
  ClockCorrectionPayload,
  ClockCorrectionResponse,
  ClockLiveResponse,
  CurrentUser,
  Employee,
  EmployeeCreatePayload,
  EmployeeResetPinResponse,
  EmployeeUpdatePayload,
  Incident,
  Restaurant,
  RestaurantCreatePayload,
  RestaurantUpdatePayload,
  Shift,
  ShiftCreatePayload,
  ShiftUpdatePayload,
  TokenResponse,
  WorkSession
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const TOKEN_KEY = "restaurantos.access_token";
const REFRESH_TOKEN_KEY = "restaurantos.refresh_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(tokens: TokenResponse) {
  window.localStorage.setItem(TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function redirectToLogin() {
  if (typeof window !== "undefined") window.location.replace("/login");
}

async function _rawRefresh(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!res.ok) throw new Error("refresh_failed");
  return (await res.json()) as TokenResponse;
}

async function request<T>(path: string, options: RequestInit = {}, _retry = false): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && !_retry) {
    const stored = getRefreshToken();
    if (stored) {
      try {
        const tokens = await _rawRefresh(stored);
        saveTokens(tokens);
        return request<T>(path, options, true);
      } catch {
        clearTokens();
        redirectToLogin();
        throw new Error("Sesión expirada. Inicia sesión de nuevo.");
      }
    }
    clearTokens();
    redirectToLogin();
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }

  if (!response.ok) {
    let detail = `Error ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // Keep generic message.
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  me() {
    return request<CurrentUser>("/auth/me");
  },
  live() {
    return request<ClockLiveResponse>("/manager/clock/live");
  },
  employees() {
    return request<Employee[]>("/employees");
  },
  createEmployee(payload: EmployeeCreatePayload) {
    return request<Employee>("/employees", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateEmployee(employeeId: string, payload: EmployeeUpdatePayload) {
    return request<Employee>(`/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  resetEmployeePin(employeeId: string, kioskPin?: string) {
    return request<EmployeeResetPinResponse>(`/employees/${employeeId}/reset-pin`, {
      method: "POST",
      body: JSON.stringify({ kiosk_pin: kioskPin || null })
    });
  },
  restaurants() {
    return request<Restaurant[]>("/restaurants");
  },
  createRestaurant(payload: RestaurantCreatePayload) {
    return request<Restaurant>("/restaurants", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateRestaurant(restaurantId: string, payload: RestaurantUpdatePayload) {
    return request<Restaurant>(`/restaurants/${restaurantId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  workSessions(dateFrom: string, dateTo: string) {
    const search = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    return request<WorkSession[]>(`/manager/work-sessions?${search.toString()}`);
  },
  createCorrection(payload: ClockCorrectionPayload) {
    return request<ClockCorrectionResponse>("/manager/clock-corrections", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  incidents() {
    return request<Incident[]>("/manager/incidents");
  },
  updateIncident(
    incidentId: string,
    status: "RESOLVED" | "REJECTED",
    resolutionNote?: string
  ) {
    return request<Incident>(`/manager/incidents/${incidentId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, resolution_note: resolutionNote ?? null })
    });
  },
  deleteEmployee(employeeId: string) {
    return request<void>(`/employees/${employeeId}`, { method: "DELETE" });
  },
  verifyMagicLink(token: string, newPassword?: string) {
    return request<TokenResponse>("/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword ?? null })
    });
  },
  exportUrl(dateFrom: string, dateTo: string, format: "CSV" | "XLSX" | "PDF") {
    const search = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, format });
    return `${API_BASE_URL}/manager/exports/hours?${search.toString()}`;
  },
  shifts(params: { restaurant_id?: string; from?: string; to?: string }) {
    const search = new URLSearchParams();
    if (params.restaurant_id) search.set("restaurant_id", params.restaurant_id);
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    return request<{ items: Shift[] }>(`/shifts?${search.toString()}`);
  },
  createShift(payload: ShiftCreatePayload) {
    return request<Shift>("/shifts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateShift(shiftId: string, payload: ShiftUpdatePayload) {
    return request<Shift>(`/shifts/${shiftId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  cancelShift(shiftId: string) {
    return request<void>(`/shifts/${shiftId}`, { method: "DELETE" });
  },

  /**
   * Import schedule from an Excel (.xlsx) or CSV file.
   * Creates all valid rows as DRAFT shifts and returns a summary.
   */
  importShifts(file: File, restaurantId: string) {
    const form = new FormData();
    form.append("file", file);
    return request<{
      imported: number;
      skipped: number;
      errors: { row: number; employee: string; message: string }[];
      shifts: Shift[];
    }>(`/shifts/import?restaurant_id=${restaurantId}`, {
      method: "POST",
      body: form,
    });
  },

  /**
   * Publish the schedule for a week — marks DRAFT shifts as PUBLISHED
   * and sends push notifications to all affected employees.
   */
  publishSchedule(weekStart: string) {
    return request<{ shifts_published: number; notifications_sent: number }>(
      "/shifts/publish",
      {
        method: "POST",
        body: JSON.stringify({ week_start: weekStart }),
      }
    );
  },
};
