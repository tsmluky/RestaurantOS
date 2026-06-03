"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Upload, Send, FileSpreadsheet, X, CheckCircle, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import type { Employee, Restaurant, Shift } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
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
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

function weekStartISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Types ──────────────────────────────────────────────────────────────────

type ShiftDraft = {
  user_id: string;
  starts_at: string;
  ends_at: string;
  role: string;
  notes: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; employee: string; message: string }[];
  shifts: Shift[];
};

const ROLES = ["Sala", "Cocina", "Barra", "Limpieza", "Caja", "Terraza"];

// ── Page ───────────────────────────────────────────────────────────────────

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

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Publish state
  const [publishing, setPublishing] = useState(false);

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
        api.employees(),
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
        to: weekEnd.toISOString(),
      });
      setShifts(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando turnos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, weekStart]);

  const employeesOfRestaurant = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.status === "ACTIVE" &&
          (!e.primary_restaurant_id || e.primary_restaurant_id === restaurantId)
      ),
    [employees, restaurantId]
  );

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

  // ── Draft shift handlers ────────────────────────────────────────────────

  function openCreateDraft(employeeId: string, day: Date) {
    const start = new Date(day);
    start.setHours(12, 0, 0, 0);
    const end = new Date(day);
    end.setHours(16, 0, 0, 0);
    setEditingShift(null);
    setDraftDate(day);
    setDraft({ user_id: employeeId, starts_at: toLocalInputValue(start), ends_at: toLocalInputValue(end), role: "", notes: "" });
  }

  function openEditDraft(s: Shift) {
    setEditingShift(s);
    setDraftDate(new Date(s.starts_at));
    setDraft({ user_id: s.user_id, starts_at: toLocalInputValue(new Date(s.starts_at)), ends_at: toLocalInputValue(new Date(s.ends_at)), role: s.role ?? "", notes: s.notes ?? "" });
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
        notes: draft.notes || null,
      };
      if (editingShift) {
        await api.updateShift(editingShift.id, { starts_at: payload.starts_at, ends_at: payload.ends_at, role: payload.role, notes: payload.notes });
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
    if (!window.confirm(`¿Cancelar el turno de ${s.user_full_name ?? "este empleado"}?`)) return;
    try {
      await api.cancelShift(s.id);
      setNotice("Turno cancelado.");
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el turno");
    }
  }

  // ── Import handlers ─────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    setImporting(true);
    setImportResult(null);
    setError(null);
    setNotice(null);

    try {
      const result = await api.importShifts(file, restaurantId);
      setImportResult(result);
      if (result.imported > 0) {
        await loadShifts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar el archivo");
    } finally {
      setImporting(false);
      // Reset input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Publish handler ─────────────────────────────────────────────────────

  async function handlePublish() {
    if (!window.confirm(
      `¿Publicar el horario de la semana del ${weekStartISO(weekStart)}? Los empleados recibirán una notificación.`
    )) return;

    setPublishing(true);
    setError(null);
    setNotice(null);

    try {
      const result = await api.publishSchedule(weekStartISO(weekStart));
      if (result.shifts_published === 0) {
        setNotice("No hay turnos en borrador para publicar esta semana.");
      } else {
        setNotice(
          `✅ ${result.shifts_published} turno(s) publicado(s). ` +
          `${result.notifications_sent} notificación(es) enviada(s).`
        );
      }
      await loadShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar el horario");
    } finally {
      setPublishing(false);
    }
  }

  // ── Labels ──────────────────────────────────────────────────────────────

  const weekLabel = `${weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;

  const draftShiftCount = shifts.filter((s) => s.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horario"
        description="Planifica los turnos de cada empleado. Importa desde Excel o crea manualmente. Publica cuando esté listo."
      />

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
      {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

      {/* Import result banner */}
      {importResult && (
        <div className="rounded-lg border border-border bg-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {importResult.imported > 0
                ? <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                : <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
              }
              <div>
                <p className="text-sm font-semibold text-ink">
                  Importación completada —{" "}
                  <span className="text-green-700">{importResult.imported} turno(s) creados</span>
                  {importResult.skipped > 0 && <span className="text-muted">, {importResult.skipped} filas vacías ignoradas</span>}
                  {importResult.errors.length > 0 && <span className="text-red-600">, {importResult.errors.length} error(es)</span>}
                </p>
                {importResult.imported > 0 && (
                  <p className="mt-1 text-xs text-muted">Los turnos están en borrador. Pulsa &quot;Publicar semana&quot; cuando estén listos.</p>
                )}
              </div>
            </div>
            <button onClick={() => setImportResult(null)} className="shrink-0 text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border pt-3">
              {importResult.errors.map((e) => (
                <div key={e.row} className="flex gap-2 text-xs">
                  <span className="shrink-0 font-medium text-red-600">Fila {e.row}</span>
                  <span className="text-muted">({e.employee})</span>
                  <span className="text-ink">{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-panel">
        {/* Restaurant selector */}
        <label className="text-sm font-medium text-ink">
          Sucursal
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="ml-2 h-9 rounded-md border border-border px-3 text-sm"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        {/* Week navigation */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button type="button"
            onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-gray-50"
          >← Anterior</button>
          <span className="px-3 text-sm font-semibold text-ink">{weekLabel}</span>
          <button type="button"
            onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-gray-50"
          >Siguiente →</button>
          <button type="button"
            onClick={() => setWeekStart(startOfWeek())}
            className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-gray-50"
          >Hoy</button>

          {/* Import button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={importing || !restaurantId}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-ink hover:bg-gray-50 disabled:opacity-50"
          >
            {importing
              ? <span className="animate-spin text-xs">⟳</span>
              : <FileSpreadsheet className="h-4 w-4 text-green-600" />
            }
            {importing ? "Importando…" : "Importar Excel"}
          </button>

          {/* Publish button — highlighted when there are drafts */}
          <button
            type="button"
            disabled={publishing}
            onClick={handlePublish}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold disabled:opacity-50 ${
              draftShiftCount > 0
                ? "bg-primary text-white shadow hover:bg-blue-700"
                : "border border-border bg-white text-ink hover:bg-gray-50"
            }`}
          >
            <Send className="h-4 w-4" />
            {publishing ? "Publicando…" : draftShiftCount > 0 ? `Publicar semana (${draftShiftCount})` : "Publicar semana"}
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-panel">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-muted">
            <tr>
              <th className="w-44 px-4 py-3 text-left">Empleado</th>
              {days.map((d) => {
                const isToday = isSameDay(d, new Date());
                return (
                  <th key={d.toISOString()} className={`px-2 py-3 text-center ${isToday ? "bg-blue-50 text-blue-600" : ""}`}>
                    {fmtDay(d)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employeesOfRestaurant.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                  No hay empleados activos en esta sucursal.
                </td>
              </tr>
            ) : (
              employeesOfRestaurant.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 align-top text-sm font-medium text-ink">
                    {emp.full_name}
                    {emp.contract_hours_week ? (
                      <div className="text-xs text-muted">{emp.contract_hours_week}h/sem</div>
                    ) : null}
                  </td>
                  {days.map((day) => {
                    const dayKey = new Date(day);
                    dayKey.setHours(0, 0, 0, 0);
                    const cellShifts = shiftsByEmployeeDay.get(`${emp.id}|${dayKey.toISOString()}`) ?? [];
                    return (
                      <td key={day.toISOString()} className="border-l border-border align-top">
                        <button
                          type="button"
                          onClick={() => openCreateDraft(emp.id, day)}
                          className="block w-full px-1 py-1 text-left hover:bg-gray-50"
                          aria-label={`Nuevo turno para ${emp.full_name}`}
                        >
                          {cellShifts.length === 0 ? (
                            <div className="min-h-[44px] text-center text-xs text-muted/50">+</div>
                          ) : (
                            <div className="space-y-1">
                              {cellShifts.map((s) => (
                                <div
                                  key={s.id}
                                  onClick={(e) => { e.stopPropagation(); openEditDraft(s); }}
                                  className={`cursor-pointer rounded-md border-l-4 px-2 py-1 text-xs hover:opacity-80 ${
                                    s.status === "DRAFT"
                                      ? "border-yellow-400 bg-yellow-50"
                                      : "border-green-500 bg-green-50"
                                  }`}
                                >
                                  <div className="font-semibold text-ink">
                                    {fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}
                                  </div>
                                  {s.role && <div className="text-[11px] text-muted">{s.role}</div>}
                                  {s.status === "DRAFT" && (
                                    <div className="text-[10px] font-medium text-yellow-600">BORRADOR</div>
                                  )}
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
        {loading && <div className="px-4 py-2 text-xs text-muted">Cargando…</div>}
      </div>

      {/* Import instructions hint */}
      <details className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        <summary className="cursor-pointer font-medium text-ink">
          <FileSpreadsheet className="mr-1 inline h-4 w-4 text-green-600" />
          ¿Cómo preparar el Excel para importar?
        </summary>
        <div className="mt-3 space-y-2">
          <p>El archivo debe tener una fila de cabeceras y las siguientes columnas (en cualquier orden):</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead><tr className="bg-gray-50">
                <th className="border border-border px-3 py-2 text-left">Columna</th>
                <th className="border border-border px-3 py-2 text-left">Nombres aceptados</th>
                <th className="border border-border px-3 py-2 text-left">Ejemplo</th>
              </tr></thead>
              <tbody>
                {[
                  ["Empleado *", "email, empleado, nombre, name", "francisco@demo.dev"],
                  ["Fecha *", "fecha, date, dia", "26/05/2026"],
                  ["Hora inicio *", "inicio, entrada, start", "09:00"],
                  ["Hora fin *", "fin, salida, end", "17:00"],
                  ["Puesto", "puesto, role, rol, cargo", "Sala"],
                  ["Notas", "notas, notes", "Turno especial"],
                ].map(([col, names, ex]) => (
                  <tr key={col}>
                    <td className="border border-border px-3 py-1 font-medium text-ink">{col}</td>
                    <td className="border border-border px-3 py-1 font-mono">{names}</td>
                    <td className="border border-border px-3 py-1">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs">* Obligatorio. El empleado se busca por email, nombre completo o código de empleado.</p>
        </div>
      </details>

      {/* Shift edit modal */}
      {draft && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveDraft} className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">{editingShift ? "Editar turno" : "Nuevo turno"}</h2>
                {draftDate && <p className="text-xs text-muted">{fmtDay(draftDate)}</p>}
              </div>
              <button type="button" onClick={closeDraft} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-gray-100">✕</button>
            </div>

            <label className="block text-sm font-medium text-ink">
              Empleado
              <select
                value={draft.user_id}
                onChange={(e) => setDraft({ ...draft, user_id: e.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm"
                required disabled={!!editingShift}
              >
                {employeesOfRestaurant.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-ink">
                Entrada
                <input type="datetime-local" value={draft.starts_at}
                  onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                  className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm" required />
              </label>
              <label className="block text-sm font-medium text-ink">
                Salida
                <input type="datetime-local" value={draft.ends_at}
                  onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                  className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm" required />
              </label>
            </div>

            <label className="block text-sm font-medium text-ink">
              Puesto
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-border px-3 text-sm">
                <option value="">— Sin especificar —</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink">
              Notas
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="mt-2 min-h-[60px] w-full rounded-md border border-border p-2 text-sm" rows={2} />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {editingShift ? (
                <button type="button"
                  onClick={() => { void cancelExistingShift(editingShift); closeDraft(); }}
                  className="h-10 rounded-md border border-red-200 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50"
                >Cancelar turno</button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={closeDraft}
                  className="h-10 rounded-md border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-700">
                  {editingShift ? "Guardar cambios" : "Crear turno"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
