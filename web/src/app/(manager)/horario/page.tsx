"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import type { Employee, Restaurant, Shift } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toLocalInputValue(d: Date): string {
  // yyyy-MM-ddTHH:mm in local tz, suitable for <input type="datetime-local">
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  // Convert "yyyy-MM-ddTHH:mm" local → ISO UTC
  return new Date(value).toISOString();
}

// ── Page ───────────────────────────────────────────────────────────────────

type ShiftDraft = {
  user_id: string;
  starts_at: string; // local input value
  ends_at: string;
  role: string;
  notes: string;
};

const ROLES = ["Sala", "Cocina", "Barra", "Limpieza"];

export default function HorarioPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [draft, setDraft] = useState<ShiftDraft | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  async function loadInitial() {
    try {
      setError(null);
      const [restaurantRows, employeeRows] = await Promise.all([
        api.restaurants(),
        api.employees()
      ]);
      setRestaurants(restaurantRows);
      setEmployees(employeeRows);
      if (!restaurantId && restaurantRows[0]) {
        setRestaurantId(restaurantRows[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos");
    }
  }

  async function loadShifts() {
    if (!restaurantId) return;
    setLoading(true);
    try {
      setError(null);
      const response = await api.shifts({
        restaurant_id: restaurantId,
        from: weekStart.toISOString(),
        to: weekEnd.toISOString()
      });
      setShifts(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando turnos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, weekStart]);

  const employeesOfRestaurant = useMemo(() => {
    return employees.filter(
      (e) =>
        e.status === "ACTIVE" &&
        (!e.primary_restaurant_id || e.primary_restaurant_id === restaurantId)
    );
  }, [employees, restaurantId]);

  const shiftsByEmployeeDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const dayKey = new Date(s.starts_at);
      dayKey.setHours(0, 0, 0, 0);
      const key = `${s.user_id}|${dayKey.toISOString()}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [shifts]);

  function openCreateDraft(employeeId: string, day: Date) {
    const start = new Date(day);
    start.setHours(12, 0, 0, 0);
    const end = new Date(day);
    end.setHours(16, 0, 0, 0);
    setEditingShift(null);
    setDraftDate(day);
    setDraft({
      user_id: employeeId,
      starts_at: toLocalInputValue(start),
      ends_at: toLocalInputValue(end),
      role: "",
      notes: ""
    });
  }

  function openEditDraft(s: Shift) {
    setEditingShift(s);
    setDraftDate(new Date(s.starts_at));
    setDraft({
      user_id: s.user_id,
      starts_at: toLocalInputValue(new Date(s.starts_at)),
      ends_at: toLocalInputValue(new Date(s.ends_at)),
      role: s.role ?? "",
      notes: s.notes ?? ""
    });
  }

  function closeDraft() {
    setEditingShift(null);
    setDraft(null);
    setDraftDate(null);
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    setNotice(null);
    try {
      const payload = {
        restaurant_id: restaurantId,
        user_id: draft.user_id,
        starts_at: fromLocalInputValue(draft.starts_at),
        ends_at: fromLocalInputValue(draft.ends_at),
        role: draft.role || null,
        notes: draft.notes || null
      };
      if (editingShift) {
        await api.updateShift(editingShift.id, {
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          role: payload.role,
          notes: payload.notes
        });
        setNotice("Turno actualizado.");
      } else {
        await api.createShift(payload);
        setNotice("Turno creado.");
      }
      closeDraft();
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el turno");
    }
  }

  async function cancelExistingShift(s: Shift) {
    if (!window.confirm(`¿Cancelar el turno de ${s.user_full_name ?? "este empleado"}?`)) {
      return;
    }
    try {
      await api.cancelShift(s.id);
      setNotice("Turno cancelado.");
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el turno");
    }
  }

  const weekLabel = `${weekStart.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short"
  })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short"
  })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horario"
        description="Planifica los turnos de cada empleado. Haz click en una celda para crear, en un turno para editar."
      />

      {error ? <div className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}</div> : null}
      {notice ? (
        <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-sm text-success">
          {notice}
        </div>
      ) : null}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-panel">
        <label className="text-sm font-medium text-ink">
          Sucursal
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="ml-2 h-9 rounded-md border border-border px-3 text-sm"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeekStart(d);
            }}
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-gray-50"
          >
            ← Semana anterior
          </button>
          <div className="px-3 text-sm font-semibold text-ink">{weekLabel}</div>
          <button
            type="button"
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeekStart(d);
            }}
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-gray-50"
          >
            Semana siguiente →
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek())}
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-gray-50"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Grid semanal */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-panel">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="w-44 px-4 py-3 text-left">Empleado</th>
              {days.map((d) => {
                const isToday = isSameDay(d, new Date());
                return (
                  <th
                    key={d.toISOString()}
                    className={`px-2 py-3 text-center ${
                      isToday ? "bg-primary-soft text-primary" : ""
                    }`}
                  >
                    {fmtDay(d)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employeesOfRestaurant.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-sm text-muted"
                >
                  No hay empleados activos en esta sucursal.
                </td>
              </tr>
            ) : (
              employeesOfRestaurant.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 align-top text-sm font-medium text-ink">
                    {emp.full_name}
                    {emp.contract_hours_week ? (
                      <div className="text-xs text-muted">
                        {emp.contract_hours_week}h/sem
                      </div>
                    ) : null}
                  </td>
                  {days.map((day) => {
                    const dayKey = new Date(day);
                    dayKey.setHours(0, 0, 0, 0);
                    const cellShifts =
                      shiftsByEmployeeDay.get(
                        `${emp.id}|${dayKey.toISOString()}`
                      ) ?? [];
                    return (
                      <td
                        key={day.toISOString()}
                        className="border-l border-border align-top"
                      >
                        <button
                          type="button"
                          onClick={() => openCreateDraft(emp.id, day)}
                          className="block w-full px-1 py-1 text-left hover:bg-gray-50"
                          aria-label={`Nuevo turno para ${emp.full_name} el ${fmtDay(day)}`}
                        >
                          {cellShifts.length === 0 ? (
                            <div className="min-h-[44px] text-center text-xs text-muted/60">
                              +
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {cellShifts.map((s) => (
                                <div
                                  key={s.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDraft(s);
                                  }}
                                  className="cursor-pointer rounded-md border-l-4 border-success bg-success-soft px-2 py-1 text-xs hover:bg-success/15"
                                >
                                  <div className="font-semibold text-ink">
                                    {fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}
                                  </div>
                                  {s.role ? (
                                    <div className="text-[11px] text-muted">
                                      {s.role}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {loading ? (
          <div className="px-4 py-2 text-xs text-muted">Cargando…</div>
        ) : null}
      </div>

      {/* Modal / Drawer de edición */}
      {draft ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveDraft}
            className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {editingShift ? "Editar turno" : "Nuevo turno"}
                </h2>
                {draftDate ? (
                  <p className="text-xs text-muted">{fmtDay(draftDate)}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeDraft}
                className="rounded-md px-2 py-1 text-sm text-muted hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <label className="block text-sm font-medium text-ink">
              Empleado
              <select
                value={draft.user_id}
                onChange={(e) => setDraft({ ...draft, user_id: e.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                required
                disabled={!!editingShift}
              >
                {employeesOfRestaurant.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-ink">
                Entrada
                <input
                  type="datetime-local"
                  value={draft.starts_at}
                  onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                  className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Salida
                <input
                  type="datetime-local"
                  value={draft.ends_at}
                  onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                  className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-ink">
              Puesto
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
              >
                <option value="">— Sin especificar —</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink">
              Notas (opcional)
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="mt-2 min-h-[60px] w-full rounded-md border border-border p-2 text-sm"
                rows={2}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {editingShift ? (
                <button
                  type="button"
                  onClick={() => {
                    void cancelExistingShift(editingShift);
                    closeDraft();
                  }}
                  className="h-10 rounded-md border border-danger/20 bg-white px-4 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  Cancelar turno
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeDraft}
                  className="h-10 rounded-md border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white"
                >
                  {editingShift ? "Guardar cambios" : "Crear turno"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
