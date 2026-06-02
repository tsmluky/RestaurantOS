export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type CurrentUser = {
  id: string;
  tenant_id: string | null;
  email: string | null;
  full_name: string;
  role: string;
  status: string;
};

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

export type ClockLiveResponse = {
  now: string;
  summary: {
    clocked_in: number;
    off_duty: number;
  };
  employees: LiveEmployee[];
};

export type Employee = {
  id: string;
  profile_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  primary_restaurant_id: string | null;
  employee_code: string | null;
  contract_hours_week: number | null;
  hired_at: string | null;
  terminated_at: string | null;
  created_at: string;
};

export type EmployeeCreatePayload = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  password?: string | null;
  kiosk_pin?: string | null;
  primary_restaurant_id?: string | null;
  employee_code?: string | null;
  contract_hours_week?: number | null;
};

export type EmployeeUpdatePayload = {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  primary_restaurant_id?: string | null;
  employee_code?: string | null;
  contract_hours_week?: number | null;
  hired_at?: string | null;
  terminated_at?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "TERMINATED";
};

export type EmployeeResetPinResponse = {
  employee_id: string;
  kiosk_pin: string;
};

export type Restaurant = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  timezone: string;
  latitude: string | null;
  longitude: string | null;
  geofence_radius_m: number;
  late_tolerance_min: number;
  max_session_hours: number;
  created_at: string;
  updated_at: string;
};

export type RestaurantUpdatePayload = {
  name?: string;
  address?: string | null;
  timezone?: string;
  latitude?: string | null;
  longitude?: string | null;
  geofence_radius_m?: number;
  late_tolerance_min?: number;
  max_session_hours?: number;
};

export type RestaurantCreatePayload = {
  name: string;
  address?: string | null;
  timezone?: string;
  latitude?: string | null;
  longitude?: string | null;
  geofence_radius_m?: number;
  late_tolerance_min?: number;
  max_session_hours?: number;
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

export type ClockCorrectionPayload = {
  work_session_id: string;
  new_clock_in_at?: string | null;
  new_clock_out_at?: string | null;
  reason: string;
  incident_id?: string | null;
};

export type ClockCorrectionResponse = {
  correction_id: string;
  work_session: WorkSession;
};

export type Incident = {
  id: string;
  user_id: string;
  restaurant_id: string;
  type: string;
  affected_date: string;
  description: string | null;
  status: string;
  resolution_note: string | null;
  related_work_session_id: string | null;
  created_at: string;
};

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
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "CANCELLED";
  created_at: string;
};

export type ShiftCreatePayload = {
  restaurant_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  role?: string | null;
  notes?: string | null;
};

export type ShiftUpdatePayload = {
  starts_at?: string;
  ends_at?: string;
  role?: string | null;
  notes?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "CANCELLED";
};
