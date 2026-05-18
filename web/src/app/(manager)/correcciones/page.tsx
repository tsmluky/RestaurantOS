"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration, monthStartISODate, todayISODate } from "@/lib/format";
import type { Employee, Restaurant, WorkSession } from "@/lib/types";

type CorrectionFormState = {
  new_clock_in_at: string;
  new_clock_out_at: string;
  reason: string;
};

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function defaultReason(session: WorkSession) {
  if (session.status === "OPEN") return "Empleado olvidó fichar salida";
  if (session.flagged_reasons?.includes("outside_geofence")) return "Revisión por fichaje fuera de zona";
  if (session.flagged_reasons?.includes("max_session_exceeded")) return "Revisión por sesión demasiado larga";
  return "Corrección manual del manager";
}

function toCorrectionForm(session: WorkSession): CorrectionFormState {
  return {
    new_clock_in_at: toDateTimeLocal(session.clock_in_at),
    new_clock_out_at: toDateTimeLocal(session.clock_out_at),
    reason: defaultReason(session)
  };
}

export default function CorrectionsPage() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [forms, setForms] = useState<Record<string, CorrectionFormState>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [sessionRows, employeeRows, restaurantRows] = await Promise.all([
        api.workSessions(monthStartISODate(), todayISODate()),
        api.employees(),
        api.restaurants()
      ]);
      setSessions(sessionRows);
      setEmployees(employeeRows);
      setRestaurants(restaurantRows);
      setForms(Object.fromEntries(sessionRows.map((session) => [session.id, toCorrectionForm(session)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando correcciones");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );
  const restaurantById = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant])),
    [restaurants]
  );
  const pending = useMemo(
    () =>
      sessions.filter(
        (session) => session.status === "NEEDS_REVIEW" || session.status === "OPEN"
      ),
    [sessions]
  );

  function updateForm(sessionId: string, patch: Partial<CorrectionFormState>) {
    setForms((current) => ({
      ...current,
      [sessionId]: {
        ...current[sessionId],
        ...patch
      }
    }));
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>, session: WorkSession) {
    event.preventDefault();
    const form = forms[session.id];
    if (!form) return;
    setError(null);
    setNotice(null);
    try {
      await api.createCorrection({
        work_session_id: session.id,
        new_clock_in_at: fromDateTimeLocal(form.new_clock_in_at),
        new_clock_out_at: fromDateTimeLocal(form.new_clock_out_at),
        reason: form.reason
      });
      setNotice("Corrección guardada. La sesión queda marcada como corregida.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la corrección");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correcciones"
        description="Cierre de olvidos de salida, revisión de fichajes anómalos y ajuste auditado de horas."
      />

      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}
      {notice ? (
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <SectionCard
        title="Pendientes"
        description="Cada corrección exige un motivo y queda registrada en auditoría."
      >
        {pending.length === 0 ? (
          <EmptyState title="No hay correcciones pendientes" description="El mes está limpio por ahora." />
        ) : (
          <div className="divide-y divide-border">
            {pending.map((session) => {
              const form = forms[session.id] ?? toCorrectionForm(session);
              const employee = employeeById.get(session.user_id);
              const restaurant = restaurantById.get(session.restaurant_id);
              return (
                <form
                  key={session.id}
                  onSubmit={(event) => submitCorrection(event, session)}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_1.6fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">
                        {employee?.full_name ?? `Empleado ${session.user_id.slice(0, 8)}`}
                      </h3>
                      <StatusBadge status={session.status} />
                    </div>
                    <div className="mt-2 text-sm text-muted">
                      {restaurant?.name ?? "Sucursal sin nombre"}
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      Entrada original: {formatDateTime(session.clock_in_at)}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Salida original: {formatDateTime(session.clock_out_at)}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Duración actual: {formatDuration(session.duration_minutes)}
                    </div>
                    {session.flagged_reasons?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {session.flagged_reasons.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-md bg-warning-soft px-2 py-1 text-xs font-semibold text-warning"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-ink">
                      Entrada corregida
                      <input
                        value={form.new_clock_in_at}
                        onChange={(event) =>
                          updateForm(session.id, { new_clock_in_at: event.target.value })
                        }
                        className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label className="text-sm font-medium text-ink">
                      Salida corregida
                      <input
                        value={form.new_clock_out_at}
                        onChange={(event) =>
                          updateForm(session.id, { new_clock_out_at: event.target.value })
                        }
                        className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                        type="datetime-local"
                        required
                      />
                    </label>
                    <label className="text-sm font-medium text-ink sm:col-span-2">
                      Motivo
                      <textarea
                        value={form.reason}
                        onChange={(event) => updateForm(session.id, { reason: event.target.value })}
                        className="mt-2 min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                        minLength={5}
                        required
                      />
                    </label>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-white lg:w-auto"
                    >
                      Guardar corrección
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
